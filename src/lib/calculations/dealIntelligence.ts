import { DealStrategy, InvestorProfile } from '@/types';
import { InvestmentNode, findInvestmentNode } from '@/lib/constants/investmentNodes';
import {
  calculateDealMetrics,
  evaluateDealCriteria,
  OpportunityMetricsResult,
  BuyBoxEvaluationResult,
} from './propertyMetrics';

export type DealMetricsInputParams = Parameters<typeof calculateDealMetrics>[0];

export interface StrategyVerdictItem {
  strategy: DealStrategy;
  label: string;
  buyBox: BuyBoxEvaluationResult;
  score: number; // 0 to 100
  isNodeRecommended: boolean;
  primaryKpiLabel: string;
  primaryKpiValue: string;
  secondaryKpiLabel: string;
  secondaryKpiValue: string;
  verdictBadge: 'Optimal Fit' | 'Meets Buy-Box' | 'Partial Match' | 'Underperforms';
  summary: string;
}

export interface ThreeStrategyMatrixResult {
  strategies: Partial<Record<DealStrategy, StrategyVerdictItem>> &
    Record<'Rental' | 'Flip' | 'BRRRR', StrategyVerdictItem>;
  orderedStrategies: StrategyVerdictItem[];
  recommendedStrategy: DealStrategy;
  recommendationReason: string;
  metrics: OpportunityMetricsResult;
}

export interface DealRepairLever {
  id: 'price' | 'rent' | 'ltv' | 'exitPrice' | 'strategySwitch';
  label: string;
  currentValueLabel: string;
  targetValueLabel: string;
  deltaLabel: string;
  description: string;
  fixesAllHurdles: boolean;
  targetPriceZAR?: number;
  targetMonthlyRentZAR?: number;
  targetLtvPercent?: number;
  targetSeniorDebtLtcPercent?: number;
  targetDepositZAR?: number;
  targetExitPriceZAR?: number;
  targetStrategy?: DealStrategy;
}

export interface FailedHurdleDetail {
  key: string;
  label: string;
  actualLabel: string;
  targetLabel: string;
  gapLabel: string;
}

export interface DealRepairPrescription {
  strategy: DealStrategy;
  meetsBuyBox: boolean;
  passedCount: number;
  totalCount: number;
  failedHurdles: FailedHurdleDetail[];
  levers: DealRepairLever[];
}

function formatCompactZAR(amount: number): string {
  const rounded = Math.round(amount);
  const abs = Math.abs(rounded);
  const sign = rounded < 0 ? '-' : '';
  return `${sign}R ${abs.toLocaleString('en-ZA')}`;
}

/**
 * Evaluates a deal simultaneously across Rental, Flip, and BRRRR strategies,
 * ranking each against the InvestorProfile Buy-Box hurdles and regional InvestmentNode profile.
 */
