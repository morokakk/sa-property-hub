/**
 * Holding Delay Sensitivity & Municipal Carrying Burn Engine
 * 
 * Modeled after the operational framework of Steve Baron (Flipping Johannesburg).
 * Calculates the severe time-decay impact of South African council bottlenecks
 * (Section 118 disputes, CoJ billing errors, deeds office delays) and compounding
 * private syndicate debt interest (~12%-15% p.a.).
 */

export interface DelaySensitivityInput {
  baselineDurationMonths: number;
  monthlyHoldingBurnZAR: number; // Municipal rates, levies, site security, building insurance, standing utilities
  syndicateDebtBalanceZAR: number; // Active private lender debt principal
  syndicateInterestRatePercent: number; // e.g. 14.0 (% p.a.)
  targetExitPriceZAR: number;
  totalCostBasisZAR: number; // Purchase price + transfer duty/legal fees + BOQ renovation spend
  taxRatePercent?: number; // 0 (Pre-tax), 27 (Corporate), 45 (Individual)
  sec118ArrearsZAR?: number; // Distressed municipal arrears
  advanceCouncilDepositZAR?: number; // 4-6 months advance municipal deposit
}

export interface DelayScenarioRow {
  delayDays: number;
  delayMonths: number;
  scenarioName: string;
  scenarioDescription: string;
  totalDurationMonths: number;
  additionalHoldingBurnZAR: number;
  additionalDebtInterestZAR: number;
  totalAdditionalCarryingCostZAR: number;
  cumulativeHoldingCostZAR: number;
  cumulativeDebtInterestZAR: number;
  totalAllInCostZAR: number;
  grossMarginPreTaxZAR: number;
  estimatedTaxZAR: number;
  netProfitAfterTaxZAR: number;
  cashOnCashRoiPercent: number;
  annualizedRoiPercent: number;
  roiCompressionPercent: number; // Baseline Cash ROI - scenario Cash ROI
  annualizedRoiCompressionPercent: number; // Baseline Annualized ROI - scenario Annualized ROI
  netProfitErosionZAR: number; // Baseline Profit - scenario Profit
  isNegativeProfit: boolean;
}

export interface DelaySensitivityMatrixResult {
  monthlyHoldingBurnZAR: number;
  monthlyDebtInterestZAR: number;
  totalMonthlyDelayBurnZAR: number;
  dailyDelayBurnZAR: number;
  baselineNetProfitZAR: number;
  baselineRoiPercent: number;
  baselineAnnualizedRoiPercent: number;
  zeroMarginDelayDays: number; // Exact days of delay until net profit reaches R0
  scenarios: DelayScenarioRow[];
}

const DEFAULT_DELAY_SCENARIOS = [
  { days: 0, label: 'Baseline Target', desc: 'On-schedule exit without municipal or contractor delays' },
  { days: 30, label: '+30 Days (1 Month)', desc: 'Contractor finish snagging & initial conveyancing lodgement' },
  { days: 60, label: '+60 Days (2 Months)', desc: 'Deeds Office queries & Deeds Registry examination queue' },
  { days: 90, label: '+90 Days (3 Months)', desc: 'City of Johannesburg (CoJ) Section 118 billing query / dispute' },
  { days: 120, label: '+120 Days (4 Months)', desc: 'Severe municipal impasse, council escalation & deadlock' },
];

/**
 * Calculates zero-margin delay days before pre-tax profit is wiped out by holding burn
 */
export function calculateZeroMarginDelayDays(
  baselineProfitZAR: number,
  monthlyDelayBurnZAR: number
): number {
  if (Number.isNaN(baselineProfitZAR) || baselineProfitZAR <= 0) return 0;
  if (Number.isNaN(monthlyDelayBurnZAR) || monthlyDelayBurnZAR <= 0) return 9999;
  const burnPerDay = monthlyDelayBurnZAR / 30;
  return Math.round(baselineProfitZAR / burnPerDay);
}

/**
 * Calculates complete Delay Sensitivity Matrix (+0, +30, +60, +90, +120 days)
 */
