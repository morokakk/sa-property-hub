import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as XLSX from 'xlsx';
import { exportITR12TaxReport } from '@/lib/export/excelExport';
import { INITIAL_RENTALS } from '@/lib/store/initialData';

const FORBIDDEN_LINE_ITEM_CODES_RE = /Code\s*421[2468]|Code\s*422[0246]/;

const writeFileMock = vi.fn();

vi.mock('xlsx', async () => {
  const actual = await vi.importActual<typeof import('xlsx')>('xlsx');
  return {
    ...actual,
    writeFile: (...args: unknown[]) => writeFileMock(...args),
  };
});

describe('SARS Rental Income & Expenses Tax Excel Export', () => {
  beforeEach(() => {
    writeFileMock.mockClear();
  });

  it('uses entity-neutral Section 11(a) headers and keeps profit/loss source codes on the net line only', async () => {
    await exportITR12TaxReport([INITIAL_RENTALS[0]], 2026);

    expect(writeFileMock).toHaveBeenCalledTimes(1);
    const [workbook, filename] = writeFileMock.mock.calls[0] as [XLSX.WorkBook, string];

    expect(filename).toBe('sars-itr12-rental-tax-report-2026.xlsx');
    const ws = workbook.Sheets['ITR12 Tax 2026'];
    expect(ws).toBeDefined();

    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });
    expect(rows[0]).toContain('SARS RENTAL INCOME & EXPENSES TAX SCHEDULE (ITR12 / ITR14)');

    const headerRow = rows.find(
      (r) => Array.isArray(r) && r.includes('Section 11(a) Bond Interest (Deductible Expense)')
    );
    expect(headerRow).toBeDefined();
    expect(headerRow).toContain('Gross Rental Income');
    expect(headerRow).not.toContain('Gross Rent (Code 4210)');
    expect(headerRow).toContain('Section 11(a) Bond Interest (Deductible Expense)');
    expect(headerRow).toContain('Net Taxable Rental Income / Loss (Code 4210 Profit / 4211 Loss)');

    const allCells = rows.flat().map((cell) => String(cell ?? ''));
    for (const cell of allCells) {
      expect(cell).not.toMatch(FORBIDDEN_LINE_ITEM_CODES_RE);
    }
  });

  it('includes Ancillary Income, Communal Services OpEx, and Prepaid Vending Fees in ITR12/ITR14 net taxable math', async () => {
    const rental = {
      ...structuredClone(INITIAL_RENTALS[0]),
      propertyType: 'Sectional Title Apartment' as const,
      managementType: 'Self-Managed' as const,
      monthlyGrossRentZAR: 10_000,
      monthlyRatesTaxesZAR: 1_000,
      monthlyLeviesZAR: 1_500,
      outstandingBondBalanceZAR: 500_000,
      bondInterestRatePercent: 10.0,
      monthlyMaintenanceReserveZAR: 500,
      monthlyCommunalServicesZAR: 800,
      monthlyPrepaidVendingFeeZAR: 150,
      section13sexAnnualShieldZAR: 10_000,
      arrearsWriteOffs: [],
      transactions: [],
      ancillaryIncomes: [
        {
          id: 'anc-1',
          type: 'parking' as const,
          tenantName: 'Parking Tenant',
          monthlyRentZAR: 1_200,
          annualEscalationPercent: 6,
          contractStartDate: '2026-01-01',
          contractEndDate: '2027-01-01',
          vatApplicable: false,
        },
      ],
    };

    await exportITR12TaxReport([rental], 2026);
    const [workbook] = writeFileMock.mock.calls[0] as [XLSX.WorkBook, string];
    const ws = workbook.Sheets['ITR12 Tax 2026'];
    const rows = XLSX.utils.sheet_to_json<(string | number)[]>(ws, { header: 1 });

    const headerIdx = rows.findIndex(
      (r) => Array.isArray(r) && r.includes('Gross Rental Income')
    );
    const headers = rows[headerIdx] as string[];
    const dataRow = rows[headerIdx + 1];
    const totalsRow = rows[headerIdx + 2];

    expect(headers).toContain('Ancillary Income');
    expect(headers).toContain('Communal Services OpEx');
    expect(headers).toContain('Prepaid Vending Fees');

    const gross = 120_000;
    const ancillary = 14_400; // 1200 * 12
    const rates = 12_000;
    const levies = 18_000;
    const bondInterest = 50_000; // 500,000 * 10%
    const repairs = 6_000;
    const communal = 9_600; // 800 * 12
    const vending = 1_800; // 150 * 12
    const sec13 = 10_000;
    const expectedDeductions = rates + levies + bondInterest + repairs + communal + vending + sec13;
    const expectedNetTaxable = gross + ancillary - expectedDeductions;

    expect(dataRow[headers.indexOf('Ancillary Income')]).toBe(ancillary);
    expect(dataRow[headers.indexOf('Communal Services OpEx')]).toBe(communal);
    expect(dataRow[headers.indexOf('Prepaid Vending Fees')]).toBe(vending);
    expect(dataRow[headers.indexOf('Total Allowable Deductions')]).toBe(expectedDeductions);
    expect(
      dataRow[headers.indexOf('Net Taxable Rental Income / Loss (Code 4210 Profit / 4211 Loss)')]
    ).toBe(expectedNetTaxable);

    expect(totalsRow[headers.indexOf('Ancillary Income')]).toBe(ancillary);
    expect(totalsRow[headers.indexOf('Communal Services OpEx')]).toBe(communal);
    expect(totalsRow[headers.indexOf('Prepaid Vending Fees')]).toBe(vending);
    expect(totalsRow[headers.indexOf('Total Allowable Deductions')]).toBe(expectedDeductions);
    expect(
      totalsRow[headers.indexOf('Net Taxable Rental Income / Loss (Code 4210 Profit / 4211 Loss)')]
    ).toBe(expectedNetTaxable);

    const allCells = rows.flat().map((cell) => String(cell ?? ''));
    for (const cell of allCells) {
      expect(cell).not.toMatch(FORBIDDEN_LINE_ITEM_CODES_RE);
    }
  });
});