export function evaluateThreeStrategyMatrix(
  params: DealMetricsInputParams,
  profile: Partial<InvestorProfile> & { liquidCapitalReserveZAR?: number } = {},
  nodeOrCity?: InvestmentNode | string
): ThreeStrategyMatrixResult {
  const node = typeof nodeOrCity === 'string' ? findInvestmentNode(nodeOrCity) : nodeOrCity;

  // Compute full metrics once (calculateDealMetrics computes Rental, Flip, BRRRR, and Development fields together)
  const metrics = calculateDealMetrics({
    ...params,
    costs: undefined, // allow clean recomputation if needed, or use provided costs if not overridden
    recomputeBondRegFromDeposit: true,
  });

  // If custom costs were explicitly passed, use params directly for exact parity with Analyzer page
  const exactMetrics = params.costs ? calculateDealMetrics(params) : metrics;

  // When Development strategy is active, a traditional Rental/Flip/BRRRR on raw land cannot earn the
  // multi-unit completed scheme rent or GDV without spending the full Hard + Soft + Contingency build cost.
  const singleFacilityMetrics =
    params.strategy === 'Development'
      ? calculateDealMetrics({
          ...params,
          strategy: 'Rental',
          estimatedRehabCost:
            exactMetrics.devHardBuildCostZAR +
            exactMetrics.devSoftCostsZAR +
            exactMetrics.devContingencyZAR,
        })
      : exactMetrics;

  const minFlipRoi = profile.minFlipRoiPercent ?? 18.0;
  const minDevPoc = profile.minDevelopmentPocPercent ?? 20.0;
  const maxDay1Cash = profile.maxDay1CashZAR ?? 500_000;
  const includeDevelopment =
    params.strategy === 'Development' || (params.numberOfUnits ?? 1) >= 2;

  // 1. Rental Evaluation
  const rentalBuyBox = evaluateDealCriteria(singleFacilityMetrics, profile, 'Rental');
  const rentalNodeMatch = node ? node.recommendedStrategies.includes('Rental') : true;
  let rentalScore = Math.round((rentalBuyBox.passedCount / Math.max(1, rentalBuyBox.totalCount)) * 70);
  if (rentalNodeMatch) rentalScore += 15;
  if (singleFacilityMetrics.monthlyCashFlow > 0) rentalScore += Math.min(10, Math.round(singleFacilityMetrics.netRoi / 2));
  if ((singleFacilityMetrics.dscr ?? 1.5) >= (profile.minDscr ?? 1.2)) rentalScore += 5;
  rentalScore = Math.max(0, Math.min(100, rentalScore));

  // 2. Flip Evaluation
  const flipBuyBox = evaluateDealCriteria(singleFacilityMetrics, profile, 'Flip');
  const flipNodeMatch = node ? node.recommendedStrategies.includes('Flip') : true;
  let flipScore = Math.round((flipBuyBox.passedCount / Math.max(1, flipBuyBox.totalCount)) * 70);
  if (flipNodeMatch) flipScore += 15;
  if (singleFacilityMetrics.projectedFlipNetProfit > 0) {
    flipScore += Math.min(15, Math.round((singleFacilityMetrics.projectedFlipRoi / Math.max(1, minFlipRoi)) * 10));
  }
  flipScore = Math.max(0, Math.min(100, flipScore));

  // 3. BRRRR Evaluation
  // Uses Rental/BRRRR base criteria + evaluates Post-Refi Cashflow & Capital Recycling efficiency
  const baseBrrrrBuyBox = evaluateDealCriteria(singleFacilityMetrics, profile, 'BRRRR');
  const brrrrNodeMatch = node ? node.recommendedStrategies.includes('BRRRR') : true;
  const postRefiCashflowPositive = singleFacilityMetrics.brrrrPostRefiCashflowZAR >= 0;
  const capitalRecycledWell = singleFacilityMetrics.brrrrCashLeftInDealZAR <= maxDay1Cash;
  let brrrrScore = Math.round((baseBrrrrBuyBox.passedCount / Math.max(1, baseBrrrrBuyBox.totalCount)) * 60);
  if (brrrrNodeMatch) brrrrScore += 15;
  if (postRefiCashflowPositive) brrrrScore += 12;
  if (capitalRecycledWell) brrrrScore += 8;
  if (singleFacilityMetrics.brrrrCashLeftInDealZAR === 0) brrrrScore += 5;
  brrrrScore = Math.max(0, Math.min(100, brrrrScore));

  const buildVerdictBadge = (meets: boolean, passed: number, total: number, isBest: boolean): StrategyVerdictItem['verdictBadge'] => {
    if (meets && isBest) return 'Optimal Fit';
    if (meets) return 'Meets Buy-Box';
    if (passed >= Math.ceil(total * 0.6)) return 'Partial Match';
    return 'Underperforms';
  };

  // Determine top strategy
  const rawScores: Array<{ strategy: DealStrategy; score: number; meets: boolean }> = [
    { strategy: 'Rental', score: rentalScore, meets: rentalBuyBox.meetsBuyBox },
    { strategy: 'Flip', score: flipScore, meets: flipBuyBox.meetsBuyBox },
    { strategy: 'BRRRR', score: brrrrScore, meets: baseBrrrrBuyBox.meetsBuyBox },
  ];

  // 4. Development Evaluation (included when strategy === 'Development' or numberOfUnits >= 2)
  let devBuyBox: BuyBoxEvaluationResult | null = null;
  let devScore = 0;
  if (includeDevelopment) {
    devBuyBox = evaluateDealCriteria(exactMetrics, profile, 'Development');
    const devPoc = exactMetrics.devPocPercent ?? 0;
    const devProfit = exactMetrics.devNetProfitBeforeTaxZAR ?? 0;
    devScore = Math.round((devBuyBox.passedCount / Math.max(1, devBuyBox.totalCount)) * 70);
    if (devProfit > 0) {
      devScore += Math.min(20, Math.round((devPoc / Math.max(1, minDevPoc)) * 15));
    }
    if (exactMetrics.devIsSection13SexEligible) devScore += 10;
    devScore = Math.max(0, Math.min(100, devScore));
    rawScores.push({ strategy: 'Development', score: devScore, meets: devBuyBox.meetsBuyBox });
  }

  rawScores.sort((a, b) => {
    if (params.strategy === 'Development') {
      if (a.strategy === 'Development') return -1;
      if (b.strategy === 'Development') return 1;
    }
    if (a.meets !== b.meets) return a.meets ? -1 : 1;
    return b.score - a.score;
  });

  const recommendedStrategy = rawScores[0].strategy;

  const strategies: ThreeStrategyMatrixResult['strategies'] = {
    Rental: {
      strategy: 'Rental',
      label: 'Buy & Hold Rental',
      buyBox: rentalBuyBox,
      score: rentalScore,
      isNodeRecommended: rentalNodeMatch,
      primaryKpiLabel: 'Net Cashflow / CoC',
      primaryKpiValue: `${formatCompactZAR(singleFacilityMetrics.monthlyCashFlow)}/m (${singleFacilityMetrics.netRoi.toFixed(1)}%)`,
      secondaryKpiLabel: 'Net Yield / DSCR',
      secondaryKpiValue: `${singleFacilityMetrics.capRate.toFixed(1)}% • ${singleFacilityMetrics.dscr === null ? 'Cash' : `${singleFacilityMetrics.dscr.toFixed(2)}x`}`,
      verdictBadge: buildVerdictBadge(rentalBuyBox.meetsBuyBox, rentalBuyBox.passedCount, rentalBuyBox.totalCount, recommendedStrategy === 'Rental'),
      summary: rentalBuyBox.meetsBuyBox
        ? `Passes all ${rentalBuyBox.totalCount} rental hurdles with ${formatCompactZAR(singleFacilityMetrics.monthlyCashFlow)}/m cashflow.`
        : `Meets ${rentalBuyBox.passedCount}/${rentalBuyBox.totalCount} hurdles (${singleFacilityMetrics.capRate.toFixed(1)}% Cap Rate).`,
    },
    Flip: {
      strategy: 'Flip',
      label: 'Buy & Flip',
      buyBox: flipBuyBox,
      score: flipScore,
      isNodeRecommended: flipNodeMatch,
      primaryKpiLabel: 'Net Flip Profit',
      primaryKpiValue: formatCompactZAR(singleFacilityMetrics.projectedFlipNetProfit),
      secondaryKpiLabel: 'Flip ROI (Ann.)',
      secondaryKpiValue: `${singleFacilityMetrics.projectedFlipRoi.toFixed(1)}% (${singleFacilityMetrics.annualizedFlipRoi.toFixed(1)}%/yr)`,
      verdictBadge: buildVerdictBadge(flipBuyBox.meetsBuyBox, flipBuyBox.passedCount, flipBuyBox.totalCount, recommendedStrategy === 'Flip'),
      summary: flipBuyBox.meetsBuyBox
        ? `Exceeds ${minFlipRoi}% Flip ROI hurdle with ${formatCompactZAR(singleFacilityMetrics.projectedFlipNetProfit)} net profit.`
        : `Projected Flip ROI of ${singleFacilityMetrics.projectedFlipRoi.toFixed(1)}% vs ${minFlipRoi}% target.`,
    },
    BRRRR: {
      strategy: 'BRRRR',
      label: 'Hybrid BRRRR',
      buyBox: baseBrrrrBuyBox,
      score: brrrrScore,
      isNodeRecommended: brrrrNodeMatch,
      primaryKpiLabel: 'Post-Refi Cashflow',
      primaryKpiValue: `${formatCompactZAR(singleFacilityMetrics.brrrrPostRefiCashflowZAR)}/m`,
      secondaryKpiLabel: 'Cash Left in Deal',
      secondaryKpiValue:
        singleFacilityMetrics.brrrrCashLeftInDealZAR === 0
          ? 'R 0 (100% Recycled)'
          : formatCompactZAR(singleFacilityMetrics.brrrrCashLeftInDealZAR),
      verdictBadge: buildVerdictBadge(baseBrrrrBuyBox.meetsBuyBox, baseBrrrrBuyBox.passedCount, baseBrrrrBuyBox.totalCount, recommendedStrategy === 'BRRRR'),
      summary:
        singleFacilityMetrics.brrrrCashLeftInDealZAR === 0
          ? `100% capital recycled on refi with ${formatCompactZAR(singleFacilityMetrics.brrrrPostRefiCashflowZAR)}/m post-refi flow.`
          : `Leaves ${formatCompactZAR(singleFacilityMetrics.brrrrCashLeftInDealZAR)} in deal post-refi (${formatCompactZAR(singleFacilityMetrics.brrrrEquityExtractedZAR)} extracted).`,
    },
  };

  if (includeDevelopment && devBuyBox) {
    const devProfit = exactMetrics.devNetProfitBeforeTaxZAR ?? 0;
    const devPoc = exactMetrics.devPocPercent ?? 0;
    const devTdc = exactMetrics.devTdcZAR ?? 0;
    strategies.Development = {
      strategy: 'Development',
      label: 'Development',
      buyBox: devBuyBox,
      score: devScore,
      isNodeRecommended: true,
      primaryKpiLabel: 'Net Dev Profit / POC',
      primaryKpiValue: `${formatCompactZAR(devProfit)} (${devPoc.toFixed(1)}%)`,
      secondaryKpiLabel: 'Total TDC / Scale',
      secondaryKpiValue: `${formatCompactZAR(devTdc)} • ${params.numberOfUnits ?? 1}u`,
      verdictBadge: buildVerdictBadge(
        devBuyBox.meetsBuyBox,
        devBuyBox.passedCount,
        devBuyBox.totalCount,
        recommendedStrategy === 'Development'
      ),
      summary: devBuyBox.meetsBuyBox
        ? `Exceeds ${minDevPoc}% POC hurdle with ${formatCompactZAR(devProfit)} pre-tax development profit.`
        : `Projected POC of ${devPoc.toFixed(1)}% vs ${minDevPoc}% target (${formatCompactZAR(devTdc)} TDC).`,
    };
  }

  const orderedStrategies = rawScores
    .map((r) => strategies[r.strategy])
    .filter((item): item is StrategyVerdictItem => Boolean(item));

  let recommendationReason = '';
  if (recommendedStrategy === 'Rental') {
    recommendationReason = `Buy & Hold Rental scores highest (${rentalScore}/100) with ${rentalBuyBox.passedCount}/${rentalBuyBox.totalCount} Buy-Box hurdles met and ${exactMetrics.fiveYearIrrPercent.toFixed(1)}% 5-Yr IRR.`;
  } else if (recommendedStrategy === 'Flip') {
    recommendationReason = `Buy & Flip scores highest (${flipScore}/100), unlocking ${formatCompactZAR(exactMetrics.projectedFlipNetProfit)} net profit (${exactMetrics.projectedFlipRoi.toFixed(1)}% ROI) over ${params.holdingPeriodMonths ?? 6} months.`;
  } else if (recommendedStrategy === 'Development') {
    recommendationReason = `Ground-Up / Subdivision Development scores highest (${devScore}/100), generating ${formatCompactZAR(exactMetrics.devNetProfitBeforeTaxZAR ?? 0)} net profit (${(exactMetrics.devPocPercent ?? 0).toFixed(1)}% POC) on ${formatCompactZAR(exactMetrics.devTdcZAR ?? 0)} TDC.`;
  } else {
    recommendationReason = `Hybrid BRRRR scores highest (${brrrrScore}/100), extracting ${formatCompactZAR(exactMetrics.brrrrEquityExtractedZAR)} on refinance and leaving ${formatCompactZAR(exactMetrics.brrrrCashLeftInDealZAR)} trapped.`;
  }

  return {
    strategies,
    orderedStrategies,
    recommendedStrategy,
    recommendationReason,
    metrics: exactMetrics,
  };
}

