import { FlipProject, BOQItem, FundingSource } from '@/types';

export interface FlipFinancialSummary {
  totalBOQBaselineZAR: number;
  totalBOQActualZAR: number;
  totalBOQVarianceZAR: number;
  effectiveRenoCostZAR: number;

  flipHoldingMonths: number;
  flipMonthlyHoldingCostZAR: number;
  totalHoldingCostZAR: number;

  totalCostBasisZAR: number;

  sec118ArrearsZAR: number;
  advanceCouncilDepositZAR: number;
  totalMunicipalClearanceOutlayZAR: number;
  rccStatus: string;
  isRccDisputed: boolean;

  exitCommissionPercent: number;
  exitCommissionZAR: number;

  totalAllInCostZAR: number;
  projectedNetProfitZAR: number;
  projectedRoiPercent: number;

  taxEntityType: 'Company (27%)' | 'Individual (45%)' | 'Pre-Tax';
  effectiveTaxRatePercent: number;
  estimatedTaxProvisionZAR: number;
  netProfitAfterTaxZAR: number;
  afterTaxRoiPercent: number;

  totalSponsorItemsCount: number;
  sponsorRetailTotalZAR: number;
  sponsorCashTotalZAR: number;
  totalSponsorSavingsZAR: number;
  totalRetailBOQZAR: number;
  totalActualCashBOQZAR: number;

  milestoneDraws: {
    deposit: number;
    firstFix: number;
    finishes: number;
    retention: number;
  };
  milestoneTargets: MilestonePhaseTargets;
  totalRetentionHeldZAR: number;
}

export interface MilestonePhaseTargets {
  deposit: number;
  firstFix: number;
  finishes: number;
  retention: number;
}

export interface FundingCampaignSummary {
  fundingRequiredZAR: number;
  capitalRaisedZAR: number;
  capitalRemainingZAR: number;
  fundingProgressPercent: number;
  totalCapitalSecuredZAR: number;
  isFullyFunded: boolean;
}

export interface ArchivedFlipFinancials {
  fullCostBasisZAR: number;
  realizedSalePriceZAR: number;
  realizedNetProfitZAR: number;
  realizedRoiPercent: number;
  brrrrTargetValuationZAR: number;
  brrrrEquityCreatedZAR: number;
}

/**
 * Calculates standardized contractor milestone drawdown target allocations based on
 * the baseline renovation budget:
 * - Phase 1: Deposit (20%) - Mobilization, prep & materials
 * - Phase 2: First Fix (30%) - Wet works, plumbing rough-in, electrical conduit
 * - Phase 3: Finishes (30%) - Tiling, joinery, sanitaryware, ceilings, paint
 * - Phase 4: Retention (20%) - Snag list completion, CoC delivery & handover
 */
export function calculateMilestonePhaseTargets(
  baselineRenovationBudgetZAR: number = 0
): MilestonePhaseTargets {
  const budget = Math.max(0, baselineRenovationBudgetZAR || 0);
  return {
    deposit: Math.round(budget * 0.20),
    firstFix: Math.round(budget * 0.30),
    finishes: Math.round(budget * 0.30),
    retention: Math.round(budget * 0.20),
  };
}

/**
 * Pure calculation of comprehensive financial metrics for an active Flip project.
 * Extracted from lines 517–593 of src/app/flips/page.tsx.
 */
