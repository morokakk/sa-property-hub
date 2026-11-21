import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import ConsolidatedTaxCard from '../ConsolidatedTaxCard';
import ActualVsBudgetKpiStrip from '../ActualVsBudgetKpiStrip';
import { INITIAL_RENTALS } from '@/lib/store/initialData';
import type { PortfolioSummary } from '@/types';

const FORBIDDEN_LINE_ITEM_CODES_RE = /Code\s*421[2468]|Code\s*422[0246]/;

const mockSummary: PortfolioSummary = {
  totalGrossAssetValue: 10_000_000,
  totalRentalValue: 10_000_000,
  totalFlipValue: 0,
  liquidCapitalReserve: 500_000,
  ringFencedWorkingCapital: 0,
  freeUnallocatedCash: 500_000,
  unallocatedFundingReserve: 0,
  deployableWarChest: 500_000,
  totalAvailablePurchasingPower: 500_000,
  totalFundingLiabilities: 3_000_000,
  totalPrivateFundingLiability: 0,
  totalBondLiabilities: 3_000_000,
  netEquity: 7_000_000,
  monthlyNetRentalCashflow: 25_000,
  totalProjectedFlipProfits: 0,
  totalGrossProjectedFlipProfits: 0,
  totalSarsFlipTaxReserve: 0,
  totalSarsRentalTaxReserve: 81_000,
  totalSarsProvisionalTaxReserve: 81_000,
  totalNetProjectedFlipProfits: 0,
  totalRealizedFlipProfits: 0,
  activeRentalsCount: 1,
  soldRentalsCount: 0,
  activeFlipsCount: 0,
  completedFlipsCount: 0,
  pendingOpportunitiesCount: 0,
  annualRentalTaxReserve: 81_000,
  monthlyRentalTaxReserve: 6_750,
  equityAlerts: [],
};

describe('Dashboard Tax Components (Entity-Neutral Section 11(a) Labels)', () => {
  it('renders entity-neutral Section 11(a) bond interest copy and tooltip on ConsolidatedTaxCard', () => {
    const html = renderToString(
      <ConsolidatedTaxCard summary={mockSummary} rentals={[INITIAL_RENTALS[0]]} />
    );

    expect(html).toContain('Sec 11(a) Deductible Bond Interest:');
    expect(html).toContain('Rental Tax Shield');
    expect(html).toContain(
      'Reflects interest-only bond deduction under SARS Section 11(a); capital repayments are excluded.'
    );
    expect(html).not.toMatch(FORBIDDEN_LINE_ITEM_CODES_RE);
  });

  it('renders entity-neutral Section 11(a) labels in collapsed and expanded ActualVsBudgetKpiStrip states', () => {
    const collapsedHtml = renderToString(
      <ActualVsBudgetKpiStrip rentals={[INITIAL_RENTALS[0]]} collapsible defaultCollapsed />
    );
    expect(collapsedHtml).toContain('Sec 11(a) Rental Tax Shield:');
    expect(collapsedHtml).not.toMatch(FORBIDDEN_LINE_ITEM_CODES_RE);

    const expandedHtml = renderToString(
      <ActualVsBudgetKpiStrip rentals={[INITIAL_RENTALS[0]]} />
    );
    expect(expandedHtml).toContain('Section 11(a) Interest');
    expect(expandedHtml).toContain('SARS Shield Active');
    expect(expandedHtml).not.toMatch(FORBIDDEN_LINE_ITEM_CODES_RE);
  });
});