/**
 * Helper to run calculateDealMetrics cleanly with modified purchasePrice / LTV / rent / exitPrice
 * while recomputing acquisition costs (transfer duty, conveyancing, bond registration) accurately.
 */
function simulateModifiedDeal(
  baseParams: DealMetricsInputParams,
  overrides: Partial<DealMetricsInputParams>
): OpportunityMetricsResult {
  const merged: DealMetricsInputParams = {
    ...baseParams,
    ...overrides,
    // Force recomputation of SARS transfer duty and conveyancing fees when purchasePrice or LTV changes
    costs: undefined,
  };
  return calculateDealMetrics(merged);
}

/**
 * Solves exact, deterministic Deal-Repair Levers when a deal fails one or more Buy-Box hurdles.
 * Enforces Guardrail #1: Exact net-to-gross math on the "Apply Target Rent" solver accounting for
 * vacancyRatePercent, managementFeePercent, tenantPlacementFeePercent, and 15% VAT multiplier,
 * verified directly against calculateDealMetrics + evaluateDealCriteria.
 */
export function solveDealRepairLevers(
  params: DealMetricsInputParams,
  profile: Partial<InvestorProfile> & { liquidCapitalReserveZAR?: number } = {},
  strategy: DealStrategy = params.strategy ?? 'Rental',
  nodeOrCity?: InvestmentNode | string
): DealRepairPrescription {
  const currentMetrics = params.costs ? calculateDealMetrics(params) : simulateModifiedDeal(params, {});
  const currentBuyBox = evaluateDealCriteria(currentMetrics, profile, strategy);

  const minNetYield = profile.minNetYieldPercent ?? 8.0;
  const minMonthlyCashflow = profile.minMonthlyCashflowZAR ?? 1500;
  const minNetRoi = profile.minNetRoiPercent ?? 8.0;
  const minFlipRoi = profile.minFlipRoiPercent ?? 18.0;
  const minDevPoc = profile.minDevelopmentPocPercent ?? 20.0;
  const maxDay1Cash = profile.maxDay1CashZAR ?? 500_000;
  const effectiveDevEquityCap =
    profile.liquidCapitalReserveZAR !== undefined && profile.liquidCapitalReserveZAR > 0
      ? profile.liquidCapitalReserveZAR
      : maxDay1Cash;
  const minDscr = profile.minDscr ?? 1.20;

  const failedHurdles: FailedHurdleDetail[] = [];

  if (strategy === 'Flip') {
    if (!currentBuyBox.criteriaMap['minFlipRoi']) {
      failedHurdles.push({
        key: 'minFlipRoi',
        label: 'Flip ROI Hurdle',
        actualLabel: `${currentMetrics.projectedFlipRoi.toFixed(1)}%`,
        targetLabel: `≥ ${minFlipRoi.toFixed(1)}%`,
        gapLabel: `${(currentMetrics.projectedFlipRoi - minFlipRoi).toFixed(1)}%`,
      });
    }
    if (!currentBuyBox.criteriaMap['maxDay1Cash']) {
      failedHurdles.push({
        key: 'maxDay1Cash',
        label: 'Max Day-1 Cash',
        actualLabel: formatCompactZAR(currentMetrics.initialCapitalRequired),
        targetLabel: `≤ ${formatCompactZAR(maxDay1Cash)}`,
        gapLabel: `+${formatCompactZAR(currentMetrics.initialCapitalRequired - maxDay1Cash)} over`,
      });
    }
  } else if (strategy === 'Development') {
    const devPoc = currentMetrics.devPocPercent ?? 0;
    const devYoc = currentMetrics.devYieldOnCostPercent ?? 0;
    const devEq = currentMetrics.devEquityRequiredZAR ?? currentMetrics.initialCapitalRequired;
    const plannedUnits = Math.max(1, currentMetrics.devUnitsTotalCount ?? params.numberOfUnits ?? 6);
    const maxWipeoutUnits = currentMetrics.devMaxDebtWipeoutUnits ?? Math.ceil(plannedUnits * 0.65);
    const wipeoutUnits = currentMetrics.devUnitsRequiredForDebtWipeout ?? 0;

    if (!currentBuyBox.criteriaMap['minDevelopmentPoc']) {
      failedHurdles.push({
        key: 'minDevelopmentPoc',
        label: 'Profit on Cost (POC %)',
        actualLabel: `${devPoc.toFixed(1)}%`,
        targetLabel: `≥ ${minDevPoc.toFixed(1)}%`,
        gapLabel: `${(devPoc - minDevPoc).toFixed(1)}%`,
      });
    }
    if (!currentBuyBox.criteriaMap['minDevelopmentYoc']) {
      failedHurdles.push({
        key: 'minDevelopmentYoc',
        label: 'Yield on Cost (BTR YoC %)',
        actualLabel: `${devYoc.toFixed(1)}%`,
        targetLabel: `≥ ${minNetYield.toFixed(1)}%`,
        gapLabel: `${(devYoc - minNetYield).toFixed(1)}%`,
      });
    }
    if (!currentBuyBox.criteriaMap['maxDebtWipeoutUnits']) {
      failedHurdles.push({
        key: 'maxDebtWipeoutUnits',
        label: 'Debt Wipeout Breakeven',
        actualLabel: `${wipeoutUnits}/${plannedUnits} units`,
        targetLabel: `≤ ${maxWipeoutUnits} units (65%)`,
        gapLabel: `+${wipeoutUnits - maxWipeoutUnits} units over`,
      });
    }
    if (!currentBuyBox.criteriaMap['maxDay1Cash']) {
      failedHurdles.push({
        key: 'maxDay1Cash',
        label: 'Developer Equity vs War Chest',
        actualLabel: formatCompactZAR(devEq),
        targetLabel: `≤ ${formatCompactZAR(effectiveDevEquityCap)}`,
        gapLabel: `Reserve Shortfall: -${formatCompactZAR(devEq - effectiveDevEquityCap)}`,
      });
    }
  } else {
    if (!currentBuyBox.criteriaMap['minNetYield']) {
      failedHurdles.push({
        key: 'minNetYield',
        label: 'Cap Rate (Net Yield)',
        actualLabel: `${currentMetrics.capRate.toFixed(2)}%`,
        targetLabel: `≥ ${minNetYield.toFixed(1)}%`,
        gapLabel: `${(currentMetrics.capRate - minNetYield).toFixed(2)}%`,
      });
    }
    if (!currentBuyBox.criteriaMap['minMonthlyCashflow']) {
      failedHurdles.push({
        key: 'minMonthlyCashflow',
        label: 'Monthly Net Cashflow',
        actualLabel: `${formatCompactZAR(currentMetrics.monthlyCashFlow)}/m`,
        targetLabel: `≥ ${formatCompactZAR(minMonthlyCashflow)}/m`,
        gapLabel: `${formatCompactZAR(currentMetrics.monthlyCashFlow - minMonthlyCashflow)}/m`,
      });
    }
    if (!currentBuyBox.criteriaMap['minNetRoi']) {
      failedHurdles.push({
        key: 'minNetRoi',
        label: 'Cash-on-Cash ROI (Yr 1)',
        actualLabel: `${currentMetrics.netRoi.toFixed(2)}%`,
        targetLabel: `≥ ${minNetRoi.toFixed(1)}%`,
        gapLabel: `${(currentMetrics.netRoi - minNetRoi).toFixed(2)}%`,
      });
    }
    if (!currentBuyBox.criteriaMap['minDscr']) {
      failedHurdles.push({
        key: 'minDscr',
        label: 'Debt Coverage (DSCR)',
        actualLabel: `${(currentMetrics.dscr ?? 0).toFixed(2)}x`,
        targetLabel: `≥ ${minDscr.toFixed(2)}x`,
        gapLabel: `${((currentMetrics.dscr ?? 0) - minDscr).toFixed(2)}x`,
      });
    }
    if (!currentBuyBox.criteriaMap['maxDay1Cash']) {
      failedHurdles.push({
        key: 'maxDay1Cash',
        label: 'Max Day-1 Cash',
        actualLabel: formatCompactZAR(currentMetrics.initialCapitalRequired),
        targetLabel: `≤ ${formatCompactZAR(maxDay1Cash)}`,
        gapLabel: `+${formatCompactZAR(currentMetrics.initialCapitalRequired - maxDay1Cash)} over`,
      });
    }
  }

  if (currentBuyBox.meetsBuyBox) {
    return {
      strategy,
      meetsBuyBox: true,
      passedCount: currentBuyBox.passedCount,
      totalCount: currentBuyBox.totalCount,
      failedHurdles: [],
      levers: [],
    };
  }

  const levers: DealRepairLever[] = [];
  const effectiveLtv = params.bondLTV !== undefined ? params.bondLTV : params.loanToValuePercent;

  // ============================================================================
  // LEVER 1: Exact Net-to-Gross Target Monthly Rent Solver (Rental & BRRRR)
  // ============================================================================
  if (strategy !== 'Flip' && strategy !== 'Development') {
    const incomeHurdleFailed =
      !currentBuyBox.criteriaMap['minNetYield'] ||
      !currentBuyBox.criteriaMap['minMonthlyCashflow'] ||
      !currentBuyBox.criteriaMap['minNetRoi'] ||
      !currentBuyBox.criteriaMap['minDscr'];

    if (incomeHurdleFailed) {
      const vacRate = (params.vacancyRatePercent ?? 0) / 100;
      const vatMult = params.agencyVatApplicable !== false ? 1.15 : 1.0;
      const mgmtRate = ((params.managementFeePercent ?? 0) / 100) * vatMult;
      const placementRate = ((params.tenantPlacementFeePercent ?? 0) / 100) * vatMult;
      const netRetentionFactor = 1 - vacRate - mgmtRate - placementRate;

      if (netRetentionFactor > 0.05) {
        // Compute required monthly NOI for each income hurdle:
        // 1. minMonthlyCashflow: monthlyNOI - monthlyBondPayment >= minMonthlyCashflow
        const reqNoiForCashflow = minMonthlyCashflow + currentMetrics.monthlyBondPayment;
        // 2. minNetYield (capRate): ((monthlyNOI * 12) / totalCost) * 100 >= minNetYield
        // Note: totalCost = currentMetrics.annualNetOperatingIncome / (currentMetrics.capRate / 100) or derived from cost
        const impliedTotalCost =
          currentMetrics.capRate > 0
            ? (currentMetrics.annualNetOperatingIncome / (currentMetrics.capRate / 100))
            : params.purchasePrice + params.estimatedRehabCost;
        const reqNoiForYield = ((minNetYield / 100) * impliedTotalCost) / 12;
        // 3. minNetRoi: (((monthlyNOI - monthlyBondPayment) * 12) / totalCashRequired) * 100 >= minNetRoi
        const reqNoiForRoi =
          (((minNetRoi / 100) * currentMetrics.totalCashRequired) / 12) +
          currentMetrics.monthlyBondPayment;
        // 4. minDscr: round(monthlyNOI / monthlyBondPayment, 2) >= minDscr
        const reqNoiForDscr =
          currentMetrics.monthlyBondPayment > 0
            ? minDscr * currentMetrics.monthlyBondPayment
            : 0;

        const targetMonthlyNoi = Math.max(
          reqNoiForCashflow,
          reqNoiForYield,
          reqNoiForRoi,
          reqNoiForDscr
        );

        const currentNoi = currentMetrics.monthlyNOI;
        const noiDelta = Math.max(0, targetMonthlyNoi - currentNoi);
        const analyticalGrossRent = params.monthlyRentalEstimate + noiDelta / netRetentionFactor;

        // Round up to nearest R 50 and verify directly against calculateDealMetrics + evaluateDealCriteria
        let candidateRent = Math.max(
          params.monthlyRentalEstimate + 50,
          Math.ceil(analyticalGrossRent / 50) * 50
        );

        // Step upward in R 50 increments (up to 40 iterations) to guarantee rounding in calculateDealMetrics
        // turns all 4 income hurdles green on the very first click
        for (let step = 0; step < 40; step++) {
          const simMetrics = params.costs
            ? calculateDealMetrics({ ...params, monthlyRentalEstimate: candidateRent })
            : simulateModifiedDeal(params, { monthlyRentalEstimate: candidateRent });
          const simEval = evaluateDealCriteria(simMetrics, profile, strategy);
          const allIncomeHurdlesPass =
            simEval.criteriaMap['minNetYield'] &&
            simEval.criteriaMap['minMonthlyCashflow'] &&
            simEval.criteriaMap['minNetRoi'] &&
            simEval.criteriaMap['minDscr'];
          if (allIncomeHurdlesPass) {
            const rentDelta = candidateRent - params.monthlyRentalEstimate;
            levers.push({
              id: 'rent',
              label: 'Target Gross Monthly Rent',
              currentValueLabel: `${formatCompactZAR(params.monthlyRentalEstimate)}/m`,
              targetValueLabel: `${formatCompactZAR(candidateRent)}/m`,
              deltaLabel: `+${formatCompactZAR(rentDelta)}/m (+${params.monthlyRentalEstimate > 0 ? Math.round((rentDelta / params.monthlyRentalEstimate) * 100) : 100}%)`,
              description: `Accounts for ${params.vacancyRatePercent ?? 0}% vacancy & ${params.managementFeePercent ?? 0}%${params.agencyVatApplicable !== false ? '+VAT' : ''} agency fees so Net Yield, Cashflow, CoC ROI & DSCR pass immediately.`,
              fixesAllHurdles: simEval.meetsBuyBox,
              targetMonthlyRentZAR: candidateRent,
            });
            break;
          }
          candidateRent += 50;
        }
      }
    }
  }

  // ============================================================================
  // LEVER 2: Max Allowable Purchase Price / Land Bid Solver (All Strategies)
  // ============================================================================
  if (params.purchasePrice > 100_000) {
    // Binary search between R 50,000 and current purchasePrice preserving LTV %
    let low = 50_000;
    let high = params.purchasePrice;
    let bestPrice: number | null = null;

    for (let iter = 0; iter < 30; iter++) {
      const mid = Math.floor((low + high) / 2 / 1000) * 1000;
      const midDeposit = Math.max(0, Math.round(mid * (1 - effectiveLtv / 100)));
      const simMetrics = simulateModifiedDeal(params, {
        purchasePrice: mid,
        depositZAR: midDeposit,
        loanToValuePercent: effectiveLtv,
        bondLTV: effectiveLtv,
      });
      const simEval = evaluateDealCriteria(simMetrics, profile, strategy);
      if (simEval.meetsBuyBox) {
        bestPrice = mid;
        low = mid + 1000;
      } else {
        high = mid - 1000;
      }
    }

    // For Development, if build works alone require more equity than War Chest at current LTC,
    // solve the Max Land Bid that satisfies the 20% POC, YoC & Debt Wipeout hurdles (or fits War Chest at 75% LTC).
    if (bestPrice === null && strategy === 'Development') {
      let devLow = 50_000;
      let devHigh = params.purchasePrice;
      for (let iter = 0; iter < 30; iter++) {
        const mid = Math.floor((devLow + devHigh) / 2 / 1000) * 1000;
        const midDeposit = Math.max(0, Math.round(mid * (1 - effectiveLtv / 100)));
        const simMetrics = simulateModifiedDeal(params, {
          purchasePrice: mid,
          depositZAR: midDeposit,
          loanToValuePercent: effectiveLtv,
          bondLTV: effectiveLtv,
        });
        const simEval = evaluateDealCriteria(simMetrics, profile, 'Development');
        const pocAndWipeoutPass =
          simEval.criteriaMap['minDevelopmentPoc'] &&
          simEval.criteriaMap['minDevelopmentYoc'] &&
          simEval.criteriaMap['maxDebtWipeoutUnits'];
        if (pocAndWipeoutPass) {
          bestPrice = mid;
          devLow = mid + 1000;
        } else {
          devHigh = mid - 1000;
        }
      }
    }

    // Fine-tune downward in R 1,000 steps if needed
    if (bestPrice !== null && bestPrice < params.purchasePrice) {
      const finalDeposit = Math.max(0, Math.round(bestPrice * (1 - effectiveLtv / 100)));
      const verifyMetrics = simulateModifiedDeal(params, {
        purchasePrice: bestPrice,
        depositZAR: finalDeposit,
        loanToValuePercent: effectiveLtv,
        bondLTV: effectiveLtv,
      });
      const verifyEval = evaluateDealCriteria(verifyMetrics, profile, strategy);
      if (verifyEval.meetsBuyBox || (strategy === 'Development' && verifyEval.criteriaMap['minDevelopmentPoc'])) {
        const discountZAR = params.purchasePrice - bestPrice;
        const discountPct = Number(((discountZAR / params.purchasePrice) * 100).toFixed(1));
        levers.push({
          id: 'price',
          label: strategy === 'Development' ? 'Max Allowable Land Bid' : 'Max Allowable Purchase Bid',
          currentValueLabel: formatCompactZAR(params.purchasePrice),
          targetValueLabel: formatCompactZAR(bestPrice),
          deltaLabel: `-${formatCompactZAR(discountZAR)} (-${discountPct}%)`,
          description:
            strategy === 'Development'
              ? `Negotiating the raw land bid down to ${formatCompactZAR(bestPrice)} lowers TDC to ${formatCompactZAR(verifyMetrics.devTdcZAR)} (${verifyMetrics.devPocPercent.toFixed(1)}% POC) and reduces required developer equity to ${formatCompactZAR(verifyMetrics.devEquityRequiredZAR)}.`
              : `Negotiating the bid down to ${formatCompactZAR(bestPrice)} (at ${effectiveLtv}% LTV) recalibrates SARS transfer duty, bond size, and Day-1 cash to pass all ${verifyEval.totalCount}/${verifyEval.totalCount} hurdles.`,
          fixesAllHurdles: verifyEval.meetsBuyBox,
          targetPriceZAR: bestPrice,
        });
      }
    }
  }

  // ============================================================================
  // LEVER 3: Optimal LTV / Senior LTC Structure Solver
  // ============================================================================
  if (strategy === 'Development' && !currentBuyBox.criteriaMap['maxDay1Cash']) {
    const currentLtc = params.seniorDebtLtcPercent ?? 65;
    const candidateLtcs = [75, 80, 70];
    let targetLtc: number | null = null;
    for (const cand of candidateLtcs) {
      if (cand <= currentLtc) continue;
      const simMetrics = simulateModifiedDeal(params, { seniorDebtLtcPercent: cand });
      const simEval = evaluateDealCriteria(simMetrics, profile, 'Development');
      if (simEval.criteriaMap['maxDay1Cash']) {
        targetLtc = cand;
        break;
      }
    }
    if (targetLtc === null && currentLtc < 75) {
      targetLtc = 75;
    } else if (targetLtc === null && currentLtc < 80) {
      targetLtc = 80;
    }

    if (targetLtc !== null) {
      const simMetrics = simulateModifiedDeal(params, { seniorDebtLtcPercent: targetLtc });
      const simEval = evaluateDealCriteria(simMetrics, profile, 'Development');
      const curEq = currentMetrics.devEquityRequiredZAR;
      const nextEq = simMetrics.devEquityRequiredZAR;
      const eqSaved = Math.max(0, curEq - nextEq);
      levers.push({
        id: 'ltv',
        label: `Increase LTC to ${targetLtc}% (TUHF/DFI)`,
        currentValueLabel: `${currentLtc}% LTC (${formatCompactZAR(curEq)})`,
        targetValueLabel: `${targetLtc}% LTC (${formatCompactZAR(nextEq)})`,
        deltaLabel: `-${formatCompactZAR(eqSaved)} Equity`,
        description: `Securing a ${targetLtc}% LTC Senior Development Facility (TUHF / DFI inner-city or infill mandate) expands senior debt to ${formatCompactZAR(simMetrics.devSeniorFacilityLimitZAR)} and reduces Developer Equity required by ${formatCompactZAR(eqSaved)}.`,
        fixesAllHurdles: simEval.meetsBuyBox,
        targetLtvPercent: targetLtc,
        targetSeniorDebtLtcPercent: targetLtc,
      });
    }
  } else if (
    strategy !== 'Development' &&
    (!currentBuyBox.criteriaMap['maxDay1Cash'] ||
      !currentBuyBox.criteriaMap['minDscr'] ||
      !currentBuyBox.criteriaMap['minMonthlyCashflow'])
  ) {
    let bestLtv: number | null = null;
    let bestLtvPassesAll = false;
    let bestPassedCount = currentBuyBox.passedCount;

    for (let candLtv = 0; candLtv <= 100; candLtv += 5) {
      if (candLtv === effectiveLtv) continue;
      const candDeposit = Math.max(0, Math.round(params.purchasePrice * (1 - candLtv / 100)));
      const simMetrics = simulateModifiedDeal(params, {
        loanToValuePercent: candLtv,
        bondLTV: candLtv,
        depositZAR: candDeposit,
      });
      const simEval = evaluateDealCriteria(simMetrics, profile, strategy);
      if (simEval.meetsBuyBox) {
        // Pick the LTV closest to current effectiveLtv that passes all hurdles
        if (!bestLtvPassesAll || Math.abs(candLtv - effectiveLtv) < Math.abs((bestLtv ?? 0) - effectiveLtv)) {
          bestLtv = candLtv;
          bestLtvPassesAll = true;
        }
      } else if (!bestLtvPassesAll && simEval.passedCount > bestPassedCount) {
        bestPassedCount = simEval.passedCount;
        bestLtv = candLtv;
      }
    }

    if (bestLtv !== null) {
      const targetDeposit = Math.max(0, Math.round(params.purchasePrice * (1 - bestLtv / 100)));
      const ltvDelta = bestLtv - effectiveLtv;
      levers.push({
        id: 'ltv',
        label: 'Restructure LTV / Cash Deposit',
        currentValueLabel: `${effectiveLtv}% LTV (${formatCompactZAR(currentMetrics.cashDeposit)})`,
        targetValueLabel: `${bestLtv}% LTV (${formatCompactZAR(targetDeposit)})`,
        deltaLabel: `${ltvDelta >= 0 ? '+' : ''}${ltvDelta}% LTV`,
        description:
          bestLtv > effectiveLtv
            ? `Increasing bond leverage to ${bestLtv}% LTV reduces Day-1 cash deposit to ${formatCompactZAR(targetDeposit)}.`
            : `Increasing cash deposit to ${formatCompactZAR(targetDeposit)} (${bestLtv}% LTV) reduces monthly bond debt service so DSCR & cashflow pass.`,
        fixesAllHurdles: bestLtvPassesAll,
        targetLtvPercent: bestLtv,
        targetDepositZAR: targetDeposit,
      });
    }
  }

  // ============================================================================
  // LEVER 4: Required Exit Valuation / Post-Rehab ARV / Scheme GDV
  // ============================================================================
  if (strategy === 'Flip' && !currentBuyBox.criteriaMap['minFlipRoi']) {
    let candExit = Math.max(params.targetExitPrice + 10_000, params.purchasePrice + params.estimatedRehabCost);
    for (let step = 0; step < 150; step++) {
      const simMetrics = params.costs
        ? calculateDealMetrics({ ...params, targetExitPrice: candExit })
        : simulateModifiedDeal(params, { targetExitPrice: candExit });
      const simEval = evaluateDealCriteria(simMetrics, profile, 'Flip');
      if (simEval.criteriaMap['minFlipRoi']) {
        const exitDelta = candExit - params.targetExitPrice;
        levers.push({
          id: 'exitPrice',
          label: 'Required Flip Exit Valuation',
          currentValueLabel: formatCompactZAR(params.targetExitPrice),
          targetValueLabel: formatCompactZAR(candExit),
          deltaLabel: `+${formatCompactZAR(exitDelta)}`,
          description: `Achieving an exit price of ${formatCompactZAR(candExit)} covers exit agent commission and holding burn while hitting the ${minFlipRoi}% Flip ROI hurdle.`,
          fixesAllHurdles: simEval.meetsBuyBox,
          targetExitPriceZAR: candExit,
        });
        break;
      }
      candExit += 25_000;
    }
  } else if (strategy === 'Development' && !currentBuyBox.criteriaMap['minDevelopmentPoc']) {
    const baseGdv = currentMetrics.devGdvInclVatZAR ?? params.targetExitPrice;
    let candGdv = Math.max(baseGdv + 50_000, currentMetrics.devTdcZAR ?? baseGdv);
    for (let step = 0; step < 150; step++) {
      const simMetrics = params.costs
        ? calculateDealMetrics({ ...params, targetExitPrice: candGdv })
        : simulateModifiedDeal(params, { targetExitPrice: candGdv });
      const simEval = evaluateDealCriteria(simMetrics, profile, 'Development');
      if (simEval.criteriaMap['minDevelopmentPoc']) {
        const gdvDelta = candGdv - baseGdv;
        levers.push({
          id: 'exitPrice',
          label: 'Required Completed Scheme GDV',
          currentValueLabel: formatCompactZAR(baseGdv),
          targetValueLabel: formatCompactZAR(candGdv),
          deltaLabel: `+${formatCompactZAR(gdvDelta)}`,
          description: `Pricing completed units for a total scheme GDV of ${formatCompactZAR(candGdv)} achieves the ${minDevPoc}% Profit on Cost (POC) hurdle.`,
          fixesAllHurdles: simEval.meetsBuyBox,
          targetExitPriceZAR: candGdv,
        });
        break;
      }
      candGdv += 50_000;
    }
  }

  // ============================================================================
  // LEVER 5: Strategy Pivot Lever (If another strategy passes all Buy-Box hurdles)
  // ============================================================================
  const matrix = evaluateThreeStrategyMatrix(params, profile, nodeOrCity);
  const passingAlt = matrix.orderedStrategies.find(
    (s) => s.strategy !== strategy && s.buyBox.meetsBuyBox
  );
  if (passingAlt) {
    levers.push({
      id: 'strategySwitch',
      label: `Pivot Strategy to ${passingAlt.label}`,
      currentValueLabel: strategy,
      targetValueLabel: passingAlt.strategy,
      deltaLabel: `${passingAlt.buyBox.passedCount}/${passingAlt.buyBox.totalCount} Hurdles Met`,
      description: `${passingAlt.summary} Switching strategy aligns this asset with its strongest return profile.`,
      fixesAllHurdles: true,
      targetStrategy: passingAlt.strategy,
    });
  }

  return {
    strategy,
    meetsBuyBox: currentBuyBox.meetsBuyBox,
    passedCount: currentBuyBox.passedCount,
    totalCount: currentBuyBox.totalCount,
    failedHurdles,
    levers,
  };
}
