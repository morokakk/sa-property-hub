import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as XLSX from 'xlsx';
import {
  buildPortfolioWorkbook,
  exportPortfolioToExcel,
} from '@/lib/export/excelExport';
import {
  INITIAL_RENTALS,
  INITIAL_FLIPS,
  INITIAL_DEVELOPMENTS,
  INITIAL_OPPORTUNITIES,
  INITIAL_FUNDING,
  INITIAL_INVESTOR_PROFILE,
} from '@/lib/store/initialData';
import { computePortfolioSummary } from '@/lib/store/selectors/portfolioSummarySelector';
import type { DevelopmentProject } from '@/types';

const writeFileMock = vi.fn();

vi.mock('xlsx', async () => {
  const actual = await vi.importActual<typeof import('xlsx')>('xlsx');
  return {
    ...actual,
    writeFile: (...args: unknown[]) => writeFileMock(...args),
  };
});

describe('Portfolio Multi-Tab Excel Workbook Export', () => {
  beforeEach(() => {
    writeFileMock.mockClear();
  });

  it('includes Developments tab, reconciles Sheet 1 Summary 100% with portfolioSummarySelector, and keeps raw numeric ZAR cells', async () => {
    // Include one development with unlinked debt & sold/graduated units alongside seeded developments
    const unlinkedDev: DevelopmentProject = {
      ...structuredClone(INITIAL_DEVELOPMENTS[0]),
      id: 'dev-unlinked-test',
      title: 'Tshwane Unlinked Test Estate',
      linkedFundingSourceId: undefined,
      developmentFacilityDrawnZAR: 1_200_000,
      developmentFacilityRepaidZAR: 200_000,
      units: [
        {
          ...structuredClone(INITIAL_DEVELOPMENTS[0].units[0]),
          id: 'u-sold',
          unitNumber: 'Unit 1',
          listPriceVatInclZAR: 1_100_000,
          status: 'Sold & Transferred',
        },
        {
          ...structuredClone(INITIAL_DEVELOPMENTS[0].units[0]),
          id: 'u-graduated',
          unitNumber: 'Unit 2',
          listPriceVatInclZAR: 1_100_000,
          status: 'Retained for Rental',
          graduatedRentalId: 'rental-grad-1',
        },
        {
          ...structuredClone(INITIAL_DEVELOPMENTS[0].units[0]),
          id: 'u-unsold',
          unitNumber: 'Unit 3',
          listPriceVatInclZAR: 1_250_000,
          status: 'Available',
        },
      ],
    };

    const developments = [...structuredClone(INITIAL_DEVELOPMENTS), unlinkedDev];
    const liquidCapitalReserve = 650_000;
    const summary = computePortfolioSummary({
      rentals: INITIAL_RENTALS,
      flips: INITIAL_FLIPS,
      developments,
      opportunities: INITIAL_OPPORTUNITIES,
      funding: INITIAL_FUNDING,
      liquidCapitalReserve,
      investorProfile: INITIAL_INVESTOR_PROFILE,
    });

    await exportPortfolioToExcel({
      rentals: INITIAL_RENTALS,
      flips: INITIAL_FLIPS,
      developments,
      opportunities: INITIAL_OPPORTUNITIES,
      funding: INITIAL_FUNDING,
      summary,
      investorProfile: INITIAL_INVESTOR_PROFILE,
    });

    expect(writeFileMock).toHaveBeenCalledTimes(1);
    const [wb, filename] = writeFileMock.mock.calls[0] as [XLSX.WorkBook, string];
    expect(filename).toMatch(/^sa-property-portfolio-\d{4}-\d{2}-\d{2}\.xlsx$/);

    // Every sheet tab name <= 31 Excel limit
    wb.SheetNames.forEach((name) => expect(name.length).toBeLessThanOrEqual(31));
    expect(wb.SheetNames).toEqual([
      'Summary',
      'Rentals',
      'Buy & Flips',
      'Renovation BOQ',
      'Developments',
      'Pipeline Deals',
      'Private Funding',
    ]);

    // --- Sheet 1: Summary Reconciliation ---
    const wsSummary = wb.Sheets['Summary'];
    const sumRows = XLSX.utils.sheet_to_json<(string | number)[]>(wsSummary, { header: 1 });
    const getKpi = (label: string) => {
      const row = sumRows.find((r) => r[0] === label);
      expect(row, `Missing Summary KPI: ${label}`).toBeDefined();
      expect(typeof row![1]).toBe('number');
      return Number(row![1]);
    };

    const rentalVal = getKpi('Rental Portfolio Value');
    const flipVal = getKpi('Buy-and-Flip Portfolio Value');
    const devVal = getKpi('Development Portfolio Value');
    const liquidVal = getKpi('Liquid Capital Reserve');
    const grossVal = getKpi('Total Gross Asset Value');

    expect(rentalVal + flipVal + devVal + liquidVal).toBe(grossVal);

    const privDebt = getKpi('Private Funding Liabilities');
    const bondDebt = getKpi('Bank Mortgage Bond Liabilities');
    const unlinkedDevDebt = getKpi('Development Debt Liabilities (Unlinked)');
    const totalDebt = getKpi('Total Debt Liabilities');
    const netEquity = getKpi('Net Equity');

    expect(unlinkedDevDebt).toBe(1_000_000);
    expect(privDebt + bondDebt + unlinkedDevDebt).toBe(totalDebt);
    expect(grossVal - totalDebt).toBe(netEquity);
    expect(getKpi('Total Senior Development Debt (incl. Linked Facilities)')).toBe(
      summary.totalDevelopmentLiabilities
    );
    expect(getKpi('Active Developments Count')).toBe(summary.activeDevelopmentsCount);

    // --- Sheet 5: Developments ---
    const wsDevs = wb.Sheets['Developments'];
    const devRows = XLSX.utils.sheet_to_json<(string | number)[]>(wsDevs, { header: 1 });
    const devHeaders = devRows[0] as string[];
    const unsoldColIdx = devHeaders.indexOf('Unsold / Retained Asset Value (ZAR)');
    expect(unsoldColIdx).toBeGreaterThan(-1);

    const unlinkedRowIdx = devRows.findIndex((r) => r[0] === 'Tshwane Unlinked Test Estate');
    expect(unlinkedRowIdx).toBeGreaterThan(0);
    // Excludes sold unit (1.1m) and graduated rental unit (1.1m), keeps only unsold (1.25m)
    expect(devRows[unlinkedRowIdx][unsoldColIdx]).toBe(1_250_000);
    const cellAddr = XLSX.utils.encode_cell({ r: unlinkedRowIdx, c: unsoldColIdx });
    expect(wsDevs[cellAddr]?.t).toBe('n');

    // Sum of Unsold / Retained Asset Value column matches Development Portfolio Value on Summary
    const sumUnsoldDevs = devRows
      .slice(1)
      .reduce((acc, r) => acc + Number(r[unsoldColIdx] || 0), 0);
    expect(sumUnsoldDevs).toBe(devVal);
  });

  it('syncs Sheet 2 Rentals, Sheet 3 Flips, Sheet 4 BOQ, Sheet 6 Pipeline, and Sheet 7 Funding columns', () => {
    const multiUnitRental = {
      ...structuredClone(INITIAL_RENTALS[0]),
      id: 'rental-multi-wb',
      title: 'Fourways 2-Unit Cluster',
      leases: [
        { ...structuredClone(INITIAL_RENTALS[0].leases[0]), depositHeldZAR: 15_000, status: 'Occupied' as const },
        { ...structuredClone(INITIAL_RENTALS[0].leases[0]), id: 'lease-2', depositHeldZAR: 12_000, status: 'Vacant' as const },
      ],
      numberOfUnits: 2,
      applicants: [
        {
          id: 'app-1',
          unitName: 'Unit 2',
          fullName: 'Sipho Dlamini',
          phone: '+27 82 000 0000',
          monthlyBudgetZAR: 18_000,
          status: 'Viewing' as const,
          createdAt: '2026-11-20',
        },
      ],
    };

    const summary = computePortfolioSummary({
      rentals: [multiUnitRental],
      flips: INITIAL_FLIPS,
      developments: INITIAL_DEVELOPMENTS,
      opportunities: INITIAL_OPPORTUNITIES,
      funding: INITIAL_FUNDING,
      liquidCapitalReserve: 500_000,
      investorProfile: INITIAL_INVESTOR_PROFILE,
    });

    const wb = buildPortfolioWorkbook(XLSX, {
      rentals: [multiUnitRental],
      flips: INITIAL_FLIPS,
      developments: INITIAL_DEVELOPMENTS,
      opportunities: INITIAL_OPPORTUNITIES,
      funding: INITIAL_FUNDING,
      summary,
      investorProfile: INITIAL_INVESTOR_PROFILE,
    });

    // Sheet 2: Rentals
    const rentalRows = XLSX.utils.sheet_to_json<(string | number)[]>(wb.Sheets['Rentals'], { header: 1 });
    const rHeaders = rentalRows[0] as string[];
    expect(rHeaders).toContain('Occupied Units');
    expect(rHeaders).toContain('Deposit Held (ZAR)');
    expect(rHeaders).toContain('Applicants Count');
    expect(rHeaders).toContain('Zoning Summary');
    expect(rentalRows[1][rHeaders.indexOf('Occupied Units')]).toBe('1 / 2');
    expect(rentalRows[1][rHeaders.indexOf('Deposit Held (ZAR)')]).toBe(27_000);
    expect(rentalRows[1][rHeaders.indexOf('Applicants Count')]).toBe(1);

    // Sheet 3: Buy & Flips
    const flipRows = XLSX.utils.sheet_to_json<(string | number)[]>(wb.Sheets['Buy & Flips'], { header: 1 });
    const fHeaders = flipRows[0] as string[];
    expect(fHeaders).toContain('Project Strategy');
    expect(fHeaders).toContain('Graduated Units Count');
    expect(fHeaders).toContain('Tax Entity Type');
    expect(fHeaders).toContain('Section 118 Municipal Arrears (ZAR)');
    expect(fHeaders).toContain('Zoning Summary');

    // Sheet 4: Renovation BOQ synced with exportFlipBOQCSV
    const boqRows = XLSX.utils.sheet_to_json<(string | number)[]>(wb.Sheets['Renovation BOQ'], { header: 1 });
    const bHeaders = boqRows[0] as string[];
    expect(bHeaders).toContain('Milestone Draw Phase');
    expect(bHeaders).toContain('Retention (%)');
    expect(bHeaders).toContain('Is Sponsored / Barter');
    expect(bHeaders).toContain('Commercial Retail Value (ZAR)');
    expect(bHeaders).toContain('Actual Cash Outflow (ZAR)');

    // Sheet 6: Pipeline Deals
    const oppRows = XLSX.utils.sheet_to_json<(string | number)[]>(wb.Sheets['Pipeline Deals'], { header: 1 });
    const oHeaders = oppRows[0] as string[];
    expect(oHeaders).toContain('Strategy');
    expect(oHeaders).toContain('Units');
    expect(oHeaders).toContain('Floor Area (m²)');
    expect(oHeaders).toContain('VAT-Inclusive Developer Sale');
    expect(oHeaders).toContain('Pass Reason');

    // Sheet 7: Private Funding
    const fundRows = XLSX.utils.sheet_to_json<(string | number)[]>(wb.Sheets['Private Funding'], { header: 1 });
    const fnHeaders = fundRows[0] as string[];
    expect(fnHeaders).toContain('Disbursement Date');
    expect(fnHeaders).toContain('Maturity Date');
    expect(fnHeaders).toContain('Delay Extension Days');
    expect(fnHeaders).toContain('Drawn Amount (ZAR)');
    expect(fnHeaders).toContain('Undrawn Standby Capacity (ZAR)');
    expect(fnHeaders).toContain('Tranches Progress');
  });
});
