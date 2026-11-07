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
  calculateDevelopmentRateShockScenarios,
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

  it('includes the 4th Development strategy in the matrix when strategy is Development or numberOfUnits >= 2, and solves Development POC & Equity hurdles', () => {
    const devDeal: DealMetricsInputParams = {
      ...baseFailingRentalDeal,
      strategy: 'Development',
      numberOfUnits: 6,
      floorAreaSqm: 390,
      purchasePrice: 1_850_000,
      monthlyRentalEstimate: 57_000,
      targetExitPrice: 7_200_000, // Low GDV so POC is below 20%
      hardCostPerSqmZAR: 9_800,
      contingencyPercent: 7.5,
      softCostAllowancePercent: 15,
      preApprovalMonths: 4,
      constructionMonths: 8,
      monthlyPreApprovalBurnZAR: 3_500,
      monthlyConstructionBurnZAR: 12_500,
      seniorDebtLtcPercent: 65,
      sCurveUtilizationPercent: 60,
      preSalesHurdlePercent: 60,
      isVatRegisteredDeveloper: true,
    };

    const matrix = evaluateThreeStrategyMatrix(
      devDeal,
      { ...mockInvestorProfile, liquidCapitalReserveZAR: 450_000 },
      'Sandton'
    );
    expect(matrix.orderedStrategies).toHaveLength(4);
    expect(Object.keys(matrix.strategies)).toEqual(['Rental', 'Flip', 'BRRRR', 'Development']);
    expect(matrix.strategies.Development).toBeDefined();
    expect(matrix.strategies.Development?.primaryKpiLabel).toBe('Net Dev Profit / POC');
    expect(matrix.recommendedStrategy).toBe('Development');
    expect(matrix.strategies.Development?.buyBox.totalCount).toBe(4);

    const devMetrics = calculateDealMetrics(devDeal);
    expect(devMetrics.devTdcZAR).toBeGreaterThan(5_000_000);
    expect(devMetrics.devUnitsRequiredForDebtWipeout).toBeGreaterThan(0);

    const repairPlan = solveDealRepairLevers(
      devDeal,
      { ...mockInvestorProfile, liquidCapitalReserveZAR: 450_000 },
      'Development',
      'Sandton'
    );
    expect(repairPlan.totalCount).toBe(4);
    expect(repairPlan.failedHurdles.map((h) => h.key)).toContain('minDevelopmentPoc');
    expect(repairPlan.failedHurdles.map((h) => h.key)).toContain('maxDay1Cash');

    const landBidLever = repairPlan.levers.find((l) => l.id === 'price');
    expect(landBidLever).toBeDefined();
    expect(landBidLever!.targetPriceZAR).toBeLessThan(devDeal.purchasePrice);

    const ltcLever = repairPlan.levers.find((l) => l.id === 'ltv');
    expect(ltcLever).toBeDefined();
    expect(ltcLever!.targetSeniorDebtLtcPercent).toBe(75);
    expect(ltcLever!.label).toContain('Increase LTC to 75% (TUHF/DFI)');

    const gdvLever = repairPlan.levers.find((l) => l.id === 'exitPrice');
    expect(gdvLever).toBeDefined();
    expect(gdvLever!.targetExitPriceZAR).toBeGreaterThan(devDeal.targetExitPrice!);

    // Verify SARB Shock Exposure bound to Senior Development Facility
    const devRateShocks = calculateDevelopmentRateShockScenarios({
      seniorDebtZAR: devMetrics.devSeniorFacilityLimitZAR,
      sCurveUtilizationPercent: 60,
      baseRatePercent: 10.75,
      preApprovalMonths: 4,
      constructionMonths: 8,
      monthlyPreApprovalBurnZAR: 3_500,
      monthlyConstructionBurnZAR: 12_500,
      baseNonCarryingTdcZAR: devMetrics.devTdcZAR - devMetrics.devTotalCarryingCostZAR,
      netRealizableGdvPlusInputVatZAR:
        devMetrics.devNetRealizableGdvZAR + devMetrics.devClaimableInputVatZAR,
      exitMode: 'Build-to-Sell',
      monthlyNoi: devMetrics.monthlyNOI,
      loanTermYears: 20,
      minDscr: 1.25,
    });
    expect(devRateShocks).toHaveLength(3);
    expect(devRateShocks[0].ratePercent).toBe(10.75);
    expect(devRateShocks[1].ratePercent).toBe(11.75);
    expect(devRateShocks[2].ratePercent).toBe(12.75);
    expect(devRateShocks[2].avgMonthlySCurveInterestZAR).toBeGreaterThan(
      devRateShocks[0].avgMonthlySCurveInterestZAR
    );
    expect(devRateShocks[2].totalCarryingBurnWithDelayZAR).toBeGreaterThan(
      devRateShocks[0].totalCarryingBurnWithDelayZAR
    );
  });
});
