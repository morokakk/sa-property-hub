import { DealSource, DealStrategy, InvestorProfile, OccupantRiskProfile, ReturnTermType } from '@/types';
import { findInvestmentNode, evaluateNodeBenchmarks, getEffectiveNodeBenchmarks } from '@/lib/constants/investmentNodes';
import { isEvictionActive } from './occupantRisk';
import { RateShockScenario } from './propertyMetrics';

export type CanonicalProposalReturnType = Extract<
  ReturnTermType,
  'Fixed Interest' | 'Monthly Coupon' | 'Bullet Repayment' | 'Equity Profit Split'
>;

export interface FundingPresetOption {
  id: 'recommended' | 'bullet_bridge' | 'monthly_coupon' | 'jv_split';
  badge: string;
  label: string;
  capitalRequestedZAR: number;
  returnStructure: CanonicalProposalReturnType;
  offeredRatePercent: number;
  securityOffered: string;
  rationale: string;
}

export interface OptimalFundingRecommendation {
  recommended: FundingPresetOption;
  presets: FundingPresetOption[];
}

export interface CapitalStackSplitResult {
  lenderPrincipalZAR: number;
  lenderReturnZAR: number;
  lenderTotalPayoutZAR: number;
  monthlyLenderServiceZAR: number;
  sponsorCoInvestmentZAR: number;
  sponsorNetProfitFlipZAR: number;
  sponsorNetMonthlyCashflowZAR: number;
  loanToCostPercent: number;
  loanToExitValuePercent: number;
  lenderCoverageRatio: number;
  healthBand: 'healthy' | 'watch' | 'deficit';
  warnings: string[];
}

export interface ProposalStressRow {
  id: 'severe_downside' | 'conservative' | 'base' | 'optimistic';
  label: string;
  deltaPercent: number;
  exitValuationZAR: number;
  netProceedsBeforeLenderZAR: number;
  projectedNetProfitZAR: number;
  sponsorNetTakeHomeZAR: number;
  sponsorRoiPercent: number;
  lenderPrincipalCoveredPercent: number;
  coverageStatus: 'full' | 'principal_only' | 'shortfall';
  securityBadgeLabel: string;
}

export interface ProposalStressMatrixResult {
  principalBreakEvenExitZAR: number;
  principalSafetyMarginPercent: number;
  fullPayoutBreakEvenExitZAR: number;
  fullPayoutSafetyMarginPercent: number;
  threeMonthDelayBurnZAR: number;
  profitAfterThreeMonthDelayZAR: number;
  scenarios: ProposalStressRow[];
}

export interface SynthesizedStrengthItem {
  id: string;
  title: string;
  metricBadge: string;
  detail: string;
}

export interface SynthesizedRiskMitigantItem {
  id: string;
  riskTitle: string;
  severity: 'low' | 'medium' | 'high';
  exposureBadge: string;
  mitigationDetail: string;
}

export interface StrengthsAndMitigantsResult {
  strengths: SynthesizedStrengthItem[];
  riskMitigants: SynthesizedRiskMitigantItem[];
}

function formatCompactZAR(amount: number): string {
  const rounded = Math.round(amount);
  const abs = Math.abs(rounded);
  const sign = rounded < 0 ? '-' : '';
  return `${sign}R ${abs.toLocaleString('en-ZA')}`;
}

/**
 * Recommends optimal funding structure and 3 quick presets based on strategy, cashflow, and project outlay.
 * Enforces Guardrail #3: Strictly outputs canonical ReturnTermType values:
 * 'Fixed Interest' | 'Monthly Coupon' | 'Bullet Repayment' | 'Equity Profit Split'.
 */
