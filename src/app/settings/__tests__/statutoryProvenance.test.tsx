import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { LSSA_FEE_GUIDELINE_2026_07 } from '@/lib/calculations/sarsTax';

describe('Settings Statutory Provenance Stamp', () => {
  it('derives the LSSA effective date label directly from LSSA_FEE_GUIDELINE_2026_07 in sarsTax.ts', () => {
    expect(LSSA_FEE_GUIDELINE_2026_07.effectiveFrom).toBe('2026-07-01');

    const settingsSource = fs.readFileSync(
      path.resolve(__dirname, '../page.tsx'),
      'utf-8'
    );

    expect(settingsSource).toContain("import { LSSA_FEE_GUIDELINE_2026_07 } from '@/lib/calculations/sarsTax';");
    expect(settingsSource).toContain('const ACTIVE_LSSA_GUIDELINE_LABEL = formatEffectiveMonthYear(LSSA_FEE_GUIDELINE_2026_07.effectiveFrom);');
    expect(settingsSource).toContain('data-testid="settings-statutory-provenance"');
    expect(settingsSource).toContain(
      'Statutory schedules active: SARS Transfer Duty (2026/27) • LSSA Conveyancing Guideline ({ACTIVE_LSSA_GUIDELINE_LABEL})'
    );
  });
});
