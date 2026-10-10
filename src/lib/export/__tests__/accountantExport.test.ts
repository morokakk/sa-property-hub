import { describe, it, expect, vi, afterEach } from 'vitest';
import type { RentalProperty } from '@/types';
import {
  ACCOUNTANT_JOURNAL_HEADERS,
  buildAccountantJournalCSV,
  buildAccountantJournalRows,
  exportAccountantJournalCSV,
} from '../csvExport';

// Local-time constructor: March, April, May 2026 are in scope (SA tax year 2026/27)
const AS_OF = new Date(2026, 4, 15);

function makeRental(overrides: Partial<RentalProperty> = {}): RentalProperty {
  return {
    id: 'r1',
    title: 'Clearwater 12',
    address: '12 Clearwater Rd',
    city: 'Johannesburg',
    propertyType: 'Sectional Title Apartment',
    marketValueZAR: 1_500_000,
    purchasePriceZAR: 1_200_000,
    purchaseDate: '2020-01-01',
    outstandingBondBalanceZAR: 800_000,
    bondInterestRatePercent: 11.5,
    monthlyBondPaymentZAR: 9000,
    leases: [],
    managementType: 'Agency',
    agencyCommissionPercent: 10,
    agencyVatApplicable: true,
    monthlyGrossRentZAR: 15000,
    monthlyLeviesZAR: 1800,
    monthlyRatesTaxesZAR: 900,
    monthlyAgentFeeZAR: 0,
    monthlyMaintenanceReserveZAR: 500,
    maintenanceHistory: [],
    status: 'Occupied',
    ...overrides,
  };
}

const freeholdNoBond = () =>
  makeRental({
    id: 'r2',
    title: 'Freehold 7',
    propertyType: 'Freehold House',
    managementType: 'Self-Managed',
    outstandingBondBalanceZAR: 0,
    monthlyBondPaymentZAR: 0,
    monthlyGrossRentZAR: 8000,
    monthlyLeviesZAR: 0,
    monthlyRatesTaxesZAR: 600,
    annualBuildingInsuranceZAR: 2400,
  });

/** Minimal RFC 4180 parser for assertions */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') inQuotes = false;
      else cell += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\r' && text[i + 1] === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      i++;
    } else cell += c;
  }
  row.push(cell);
  rows.push(row);
  return rows;
}