export function calculateDelaySensitivityMatrix(
  input: DelaySensitivityInput
): DelaySensitivityMatrixResult {
  const durationMonths = Math.max(1, input.baselineDurationMonths || 6);
  const holdingBurn = Math.max(0, input.monthlyHoldingBurnZAR || 0);
  const debtPrincipal = Math.max(0, input.syndicateDebtBalanceZAR || 0);
  const debtRate = Math.max(0, input.syndicateInterestRatePercent || 0);
  const exitPrice = Math.max(0, input.targetExitPriceZAR || 0);
  const costBasis = Math.max(0, input.totalCostBasisZAR || 0);
  const sec118 = Math.max(0, input.sec118ArrearsZAR || 0);
  const advanceCouncil = Math.max(0, input.advanceCouncilDepositZAR || 0);
  const taxRate = Math.max(0, input.taxRatePercent || 0);

  // Monthly private syndicate debt interest
  const monthlyDebtInterestZAR = Math.round((debtPrincipal * (debtRate / 100)) / 12);
  const totalMonthlyDelayBurnZAR = holdingBurn + monthlyDebtInterestZAR;
  const dailyDelayBurnZAR = Math.round(totalMonthlyDelayBurnZAR / 30);

  // Baseline holding and debt costs across project life
  const baselineHoldingCostZAR = durationMonths * holdingBurn;
  const baselineDebtInterestZAR = durationMonths * monthlyDebtInterestZAR;

  // Base capital outlays
  const baselineTotalAllInCostZAR =
    costBasis + baselineHoldingCostZAR + baselineDebtInterestZAR + sec118 + advanceCouncil;

  const baselineGrossMarginZAR = exitPrice - baselineTotalAllInCostZAR;
  const baselineTaxZAR = Math.max(0, Math.round(baselineGrossMarginZAR * (taxRate / 100)));
  const baselineNetProfitZAR = baselineGrossMarginZAR - baselineTaxZAR;
  const baselineRoiPercent =
    baselineTotalAllInCostZAR > 0 ? (baselineNetProfitZAR / baselineTotalAllInCostZAR) * 100 : 0;
  const baselineAnnualizedRoiPercent =
    durationMonths > 0 ? baselineRoiPercent * (12 / durationMonths) : 0;

  const zeroMarginDelayDays = calculateZeroMarginDelayDays(
    baselineGrossMarginZAR,
    totalMonthlyDelayBurnZAR
  );

  const scenarios: DelayScenarioRow[] = DEFAULT_DELAY_SCENARIOS.map((sc) => {
    const delayDays = sc.days;
    const delayMonths = delayDays / 30;
    const totalDuration = durationMonths + delayMonths;

    const additionalHolding = Math.round(delayMonths * holdingBurn);
    const additionalDebt = Math.round(delayMonths * monthlyDebtInterestZAR);
    const totalAdditionalCarrying = additionalHolding + additionalDebt;

    const cumulativeHolding = baselineHoldingCostZAR + additionalHolding;
    const cumulativeDebt = baselineDebtInterestZAR + additionalDebt;

    const totalAllInCost = baselineTotalAllInCostZAR + totalAdditionalCarrying;
    const grossMarginPreTax = exitPrice - totalAllInCost;
    const estimatedTax = Math.max(0, Math.round(grossMarginPreTax * (taxRate / 100)));
    const netProfitAfterTax = grossMarginPreTax - estimatedTax;

    const cocRoi = totalAllInCost > 0 ? (netProfitAfterTax / totalAllInCost) * 100 : 0;
    const annualizedRoi = totalDuration > 0 ? cocRoi * (12 / totalDuration) : 0;
    const roiCompression = baselineRoiPercent - cocRoi;
    const annualizedRoiCompression = baselineAnnualizedRoiPercent - annualizedRoi;
    const netProfitErosion = baselineNetProfitZAR - netProfitAfterTax;

    return {
      delayDays,
      delayMonths,
      scenarioName: sc.label,
      scenarioDescription: sc.desc,
      totalDurationMonths: totalDuration,
      additionalHoldingBurnZAR: additionalHolding,
      additionalDebtInterestZAR: additionalDebt,
      totalAdditionalCarryingCostZAR: totalAdditionalCarrying,
      cumulativeHoldingCostZAR: cumulativeHolding,
      cumulativeDebtInterestZAR: cumulativeDebt,
      totalAllInCostZAR: totalAllInCost,
      grossMarginPreTaxZAR: grossMarginPreTax,
      estimatedTaxZAR: estimatedTax,
      netProfitAfterTaxZAR: netProfitAfterTax,
      cashOnCashRoiPercent: cocRoi,
      annualizedRoiPercent: annualizedRoi,
      roiCompressionPercent: roiCompression,
      annualizedRoiCompressionPercent: annualizedRoiCompression,
      netProfitErosionZAR: netProfitErosion,
      isNegativeProfit: netProfitAfterTax < 0,
    };
  });

  return {
    monthlyHoldingBurnZAR: holdingBurn,
    monthlyDebtInterestZAR,
    totalMonthlyDelayBurnZAR,
    dailyDelayBurnZAR,
    baselineNetProfitZAR,
    baselineRoiPercent,
    baselineAnnualizedRoiPercent,
    zeroMarginDelayDays,
    scenarios,
  };
}
