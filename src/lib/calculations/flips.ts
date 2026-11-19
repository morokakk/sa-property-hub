import { FlipProject, BOQItem, FundingSource, FundingTranche } from '@/types';

export interface FlipFinancialSummary {
  totalBOQBaselineZAR: number;
  totalBOQActualZAR: number;
  totalBOQVarianceZAR: number;
  effectiveRenoCostZAR: number;

  flipHoldingMonths: number;
  flipMonthlyHoldingCostZAR: number;
  totalHoldingCostZAR: number;

  totalCostBasisZAR: number;
  numberOfUnits: number;
  rehabCostPerUnitZAR: number;
  allInCostPerUnitZAR: number;
  isBuildToRent: boolean;

  sec118ArrearsZAR: number;
  advanceCouncilDepositZAR: number;
  totalMunicipalClearanceOutlayZAR: number;
  rccStatus: string;
  isRccDisputed: boolean;

  exitCommissionPercent: number;
  exitCommissionZAR: number;

  bondCancellationFeeZAR: number;
  earlyPenaltyZAR: number;
  totalExitLegalCostZAR: number;

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
  bondCancellationFeeZAR?: number;
  earlyTerminationPenaltyZAR?: number;
  exitLegalCostsZAR?: number;
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
export function calculateFlipFinancials(
  flip?: FlipProject | null,
  defaultBondCancellationFeeZAR: number = 5200
): FlipFinancialSummary {
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
      numberOfUnits: 1,
      rehabCostPerUnitZAR: 0,
      allInCostPerUnitZAR: 0,
      isBuildToRent: false,
      sec118ArrearsZAR: 0,
      advanceCouncilDepositZAR: 0,
      totalMunicipalClearanceOutlayZAR: 0,
      rccStatus: 'Pending Application',
      isRccDisputed: false,
      exitCommissionPercent: 5.75,
      exitCommissionZAR: 0,
      bondCancellationFeeZAR: 0,
      earlyPenaltyZAR: 0,
      totalExitLegalCostZAR: 0,
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
  const numberOfUnits = Math.max(1, flip.numberOfUnits || 1);
  const rehabCostPerUnitZAR = Math.round(effectiveRenoCostZAR / numberOfUnits);
  const isBuildToRent = flip.projectStrategy === 'build_to_rent';

  const sec118ArrearsZAR = flip.municipalClearance?.sec118ArrearsZAR || 0;
  const advanceCouncilDepositZAR = flip.municipalClearance?.advanceCouncilDepositZAR || 0;
  const totalMunicipalClearanceOutlayZAR = sec118ArrearsZAR + advanceCouncilDepositZAR;
  const rccStatus = flip.municipalClearance?.rccStatus || 'Pending Application';
  const isRccDisputed = rccStatus === 'Disputed';

  const exitCommissionPercent = isBuildToRent ? 0 : (flip.exitCommissionPercent ?? 5.75);
  const exitCommissionZAR = isBuildToRent
    ? 0
    : Math.round((flip.targetExitPriceZAR || 0) * (exitCommissionPercent / 100));

  // Active Bond Exit Costs: Bond Cancellation Legal Fee & 90-Day Early Termination Penalty
  // Zeroed out for build_to_rent projects since the investor is holding/refinancing, not cancelling upon sale.
  const hasBond = !isBuildToRent && (flip.monthlyBondPaymentZAR ?? 0) > 0;
  const bondCancellationFeeZAR = !hasBond
    ? 0
    : (flip.bondCancellationFeeZAR !== undefined && flip.bondCancellationFeeZAR !== null
        ? flip.bondCancellationFeeZAR
        : defaultBondCancellationFeeZAR);

  let earlyPenaltyZAR = 0;
  if (hasBond && flip.earlyTerminationNoticeGiven === false) {
    if (flip.earlyTerminationPenaltyZAR !== undefined && flip.earlyTerminationPenaltyZAR !== null) {
      earlyPenaltyZAR = Math.max(0, flip.earlyTerminationPenaltyZAR);
    } else {
      // 3 * monthly interim bond payment
      earlyPenaltyZAR = Math.round(3 * (flip.monthlyBondPaymentZAR ?? 0));
    }
  }
  const totalExitLegalCostZAR = bondCancellationFeeZAR + earlyPenaltyZAR;

  const totalAllInCostZAR =
    totalCostBasisZAR +
    totalHoldingCostZAR +
    totalMunicipalClearanceOutlayZAR +
    exitCommissionZAR +
    totalExitLegalCostZAR;
  const allInCostPerUnitZAR = Math.round(totalAllInCostZAR / numberOfUnits);
  const projectedNetProfitZAR = (flip.targetExitPriceZAR || 0) - totalAllInCostZAR;
  const projectedRoiPercent = totalAllInCostZAR > 0 ? (projectedNetProfitZAR / totalAllInCostZAR) * 100 : 0;

  const taxEntityType = flip.taxEntityType || 'Company (27%)';
  const effectiveTaxRatePercent = isBuildToRent
    ? 0
    : taxEntityType === 'Company (27%)'
      ? 27
      : taxEntityType === 'Individual (45%)'
        ? 45
        : 0;
  const estimatedTaxProvisionZAR = isBuildToRent
    ? 0
    : Math.max(0, Math.round(projectedNetProfitZAR * (effectiveTaxRatePercent / 100)));
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
    numberOfUnits,
    rehabCostPerUnitZAR,
    allInCostPerUnitZAR,
    isBuildToRent,
    sec118ArrearsZAR,
    advanceCouncilDepositZAR,
    totalMunicipalClearanceOutlayZAR,
    rccStatus,
    isRccDisputed,
    exitCommissionPercent,
    exitCommissionZAR,
    bondCancellationFeeZAR,
    earlyPenaltyZAR,
    totalExitLegalCostZAR,
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
export function calculateArchivedFlipFinancials(
  flip?: FlipProject | null,
  defaultBondCancellationFeeZAR: number = 5200
): ArchivedFlipFinancials {
  if (!flip) {
    return {
      fullCostBasisZAR: 0,
      realizedSalePriceZAR: 0,
      realizedNetProfitZAR: 0,
      realizedRoiPercent: 0,
      brrrrTargetValuationZAR: 0,
      brrrrEquityCreatedZAR: 0,
      bondCancellationFeeZAR: 0,
      earlyTerminationPenaltyZAR: 0,
      exitLegalCostsZAR: 0,
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

  // Point 1: Include bond cancellation and early penalty in archived cost basis to avoid profit jump
  const hasBond = (flip.monthlyBondPaymentZAR ?? 0) > 0;
  const bondCancellationFeeZAR = !hasBond
    ? 0
    : (flip.bondCancellationFeeZAR !== undefined && flip.bondCancellationFeeZAR !== null
        ? flip.bondCancellationFeeZAR
        : defaultBondCancellationFeeZAR);

  let earlyTerminationPenaltyZAR = 0;
  if (hasBond && flip.earlyTerminationNoticeGiven === false) {
    if (flip.earlyTerminationPenaltyZAR !== undefined && flip.earlyTerminationPenaltyZAR !== null) {
      earlyTerminationPenaltyZAR = Math.max(0, flip.earlyTerminationPenaltyZAR);
    } else {
      earlyTerminationPenaltyZAR = Math.round(3 * (flip.monthlyBondPaymentZAR ?? 0));
    }
  }

  const exitLegalCostsZAR = bondCancellationFeeZAR + earlyTerminationPenaltyZAR;
  const fullCostBasisZAR = costBasis + totalHoldingCost + sec118Cost + exitCommission + exitLegalCostsZAR;
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
    bondCancellationFeeZAR,
    earlyTerminationPenaltyZAR,
    exitLegalCostsZAR,
  };
}

/**
 * Pure calculation of ring-fenced project working capital across active flip projects:
 * Sum of active retention pools, committed pending contractor milestone draws (items in progress excluding retention),
 * and advance municipal council deposits.
 */
export function calculateRingFencedWorkingCapital(activeFlips: FlipProject[]): number {
  return (activeFlips || []).reduce((sum, f) => {
    const advanceCouncil = f.municipalClearance?.advanceCouncilDepositZAR || 0;
    const isRetentionReleased = f.drawSchedule?.retentionReleased === true;

    let retentionPool = 0;
    let pendingMilestoneDraws = 0;

    (f.boq || []).forEach((b) => {
      const itemCost = b.actualCostZAR || b.baselineTotalZAR || 0;
      const retentionPct = b.retentionPercent || 0;
      const retentionAmount = Math.round(itemCost * (retentionPct / 100));

      if (!isRetentionReleased && retentionAmount > 0) {
        if (b.status === 'Completed' || b.status === 'In Progress') {
          retentionPool += retentionAmount;
        }
      }

      if (b.status === 'In Progress') {
        // Committed contractor draw payable upon milestone sign-off (excluding retention portion)
        pendingMilestoneDraws += (itemCost - retentionAmount);
      }
    });

    return sum + advanceCouncil + retentionPool + pendingMilestoneDraws;
  }, 0);
}

export type BoqMilestonePhase = NonNullable<FundingTranche['linkedMilestonePhase']>;
export type DrawSchedulePhaseKey = keyof NonNullable<FlipProject['drawSchedule']>;

export const BOQ_MILESTONE_PHASE_CONFIG: ReadonlyArray<{
  phaseNumber: 1 | 2 | 3 | 4;
  phase: BoqMilestonePhase;
  drawScheduleKey: DrawSchedulePhaseKey;
  weightPercent: number;
  defaultLabel: string;
}> = [
  {
    phaseNumber: 1,
    phase: 'Deposit',
    drawScheduleKey: 'depositPaid',
    weightPercent: 20,
    defaultLabel: 'Phase 1: Deposit & Mobilization (20%)',
  },
  {
    phaseNumber: 2,
    phase: 'First Fix / Wet Works',
    drawScheduleKey: 'firstFixApproved',
    weightPercent: 30,
    defaultLabel: 'Phase 2: First Fix & Wet Works (30%)',
  },
  {
    phaseNumber: 3,
    phase: 'Finishes',
    drawScheduleKey: 'finishesApproved',
    weightPercent: 30,
    defaultLabel: 'Phase 3: Finishes & Tiling (30%)',
  },
  {
    phaseNumber: 4,
    phase: 'Retention',
    drawScheduleKey: 'retentionReleased',
    weightPercent: 20,
    defaultLabel: 'Phase 4: Snagging & Retention (20%)',
  },
];

export interface BuildFourPhaseBoqTranchesParams {
  totalAmountZAR: number;
  flip?: FlipProject | null;
  idPrefix?: string;
  existingTranches?: FundingTranche[];
}

/**
 * Builds 4 funding tranches aligned to the 4-phase BOQ milestone structure (20/30/30/20).
 * - If `flip` has phased BOQ items (`milestonePhase` totals > 0), uses the actual BOQ phase sums.
 * - Else if `flip.baselineRenovationBudgetZAR > 0`, splits the baseline budget 20/30/30/20.
 * - Else splits `totalAmountZAR` 20/30/30/20 (falling back to R 500,000 when unspecified).
 * Preserves existing disbursement state by `linkedMilestonePhase` when `existingTranches` is supplied,
 * and populates `verifiedPhysicalProgress` from `flip.drawSchedule` when linked to a Flip.
 */
export function buildFourPhaseBoqTranches({
  totalAmountZAR,
  flip,
  idPrefix = `tr-${Date.now()}`,
  existingTranches,
}: BuildFourPhaseBoqTranchesParams): FundingTranche[] {
  const split20303020 = (baseAmount: number): [number, number, number, number] => {
    const safeBase = Math.max(0, Math.round(Number.isFinite(baseAmount) ? baseAmount : 0));
    const targets = calculateMilestonePhaseTargets(safeBase);
    const t4 = Math.max(0, safeBase - targets.deposit - targets.firstFix - targets.finishes);
    return [targets.deposit, targets.firstFix, targets.finishes, t4];
  };

  let amounts: [number, number, number, number];
  let matchedFromBoqItems = false;

  if (flip) {
    const boq = flip.boq || [];
    const boqSums: [number, number, number, number] = [
      boq
        .filter((i) => i.milestonePhase === 'Deposit')
        .reduce((s, i) => s + (i.actualCostZAR || i.baselineTotalZAR || 0), 0),
      boq
        .filter((i) => i.milestonePhase === 'First Fix / Wet Works')
        .reduce((s, i) => s + (i.actualCostZAR || i.baselineTotalZAR || 0), 0),
      boq
        .filter((i) => i.milestonePhase === 'Finishes')
        .reduce((s, i) => s + (i.actualCostZAR || i.baselineTotalZAR || 0), 0),
      boq
        .filter((i) => i.milestonePhase === 'Retention')
        .reduce((s, i) => s + (i.actualCostZAR || i.baselineTotalZAR || 0), 0),
    ];
    const boqTotal = boqSums.reduce((s, v) => s + v, 0);

    if (boqTotal > 0) {
      amounts = [
        Math.round(boqSums[0]),
        Math.round(boqSums[1]),
        Math.round(boqSums[2]),
        Math.round(boqSums[3]),
      ];
      matchedFromBoqItems = true;
    } else if ((flip.baselineRenovationBudgetZAR || 0) > 0) {
      amounts = split20303020(flip.baselineRenovationBudgetZAR);
    } else {
      amounts = split20303020(totalAmountZAR > 0 ? totalAmountZAR : 500_000);
    }
  } else {
    amounts = split20303020(totalAmountZAR > 0 ? totalAmountZAR : 500_000);
  }

  return BOQ_MILESTONE_PHASE_CONFIG.map((cfg, idx) => {
    const existingMatch = existingTranches?.find((t) => t.linkedMilestonePhase === cfg.phase);
    const drawSignedOff = flip ? Boolean(flip.drawSchedule?.[cfg.drawScheduleKey]) : undefined;

    const isDisbursed = existingMatch
      ? existingMatch.isDisbursed
      : flip
      ? Boolean(drawSignedOff)
      : idx === 0;

    return {
      id: existingMatch?.id || `${idPrefix}-${cfg.phaseNumber}`,
      name: matchedFromBoqItems
        ? `Phase ${cfg.phaseNumber}: ${cfg.phase} (BOQ)`
        : cfg.defaultLabel,
      amountZAR: amounts[idx],
      isDisbursed,
      disbursedDate: existingMatch?.disbursedDate,
      linkedMilestonePhase: cfg.phase,
      ...(flip ? { verifiedPhysicalProgress: drawSignedOff } : {}),
    };
  });
}

export type TrancheBoqStatusKey =
  | 'signed_disbursed'
  | 'signed_ready'
  | 'early_disbursed'
  | 'awaiting_signoff';

export interface TrancheBoqSignOffStatus {
  phaseNumber: 1 | 2 | 3 | 4 | null;
  phaseLabel: string;
  isBoqSignedOff: boolean;
  statusKey: TrancheBoqStatusKey;
  label: string;
}

/**
 * Cross-references a funding tranche's `linkedMilestonePhase` and `isDisbursed` state against
 * the linked FlipProject's on-site `drawSchedule` sign-offs (or `tranche.verifiedPhysicalProgress`).
 */
export function getTrancheBoqSignOffStatus(
  tranche: FundingTranche,
  flip?: FlipProject | null
): TrancheBoqSignOffStatus {
  const cfg = BOQ_MILESTONE_PHASE_CONFIG.find((c) => c.phase === tranche.linkedMilestonePhase);
  const phaseNumber = cfg?.phaseNumber ?? null;
  const phaseLabel = cfg ? `Phase ${cfg.phaseNumber}` : tranche.linkedMilestonePhase || 'Milestone';

  const drawScheduleApproved = Boolean(cfg && flip?.drawSchedule?.[cfg.drawScheduleKey]);
  const isBoqSignedOff = drawScheduleApproved || tranche.verifiedPhysicalProgress === true;

  let statusKey: TrancheBoqStatusKey;
  let statusText: string;

  if (isBoqSignedOff && tranche.isDisbursed) {
    statusKey = 'signed_disbursed';
    statusText = 'BOQ Signed Off ✓ • Disbursed';
  } else if (isBoqSignedOff && !tranche.isDisbursed) {
    statusKey = 'signed_ready';
    statusText = 'BOQ Signed Off ✓ • Ready to Draw';
  } else if (!isBoqSignedOff && tranche.isDisbursed) {
    statusKey = 'early_disbursed';
    statusText = 'Disbursed • Awaiting BOQ Sign-Off';
  } else {
    statusKey = 'awaiting_signoff';
    statusText = 'Awaiting On-Site Sign-Off';
  }

  return {
    phaseNumber,
    phaseLabel,
    isBoqSignedOff,
    statusKey,
    label: cfg ? `${phaseLabel}: ${statusText}` : statusText,
  };
}

