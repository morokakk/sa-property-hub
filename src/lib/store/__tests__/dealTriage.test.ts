import { describe, it, expect, beforeEach } from 'vitest';
import { usePortfolioStore } from '../usePortfolioStore';
import { OpportunityDeal } from '@/types';

describe('usePortfolioStore Deal Triage Actions', () => {
  beforeEach(() => {
    usePortfolioStore.getState().resetToDemoData();
  });

  it('advances opportunity stages in sequence: Screening -> Offer Submitted -> Due Diligence', () => {
    // Add a deal in 'Screening'
    const dealId = 'test-triage-1';
    const sampleDeal = usePortfolioStore.getState().opportunities[0];
    const testDeal: OpportunityDeal = {
      ...sampleDeal,
      id: dealId,
      title: 'Triage Stage Test Property',
      status: 'Screening',
    };
    usePortfolioStore.getState().addOpportunity(testDeal);

    let current = usePortfolioStore.getState().opportunities.find((o) => o.id === dealId);
    expect(current?.status).toBe('Screening');

    // 1. Advance to Offer Submitted
    usePortfolioStore.getState().advanceOpportunityStage(dealId);
    current = usePortfolioStore.getState().opportunities.find((o) => o.id === dealId);
    expect(current?.status).toBe('Offer Submitted');

    // 2. Advance to Due Diligence
    usePortfolioStore.getState().advanceOpportunityStage(dealId);
    current = usePortfolioStore.getState().opportunities.find((o) => o.id === dealId);
    expect(current?.status).toBe('Due Diligence');

    // 3. Advancing past Due Diligence should do nothing (stops at DD before conversion)
    usePortfolioStore.getState().advanceOpportunityStage(dealId);
    current = usePortfolioStore.getState().opportunities.find((o) => o.id === dealId);
    expect(current?.status).toBe('Due Diligence');
  });

  it('passes a deal with reason and optional notes', () => {
    const dealId = 'test-pass-deal';
    const sampleDeal = usePortfolioStore.getState().opportunities[0];
    const testDeal: OpportunityDeal = {
      ...sampleDeal,
      id: dealId,
      title: 'High Arrears Deal',
      status: 'Screening',
    };
    usePortfolioStore.getState().addOpportunity(testDeal);

    usePortfolioStore.getState().passOpportunity(dealId, 'High Arrears / Municipal Risk', 'Section 118 clearance exceeds R200k');

    const passed = usePortfolioStore.getState().opportunities.find((o) => o.id === dealId);
    expect(passed?.status).toBe('Passed');
    expect(passed?.passReason).toBe('High Arrears / Municipal Risk');
    expect(passed?.passNotes).toBe('Section 118 clearance exceeds R200k');
    expect(passed?.passedAt).toBeDefined();
  });

  it('reactivates a passed deal back to Screening and clears pass fields', () => {
    const dealId = 'test-reactivate-deal';
    const sampleDeal = usePortfolioStore.getState().opportunities[0];
    const testDeal: OpportunityDeal = {
      ...sampleDeal,
      id: dealId,
      title: 'Reactivated Deal',
      status: 'Screening',
    };
    usePortfolioStore.getState().addOpportunity(testDeal);

    usePortfolioStore.getState().passOpportunity(dealId, 'Seller Countered Above MAO', 'Seller wanted R2.5M, max was R2.1M');
    let deal = usePortfolioStore.getState().opportunities.find((o) => o.id === dealId);
    expect(deal?.status).toBe('Passed');

    // Now seller comes back: reactivate
    usePortfolioStore.getState().reactivateOpportunity(dealId);
    deal = usePortfolioStore.getState().opportunities.find((o) => o.id === dealId);
    expect(deal?.status).toBe('Screening');
    expect(deal?.passReason).toBeUndefined();
    expect(deal?.passNotes).toBeUndefined();
    expect(deal?.passedAt).toBeUndefined();
  });
});
