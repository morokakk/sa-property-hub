import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  DevelopmentFeasibilitySection,
  mapDevelopmentToProposalDeal,
} from '../DevelopmentFeasibilitySection';
import { INITIAL_DEVELOPMENTS } from '@/lib/store/initialData';
import {
  calculateDevelopmentFinancials,
  calculateDevelopmentCapitalStack,
  calculateDevelopmentRiskGate,
  calculateDevelopmentDebtWipeoutMatrix,
} from '@/lib/calculations/developments';
import { formatZAR, formatPercent } from '@/lib/formatters';

describe('DevelopmentFeasibilitySection Component', () => {
  const dev1 = INITIAL_DEVELOPMENTS.find((d) => d.id === 'dev-1')!;
  const dev2 = INITIAL_DEVELOPMENTS.find((d) => d.id === 'dev-2')!;

  it('renders complete 3-part layout for dev-1 (Ferndale 6-Unit Cluster)', () => {
    const fin = calculateDevelopmentFinancials(dev1);
    const capitalStack = calculateDevelopmentCapitalStack(dev1, fin);
    const riskGate = calculateDevelopmentRiskGate(dev1, fin);
    const wipeoutMatrix = calculateDevelopmentDebtWipeoutMatrix(dev1, fin);

    const html = renderToString(
      <DevelopmentFeasibilitySection development={dev1} financials={fin} />
    );

    // Header & Badges
    expect(html).toContain('Development Feasibility &amp; Institutional Capital Stack');
    expect(html).toContain('Subdivision &amp; Cluster');
    expect(html).toContain('15% VAT Registered Developer (R0 Buyer Duty)');

    // Part 1: Institutional TDC vs GDV Capital Stack
    expect(html).toContain('Part 1: Institutional TDC vs GDV Capital Stack');
    expect(html).toContain(formatZAR(capitalStack.tdcZAR));
    expect(html).toContain(formatPercent(capitalStack.pocPercent));
    expect(html).toContain('Pre-Tax');
    expect(html).toContain('Land Purchase &amp; Direct Acquisition');
    expect(html).toContain('Professional Team Fees &amp; Municipal Bulk Contributions');
    expect(html).toContain('Hard Construction Build Works');
    expect(html).toContain('Carrying Cost &amp; Holding Burn Reserve');
    expect(html).toContain('Contingency Buffer Reserve');

    // Part 2: 2-Stage Risk Gate Callout
    expect(html).toContain('Part 2: 2-Stage Risk Gate Callout');
    expect(html).toContain('Stage 1: Paper Rights &amp; Statutory Approvals');
    expect(html).toContain('Stage 2: Wet Works Draws &amp; Facility');
    expect(html).toContain(riskGate.stage1RingFenceLabel);
    expect(html).toContain(riskGate.stage2DrawLabel);
    expect(html).toContain(formatZAR(riskGate.facilityLimitZAR));
    expect(html).toContain(formatZAR(riskGate.facilityDrawnZAR));

    // Part 3: Debt Wipeout & Pre-Sales Breakeven Matrix
    expect(html).toContain('Part 3: Debt Wipeout &amp; Pre-Sales Breakeven Matrix');
    expect(html).toContain('Units for 100% Debt Wipeout');
    expect(html).toContain(String(wipeoutMatrix.unitsRequiredForDebtWipeout));
    expect(html).toContain(String(wipeoutMatrix.totalUnitsCount));
    expect(html).toContain('Unencumbered Units');
    expect(html).toContain(String(wipeoutMatrix.unencumberedUnitsCount));
    expect(html).toContain('Unit Inventory Waterfall Allocation');
    expect(html).toContain('Hybrid Split-Exit &amp; SARS Section 13sex Tax Shield');
  });

  it('renders SARS Section 13sex active tax shield for dev-2 (10-Unit Micro-Apartments)', () => {
    const fin = calculateDevelopmentFinancials(dev2);
    const wipeoutMatrix = calculateDevelopmentDebtWipeoutMatrix(dev2, fin);

    expect(wipeoutMatrix.isSection13SexEligible).toBe(true);

    const html = renderToString(
      <DevelopmentFeasibilitySection development={dev2} financials={fin} />
    );

    expect(html).toContain('SARS Section 13sex 55% Residential Building Tax Shield (Active &amp; Unlocked)');
    expect(html).toContain(formatZAR(wipeoutMatrix.section13sexDeductionBaseZAR));
    expect(html).toContain(formatZAR(wipeoutMatrix.section13sexAnnualAllowanceZAR));
    expect(html).toContain(formatZAR(wipeoutMatrix.section13sexTwentyYearSavingsZAR));
  });

  it('includes data-sensitive and print-friendly CSS classes', () => {
    const html = renderToString(<DevelopmentFeasibilitySection development={dev1} />);
    expect(html).toContain('data-sensitive="true"');
    expect(html).toContain('print:border-slate-300');
    expect(html).toContain('break-inside-avoid');
    expect(html).toContain('print:break-inside-avoid');
  });

  it('mapDevelopmentToProposalDeal correctly maps DevelopmentProject to allDeals shape', () => {
    const mapped = mapDevelopmentToProposalDeal(dev1);

    expect(mapped.id).toBe('dev-1');
    expect(mapped.type).toBe('development');
    expect(mapped.title).toBe(dev1.title);
    expect(mapped.city).toBe('Johannesburg');
    expect(mapped.purchasePrice).toBe(dev1.landPurchasePriceZAR);
    expect(mapped.strategy).toBe('Flip');
    expect(mapped.holdingDurationMonths).toBe(dev1.preApprovalMonths + dev1.constructionMonths + dev1.sellDownMonths);
    expect(mapped.rawDevelopment).toBe(dev1);
    expect(mapped.developmentFinancials).toBeDefined();
    expect(mapped.securityOffered).toBe('1st Covering Mortgage Bond over Land & Works');
  });

  it('mapDevelopmentToProposalDeal marks strategy as Rental when all units are retained', () => {
    const mapped = mapDevelopmentToProposalDeal(dev2);
    expect(mapped.strategy).toBe('Rental');
    expect(mapped.isSection13Eligible).toBe(true);
  });
});