export function recommendOptimalFundingStructure(params: {
  strategy: DealStrategy;
  totalProjectCostZAR: number;
  targetExitPriceZAR: number;
  projectedNetProfitZAR: number;
  holdingDurationMonths: number;
  monthlyRentZAR: number;
  monthlyBurnRateZAR: number;
  seniorDebtZAR?: number;
  isEviction?: boolean;
}): OptimalFundingRecommendation {
  const {
    strategy,
    totalProjectCostZAR,
    targetExitPriceZAR,
    projectedNetProfitZAR,
    holdingDurationMonths,
    monthlyRentZAR,
    monthlyBurnRateZAR,
    seniorDebtZAR = 0,
    isEviction = false,
  } = params;

  const safeCost = Math.max(1, totalProjectCostZAR);
  const safeExit = Math.max(safeCost, targetExitPriceZAR);
  const netMonthlyBeforeLender = monthlyRentZAR - monthlyBurnRateZAR;

  // Cap safe facility so (Facility + Senior Debt) <= 70% of Exit ARV and <= 75% of Total Cost
  const maxSafeByArv = Math.max(0, Math.round(safeExit * 0.70 - seniorDebtZAR));
  const maxSafeByCost = Math.round(safeCost * 0.75);
  const optimalCapital = Math.max(
    100_000,
    Math.round(Math.min(maxSafeByArv > 0 ? maxSafeByArv : maxSafeByCost, maxSafeByCost) / 10_000) * 10_000
  );

  // Preset 1: Zero-Drag Bullet Bridge (Ideal for Flips & BRRRR Phase 1)
  const bulletPreset: FundingPresetOption = {
    id: 'bullet_bridge',
    badge: 'Zero Monthly Drag',
    label: 'Accrued Bullet Bridge',
    capitalRequestedZAR: optimalCapital,
    returnStructure: 'Bullet Repayment',
    offeredRatePercent: 14.5,
    securityOffered: '1st or 2nd Mortgage Bond registered over title deed',
    rationale: `Accrues 14.5% p.a. to exit maturity (${holdingDurationMonths} mos), eliminating monthly debt-service drain during construction${isEviction ? ' and legal eviction' : ''}.`,
  };

  // Preset 2: Sustainable Monthly Coupon / Fixed Interest (Ideal for cash-flowing Rentals)
  // Size rate or principal so monthly coupon <= 75% of net cashflow if positive
  const couponCapital =
    strategy === 'Rental' && netMonthlyBeforeLender > 2000
      ? Math.min(
          optimalCapital,
          Math.max(100_000, Math.round(((netMonthlyBeforeLender * 0.8 * 12) / 0.13) / 10_000) * 10_000)
        )
      : optimalCapital;
  const couponPreset: FundingPresetOption = {
    id: 'monthly_coupon',
    badge: 'Income Yield',
    label: 'Monthly Coupon Facility',
    capitalRequestedZAR: couponCapital,
    returnStructure: 'Monthly Coupon',
    offeredRatePercent: 13.0,
    securityOffered: '2nd Mortgage Bond + Cession of Gross Rental Income',
    rationale:
      strategy === 'Rental' && netMonthlyBeforeLender > 0
        ? `Sized at ${formatCompactZAR(couponCapital)} (13.0% p.a.) so in-place net rental cashflow services the monthly coupon without sponsor shortfall.`
        : `Provides predictable 13.0% p.a. monthly interest income backed by mortgage security and escrow reserve.`,
  };

  // Preset 3: Aligned JV Equity Profit Split (Ideal for tighter margin or high-upside Flips)
  const jvCapital = Math.round((safeCost * 0.80) / 10_000) * 10_000;
  const jvPreset: FundingPresetOption = {
    id: 'jv_split',
    badge: 'Zero Debt Risk',
    label: 'JV Equity Profit Split',
    capitalRequestedZAR: jvCapital,
    returnStructure: 'Equity Profit Split',
    offeredRatePercent: 50,
    securityOffered: 'SPV Shareholding + 1st Capital Distribution Waterfall',
    rationale: `Eliminates fixed interest risk: funder provides ${formatCompactZAR(jvCapital)} (80% LTC) for a 50/50 split of net profit (${formatCompactZAR(Math.max(0, Math.round(projectedNetProfitZAR * 0.5)))} est. share).`,
  };

  let recommended: FundingPresetOption;
  if (strategy === 'Flip') {
    const profitMarginPct = (projectedNetProfitZAR / safeCost) * 100;
    recommended = profitMarginPct >= 20 ? { ...bulletPreset, id: 'recommended' } : { ...jvPreset, id: 'recommended' };
  } else if (strategy === 'BRRRR') {
    recommended = {
      ...bulletPreset,
      id: 'recommended',
      securityOffered: '1st Bridge Bond settled via Tier-1 Bank Refinance Guarantee',
      rationale: `Zero monthly cash drag during Phase 1 rehab; 100% principal + accrued return settled from Phase 2 bank refinance proceeds.`,
    };
  } else {
    recommended =
      netMonthlyBeforeLender >= (optimalCapital * 0.13) / 12
        ? { ...couponPreset, id: 'recommended' }
        : {
            id: 'recommended',
            badge: 'Fixed Facility',
            label: 'Fixed Interest Facility',
            capitalRequestedZAR: couponCapital,
            returnStructure: 'Fixed Interest',
            offeredRatePercent: 12.5,
            securityOffered: '2nd Mortgage Bond registered over title deed',
            rationale: `Balanced ${formatCompactZAR(couponCapital)} facility at 12.5% p.a. Fixed Interest matched to long-term rental cashflow.`,
          };
  }

  return {
    recommended,
    presets: [bulletPreset, couponPreset, jvPreset],
  };
}

