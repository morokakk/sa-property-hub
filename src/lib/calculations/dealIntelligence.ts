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
  strategies: Record<DealStrategy, StrategyVerdictItem>;
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
  profile: Partial<InvestorProfile> = {},
  nodeOrCity?: InvestmentNode | string
): ThreeStrategyMatrixResult {
  const node = typeof nodeOrCity === 'string' ? findInvestmentNode(nodeOrCity) : nodeOrCity;

  // Compute full metrics once (calculateDealMetrics computes Rental, Flip, and BRRRR fields together)
  const metrics = calculateDealMetrics({
    ...params,
    costs: undefined, // allow clean recomputation if needed, or use provided costs if not overridden
    recomputeBondRegFromDeposit: true,
  });

  // If custom costs were explicitly passed, use params directly for exact parity with Analyzer page
  const exactMetrics = params.costs ? calculateDealMetrics(params) : metrics;

  const minFlipRoi = profile.minFlipRoiPercent ?? 18.0;
  const maxDay1Cash = profile.maxDay1CashZAR ?? 500_000;

  // 1. Rental Evaluation
  const rentalBuyBox = evaluateDealCriteria(exactMetrics, profile, 'Rental');
  const rentalNodeMatch = node ? node.recommendedStrategies.includes('Rental') : true;
  let rentalScore = Math.round((rentalBuyBox.passedCount / Math.max(1, rentalBuyBox.totalCount)) * 70);
  if (rentalNodeMatch) rentalScore += 15;
  if (exactMetrics.monthlyCashFlow > 0) rentalScore += Math.min(10, Math.round(exactMetrics.netRoi / 2));
  if ((exactMetrics.dscr ?? 1.5) >= (profile.minDscr ?? 1.2)) rentalScore += 5;
  rentalScore = Math.max(0, Math.min(100, rentalScore));

  // 2. Flip Evaluation
  const flipBuyBox = evaluateDealCriteria(exactMetrics, profile, 'Flip');
  const flipNodeMatch = node ? node.recommendedStrategies.includes('Flip') : true;
  let flipScore = Math.round((flipBuyBox.passedCount / Math.max(1, flipBuyBox.totalCount)) * 70);
  if (flipNodeMatch) flipScore += 15;
  if (exactMetrics.projectedFlipNetProfit > 0) {
    flipScore += Math.min(15, Math.round((exactMetrics.projectedFlipRoi / Math.max(1, minFlipRoi)) * 10));
  }
  flipScore = Math.max(0, Math.min(100, flipScore));

  // 3. BRRRR Evaluation
  // Uses Rental/BRRRR base criteria + evaluates Post-Refi Cashflow & Capital Recycling efficiency
  const baseBrrrrBuyBox = evaluateDealCriteria(exactMetrics, profile, 'BRRRR');
  const brrrrNodeMatch = node ? node.recommendedStrategies.includes('BRRRR') : true;
  const postRefiCashflowPositive = exactMetrics.brrrrPostRefiCashflowZAR >= 0;
  const capitalRecycledWell = exactMetrics.brrrrCashLeftInDealZAR <= maxDay1Cash;
  let brrrrScore = Math.round((baseBrrrrBuyBox.passedCount / Math.max(1, baseBrrrrBuyBox.totalCount)) * 60);
  if (brrrrNodeMatch) brrrrScore += 15;
  if (postRefiCashflowPositive) brrrrScore += 12;
  if (capitalRecycledWell) brrrrScore += 8;
  if (exactMetrics.brrrrCashLeftInDealZAR === 0) brrrrScore += 5;
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

  rawScores.sort((a, b) => {
    if (a.meets !== b.meets) return a.meets ? -1 : 1;
    return b.score - a.score;
  });

  const recommendedStrategy = rawScores[0].strategy;

  const strategies: Record<DealStrategy, StrategyVerdictItem> = {
    Rental: {
      strategy: 'Rental',
      label: 'Buy & Hold Rental',
      buyBox: rentalBuyBox,
      score: rentalScore,
      isNodeRecommended: rentalNodeMatch,
      primaryKpiLabel: 'Net Cashflow / CoC',
      primaryKpiValue: `${formatCompactZAR(exactMetrics.monthlyCashFlow)}/m (${exactMetrics.netRoi.toFixed(1)}%)`,
      secondaryKpiLabel: 'Net Yield / DSCR',
      secondaryKpiValue: `${exactMetrics.capRate.toFixed(1)}% • ${exactMetrics.dscr === null ? 'Cash' : `${exactMetrics.dscr.toFixed(2)}x`}`,
      verdictBadge: buildVerdictBadge(rentalBuyBox.meetsBuyBox, rentalBuyBox.passedCount, rentalBuyBox.totalCount, recommendedStrategy === 'Rental'),
      summary: rentalBuyBox.meetsBuyBox
        ? `Passes all ${rentalBuyBox.totalCount} rental hurdles with ${formatCompactZAR(exactMetrics.monthlyCashFlow)}/m cashflow.`
        : `Meets ${rentalBuyBox.passedCount}/${rentalBuyBox.totalCount} hurdles (${exactMetrics.capRate.toFixed(1)}% Cap Rate).`,
    },
    Flip: {
      strategy: 'Flip',
      label: 'Buy & Flip',
      buyBox: flipBuyBox,
      score: flipScore,
      isNodeRecommended: flipNodeMatch,
      primaryKpiLabel: 'Net Flip Profit',
      primaryKpiValue: formatCompactZAR(exactMetrics.projectedFlipNetProfit),
      secondaryKpiLabel: 'Flip ROI (Ann.)',
      secondaryKpiValue: `${exactMetrics.projectedFlipRoi.toFixed(1)}% (${exactMetrics.annualizedFlipRoi.toFixed(1)}%/yr)`,
      verdictBadge: buildVerdictBadge(flipBuyBox.meetsBuyBox, flipBuyBox.passedCount, flipBuyBox.totalCount, recommendedStrategy === 'Flip'),
      summary: flipBuyBox.meetsBuyBox
        ? `Exceeds ${minFlipRoi}% Flip ROI hurdle with ${formatCompactZAR(exactMetrics.projectedFlipNetProfit)} net profit.`
        : `Projected Flip ROI of ${exactMetrics.projectedFlipRoi.toFixed(1)}% vs ${minFlipRoi}% target.`,
    },
    BRRRR: {
      strategy: 'BRRRR',
      label: 'Hybrid BRRRR',
      buyBox: baseBrrrrBuyBox,
      score: brrrrScore,
      isNodeRecommended: brrrrNodeMatch,
      primaryKpiLabel: 'Post-Refi Cashflow',
      primaryKpiValue: `${formatCompactZAR(exactMetrics.brrrrPostRefiCashflowZAR)}/m`,
      secondaryKpiLabel: 'Cash Left in Deal',
      secondaryKpiValue:
        exactMetrics.brrrrCashLeftInDealZAR === 0
          ? 'R 0 (100% Recycled)'
          : formatCompactZAR(exactMetrics.brrrrCashLeftInDealZAR),
      verdictBadge: buildVerdictBadge(baseBrrrrBuyBox.meetsBuyBox, baseBrrrrBuyBox.passedCount, baseBrrrrBuyBox.totalCount, recommendedStrategy === 'BRRRR'),
      summary:
        exactMetrics.brrrrCashLeftInDealZAR === 0
          ? `100% capital recycled on refi with ${formatCompactZAR(exactMetrics.brrrrPostRefiCashflowZAR)}/m post-refi flow.`
          : `Leaves ${formatCompactZAR(exactMetrics.brrrrCashLeftInDealZAR)} in deal post-refi (${formatCompactZAR(exactMetrics.brrrrEquityExtractedZAR)} extracted).`,
    },
  };

  const orderedStrategies = rawScores.map((r) => strategies[r.strategy]);

  let recommendationReason = '';
  if (recommendedStrategy === 'Rental') {
    recommendationReason = `Buy & Hold Rental scores highest (${rentalScore}/100) with ${rentalBuyBox.passedCount}/${rentalBuyBox.totalCount} Buy-Box hurdles met and ${exactMetrics.fiveYearIrrPercent.toFixed(1)}% 5-Yr IRR.`;
  } else if (recommendedStrategy === 'Flip') {
    recommendationReason = `Buy & Flip scores highest (${flipScore}/100), unlocking ${formatCompactZAR(exactMetrics.projectedFlipNetProfit)} net profit (${exactMetrics.projectedFlipRoi.toFixed(1)}% ROI) over ${params.holdingPeriodMonths ?? 6} months.`;
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
  profile: Partial<InvestorProfile> = {},
  strategy: DealStrategy = params.strategy ?? 'Rental',
  nodeOrCity?: InvestmentNode | string
): DealRepairPrescription {
  const currentMetrics = params.costs ? calculateDealMetrics(params) : simulateModifiedDeal(params, {});
  const currentBuyBox = evaluateDealCriteria(currentMetrics, profile, strategy);

  const minNetYield = profile.minNetYieldPercent ?? 8.0;
  const minMonthlyCashflow = profile.minMonthlyCashflowZAR ?? 1500;
  const minNetRoi = profile.minNetRoiPercent ?? 8.0;
  const minFlipRoi = profile.minFlipRoiPercent ?? 18.0;
  const maxDay1Cash = profile.maxDay1CashZAR ?? 500_000;
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
  if (strategy !== 'Flip') {
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
  // LEVER 2: Max Allowable Purchase Price Solver (All Strategies)
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

    // Fine-tune downward in R 1,000 steps if needed to ensure strict Buy-Box pass
    if (bestPrice !== null && bestPrice < params.purchasePrice) {
      const finalDeposit = Math.max(0, Math.round(bestPrice * (1 - effectiveLtv / 100)));
      const verifyMetrics = simulateModifiedDeal(params, {
        purchasePrice: bestPrice,
        depositZAR: finalDeposit,
        loanToValuePercent: effectiveLtv,
        bondLTV: effectiveLtv,
      });
      const verifyEval = evaluateDealCriteria(verifyMetrics, profile, strategy);
      if (verifyEval.meetsBuyBox) {
        const discountZAR = params.purchasePrice - bestPrice;
        const discountPct = Number(((discountZAR / params.purchasePrice) * 100).toFixed(1));
        levers.push({
          id: 'price',
          label: 'Max Allowable Purchase Bid',
          currentValueLabel: formatCompactZAR(params.purchasePrice),
          targetValueLabel: formatCompactZAR(bestPrice),
          deltaLabel: `-${formatCompactZAR(discountZAR)} (-${discountPct}%)`,
          description: `Negotiating the bid down to ${formatCompactZAR(bestPrice)} (at ${effectiveLtv}% LTV) recalibrates SARS transfer duty, bond size, and Day-1 cash to pass all ${verifyEval.totalCount}/${verifyEval.totalCount} hurdles.`,
          fixesAllHurdles: true,
          targetPriceZAR: bestPrice,
        });
      }
    }
  }

  // ============================================================================
  // LEVER 3: Optimal LTV / Deposit Structure Solver
  // ============================================================================
  if (!currentBuyBox.criteriaMap['maxDay1Cash'] || !currentBuyBox.criteriaMap['minDscr'] || !currentBuyBox.criteriaMap['minMonthlyCashflow']) {
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
  // LEVER 4: Required Exit Valuation / Post-Rehab ARV (Flip & BRRRR)
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