export function calculateFlipFinancials(flip?: FlipProject | null): FlipFinancialSummary {
  if (!flip) {
    return {
      totalBOQBaselineZAR: 0,
      totalBOQActualZAR: 0,
      totalBOQVarianceZAR: 0,
      effectiveRenoCostZAR: 0,
      flipHoldingMonths: 6,
      flipMonthlyHoldingCostZAR: 0,
      totalHoldingCostZAR: 0,
      totalCostBasisZAR: 0,
      sec118ArrearsZAR: 0,
      advanceCouncilDepositZAR: 0,
      totalMunicipalClearanceOutlayZAR: 0,
      rccStatus: 'Pending Application',
      isRccDisputed: false,
      exitCommissionPercent: 5.75,
      exitCommissionZAR: 0,
      totalAllInCostZAR: 0,
      projectedNetProfitZAR: 0,
      projectedRoiPercent: 0,
      taxEntityType: 'Company (27%)',
      effectiveTaxRatePercent: 27,
      estimatedTaxProvisionZAR: 0,
      netProfitAfterTaxZAR: 0,
      afterTaxRoiPercent: 0,
      totalSponsorItemsCount: 0,
      sponsorRetailTotalZAR: 0,
      sponsorCashTotalZAR: 0,
      totalSponsorSavingsZAR: 0,
      totalRetailBOQZAR: 0,
      totalActualCashBOQZAR: 0,
      milestoneDraws: { deposit: 0, firstFix: 0, finishes: 0, retention: 0 },
      milestoneTargets: { deposit: 0, firstFix: 0, finishes: 0, retention: 0 },
      totalRetentionHeldZAR: 0,
    };
  }

  const boq = flip.boq || [];
  const totalBOQBaselineZAR = boq.reduce((s, i) => s + (i.baselineTotalZAR || 0), 0);
  const totalBOQActualZAR = boq.reduce((s, i) => s + (i.actualCostZAR || i.baselineTotalZAR || 0), 0);
  const totalBOQVarianceZAR = totalBOQActualZAR - totalBOQBaselineZAR;

  const effectiveRenoCostZAR = totalBOQActualZAR > 0 ? totalBOQActualZAR : (flip.baselineRenovationBudgetZAR || 0);

  const flipHoldingMonths = flip.estimatedDurationMonths ?? 6;
  const flipMonthlyHoldingCostZAR = flip.monthlyHoldingCostZAR ?? 0;
  const totalHoldingCostZAR = flipHoldingMonths * flipMonthlyHoldingCostZAR;

  const totalCostBasisZAR = (flip.purchasePriceZAR || 0) + (flip.acquisitionCostsZAR || 0) + effectiveRenoCostZAR;

  const sec118ArrearsZAR = flip.municipalClearance?.sec118ArrearsZAR || 0;
  const advanceCouncilDepositZAR = flip.municipalClearance?.advanceCouncilDepositZAR || 0;
  const totalMunicipalClearanceOutlayZAR = sec118ArrearsZAR + advanceCouncilDepositZAR;
  const rccStatus = flip.municipalClearance?.rccStatus || 'Pending Application';
  const isRccDisputed = rccStatus === 'Disputed';

  const exitCommissionPercent = flip.exitCommissionPercent ?? 5.75;
  const exitCommissionZAR = Math.round((flip.targetExitPriceZAR || 0) * (exitCommissionPercent / 100));

  const totalAllInCostZAR = totalCostBasisZAR + totalHoldingCostZAR + totalMunicipalClearanceOutlayZAR + exitCommissionZAR;
  const projectedNetProfitZAR = (flip.targetExitPriceZAR || 0) - totalAllInCostZAR;
  const projectedRoiPercent = totalAllInCostZAR > 0 ? (projectedNetProfitZAR / totalAllInCostZAR) * 100 : 0;

  const taxEntityType = flip.taxEntityType || 'Company (27%)';
  const effectiveTaxRatePercent = taxEntityType === 'Company (27%)' ? 27 : taxEntityType === 'Individual (45%)' ? 45 : 0;
  const estimatedTaxProvisionZAR = Math.max(0, Math.round(projectedNetProfitZAR * (effectiveTaxRatePercent / 100)));
  const netProfitAfterTaxZAR = projectedNetProfitZAR - estimatedTaxProvisionZAR;
  const afterTaxRoiPercent = totalAllInCostZAR > 0 ? (netProfitAfterTaxZAR / totalAllInCostZAR) * 100 : 0;

  const sponsoredItems = boq.filter((i) => i.isSponsoredOrBarter);
  const totalSponsorItemsCount = sponsoredItems.length;
  const sponsorRetailTotalZAR = sponsoredItems.reduce((s, i) => s + (i.commercialRetailValueZAR || i.baselineTotalZAR || 0), 0);
  const sponsorCashTotalZAR = sponsoredItems.reduce((s, i) => s + (i.actualCashOutflowZAR !== undefined ? i.actualCashOutflowZAR : (i.actualCostZAR || i.baselineTotalZAR || 0)), 0);
  const totalSponsorSavingsZAR = Math.max(0, sponsorRetailTotalZAR - sponsorCashTotalZAR);
  const totalRetailBOQZAR = boq.reduce((s, i) => {
    if (i.isSponsoredOrBarter) return s + (i.commercialRetailValueZAR || i.baselineTotalZAR || 0);
    return s + (i.actualCostZAR || i.baselineTotalZAR || 0);
  }, 0);
  const totalActualCashBOQZAR = totalBOQActualZAR;

  // Milestone Drawdown Allocations & Retention Pool (matching src/app/flips/page.tsx:574–592)
  const milestoneDraws = {
    deposit: boq.filter((i) => i.milestonePhase === 'Deposit').reduce((s, i) => s + (i.actualCostZAR || i.baselineTotalZAR || 0), 0),
    firstFix: boq.filter((i) => i.milestonePhase === 'First Fix / Wet Works').reduce((s, i) => s + (i.actualCostZAR || i.baselineTotalZAR || 0), 0),
    finishes: boq.filter((i) => i.milestonePhase === 'Finishes').reduce((s, i) => s + (i.actualCostZAR || i.baselineTotalZAR || 0), 0),
    retention: boq.filter((i) => i.milestonePhase === 'Retention').reduce((s, i) => s + (i.actualCostZAR || i.baselineTotalZAR || 0), 0),
  };
  const milestoneTargets = calculateMilestonePhaseTargets(flip.baselineRenovationBudgetZAR || 0);
  const totalRetentionHeldZAR = boq.reduce((s, i) => {
    if (i.milestonePhase === 'Retention') return s + (i.actualCostZAR || i.baselineTotalZAR || 0);
    if (i.retentionPercent && i.retentionPercent > 0) {
      return s + Math.round((i.actualCostZAR || i.baselineTotalZAR || 0) * (i.retentionPercent / 100));
    }
    return s;
  }, 0) || Math.round(totalBOQActualZAR * 0.2);

  return {
    totalBOQBaselineZAR,
    totalBOQActualZAR,
    totalBOQVarianceZAR,
    effectiveRenoCostZAR,
    flipHoldingMonths,
    flipMonthlyHoldingCostZAR,
    totalHoldingCostZAR,
    totalCostBasisZAR,
    sec118ArrearsZAR,
    advanceCouncilDepositZAR,
    totalMunicipalClearanceOutlayZAR,
    rccStatus,
    isRccDisputed,
    exitCommissionPercent,
    exitCommissionZAR,
    totalAllInCostZAR,
    projectedNetProfitZAR,
    projectedRoiPercent,
    taxEntityType,
    effectiveTaxRatePercent,
    estimatedTaxProvisionZAR,
    netProfitAfterTaxZAR,
    afterTaxRoiPercent,
    totalSponsorItemsCount,
    sponsorRetailTotalZAR,
    sponsorCashTotalZAR,
    totalSponsorSavingsZAR,
    totalRetailBOQZAR,
    totalActualCashBOQZAR,
    milestoneDraws,
    milestoneTargets,
    totalRetentionHeldZAR,
  };
}

