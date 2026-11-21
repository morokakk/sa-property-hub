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
});