/**
 * Computes live capital-stack economics between the Private Lender / JV Partner and the Sponsor.
 */
export function calculateCapitalStackSplit(params: {
  strategy: DealStrategy;
  capitalRequestedZAR: number;
  fundingOfferType: ReturnTermType;
  offeredRatePercent: number;
  totalProjectCostZAR: number;
  targetExitPriceZAR: number;
  projectedNetProfitZAR: number;
  holdingDurationMonths: number;
  netMonthlyCashflowBeforeLenderZAR: number;
  seniorDebtZAR?: number;
}): CapitalStackSplitResult {
  const {
    strategy,
    capitalRequestedZAR,
    fundingOfferType,
    offeredRatePercent,
    totalProjectCostZAR,
    targetExitPriceZAR,
    projectedNetProfitZAR,
    holdingDurationMonths,
    netMonthlyCashflowBeforeLenderZAR,
    seniorDebtZAR = 0,
  } = params;

  const principal = Math.max(0, capitalRequestedZAR || 0);
  const rate = Math.max(0, offeredRatePercent || 0);
  const durationMonths = Math.max(1, holdingDurationMonths || 6);
  const durationYears = durationMonths / 12;

  let lenderReturnZAR = 0;
  let monthlyLenderServiceZAR = 0;

  if (fundingOfferType === 'Equity Profit Split') {
    lenderReturnZAR = Math.max(0, Math.round(projectedNetProfitZAR * (rate / 100)));
    monthlyLenderServiceZAR = 0;
  } else if (fundingOfferType === 'Monthly Coupon') {
    monthlyLenderServiceZAR = Math.round((principal * (rate / 100)) / 12);
    lenderReturnZAR = monthlyLenderServiceZAR * durationMonths;
  } else if (fundingOfferType === 'Bullet Repayment') {
    monthlyLenderServiceZAR = 0;
    lenderReturnZAR = Math.round(principal * (rate / 100) * durationYears);
  } else if (fundingOfferType === 'Zero Interest') {
    monthlyLenderServiceZAR = 0;
    lenderReturnZAR = 0;
  } else {
    // 'Fixed Interest'
    monthlyLenderServiceZAR = Math.round((principal * (rate / 100)) / 12);
    lenderReturnZAR = Math.round(principal * (rate / 100) * durationYears);
  }

  const lenderTotalPayoutZAR = principal + lenderReturnZAR;
  const sponsorCoInvestmentZAR = Math.max(0, Math.round(totalProjectCostZAR - principal - seniorDebtZAR));
  const sponsorNetProfitFlipZAR = Math.round(projectedNetProfitZAR - lenderReturnZAR);
  const sponsorNetMonthlyCashflowZAR = Math.round(netMonthlyCashflowBeforeLenderZAR - monthlyLenderServiceZAR);

  const loanToCostPercent =
    totalProjectCostZAR > 0 ? Number(((principal / totalProjectCostZAR) * 100).toFixed(1)) : 0;
  const loanToExitValuePercent =
    targetExitPriceZAR > 0
      ? Number((((principal + seniorDebtZAR) / targetExitPriceZAR) * 100).toFixed(1))
      : 0;

  // Coverage Ratio
  let lenderCoverageRatio = 1.0;
  if (strategy === 'Rental' && monthlyLenderServiceZAR > 0) {
    lenderCoverageRatio = Number((netMonthlyCashflowBeforeLenderZAR / monthlyLenderServiceZAR).toFixed(2));
  } else if (lenderTotalPayoutZAR > 0) {
    const netAvailableForLender = principal + projectedNetProfitZAR;
    lenderCoverageRatio = Number((netAvailableForLender / lenderTotalPayoutZAR).toFixed(2));
  }

  const warnings: string[] = [];
  if (strategy === 'Flip' && sponsorNetProfitFlipZAR <= 0) {
    warnings.push(
      `Lender return (${formatCompactZAR(lenderReturnZAR)}) exceeds projected flip profit (${formatCompactZAR(projectedNetProfitZAR)}), leaving the sponsor with ${formatCompactZAR(sponsorNetProfitFlipZAR)}.`
    );
  }
  if (strategy === 'Rental' && monthlyLenderServiceZAR > 0 && sponsorNetMonthlyCashflowZAR < 0) {
    warnings.push(
      `Monthly lender coupon (${formatCompactZAR(monthlyLenderServiceZAR)}/m) exceeds property net cashflow (${formatCompactZAR(netMonthlyCashflowBeforeLenderZAR)}/m), creating a ${formatCompactZAR(sponsorNetMonthlyCashflowZAR)}/m sponsor deficit.`
    );
  }
  if (loanToExitValuePercent > 80) {
    warnings.push(
      `Combined debt-to-exit-value (${loanToExitValuePercent}% LTV) exceeds typical 75–80% institutional collateral ceiling.`
    );
  }

  let healthBand: CapitalStackSplitResult['healthBand'] = 'healthy';
  if (warnings.length > 0 && (sponsorNetProfitFlipZAR < 0 || (strategy === 'Rental' && sponsorNetMonthlyCashflowZAR < 0))) {
    healthBand = 'deficit';
  } else if (warnings.length > 0 || loanToCostPercent > 85) {
    healthBand = 'watch';
  }

  return {
    lenderPrincipalZAR: principal,
    lenderReturnZAR,
    lenderTotalPayoutZAR,
    monthlyLenderServiceZAR,
    sponsorCoInvestmentZAR,
    sponsorNetProfitFlipZAR,
    sponsorNetMonthlyCashflowZAR,
    loanToCostPercent,
    loanToExitValuePercent,
    lenderCoverageRatio,
    healthBand,
    warnings,
  };
}

