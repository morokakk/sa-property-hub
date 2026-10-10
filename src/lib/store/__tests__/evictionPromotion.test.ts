import { describe, it, expect, beforeEach } from 'vitest';
import { usePortfolioStore } from '../usePortfolioStore';
import { OpportunityDeal } from '@/types';
import { isEvictionActive } from '@/lib/calculations/occupantRisk';

describe('PIE Act Eviction Risk - Opportunity to Flip Promotion & Possession Flow', () => {
  beforeEach(() => {
    usePortfolioStore.getState().resetToDemoData();
  });

  it('promotes vacant opportunity without eviction cost penalty or completion shift', () => {
    const oppId = 'opp-vacant-promote';
    const sampleDeal = usePortfolioStore.getState().opportunities[0];
    const testDeal: OpportunityDeal = {
      ...sampleDeal,
      id: oppId,
      title: 'Vacant Possession Property',
      holdingPeriodMonths: 6,
      costs: {
        ...sampleDeal.costs,
        totalAcquisitionCost: 1_100_000,
      },
      purchasePrice: 1_000_000,
      occupantRisk: {
        occupancyStatus: 'vacant',
        evictionRequired: false,
        evictionJurisdiction: 'none',
        estimatedEvictionDelayDays: 0,
        budgetedLegalEvictionCostZAR: 0,
        monthlySiteSecurityZAR: 0,
        totalEvictionCarryingCostZAR: 0,
      },
    };

    usePortfolioStore.getState().addOpportunity(testDeal);
    usePortfolioStore.getState().promoteOpportunityToFlip(oppId);

    const promotedFlip = usePortfolioStore.getState().flips[0];
    expect(promotedFlip.title).toBe('Vacant Possession Property (Flip)');
    // Standard acquisition costs = 1,100,000 - 1,000,000 = 100,000
    expect(promotedFlip.acquisitionCostsZAR).toBe(100_000);
    expect(promotedFlip.occupantRisk?.occupancyStatus).toBe('vacant');
    expect(isEvictionActive(promotedFlip.occupantRisk!)).toBe(false);
  });

  it('folds legal eviction reserve and shifts target completion date when promoting unlawful occupant deal', () => {
    const oppId = 'opp-unlawful-promote';
    const sampleDeal = usePortfolioStore.getState().opportunities[0];
    const testDeal: OpportunityDeal = {
      ...sampleDeal,
      id: oppId,
      title: 'Distressed Auction Foreclosure with Illegal Occupants',
      holdingPeriodMonths: 6,
      purchasePrice: 1_000_000,
      costs: {
        ...sampleDeal.costs,
        totalAcquisitionCost: 1_100_000, // base fees = 100,000
      },
      occupantRisk: {
        occupancyStatus: 'unlawful_occupant',
        evictionRequired: true,
        evictionJurisdiction: 'magistrates_court',
        estimatedEvictionDelayDays: 120,
        budgetedLegalEvictionCostZAR: 40_000,
        monthlySiteSecurityZAR: 2_500,
        totalEvictionCarryingCostZAR: 75_000,
      },
    };

    usePortfolioStore.getState().addOpportunity(testDeal);
    usePortfolioStore.getState().promoteOpportunityToFlip(oppId);

    const promotedFlip = usePortfolioStore.getState().flips[0];
    expect(promotedFlip.title).toBe('Distressed Auction Foreclosure with Illegal Occupants (Flip)');
    // Folded acquisition cost: 100,000 base + 40,000 legal reserve = 140,000
    expect(promotedFlip.acquisitionCostsZAR).toBe(140_000);
    expect(promotedFlip.occupantRisk?.budgetedLegalEvictionCostZAR).toBe(40_000);
    expect(promotedFlip.occupantRisk?.estimatedEvictionDelayDays).toBe(120);
    expect(isEvictionActive(promotedFlip.occupantRisk!)).toBe(true);
    expect(promotedFlip.notes).toContain('legal reserve for PIE Act eviction litigation (120d delay)');
    expect(promotedFlip.notes).toContain('40');

    // Target completion date includes the 120-day eviction horizon
    const baseHorizonMs = 6 * 30 * 24 * 60 * 60 * 1000;
    const evictionDelayMs = 120 * 24 * 60 * 60 * 1000;
    const expectedTargetPrefix = new Date(Date.now() + baseHorizonMs + evictionDelayMs).toISOString().split('T')[0];
    expect(promotedFlip.targetCompletionDate).toBe(expectedTargetPrefix);

    // Verifies an urgent eviction litigation task was created
    const tasks = usePortfolioStore.getState().tasks;
    const evictionTask = tasks.find((t) => t.title.includes('PIE Act Section 4(2) eviction'));
    expect(evictionTask).toBeDefined();
    expect(evictionTask?.priority).toBe('Urgent');
    expect(evictionTask?.description).toContain("Magistrate's Court");
  });

  it('transitions eviction status to vacant possession when marked obtained', () => {
    const oppId = 'opp-possession-flow';
    const sampleDeal = usePortfolioStore.getState().opportunities[0];
    const testDeal: OpportunityDeal = {
      ...sampleDeal,
      id: oppId,
      title: 'Foreclosure Property for Possession Transition',
      occupantRisk: {
        occupancyStatus: 'unlawful_occupant',
        evictionRequired: true,
        evictionJurisdiction: 'high_court',
        estimatedEvictionDelayDays: 240,
        budgetedLegalEvictionCostZAR: 85_000,
        monthlySiteSecurityZAR: 4_000,
        totalEvictionCarryingCostZAR: 150_000,
      },
    };

    usePortfolioStore.getState().addOpportunity(testDeal);
    usePortfolioStore.getState().promoteOpportunityToFlip(oppId);

    let flip = usePortfolioStore.getState().flips[0];
    expect(isEvictionActive(flip.occupantRisk!)).toBe(true);

    // Simulate clicking "Mark Vacant Possession Obtained"
    const today = new Date().toISOString().split('T')[0];
    usePortfolioStore.getState().updateFlip(flip.id, {
      occupantRisk: {
        ...flip.occupantRisk!,
        occupancyStatus: 'vacant',
        evictionRequired: false,
        possessionObtainedDate: today,
      },
    });

    flip = usePortfolioStore.getState().flips.find((f) => f.id === flip.id)!;
    expect(flip.occupantRisk?.occupancyStatus).toBe('vacant');
    expect(flip.occupantRisk?.possessionObtainedDate).toBe(today);
    expect(isEvictionActive(flip.occupantRisk!)).toBe(false);
  });
});