describe('Accountant GL Journal export', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('Test 1: headers and row counts', () => {
    it('emits the standard column headers', () => {
      const parsed = parseCSV(buildAccountantJournalCSV([makeRental()], AS_OF));
      expect(parsed[0]).toEqual([...ACCOUNTANT_JOURNAL_HEADERS]);
      expect(parsed[0]).toEqual([
        'Date',
        'Tracking Category (Property)',
        'Account Name',
        'Description',
        'Reference',
        'Amount (ZAR)',
        'Tax Type',
      ]);
    });

    it('single property: 3 months x (rent, agent, levies, rates, bond interest, bond principal + contra) = 21 rows', () => {
      const parsed = parseCSV(buildAccountantJournalCSV([makeRental()], AS_OF));
      expect(parsed.length - 1).toBe(21);
      expect(parsed.slice(1).every((r) => r.length === 7)).toBe(true);
    });

    it('multi property: rows are the sum of each property (21 + 12 = 33)', () => {
      const rows = buildAccountantJournalRows([makeRental(), freeholdNoBond()], AS_OF);
      expect(rows.length).toBe(33);
      expect(new Set(rows.map((r) => r.property))).toEqual(new Set(['Clearwater 12', 'Freehold 7']));
    });

    it('every Reference nets to exactly 0.00 (balanced journal)', () => {
      const rows = buildAccountantJournalRows([makeRental(), freeholdNoBond()], AS_OF);
      const totals = new Map<string, number>();
      rows.forEach((r) => totals.set(r.reference, (totals.get(r.reference) || 0) + Math.round(r.amount * 100)));
      expect(totals.size).toBeGreaterThan(0);
      totals.forEach((cents) => expect(cents).toBe(0));
    });

    it('returns only the header for an empty portfolio', () => {
      expect(parseCSV(buildAccountantJournalCSV([], AS_OF)).length).toBe(1);
    });

    it('excludes the maintenance reserve (a provision, not an expense)', () => {
      const rows = buildAccountantJournalRows([makeRental()], AS_OF);
      expect(rows.some((r) => /maintenance/i.test(r.account))).toBe(false);
    });
  });

  describe('Test 2: SA VAT tag mappings', () => {
    const rows = buildAccountantJournalRows([makeRental()], AS_OF);
    const taxFor = (account: string) => Array.from(new Set(rows.filter((r) => r.account === account).map((r) => r.taxType)));

    it('residential rent is Exempt (s12(a) SA VAT Act)', () => {
      expect(taxFor('Rental Income')).toEqual(['Exempt']);
    });
    it('agency fees are Standard (15%)', () => {
      expect(taxFor('Agent Commission Expense')).toEqual(['Standard (15%)']);
    });
    it('levies Exempt and rates Zero-Rated / Exempt', () => {
      expect(taxFor('Levies Expense')).toEqual(['Exempt']);
      expect(taxFor('Rates & Taxes')).toEqual(['Zero-Rated / Exempt']);
    });

    it('splits the bond into interest vs principal using amortisation', () => {
      const interest = rows.filter((r) => r.account === 'Bond Interest Expense');
      const principal = rows.filter((r) => r.account === 'Bond Principal Reduction');
      expect(interest.length).toBe(3);
      expect(principal.length).toBe(3);
      // current (asOf) month: 800000 * 11.5% / 12 = 7666.67 interest, 1333.33 principal
      const may = (a: { date: string }) => a.date === '2026-05-31';
      expect(interest.find(may)!.amount).toBe(7666.67);
      expect(principal.find(may)!.amount).toBe(1333.33);
      // every month's split sums to the monthly repayment
      ['2026-03-31', '2026-04-30', '2026-05-31'].forEach((d) => {
        const sum = interest.find((r) => r.date === d)!.amount + principal.find((r) => r.date === d)!.amount;
        expect(Math.round(sum * 100)).toBe(900000);
      });
    });

    it('falls back to "Mortgage Bond Repayment" when balance/rate are missing', () => {
      const r = makeRental({ outstandingBondBalanceZAR: 0, bondInterestRatePercent: 0, monthlyBondPaymentZAR: 7000 });
      const out = buildAccountantJournalRows([r], AS_OF);
      const combined = out.filter((x) => x.account === 'Mortgage Bond Repayment');
      expect(combined.length).toBe(3);
      expect(combined.every((x) => x.amount === 7000)).toBe(true);
      expect(out.some((x) => x.account === 'Bond Interest Expense')).toBe(false);
    });

    it('maps statement utilities to Standard (15%)', () => {
      const r = makeRental({
        utilityStatements: [
          {
            id: 's1',
            statementDate: '2026-04-03',
            provider: 'City of Johannesburg',
            electricityZAR: 500,
            waterZAR: 300,
            refuseZAR: 100,
            sewerageZAR: 50,
            totalDueZAR: 950,
            parsedVia: 'manual',
            createdAt: '2026-04-03T00:00:00Z',
          },
        ],
      });
      const util = buildAccountantJournalRows([r], AS_OF).filter((x) => x.account === 'Utility Recoveries / Municipal Charges');
      expect(util).toHaveLength(1);
      expect(util[0].taxType).toBe('Standard (15%)');
      expect(util[0].amount).toBe(950);
    });
  });

  describe('Test 3: raw decimal number formatting', () => {
    const csv = buildAccountantJournalCSV([makeRental()], AS_OF);
    const body = parseCSV(csv).slice(1);

    it('amount column is a plain signed decimal with 2dp (no currency, spaces or separators)', () => {
      body.forEach((r) => expect(r[5]).toMatch(/^-?\d+\.\d{2}$/));
    });

    it('renders 15000.00 (credit) rather than "R 15,000"', () => {
      const rent = body.find((r) => r[2] === 'Rental Income')!;
      expect(rent[5]).toBe('-15000.00');
      expect(csv).not.toMatch(/R\s?\d/);
      expect(csv).not.toContain('15,000');
    });

    it('renders agent commission as 1725.00 (15000 x 10% x 1.15)', () => {
      expect(body.find((r) => r[2] === 'Agent Commission Expense')![5]).toBe('1725.00');
    });

    it('never emits negative zero', () => {
      expect(csv).not.toContain('-0.00');
    });
  });

  describe('hybrid actuals, scope and encoding', () => {
    it('an actual gross_rent transaction replaces that month budget line only', () => {
      const r = makeRental({
        transactions: [
          { id: 't1', propertyId: 'r1', date: '2026-04-05', category: 'gross_rent', amountZAR: 14000 },
        ],
      });
      const rent = buildAccountantJournalRows([r], AS_OF).filter((x) => x.account === 'Rental Income');
      expect(rent).toHaveLength(3);
      const april = rent.find((x) => x.date === '2026-04-05')!;
      expect(april.reference).toBe('ACT-CLEARWATER-12-2026-04-05');
      expect(april.amount).toBe(-14000);
      expect(rent.filter((x) => x.reference.startsWith('BUD-')).map((x) => x.date).sort()).toEqual(['2026-03-31', '2026-05-31']);
    });

    it('cash-basis payment records are used when no transactions exist', () => {
      const r = makeRental({
        paymentRecords: [
          {
            id: 'p1',
            propertyId: 'r1',
            periodMonth: '2026-03',
            paymentDate: '2026-03-02',
            amountReceivedZAR: 15000,
            paymentMethod: 'EFT',
            createdAt: '2026-03-02T00:00:00Z',
          },
        ],
      });
      const rent = buildAccountantJournalRows([r], AS_OF).filter((x) => x.account === 'Rental Income');
      expect(rent.find((x) => x.date === '2026-03-02')!.reference.startsWith('ACT-')).toBe(true);
      expect(rent).toHaveLength(3);
    });

    it('a Sold property only carries budget lines up to its sold month', () => {
      const r = makeRental({ status: 'Sold', soldDate: '2026-04-20' });
      const rows = buildAccountantJournalRows([r], AS_OF);
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((x) => x.date <= '2026-04-30')).toBe(true);
    });

    it('does not generate budget lines for months before purchase', () => {
      const rows = buildAccountantJournalRows([makeRental({ purchaseDate: '2026-05-01' })], AS_OF);
      expect(rows.every((x) => x.date === '2026-05-31')).toBe(true);
    });

    it('uses the previous tax year before March', () => {
      const rows = buildAccountantJournalRows([makeRental()], new Date(2027, 0, 20));
      const dates = rows.map((x) => x.date).sort();
      expect(dates[0]).toBe('2026-03-31');
      expect(dates[dates.length - 1]).toBe('2027-01-31');
    });

    it('escapes commas and quotes per RFC 4180', () => {
      const csv = buildAccountantJournalCSV([makeRental({ title: 'Unit "A", Block 2' })], AS_OF);
      expect(csv).toContain('"Unit ""A"", Block 2"');
      expect(parseCSV(csv)[1][1]).toBe('Unit "A", Block 2');
      expect(csv).toContain('\r\n');
    });

    it('downloads with a UTF-8 BOM and the dated filename', async () => {
      let captured: Blob | undefined;
      const link = { href: '', download: '', click: vi.fn() };
      vi.stubGlobal('document', { createElement: vi.fn(() => link) });
      vi.spyOn(URL, 'createObjectURL').mockImplementation((b) => {
        captured = b as Blob;
        return 'blob:mock';
      });
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

      const count = exportAccountantJournalCSV([makeRental()], AS_OF);

      expect(count).toBe(21);
      expect(link.click).toHaveBeenCalledTimes(1);
      expect(link.download).toBe('sa-property-accountant-journal-2026-05-15.csv');
      const bytes = new Uint8Array(await captured!.arrayBuffer());
      expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    });
  });
});