/**
 * Computes exact Lender Principal Break-Even Exit Price, Full Payout Break-Even Exit Price,
 * and 4 dynamic stress scenarios.
 * Enforces Guardrail #3:
 * Principal Break-Even Exit = (Capital Requested + Senior Debt + Exit Legal Fees) / (1 - Exit Commission Rate)
 */
export function calculateProposalStressScenarios(params: {
  targetExitPriceZAR: number;
  totalProjectCostZAR: number;
  capitalRequestedZAR: number;
  lenderReturnZAR: number;
  exitCommissionPercent: number;
  exitLegalCostZAR: number;
  monthlyBurnRateZAR: number;
  seniorDebtZAR?: number;
  fundingOfferType?: ReturnTermType;
  offeredRatePercent?: number;
}): ProposalStressMatrixResult {
  const {
    targetExitPriceZAR,
    totalProjectCostZAR,
    capitalRequestedZAR,
    lenderReturnZAR,
    exitCommissionPercent,
    exitLegalCostZAR,
    monthlyBurnRateZAR,
    seniorDebtZAR = 0,
    fundingOfferType = 'Fixed Interest',
    offeredRatePercent = 14,
  } = params;

  const commRate = Math.min(0.5, Math.max(0, (exitCommissionPercent || 0) / 100));
  const netRetentionRate = Math.max(0.1, 1 - commRate);
  const safeExitLegal = Math.max(0, exitLegalCostZAR || 0);
  const safeSeniorDebt = Math.max(0, seniorDebtZAR || 0);
  const safePrincipal = Math.max(0, capitalRequestedZAR || 0);
  const safeLenderReturn = Math.max(0, lenderReturnZAR || 0);

  // Guardrail #3 exact formula:
  // Principal Break-Even Exit = (Capital Requested + Senior Debt (if any) + Exit Legal Fees) / (1 - Exit Commission Rate)
  const principalBreakEvenExitZAR = Math.ceil(
    (safePrincipal + safeSeniorDebt + safeExitLegal) / netRetentionRate
  );

  const fullPayoutBreakEvenExitZAR = Math.ceil(
    (safePrincipal + safeLenderReturn + safeSeniorDebt + safeExitLegal) / netRetentionRate
  );

  const principalSafetyMarginPercent =
    targetExitPriceZAR > 0
      ? Number((((targetExitPriceZAR - principalBreakEvenExitZAR) / targetExitPriceZAR) * 100).toFixed(1))
      : 0;

  const fullPayoutSafetyMarginPercent =
    targetExitPriceZAR > 0
      ? Number((((targetExitPriceZAR - fullPayoutBreakEvenExitZAR) / targetExitPriceZAR) * 100).toFixed(1))
      : 0;

  // Base cost before exit commission & exit legal (so when we vary exit price, commission scales with exit price)
  const baseExitCommissionAtTarget = targetExitPriceZAR * commRate;
  const nonDisposalProjectCost = Math.max(
    0,
    totalProjectCostZAR - baseExitCommissionAtTarget - safeExitLegal
  );

  const scenarioDefs: Array<{
    id: ProposalStressRow['id'];
    label: string;
    deltaPercent: number;
  }> = [
    { id: 'severe_downside', label: 'Severe Stress (-15%)', deltaPercent: -15 },
    { id: 'conservative', label: 'Conservative (-10%)', deltaPercent: -10 },
    { id: 'base', label: 'Base Case (Target)', deltaPercent: 0 },
    { id: 'optimistic', label: 'Optimistic (+10%)', deltaPercent: 10 },
  ];

  const scenarios: ProposalStressRow[] = scenarioDefs.map((def) => {
    const exitValuationZAR = Math.round(targetExitPriceZAR * (1 + def.deltaPercent / 100));
    const scenarioExitCommission = exitValuationZAR * commRate;
    const scenarioTotalCost = nonDisposalProjectCost + scenarioExitCommission + safeExitLegal;
    const projectedNetProfitZAR = Math.round(exitValuationZAR - scenarioTotalCost);

    // Net proceeds available to repay lender after disposal costs and senior debt
    const netProceedsBeforeLenderZAR = Math.round(
      exitValuationZAR * netRetentionRate - safeExitLegal - safeSeniorDebt
    );

    // Dynamic lender return in scenario (if Equity Profit Split, scales with scenario profit)
    const scenarioLenderReturn =
      fundingOfferType === 'Equity Profit Split'
        ? Math.max(0, Math.round(projectedNetProfitZAR * (offeredRatePercent / 100)))
        : safeLenderReturn;

    const sponsorNetTakeHomeZAR = Math.round(projectedNetProfitZAR - scenarioLenderReturn);
    const sponsorRoiPercent =
      scenarioTotalCost > 0
        ? Number(((projectedNetProfitZAR / scenarioTotalCost) * 100).toFixed(2))
        : 0;

    const lenderPrincipalCoveredPercent =
      safePrincipal > 0
        ? Math.min(100, Math.max(0, Number(((netProceedsBeforeLenderZAR / safePrincipal) * 100).toFixed(1))))
        : 100;

    let coverageStatus: ProposalStressRow['coverageStatus'] = 'full';
    let securityBadgeLabel = '100% Principal + Return Covered';

    if (netProceedsBeforeLenderZAR >= safePrincipal + scenarioLenderReturn) {
      coverageStatus = 'full';
      securityBadgeLabel = '100% Principal + Return Covered';
    } else if (netProceedsBeforeLenderZAR >= safePrincipal) {
      coverageStatus = 'principal_only';
      securityBadgeLabel = '100% Principal Covered • Partial Return';
    } else {
      coverageStatus = 'shortfall';
      const shortfallZAR = safePrincipal - Math.max(0, netProceedsBeforeLenderZAR);
      securityBadgeLabel = `Principal Exposed (-${formatCompactZAR(shortfallZAR)})`;
    }

    return {
      id: def.id,
      label: def.label,
      deltaPercent: def.deltaPercent,
      exitValuationZAR,
      netProceedsBeforeLenderZAR,
      projectedNetProfitZAR,
      sponsorNetTakeHomeZAR,
      sponsorRoiPercent,
      lenderPrincipalCoveredPercent,
      coverageStatus,
      securityBadgeLabel,
    };
  });

  const threeMonthDelayBurnZAR = Math.round(monthlyBurnRateZAR * 3);
  const baseProfit = scenarios.find((s) => s.id === 'base')?.projectedNetProfitZAR ?? 0;
  const profitAfterThreeMonthDelayZAR = Math.round(baseProfit - threeMonthDelayBurnZAR);

  return {
    principalBreakEvenExitZAR,
    principalSafetyMarginPercent,
    fullPayoutBreakEvenExitZAR,
    fullPayoutSafetyMarginPercent,
    threeMonthDelayBurnZAR,
    profitAfterThreeMonthDelayZAR,
    scenarios,
  };
}

