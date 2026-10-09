import { useMemo } from 'react';
import { FlipProject, FundingSource } from '@/types';
import {
  calculateFlipFinancials,
  calculateFundingCampaignSummary,
  calculateMilestonePhaseTargets,
  FlipFinancialSummary,
  FundingCampaignSummary,
  MilestonePhaseTargets,
} from '@/lib/calculations/flips';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';

export interface UseFlipCalculationsReturn {
  financials: FlipFinancialSummary | null;
  fundingSummary: FundingCampaignSummary | null;
  milestoneTargets: MilestonePhaseTargets;
}

export function useFlipCalculations(
  activeFlip: FlipProject | null,
  fundingProp?: FundingSource[]
): UseFlipCalculationsReturn {
  const storeFunding = usePortfolioStore((state) => state.funding);
  const funding = fundingProp ?? storeFunding;

  return useMemo(() => {
    if (!activeFlip) {
      return {
        financials: null,
        fundingSummary: null,
        milestoneTargets: { deposit: 0, firstFix: 0, finishes: 0, retention: 0 },
      };
    }

    const financials = calculateFlipFinancials(activeFlip);

    const linkedFunding = funding.filter(
      (f) => f.linkedDealId === activeFlip.id || (activeFlip.linkedFundingIds || []).includes(f.id)
    );

    const fundingSummary = calculateFundingCampaignSummary(
      activeFlip,
      linkedFunding,
      financials.totalCostBasisZAR
    );

    const milestoneTargets =
      financials.milestoneTargets ||
      calculateMilestonePhaseTargets(activeFlip.baselineRenovationBudgetZAR);

    return {
      financials,
      fundingSummary,
      milestoneTargets,
    };
  }, [activeFlip, funding]);
}
