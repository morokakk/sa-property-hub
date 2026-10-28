import { describe, it, expect } from 'vitest';
import {
  ALL_INVESTMENT_NODES,
  findInvestmentNode,
  evaluateNodeBenchmarks,
} from '@/lib/constants/investmentNodes';
import {
  evaluateThreeStrategyMatrix,
  solveDealRepairLevers,
  DealMetricsInputParams,
} from '@/lib/calculations/dealIntelligence';
import {
  calculateDealMetrics,
  evaluateDealCriteria,
} from '@/lib/calculations/propertyMetrics';
import { InvestorProfile } from '@/types';

const mockInvestorProfile: Partial<InvestorProfile> = {
  entityName: 'Apex Prop Syndicate',
  marginalTaxRatePercent: 45,
  minNetYieldPercent: 9.0,
  minNetRoiPercent: 10.0,
  minMonthlyCashflowZAR: 1500,
  minDscr: 1.25,
  minFlipRoiPercent: 18.0,
  maxDay1CashZAR: 500_000,
  defaultBondCancellationFeeZAR: 5200,
};

describe('investmentNodes — Benchmarks & Guardrail #2 (Graceful R/m² check)', () => {
  it('populates quantitative benchmarks across all 35 SA investment nodes', () => {
    expect(ALL_INVESTMENT_NODES.length).toBeGreaterThanOrEqual(35);
    for (const node of ALL_INVESTMENT_NODES) {
      expect(node.benchmarks).toBeDefined();
      expect(node.benchmarks.grossYieldRangePercent[0]).toBeLessThan(
        node.benchmarks.grossYieldRangePercent[1]
      );
      expect(node.benchmarks.typicalVacancyPercent).toBeGreaterThan(0);
      expect(node.benchmarks.typicalCapitalGrowthPercent).toBeGreaterThan(0);
      expect(node.benchmarks.pricePerSqmRangeZAR[0]).toBeLessThan(
        node.benchmarks.pricePerSqmRangeZAR[1]
      );
      expect(node.benchmarks.typicalMonthlyRatesPercentOfVal).toBeGreaterThan(0);
    }
  });

  it('Guardrail #2: evaluates yield, vacancy, growth, and rates unconditionally, and ONLY triggers pricePerSqm badge when purchasePricePerSqm > 0', () => {
    const sandton = findInvestmentNode('Sandton');
    expect(sandton).toBeDefined();

    // Case A: purchasePricePerSqm is 0 / unset -> should NOT emit pricePerSqm item even though 0 is below Sandton's range
    const auditWithoutSqm = evaluateNodeBenchmarks(sandton, {
      grossYield: 15.0, // above Sandton range -> optimistic
      vacancyRatePercent: 1.0, // below Sandton norm -> optimistic
      annualCapitalGrowthPercent: 10.0, // above Sandton norm -> optimistic
      monthlyRatesZAR: 500,
      purchasePrice: 2_000_000,
      purchasePricePerSqm: 0,
    });

    expect(auditWithoutSqm).not.toBeNull();
    const metricsWithoutSqm = auditWithoutSqm!.items.map((b) => b.metric);
    expect(metricsWithoutSqm).toContain('grossYield');
    expect(metricsWithoutSqm).toContain('vacancyRate');
    expect(metricsWithoutSqm).toContain('capitalGrowth');
    expect(metricsWithoutSqm).toContain('monthlyRates');
    expect(metricsWithoutSqm).not.toContain('pricePerSqm');

    // Case B: purchasePricePerSqm > 0 and outside range -> MUST emit pricePerSqm item
    const auditWithSqm = evaluateNodeBenchmarks(sandton, {
      grossYield: 8.5,
      vacancyRatePercent: 5.5,
      annualCapitalGrowthPercent: 4.5,
      monthlyRatesZAR: 1500,
      purchasePrice: 2_000_000,
      purchasePricePerSqm: 14_000, // well below Sandton min
    });

    expect(auditWithSqm).not.toBeNull();
    const sqmBadge = auditWithSqm!.items.find((b) => b.metric === 'pricePerSqm');
    expect(sqmBadge).toBeDefined();
    expect(sqmBadge?.status).toBe('conservative');
  });
});