/**
 * Deterministic rule-based synthesizer for Tear-Sheet Section 1B:
 * Pairs Verified Underwriting Strengths with Identified Risks & Concrete Sponsor Mitigants.
 */
export function synthesizeStrengthsAndMitigants(params: {
  deal: {
    type: 'flip' | 'opportunity' | 'rental';
    city: string;
    province?: string;
    source?: DealSource;
    purchasePrice: number;
    openMarketValue: number;
    builtInEquity: number;
    builtInEquityPercent: number;
    renovationBudget: number;
    targetExitPrice: number;
    monthlyRent: number;
    isSection13Eligible?: boolean;
    section13Allowance?: number;
    isVatInclusiveDeveloperSale?: boolean;
    auctioneerCommission?: number;
    municipalArrears?: number;
    collectionRate?: number;
    tenantArrears?: number;
    occupantRisk?: OccupantRiskProfile;
    refinanceLtvPercent?: number;
  };
  strategy: DealStrategy;
  capitalStack: CapitalStackSplitResult;
  stressMatrix: ProposalStressMatrixResult;
  rateShockScenarios?: RateShockScenario[];
  investorProfile?: Partial<InvestorProfile>;
}): StrengthsAndMitigantsResult {
  const { deal, strategy, capitalStack, stressMatrix, rateShockScenarios = [], investorProfile } = params;
  const strengths: SynthesizedStrengthItem[] = [];
  const riskMitigants: SynthesizedRiskMitigantItem[] = [];

  const node = findInvestmentNode(deal.city);

  // ============================================================================
  // 1. SYNTHESIZE UNDERWRITING STRENGTHS
  // ============================================================================

  // Strength A: Built-in Equity / Below-Market Acquisition
  if (deal.builtInEquity > 0) {
    strengths.push({
      id: 'built-in-equity',
      title: 'Day-1 Equity Cushion Below Valuation',
      metricBadge: `+${deal.builtInEquityPercent.toFixed(1)}% Discount (${formatCompactZAR(deal.builtInEquity)})`,
      detail: `Contracted at ${formatCompactZAR(deal.purchasePrice)} against an open market valuation of ${formatCompactZAR(deal.openMarketValue)}, establishing immediate collateral protection.`,
    });
  }

  // Strength B: Lender Break-Even Exit Cushion
  if (stressMatrix.principalSafetyMarginPercent >= 15) {
    strengths.push({
      id: 'lender-breakeven-buffer',
      title: 'Deep Lender Principal Break-Even Shield',
      metricBadge: `${stressMatrix.principalSafetyMarginPercent.toFixed(1)}% Downside Buffer`,
      detail: `Exit valuation can drop to ${formatCompactZAR(stressMatrix.principalBreakEvenExitZAR)} (after sales commission & bond cancellation fees) and still recover 100% of facility principal.`,
    });
  }

  // Strength C: Node & Strategy Alignment
  if (node) {
    const isStrategyAligned = node.recommendedStrategies.includes(strategy);
    const grossYield = deal.openMarketValue > 0 ? ((deal.monthlyRent * 12) / deal.openMarketValue) * 100 : 0;
    const nodeAudit = evaluateNodeBenchmarks(node, { strategy, grossYield }, investorProfile?.customNodeBenchmarks);
    const effective = nodeAudit?.effectiveBenchmarks ?? getEffectiveNodeBenchmarks(node, investorProfile?.customNodeBenchmarks) ?? {
      ...node.benchmarks,
      centsInRandAnnual: Number((node.benchmarks.typicalMonthlyRatesPercentOfVal * 12).toFixed(4)),
      provenance: 'indicative_unverified' as const,
      isOverridden: false,
    };
    strengths.push({
      id: 'node-fundamentals',
      title: `${node.name} Corridor Fundamentals`,
      metricBadge: isStrategyAligned ? `Verified ${strategy} Node` : `${effective.grossYieldRangePercent[0]}–${effective.grossYieldRangePercent[1]}% Node Yield`,
      detail: `${node.primaryInvestmentProfile} Typical node vacancy stands at ${effective.typicalVacancyPercent}% with ${effective.typicalCapitalGrowthPercent}% p.a. historical capital growth${effective.isOverridden ? ` (Custom Verified${effective.source ? ` · ${effective.source}` : ''})` : ''}.`,
    });
  }

  // Strength D: VAT-Inclusive / Section 13sex Tax Shield
  if (deal.isVatInclusiveDeveloperSale || deal.source === 'iGrow Rentals' || deal.isSection13Eligible) {
    strengths.push({
      id: 'tax-efficiency',
      title: 'SARS Transfer Duty & Section 13sex Efficiency',
      metricBadge: deal.isSection13Eligible ? 'Sec 13sex Active' : 'R 0 Transfer Duty',
      detail: `Acquisition eliminates frictional SARS Transfer Duty via VAT-registered developer pricing${deal.isSection13Eligible ? ' and unlocks 5% annual Section 13sex building write-offs' : ''}.`,
    });
  }

  // Strength E: Rate-Shock Resilience or Seasoned Rental Track Record
  const shock200 = rateShockScenarios.find((s) => s.shockBps === 200);
  if (strategy !== 'Flip' && shock200 && shock200.band === 'pass') {
    strengths.push({
      id: 'rate-shock-resilience',
      title: '+200 bps SARB Rate-Shock Resilience',
      metricBadge: `${shock200.dscr?.toFixed(2)}x DSCR at ${shock200.ratePercent}%`,
      detail: `Net Operating Income maintains positive debt coverage above the ${investorProfile?.minDscr ?? 1.2}x hurdle even under a +200 bps prime interest rate hike.`,
    });
  } else if (deal.type === 'rental' && (deal.collectionRate ?? 100) >= 95) {
    strengths.push({
      id: 'proven-collections',
      title: 'Verified 12-Month Tenant Collection Track Record',
      metricBadge: `${deal.collectionRate}% Collection Rate`,
      detail: `Seasoned in-place tenancy with verified historical ledger collections and active security deposit held in trust.`,
    });
  } else if (strategy === 'BRRRR') {
    const refiLtv = deal.refinanceLtvPercent ?? 75;
    const refiLoan = Math.round(deal.targetExitPrice * (refiLtv / 100));
    strengths.push({
      id: 'brrrr-takeout',
      title: 'Clear Bank Refinance Take-Out Exit',
      metricBadge: `${formatCompactZAR(refiLoan)} at ${refiLtv}% LTV`,
      detail: `Post-rehab ARV of ${formatCompactZAR(deal.targetExitPrice)} supports a ${refiLtv}% LTV commercial bank mortgage to settle bridge capital in full.`,
    });
  }

  // Ensure at least 3 strengths
  if (strengths.length < 3) {
    strengths.push({
      id: 'structured-collateral',
      title: 'Ring-Fenced Collateral & Milestone Governance',
      metricBadge: `${capitalStack.loanToCostPercent}% LTC`,
      detail: `Facility is secured via ${params.capitalStack.loanToExitValuePercent}% Exit LTV with milestone-gated contractor drawdowns.`,
    });
  }

  // ============================================================================
  // 2. SYNTHESIZE IDENTIFIED RISKS & CONCRETE SPONSOR MITIGANTS
  // ============================================================================

  // Risk A: PIE Act Unlawful Occupation
  if (isEvictionActive(deal.occupantRisk)) {
    const delayDays = deal.occupantRisk?.estimatedEvictionDelayDays || 120;
    const legalRes = deal.occupantRisk?.budgetedLegalEvictionCostZAR || 40000;
    riskMitigants.push({
      id: 'pie-act-eviction',
      riskTitle: 'PIE Act Unlawful Occupation & Vacant Possession Delay',
      severity: 'high',
      exposureBadge: `~${delayDays} Days • ${formatCompactZAR(legalRes)} Legal Reserve`,
      mitigationDetail: `Upfront litigation reserve (${formatCompactZAR(legalRes)}) and interim holding burn are pre-funded in the capital stack; renovation tranches remain locked in escrow until Sheriff Return of Service confirms vacant possession.`,
    });
  }

  // Risk B: High-Street Auction / Distressed Arrears
  if (deal.source === 'High-Street Auction' || (deal.municipalArrears || 0) > 0) {
    riskMitigants.push({
      id: 'auction-municipal-clearance',
      riskTitle: 'Auction Guarantee Window & Section 118 Municipal Arrears',
      severity: (deal.municipalArrears || 0) > 50000 ? 'high' : 'medium',
      exposureBadge:
        (deal.municipalArrears || 0) > 0
          ? `${formatCompactZAR(deal.municipalArrears || 0)} Sec 118 Arrears`
          : '21-Day Guarantee Mandate',
      mitigationDetail: `All Section 118 municipal clearance arrears (${formatCompactZAR(deal.municipalArrears || 0)}) and buyer's premium (${formatCompactZAR(deal.auctioneerCommission || 0)}) are ring-fenced in Day-1 acquisition outlays settled directly via conveyancing trust account.`,
    });
  }

  // Risk C: Renovation Cost Overrun & Holding Delay
  if (deal.renovationBudget > 0 || strategy === 'Flip' || strategy === 'BRRRR') {
    riskMitigants.push({
      id: 'capex-holding-overrun',
      riskTitle: 'Construction Scope Overrun & Deeds Office Transfer Delay',
      severity: deal.renovationBudget > deal.purchasePrice * 0.2 ? 'medium' : 'low',
      exposureBadge: `3-Mo Delay Buffer: ${formatCompactZAR(stressMatrix.threeMonthDelayBurnZAR)}`,
      mitigationDetail: `BOQ materials are procured directly from national trade accounts while labor is paid strictly on certified milestone completion. Even with a 3-month transfer delay (-${formatCompactZAR(stressMatrix.threeMonthDelayBurnZAR)}), project profit remains ${formatCompactZAR(stressMatrix.profitAfterThreeMonthDelayZAR)}.`,
    });
  }

  // Risk D: Tenant Collection / Interest Rate Escalation Risk
  if (deal.type === 'rental' && ((deal.collectionRate ?? 100) < 90 || (deal.tenantArrears ?? 0) > 0)) {
    riskMitigants.push({
      id: 'tenant-collection-arrears',
      riskTitle: 'In-Place Tenant Arrears & Credit Loss Exposure',
      severity: 'medium',
      exposureBadge: `${deal.collectionRate ?? 100}% Collection • ${formatCompactZAR(deal.tenantArrears ?? 0)} Arrears`,
      mitigationDetail: `Underwriting models an elevated vacancy/credit-loss buffer matched to actual 12-month collection history, and pre-paid utility sub-metering prevents municipal utility accumulation.`,
    });
  } else if (strategy !== 'Flip') {
    riskMitigants.push({
      id: 'macro-rate-escalation',
      riskTitle: 'SARB Interest Rate Cycle & Municipal Tariff Inflation',
      severity: shock200 && shock200.band === 'fail' ? 'medium' : 'low',
      exposureBadge: '+100 / +200 bps Stress Tested',
      mitigationDetail: `Annual 6% contractual lease escalations and prepaid utility sub-metering insulate net operating income against municipal tariff hikes and interest-rate tightening.`,
    });
  }

  return {
    strengths: strengths.slice(0, 4),
    riskMitigants: riskMitigants.slice(0, 4),
  };
}