/**
 * Computes funding campaign progress and targets against linked debt tranches.
 * Operates on flat fields of FlipProject from src/types/index.ts (lines 304–305)
 * matching src/app/flips/page.tsx:637–641.
 */
export function calculateFundingCampaignSummary(
  flip: FlipProject | null | undefined,
  linkedFunding: FundingSource[] = [],
  totalCostBasisZAR: number = 0
): FundingCampaignSummary {
  const fundingList = linkedFunding || [];
  const totalCapitalSecuredZAR = fundingList.reduce((s, f) => s + (f?.capitalAmountZAR || 0), 0);
  const fundingRequiredZAR = flip?.fundingRequiredZAR ?? Math.round((totalCostBasisZAR || 0) * 0.70);
  const capitalRaisedZAR = flip?.capitalRaisedZAR ?? totalCapitalSecuredZAR;
  const capitalRemainingZAR = Math.max(0, fundingRequiredZAR - capitalRaisedZAR);
  const fundingProgressPercent = fundingRequiredZAR > 0 ? Math.min(100, Math.round((capitalRaisedZAR / fundingRequiredZAR) * 100)) : 0;
  const isFullyFunded = capitalRaisedZAR >= fundingRequiredZAR;

  return {
    fundingRequiredZAR,
    capitalRaisedZAR,
    capitalRemainingZAR,
    fundingProgressPercent,
    totalCapitalSecuredZAR,
    isFullyFunded,
  };
}