describe('dealIntelligence — 3-Strategy Matrix & Guardrail #1 (Exact Net-to-Gross Rent Solver)', () => {
  const baseFailingRentalDeal: DealMetricsInputParams = {
    purchasePrice: 1_200_000,
    openMarketValueZAR: 1_300_000,
    estimatedRehabCost: 60_000,
    monthlyRentalEstimate: 10_500, // Too low to pass Net Yield 9%, CoC 10%, DSCR 1.25, and +R1,500 cashflow
    monthlyLevies: 1_400,
    monthlyRatesTaxes: 850,
    annualInsurance: 6_000,
    managementFeePercent: 8,
    agencyVatApplicable: true,
    tenantPlacementFeePercent: 4,
    vacancyRatePercent: 5,
    bondLTV: 80,
    loanToValuePercent: 80,
    depositZAR: 240_000,
    interestRatePercent: 11.75,
    loanTermYears: 20,
    targetExitPrice: 1_750_000,
    holdingPeriodMonths: 6,
    exitCommissionPercent: 5.75,
    refinanceLtvPercent: 75,
    strategy: 'Rental',
  };

  it('evaluates Rental, Flip, and BRRRR simultaneously and ranks the best strategy', () => {
    const matrix = evaluateThreeStrategyMatrix(baseFailingRentalDeal, mockInvestorProfile, 'Sandton');
    expect(matrix.orderedStrategies).toHaveLength(3);
    const strategies = Object.keys(matrix.strategies);
    expect(strategies).toEqual(['Rental', 'Flip', 'BRRRR']);
    expect(['Rental', 'Flip', 'BRRRR']).toContain(matrix.recommendedStrategy);
    expect(matrix.recommendationReason.length).toBeGreaterThan(10);
  });

  it('Guardrail #1: clicking Apply Target Rent immediately turns all income-driven Buy-Box badges (Net Yield, CoC, Cashflow, DSCR) green on the first click', () => {
    // Confirm the base deal initially fails income hurdles
    const initialMetrics = calculateDealMetrics(baseFailingRentalDeal);
    const initialEval = evaluateDealCriteria(initialMetrics, mockInvestorProfile, 'Rental');
    expect(initialEval.meetsBuyBox).toBe(false);

    // Run Deal-Repair solver
    const repairPlan = solveDealRepairLevers(baseFailingRentalDeal, mockInvestorProfile, 'Rental');
    expect(repairPlan.meetsBuyBox).toBe(false);

    const rentLever = repairPlan.levers.find((l) => l.id === 'rent');
    expect(rentLever).toBeDefined();
    expect(rentLever!.targetMonthlyRentZAR).toBeDefined();
    expect(rentLever!.targetMonthlyRentZAR! % 50).toBe(0); // Rounded to nearest R 50

    // Apply the solved targetMonthlyRentZAR back into calculateDealMetrics + evaluateDealCriteria
    const repairedInputs: DealMetricsInputParams = {
      ...baseFailingRentalDeal,
      monthlyRentalEstimate: rentLever!.targetMonthlyRentZAR!,
    };
    const repairedMetrics = calculateDealMetrics(repairedInputs);
    const repairedEval = evaluateDealCriteria(repairedMetrics, mockInvestorProfile, 'Rental');

    expect(repairedEval.criteriaMap['minNetYield']).toBe(true);
    expect(repairedEval.criteriaMap['minNetRoi']).toBe(true);
    expect(repairedEval.criteriaMap['minMonthlyCashflow']).toBe(true);
    expect(repairedEval.criteriaMap['minDscr']).toBe(true);
    expect(repairedEval.meetsBuyBox).toBe(true);
  });

  it('solves Max Allowable Purchase Bid that turns Rental Buy-Box hurdles green when applied', () => {
    const repairPlan = solveDealRepairLevers(baseFailingRentalDeal, mockInvestorProfile, 'Rental');
    const bidLever = repairPlan.levers.find((l) => l.id === 'price');
    expect(bidLever).toBeDefined();
    expect(bidLever!.targetPriceZAR).toBeLessThan(baseFailingRentalDeal.purchasePrice);

    const bestPrice = bidLever!.targetPriceZAR!;
    const newDeposit = Math.round(bestPrice * 0.2);
    const repairedInputs: DealMetricsInputParams = {
      ...baseFailingRentalDeal,
      purchasePrice: bestPrice,
      depositZAR: newDeposit,
      bondLTV: 80,
      loanToValuePercent: 80,
    };
    const repairedMetrics = calculateDealMetrics(repairedInputs);
    const repairedEval = evaluateDealCriteria(repairedMetrics, mockInvestorProfile, 'Rental');
    expect(repairedEval.meetsBuyBox).toBe(true);
  });
});
