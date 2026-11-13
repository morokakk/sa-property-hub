import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as XLSX from 'xlsx';
import {
  buildDevelopmentProjectWorkbook,
  exportDevelopmentProjectToExcel,
  formatLocalExportDate,
  slugifyDevelopmentTitle,
} from '@/lib/export/excelExport';
import { calculateDevelopmentFinancials } from '@/lib/calculations/developments';
import { INITIAL_DEVELOPMENTS } from '@/lib/store/initialData';
import { DevelopmentProject } from '@/types';

const writeFileMock = vi.fn();

vi.mock('xlsx', async () => {
  const actual = await vi.importActual<typeof import('xlsx')>('xlsx');
  return {
    ...actual,
    writeFile: (...args: unknown[]) => writeFileMock(...args),
  };
});

describe('Single-Project External Team Excel Export', () => {
  beforeEach(() => {
    writeFileMock.mockClear();
  });

  const dev1: DevelopmentProject = structuredClone(INITIAL_DEVELOPMENTS[0]);
  const summary1 = calculateDevelopmentFinancials(dev1);

  it('slugifies development titles cleanly for export filenames', () => {
    expect(slugifyDevelopmentTitle('Ferndale 6-Unit Cluster Subdivision')).toBe(
      'ferndale-6-unit-cluster-subdivision'
    );
    expect(slugifyDevelopmentTitle('  Diepsloot Ext. 4 (Phase 1)  ')).toBe(
      'diepsloot-ext-4-phase-1'
    );
    expect(slugifyDevelopmentTitle('---')).toBe('project');
  });

  it('generates all 5 required sheets in exact order with raw numeric ZAR cells', () => {
    const wb = buildDevelopmentProjectWorkbook(XLSX, dev1, summary1);

    expect(wb.SheetNames).toEqual([
      'Executive & Capital Stack',
      'Unit Inventory & Split-Exit',
      'Cost Stack & Hard Build BOQ',
      'Paper Rights & Approvals',
      'Team Comments & Action Ledger',
    ]);

    // Sheet 1: Executive & Capital Stack — raw numeric cells for TDC, GDV, POC%
    const ws1 = wb.Sheets['Executive & Capital Stack'];
    const s1Rows = XLSX.utils.sheet_to_json<(string | number)[]>(ws1, { header: 1 });
    const tdcRow = s1Rows.find((r) => r[0] === 'Total Development Cost / TDC (ZAR)');
    const gdvRow = s1Rows.find((r) => r[0] === 'Gross Development Value incl. VAT / GDV (ZAR)');
    const pocRow = s1Rows.find((r) => r[0] === 'Pre-Tax Profit on Cost / POC (%)');
    expect(tdcRow).toBeDefined();
    expect(typeof tdcRow![1]).toBe('number');
    expect(tdcRow![1]).toBe(summary1.tdcZAR);
    expect(typeof gdvRow![1]).toBe('number');
    expect(gdvRow![1]).toBe(summary1.gdvInclVatZAR);
    expect(typeof pocRow![1]).toBe('number');

    // Verify Sheet 1 cell type in underlying SheetJS sheet object is numeric ('n')
    const tdcRowIndex = s1Rows.findIndex((r) => r[0] === 'Total Development Cost / TDC (ZAR)');
    const tdcCellAddress = XLSX.utils.encode_cell({ r: tdcRowIndex, c: 1 });
    expect(ws1[tdcCellAddress]?.t).toBe('n');

    // Sheet 2: Unit Inventory & Split-Exit — numeric pricing & cost basis per unit
    const ws2 = wb.Sheets['Unit Inventory & Split-Exit'];
    const s2Rows = XLSX.utils.sheet_to_json<(string | number)[]>(ws2, { header: 1 });
    expect(s2Rows[0][0]).toBe('Unit #');
    expect(s2Rows.length).toBe(dev1.units.length + 2); // header + units + TOTAL
    const firstUnitRow = s2Rows[1];
    expect(firstUnitRow[0]).toBe(dev1.units[0].unitNumber);
    expect(typeof firstUnitRow[2]).toBe('number'); // Floor Area
    expect(typeof firstUnitRow[3]).toBe('number'); // Allocated Cost Basis
    expect(typeof firstUnitRow[4]).toBe('number'); // List Price incl. VAT
    expect(typeof firstUnitRow[5]).toBe('number'); // Est. Monthly Rent

    // Sheet 3: Cost Stack & Hard Build BOQ — Soft Costs + BOQ items with numeric ZAR
    const ws3 = wb.Sheets['Cost Stack & Hard Build BOQ'];
    const s3Rows = XLSX.utils.sheet_to_json<(string | number)[]>(ws3, { header: 1 });
    const softTotalRow = s3Rows.find((r) => r[0] === 'TOTAL SOFT COSTS & MUNICIPAL CHARGES');
    expect(typeof softTotalRow![3]).toBe('number');
    expect(softTotalRow![3]).toBe(summary1.totalSoftCostsZAR);

    const boqHeaderIdx = s3Rows.findIndex((r) => r[0] === 'Trade Category');
    expect(boqHeaderIdx).toBeGreaterThan(8);
    if (dev1.boqItems.length > 0) {
      const firstBoqRow = s3Rows[boqHeaderIdx + 1];
      expect(firstBoqRow[0]).toBe(dev1.boqItems[0].category);
      expect(typeof firstBoqRow[5]).toBe('number'); // Baseline ZAR
      expect(typeof firstBoqRow[6]).toBe('number'); // Actual ZAR
      expect(typeof firstBoqRow[7]).toBe('number'); // Variance ZAR
    }

    // Sheet 4: Paper Rights & Approvals — 6 statutory milestones
    const ws4 = wb.Sheets['Paper Rights & Approvals'];
    const s4Rows = XLSX.utils.sheet_to_json<(string | number)[]>(ws4, { header: 1 });
    const appHeaderIdx = s4Rows.findIndex((r) => r[0] === 'Stage');
    expect(appHeaderIdx).toBeGreaterThanOrEqual(2);
    const milestoneRows = s4Rows.slice(appHeaderIdx + 1);
    expect(milestoneRows).toHaveLength(6);
    expect(milestoneRows.some((r) => String(r[1]).includes('SPLUMA Section 42'))).toBe(true);

    // Sheet 5: Team Comments & Action Ledger — seeded comment statuses preserved
    const ws5 = wb.Sheets['Team Comments & Action Ledger'];
    const s5Rows = XLSX.utils.sheet_to_json<(string | number)[]>(ws5, { header: 1 });
    expect(s5Rows[0]).toEqual([
      'Comment ID',
      'Date',
      'Author Name',
      'Role',
      'Section Tag',
      'Comment / Action Note',
      'Status',
      'Resolved Date',
    ]);
    expect(s5Rows).toHaveLength(4); // header + 3 dev-1 comments
    const statuses = s5Rows.slice(1).map((r) => r[6]).sort();
    expect(statuses).toEqual(['In Progress', 'Pending', 'Resolved']);
  });

  it('handles projects with empty commentsLedger cleanly on Sheet 5', () => {
    const devEmptyComments: DevelopmentProject = {
      ...dev1,
      commentsLedger: [],
    };
    const wb = buildDevelopmentProjectWorkbook(XLSX, devEmptyComments, summary1);
    const s5Rows = XLSX.utils.sheet_to_json<(string | number)[]>(
      wb.Sheets['Team Comments & Action Ledger'],
      { header: 1 }
    );
    expect(s5Rows).toHaveLength(1);
    expect(s5Rows[0][0]).toBe('Comment ID');
  });

  it('calls XLSX.writeFile with canonical moremela-dev-<slug>-team-pack-YYYY-MM-DD.xlsx filename', async () => {
    await exportDevelopmentProjectToExcel(dev1, summary1);
    expect(writeFileMock).toHaveBeenCalledTimes(1);
    const [, passedFileName] = writeFileMock.mock.calls[0];
    const expectedDate = formatLocalExportDate();
    expect(passedFileName).toBe(
      `moremela-dev-ferndale-6-unit-cluster-subdivision-team-pack-${expectedDate}.xlsx`
    );
  });

  it('round-trips a real binary .xlsx buffer via SheetJS preserving all 5 sheets and numeric ZAR types, and applies customNodeBenchmarks & BOQ fallbacks', () => {
    const devWithUncomputedBoq: DevelopmentProject = {
      ...dev1,
      boqItems: [
        {
          id: 'boq-raw-1',
          category: 'Electrical & Lighting',
          itemDescription: 'Sub-station cabling & DB boards',
          unit: 'units',
          quantity: 6,
          baselineUnitCostZAR: 15000,
          baselineTotalZAR: undefined as unknown as number,
          actualCostZAR: 98000,
          varianceZAR: undefined as unknown as number,
          supplierOrContractor: 'Spark Electrical',
          status: 'In Progress',
        },
      ],
    };

    const customBenchmarks = {
      randburg_ferndale_blairgowrie: {
        pricePerSqmRangeZAR: [12000, 14000] as [number, number],
      },
    };
    const wb = buildDevelopmentProjectWorkbook(
      XLSX,
      devWithUncomputedBoq,
      summary1,
      customBenchmarks,
      'Moremela Custom Sponsor (Pty) Ltd'
    );

    const binaryBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    expect(binaryBuffer.byteLength).toBeGreaterThan(2000);

    const parsedWb = XLSX.read(binaryBuffer, { type: 'buffer' });
    expect(parsedWb.SheetNames).toEqual([
      'Executive & Capital Stack',
      'Unit Inventory & Split-Exit',
      'Cost Stack & Hard Build BOQ',
      'Paper Rights & Approvals',
      'Team Comments & Action Ledger',
    ]);

    const parsedWs3 = parsedWb.Sheets['Cost Stack & Hard Build BOQ'];
    const parsedS3Rows = XLSX.utils.sheet_to_json<(string | number)[]>(parsedWs3, { header: 1 });
    const boqRow = parsedS3Rows.find((r) => r[0] === 'Electrical & Lighting');
    expect(boqRow).toBeDefined();
    expect(boqRow![5]).toBe(90000); // 6 * 15000 fallback
    expect(boqRow![6]).toBe(98000);
    expect(boqRow![7]).toBe(8000); // 98000 - 90000 fallback

    const parsedWs1 = parsedWb.Sheets['Executive & Capital Stack'];
    const parsedS1Rows = XLSX.utils.sheet_to_json<(string | number)[]>(parsedWs1, { header: 1 });
    const ceilingRow = parsedS1Rows.find((r) => r[0] === 'Suburb End-User Bond Ceiling (ZAR)');
    expect(typeof ceilingRow![1]).toBe('number');
    // 65m2 * 14000 * 1.15 = 1,046,500
    expect(ceilingRow![1]).toBe(1046500);

    const pillar4Row = parsedS1Rows.find((r) => r[0] === 'Pillar 4: Delivery Track Record');
    expect(String(pillar4Row![2])).toContain('Moremela Custom Sponsor (Pty) Ltd');
  });
});