/**
 * Computes historical realized economics for an archived flip (Sold or BRRRR).
 * Operates on flat fields of FlipProject from src/types/index.ts (lines 314–320)
 * matching src/app/flips/page.tsx:1847–1870.
 */
export function calculateArchivedFlipFinancials(flip?: FlipProject | null): ArchivedFlipFinancials {
  if (!flip) {
    return {
      fullCostBasisZAR: 0,
      realizedSalePriceZAR: 0,
      realizedNetProfitZAR: 0,
      realizedRoiPercent: 0,
      brrrrTargetValuationZAR: 0,
      brrrrEquityCreatedZAR: 0,
    };
  }

  const isBrrrr = flip.exitStrategy === 'BRRRR';
  const totalBoqActual = (flip.boq || []).reduce(
    (sum, b) => sum + (b?.actualCostZAR || b?.baselineTotalZAR || 0),
    0
  );
  const renoCost = totalBoqActual > 0 ? totalBoqActual : (flip.baselineRenovationBudgetZAR || 0);
  const costBasis =
    (flip.purchasePriceZAR || 0) +
    (flip.acquisitionCostsZAR || 0) +
    renoCost;
  const holdingMonths = flip.estimatedDurationMonths ?? 6;
  const totalHoldingCost = holdingMonths * (flip.monthlyHoldingCostZAR ?? 0);
  const sec118Cost =
    (flip.municipalClearance?.sec118ArrearsZAR || 0) +
    (flip.municipalClearance?.advanceCouncilDepositZAR || 0);
  const salePrice = flip.actualSalePriceZAR ?? (flip.targetExitPriceZAR || 0);
  const exitCommRate = typeof flip.exitCommissionPercent === 'number' ? flip.exitCommissionPercent : 5.75;
  const exitCommission = isBrrrr ? 0 : Math.round(salePrice * (exitCommRate / 100));
  const fullCostBasisZAR = costBasis + totalHoldingCost + sec118Cost + exitCommission;
  const realizedNetProfitZAR = salePrice - fullCostBasisZAR;
  const realizedRoiPercent = fullCostBasisZAR > 0 ? (realizedNetProfitZAR / fullCostBasisZAR) * 100 : 0;
  const brrrrTargetValuationZAR = flip.targetExitPriceZAR || fullCostBasisZAR;
  const brrrrEquityCreatedZAR = Math.max(0, brrrrTargetValuationZAR - fullCostBasisZAR);

  return {
    fullCostBasisZAR,
    realizedSalePriceZAR: salePrice,
    realizedNetProfitZAR,
    realizedRoiPercent,
    brrrrTargetValuationZAR,
    brrrrEquityCreatedZAR,
  };
}
