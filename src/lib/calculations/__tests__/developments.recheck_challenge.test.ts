import { describe, it, expect } from 'vitest';
import {
  calculateDevelopmentFinancials,
  calculateDevelopmentSoftCostsTotal,
  calculateBOQItemTotals,
  calculateDevelopmentHoldingSensitivity,
  calculateApprovalsProgress,
  calculateIncreasedAmount,
  type DevelopmentFinancialSummary,
} from '../developments';
import type {
  DevelopmentProject,
  DevelopmentSoftCosts,
  DevelopmentUnit,
  BOQItem,
  PreConstructionApprovals,
} from '@/types';

describe('Milestone 3 Recheck Challenger: Edge Conditions & Adversarial Harness', () => {
  const createBaseProject = (overrides?: Partial<DevelopmentProject>): DevelopmentProject => ({
    id: 'dev-recheck-challenger',
    title: 'Recheck Challenger Project',
    address: '1 Challenger Way',
    city: 'Cape Town',
    province: 'Western Cape',
    developmentType: 'Sectional Title Apartments',
    isVatRegisteredDeveloper: true,
    taxEntityType: 'Company (27%)',
    currentPhase: 'Feasibility',
    preApprovalMonths: 6,
    constructionMonths: 12,
    sellDownMonths: 6,
    landPurchasePriceZAR: 2_000_000,
    acquisitionCostsZAR: 100_000,
    sec118ArrearsZAR: 0,
    softCosts: {
      townPlannerZAR: 50_000,
      architectZAR: 100_000,
      structuralCivilEngineerZAR: 50_000,
      quantitySurveyorZAR: 50_000,
      nhbrcEnrolmentFeeZAR: 25_000,
      councilBulkContributionsZAR: 150_000,
      planScrutinyAndSubdivisionFeesZAR: 25_000,
      marketingAndShowUnitZAR: 50_000,
    },
    totalBuildableAreaSqm: 1_000,
    budgetedHardCostPerSqmZAR: 12_000,
    contingencyPercent: 10,
    boqItems: [],
    monthlyPreApprovalHoldingBurnZAR: 20_000,
    monthlyConstructionHoldingBurnZAR: 30_000,
    developmentFacilityLimitZAR: 10_000_000,
    developmentFacilityDrawnZAR: 6_000_000,
    developmentFacilityRepaidZAR: 2_000_000,
    preSalesHurdlePercent: 60,
    approvals: {
      splumaRezoningSubdivision: { status: 'Approved' },
      sgDiagramApproval: { status: 'Approved' },
      municipalBuildingPlans: { status: 'Approved' },
      nhbrcEnrolment: { status: 'Approved' },
      sectionalTitleRegister: { status: 'Not Started' },
      occupancyCertificate: { status: 'Not Started' },
    },
    units: [],
    ...overrides,
  });

  // =========================================================================
  // 1. Pure Helper: calculateBOQItemTotals
  // =========================================================================
  describe('Helper 1: calculateBOQItemTotals Edge Conditions', () => {
    it('handles all zero inputs deterministically', () => {
      const res = calculateBOQItemTotals(0, 0, 0);
      expect(res).toEqual({ baselineTotalZAR: 0, varianceZAR: 0 });
      expect(Number.isFinite(res.baselineTotalZAR)).toBe(true);
      expect(Number.isFinite(res.varianceZAR)).toBe(true);
    });

    it('handles negative quantity, negative unit cost, and negative actual cost', () => {
      // qty = -5, unitCost = 1000 -> baselineTotalZAR = -5000. actual = 2000 -> variance = 2000 - (-5000) = 7000
      const res1 = calculateBOQItemTotals(-5, 1000, 2000);
      expect(res1.baselineTotalZAR).toBe(-5000);
      expect(res1.varianceZAR).toBe(7000);

      // qty = 10, unitCost = -200 -> baselineTotalZAR = -2000. actual = -3000 -> variance = -3000 - (-2000) = -1000
      const res2 = calculateBOQItemTotals(10, -200, -3000);
      expect(res2.baselineTotalZAR).toBe(-2000);
      expect(res2.varianceZAR).toBe(-1000);
    });

    it('handles extreme multi-billion figures without integer overflow', () => {
      const res = calculateBOQItemTotals(5_000_000, 25_000, 130_000_000_000);
      // baseline = 125_000_000_000 (125 Billion ZAR)
      // actual = 130_000_000_000
      // variance = +5_000_000_000
      expect(res.baselineTotalZAR).toBe(125_000_000_000);
      expect(res.varianceZAR).toBe(5_000_000_000);
      expect(Number.isFinite(res.baselineTotalZAR)).toBe(true);
      expect(Number.isFinite(res.varianceZAR)).toBe(true);
    });

    it('handles NaN, null, and undefined coerced inputs gracefully', () => {
      const resNull = calculateBOQItemTotals(null as any, undefined as any, NaN as any);
      expect(resNull.baselineTotalZAR).toBe(0);
      expect(resNull.varianceZAR).toBe(0);

      const resStr = calculateBOQItemTotals('100' as any, '250' as any, '30000' as any);
      expect(resStr.baselineTotalZAR).toBe(25_000);
      expect(resStr.varianceZAR).toBe(5_000);
    });
  });

  // =========================================================================
  // 2. Pure Helper: calculateDevelopmentHoldingSensitivity
  // =========================================================================
  describe('Helper 2: calculateDevelopmentHoldingSensitivity Edge Conditions', () => {
    it('handles development with 0 duration, 0 burn, 0 debt, and 0 cost basis without crashing', () => {
      const zeroDev = createBaseProject({
        preApprovalMonths: 0,
        constructionMonths: 0,
        monthlyPreApprovalHoldingBurnZAR: 0,
        monthlyConstructionHoldingBurnZAR: 0,
        developmentFacilityDrawnZAR: 0,
        landPurchasePriceZAR: 0,
        acquisitionCostsZAR: 0,
        totalBuildableAreaSqm: 0,
        budgetedHardCostPerSqmZAR: 0,
        softCosts: undefined,
      });

      const res = calculateDevelopmentHoldingSensitivity(zeroDev);
      expect(res).toBeDefined();
      // calculateDelaySensitivityMatrix defaults durationMonths to 6 when 0 / falsy
      expect(res.scenarios[0].totalDurationMonths).toBe(6);
      // Monthly holding defaults to 12500 when <= 0
      expect(res.monthlyHoldingBurnZAR).toBe(12500);
      expect(res.scenarios.length).toBeGreaterThan(0);
      for (const sc of res.scenarios) {
        expect(Number.isFinite(sc.additionalHoldingBurnZAR)).toBe(true);
        expect(Number.isFinite(sc.additionalDebtInterestZAR)).toBe(true);
        expect(Number.isFinite(sc.netProfitAfterTaxZAR)).toBe(true);
      }
    });

    it('accepts pre-computed financials parameter avoiding recomputation', () => {
      const dev = createBaseProject();
      const fin = calculateDevelopmentFinancials(dev);
      const res = calculateDevelopmentHoldingSensitivity(dev, fin);
      expect(res).toBeDefined();
      expect(res.scenarios[0].totalDurationMonths).toBe(18);
    });

    it('handles negative durations and negative monthly burns safely', () => {
      const negDev = createBaseProject({
        preApprovalMonths: -5,
        constructionMonths: -10,
        monthlyPreApprovalHoldingBurnZAR: -10_000,
        monthlyConstructionHoldingBurnZAR: -20_000,
      });

      const res = calculateDevelopmentHoldingSensitivity(negDev);
      expect(res).toBeDefined();
      // Since monthlyHolding is negative (-20000), it falls back to 12500
      expect(res.monthlyHoldingBurnZAR).toBe(12500);
      expect(Number.isFinite(res.zeroMarginDelayDays)).toBe(true);
    });
  });

  // =========================================================================
  // 3. Pure Helper: calculateApprovalsProgress
  // =========================================================================
  describe('Helper 3: calculateApprovalsProgress Edge Conditions', () => {
    it('handles null, undefined, and empty approvals object', () => {
      const resNull = calculateApprovalsProgress(null);
      expect(resNull).toEqual({
        approvedCount: 0,
        totalItems: 6,
        progressPercent: 0,
        isStage1Approved: false,
      });

      const resUndef = calculateApprovalsProgress(undefined, 8);
      expect(resUndef).toEqual({
        approvedCount: 0,
        totalItems: 8,
        progressPercent: 0,
        isStage1Approved: false,
      });

      const resEmpty = calculateApprovalsProgress({} as any, 6);
      expect(resEmpty).toEqual({
        approvedCount: 0,
        totalItems: 6,
        progressPercent: 0,
        isStage1Approved: false,
      });
    });

    it('handles totalItems = 0 and negative totalItems without division by zero', () => {
      const allApproved: PreConstructionApprovals = {
        splumaRezoningSubdivision: { status: 'Approved' },
        sgDiagramApproval: { status: 'Approved' },
        municipalBuildingPlans: { status: 'Approved' },
        nhbrcEnrolment: { status: 'Approved' },
        sectionalTitleRegister: { status: 'Approved' },
        occupancyCertificate: { status: 'Approved' },
      };

      const resZero = calculateApprovalsProgress(allApproved, 0);
      expect(resZero.approvedCount).toBe(6);
      expect(resZero.progressPercent).toBe(0); // guarded against NaN
      expect(resZero.isStage1Approved).toBe(true);

      const resNeg = calculateApprovalsProgress(allApproved, -4);
      expect(resNeg.approvedCount).toBe(6);
      expect(resNeg.progressPercent).toBe(0); // totalItems <= 0 -> 0%
    });

    it('treats N/A status as approved milestone completion', () => {
      const brownfieldApprovals: PreConstructionApprovals = {
        splumaRezoningSubdivision: { status: 'N/A' }, // Existing zoning valid
        sgDiagramApproval: { status: 'Approved' },
        municipalBuildingPlans: { status: 'Approved' },
        nhbrcEnrolment: { status: 'Approved' },
        sectionalTitleRegister: { status: 'N/A' }, // Single-title freehold
        occupancyCertificate: { status: 'Approved' },
      };

      const res = calculateApprovalsProgress(brownfieldApprovals, 6);
      expect(res.approvedCount).toBe(6);
      expect(res.progressPercent).toBe(100);
      expect(res.isStage1Approved).toBe(true);
    });

    it('locks Stage 1 when any Stage 1 requirement is unapproved', () => {
      const stage1Pending: PreConstructionApprovals = {
        splumaRezoningSubdivision: { status: 'Approved' },
        sgDiagramApproval: { status: 'Approved' },
        municipalBuildingPlans: { status: 'Objection / Query' }, // Blocked
        nhbrcEnrolment: { status: 'Approved' },
        sectionalTitleRegister: { status: 'Approved' },
        occupancyCertificate: { status: 'Approved' },
      };

      const res = calculateApprovalsProgress(stage1Pending, 6);
      expect(res.approvedCount).toBe(5);
      expect(res.progressPercent).toBe(83);
      expect(res.isStage1Approved).toBe(false);
    });
  });

  // =========================================================================
  // 4. Pure Helper: calculateIncreasedAmount
  // =========================================================================
  describe('Helper 4: calculateIncreasedAmount Edge Conditions', () => {
    it('handles null, undefined, zero, and negative deltas', () => {
      expect(calculateIncreasedAmount(0, 0)).toBe(0);
      expect(calculateIncreasedAmount(null, null)).toBe(0);
      expect(calculateIncreasedAmount(undefined, undefined)).toBe(0);
      expect(calculateIncreasedAmount(5_000_000, 0)).toBe(5_000_000);
      expect(calculateIncreasedAmount(0, 500_000)).toBe(500_000);

      // Negative values
      expect(calculateIncreasedAmount(-1_000_000, 500_000)).toBe(-500_000);
      expect(calculateIncreasedAmount(1_000_000, -300_000)).toBe(700_000);
      expect(calculateIncreasedAmount(-500_000, -500_000)).toBe(-1_000_000);
    });

    it('handles extreme multi-billion adjustments accurately', () => {
      const base = 50_000_000_000;
      const delta = 25_000_000_000;
      expect(calculateIncreasedAmount(base, delta)).toBe(75_000_000_000);
    });
  });

  // =========================================================================
  // 5. The 11 New Derived Fields: Adversarial Stress Testing
  // =========================================================================
  describe('11 New Fields in calculateDevelopmentFinancials: Adversarial Edge Cases', () => {
    it('evaluates all 11 fields when development is null without throwing', () => {
      const fin = calculateDevelopmentFinancials(null);
      expect(fin.actualBoqSpendPerSqmZAR).toBe(0);
      expect(fin.softCostsPercentOfTdc).toBe(0);
      expect(fin.totalHoldingAndContingencyZAR).toBe(0);
      expect(fin.availableFacilityUndrawnZAR).toBe(0);
      expect(fin.preSalesHurdleProgressRatioPercent).toBe(0);
      expect(fin.debtFacilityRepaidPercent).toBe(0);
      expect(fin.unencumberedUnitsCount).toBe(0);
      expect(fin.totalFloorAreaSqm).toBe(0);
      expect(fin.totalAllocatedCostBasisZAR).toBe(0);
      expect(fin.totalMonthlyEstimatedRentZAR).toBe(0);
      expect(fin.unitsNeededForSection13Sex).toBe(5);
    });

    it('Field 1: actualBoqSpendPerSqmZAR handles 0, negative, and extreme buildable area', () => {
      // Area = 0 -> 0 (no division by zero)
      const devZeroArea = createBaseProject({
        totalBuildableAreaSqm: 0,
        boqItems: [
          {
            id: 'b-1',
            category: 'Plumbing & Wet Works',
            itemDescription: 'Foundations',
            unit: 'm2',
            quantity: 1,
            baselineUnitCostZAR: 100_000,
            baselineTotalZAR: 100_000,
            actualCostZAR: 100_000,
            varianceZAR: 0,
            supplierOrContractor: 'Civils',
            status: 'Completed',
            milestonePhase: 'Deposit',
            retentionPercent: 0,
          },
        ],
      });
      const finZero = calculateDevelopmentFinancials(devZeroArea);
      expect(finZero.actualBoqSpendPerSqmZAR).toBe(0);
      expect(Number.isFinite(finZero.actualBoqSpendPerSqmZAR)).toBe(true);

      // Area = -500 -> 0
      const devNegArea = createBaseProject({
        totalBuildableAreaSqm: -500,
        boqItems: devZeroArea.boqItems,
      });
      const finNeg = calculateDevelopmentFinancials(devNegArea);
      expect(finNeg.actualBoqSpendPerSqmZAR).toBe(0);

      // Large Area & Large BOQ: 10,000 m² and 80,000,000 BOQ -> 8,000 / m²
      const devLarge = createBaseProject({
        totalBuildableAreaSqm: 10_000,
        boqItems: [
          {
            id: 'b-huge',
            category: 'Plumbing & Wet Works',
            itemDescription: 'Superstructure',
            unit: 'm2',
            quantity: 1,
            baselineUnitCostZAR: 80_000_000,
            baselineTotalZAR: 80_000_000,
            actualCostZAR: 80_000_000,
            varianceZAR: 0,
            supplierOrContractor: 'Civils',
            status: 'Completed',
            milestonePhase: 'Deposit',
            retentionPercent: 0,
          },
        ],
      });
      const finLarge = calculateDevelopmentFinancials(devLarge);
      expect(finLarge.actualBoqSpendPerSqmZAR).toBe(8_000);
    });

    it('Field 2: softCostsPercentOfTdc handles 0 TDC, 100% soft costs, and negative inputs', () => {
      // TDC = 0 -> 0%
      const devZeroTdc = createBaseProject({
        landPurchasePriceZAR: 0,
        acquisitionCostsZAR: 0,
        totalBuildableAreaSqm: 0,
        budgetedHardCostPerSqmZAR: 0,
        monthlyPreApprovalHoldingBurnZAR: 0,
        monthlyConstructionHoldingBurnZAR: 0,
        softCosts: undefined,
      });
      const finZero = calculateDevelopmentFinancials(devZeroTdc);
      expect(finZero.softCostsPercentOfTdc).toBe(0);
      expect(Number.isFinite(finZero.softCostsPercentOfTdc)).toBe(true);

      // Soft costs represent 100% of TDC when all other costs are 0
      const devSoftOnly = createBaseProject({
        landPurchasePriceZAR: 0,
        acquisitionCostsZAR: 0,
        totalBuildableAreaSqm: 0,
        budgetedHardCostPerSqmZAR: 0,
        monthlyPreApprovalHoldingBurnZAR: 0,
        monthlyConstructionHoldingBurnZAR: 0,
        softCosts: {
          townPlannerZAR: 100_000,
          architectZAR: 0,
          structuralCivilEngineerZAR: 0,
          quantitySurveyorZAR: 0,
          nhbrcEnrolmentFeeZAR: 0,
          councilBulkContributionsZAR: 0,
          planScrutinyAndSubdivisionFeesZAR: 0,
          marketingAndShowUnitZAR: 0,
        },
      });
      const finSoftOnly = calculateDevelopmentFinancials(devSoftOnly);
      expect(finSoftOnly.tdcZAR).toBe(100_000);
      expect(finSoftOnly.totalSoftCostsZAR).toBe(100_000);
      expect(finSoftOnly.softCostsPercentOfTdc).toBe(100);
    });

    it('Field 3: totalHoldingAndContingencyZAR aggregates carrying costs and contingency', () => {
      const dev = createBaseProject({
        preApprovalMonths: 10,
        monthlyPreApprovalHoldingBurnZAR: 20_000, // 200k
        constructionMonths: 10,
        monthlyConstructionHoldingBurnZAR: 40_000, // 400k -> total carrying = 600k
        totalBuildableAreaSqm: 1_000,
        budgetedHardCostPerSqmZAR: 10_000, // 10M hard cost
        contingencyPercent: 10, // 1M contingency
      });
      const fin = calculateDevelopmentFinancials(dev);
      expect(fin.totalCarryingCostZAR).toBe(600_000);
      expect(fin.contingencyReserveZAR).toBe(1_000_000);
      expect(fin.totalHoldingAndContingencyZAR).toBe(1_600_000);
    });

    it('Field 4: availableFacilityUndrawnZAR handles overdrawn and undrawn facilities', () => {
      // Overdrawn: drawn 12M > limit 10M -> available = 0 (clamped)
      const devOverdrawn = createBaseProject({
        developmentFacilityLimitZAR: 10_000_000,
        developmentFacilityDrawnZAR: 12_000_000,
      });
      const finOver = calculateDevelopmentFinancials(devOverdrawn);
      expect(finOver.availableFacilityUndrawnZAR).toBe(0);

      // Undrawn: drawn 4M < limit 10M -> available = 6M
      const devUndrawn = createBaseProject({
        developmentFacilityLimitZAR: 10_000_000,
        developmentFacilityDrawnZAR: 4_000_000,
      });
      const finUn = calculateDevelopmentFinancials(devUndrawn);
      expect(finUn.availableFacilityUndrawnZAR).toBe(6_000_000);

      // Zero limit and drawn
      const devZero = createBaseProject({
        developmentFacilityLimitZAR: 0,
        developmentFacilityDrawnZAR: 0,
      });
      const finZ = calculateDevelopmentFinancials(devZero);
      expect(finZ.availableFacilityUndrawnZAR).toBe(0);
    });

    it('Field 5: preSalesHurdleProgressRatioPercent clamps to 100% and handles 0 hurdle', () => {
      // Hurdle = 0 -> ratio = 100%
      const devZeroHurdle = createBaseProject({
        preSalesHurdlePercent: 0,
        units: [],
      });
      const finZeroHurdle = calculateDevelopmentFinancials(devZeroHurdle);
      expect(finZeroHurdle.preSalesHurdleProgressRatioPercent).toBe(100);

      // 50% pre-sold vs 60% hurdle -> round(50/60 * 100) = 83%
      const units: DevelopmentUnit[] = [
        {
          id: 'u-1',
          unitNumber: 'U1',
          configuration: '2 Bed',
          floorAreaSqm: 50,
          allocatedCostBasisZAR: 500_000,
          listPriceVatInclZAR: 1_000_000,
          estimatedMonthlyRentZAR: 8_000,
          status: 'Sold & Transferred',
        },
        {
          id: 'u-2',
          unitNumber: 'U2',
          configuration: '2 Bed',
          floorAreaSqm: 50,
          allocatedCostBasisZAR: 500_000,
          listPriceVatInclZAR: 1_000_000,
          estimatedMonthlyRentZAR: 8_000,
          status: 'Available',
        },
      ];
      const dev50 = createBaseProject({
        preSalesHurdlePercent: 60,
        units,
      });
      const fin50 = calculateDevelopmentFinancials(dev50);
      expect(fin50.preSoldGdvPercent).toBe(50);
      expect(fin50.preSalesHurdleProgressRatioPercent).toBe(83);

      // 100% pre-sold vs 60% hurdle -> 166% -> clamped to 100%
      const dev100 = createBaseProject({
        preSalesHurdlePercent: 60,
        units: units.map(u => ({ ...u, status: 'Sold & Transferred' as const })),
      });
      const fin100 = calculateDevelopmentFinancials(dev100);
      expect(fin100.preSoldGdvPercent).toBe(100);
      expect(fin100.preSalesHurdleProgressRatioPercent).toBe(100);
    });

    it('Field 6: debtFacilityRepaidPercent handles 0 drawn, full repayment, and over-repayment', () => {
      // Drawn = 0 -> 100% (no outstanding debt)
      const devZeroDrawn = createBaseProject({
        developmentFacilityDrawnZAR: 0,
        developmentFacilityRepaidZAR: 0,
      });
      const finZero = calculateDevelopmentFinancials(devZeroDrawn);
      expect(finZero.debtFacilityRepaidPercent).toBe(100);

      // Repaid 5M of 10M drawn -> 50%
      const devHalf = createBaseProject({
        developmentFacilityDrawnZAR: 10_000_000,
        developmentFacilityRepaidZAR: 5_000_000,
      });
      const finHalf = calculateDevelopmentFinancials(devHalf);
      expect(finHalf.debtFacilityRepaidPercent).toBe(50);

      // Repaid 12M of 10M drawn (over-repaid) -> clamped to 100%
      const devOverRepaid = createBaseProject({
        developmentFacilityDrawnZAR: 10_000_000,
        developmentFacilityRepaidZAR: 12_000_000,
      });
      const finOver = calculateDevelopmentFinancials(devOverRepaid);
      expect(finOver.debtFacilityRepaidPercent).toBe(100);
    });

    it('Field 7: unencumberedUnitsCount correctly evaluates debt wipeout surplus', () => {
      // Total 10 units @ 1M each = 10M GDV.
      // Debt = 4M. Wipeout needs ceil(4M / 1M) = 4 units.
      // Unencumbered = 10 - 4 = 6 units.
      const units: DevelopmentUnit[] = Array.from({ length: 10 }, (_, i) => ({
        id: `u-${i}`,
        unitNumber: `U${i + 1}`,
        configuration: 'Apt',
        floorAreaSqm: 50,
        allocatedCostBasisZAR: 600_000,
        listPriceVatInclZAR: 1_000_000,
        estimatedMonthlyRentZAR: 8_000,
        status: 'Available',
      }));

      const dev6 = createBaseProject({
        developmentFacilityDrawnZAR: 4_000_000,
        developmentFacilityRepaidZAR: 0,
        units,
      });
      const fin6 = calculateDevelopmentFinancials(dev6);
      expect(fin6.unitsRequiredForDebtWipeout).toBe(4);
      expect(fin6.unencumberedUnitsCount).toBe(6);

      // Debt = 15M > 10M GDV. Wipeout needs ceil(15M / 1M) = 15 units.
      // Unencumbered = max(0, 10 - 15) = 0.
      const devUnderwater = createBaseProject({
        developmentFacilityDrawnZAR: 15_000_000,
        developmentFacilityRepaidZAR: 0,
        units,
      });
      const finUnder = calculateDevelopmentFinancials(devUnderwater);
      expect(finUnder.unitsRequiredForDebtWipeout).toBe(15);
      expect(finUnder.unencumberedUnitsCount).toBe(0);
    });

    it('Fields 8, 9, 10: totalFloorAreaSqm, totalAllocatedCostBasisZAR, totalMonthlyEstimatedRentZAR aggregate units safely', () => {
      const units: DevelopmentUnit[] = [
        {
          id: 'u-1',
          unitNumber: 'U1',
          configuration: '1 Bed',
          floorAreaSqm: 45,
          allocatedCostBasisZAR: 800_000,
          listPriceVatInclZAR: 1_100_000,
          estimatedMonthlyRentZAR: 8_500,
          status: 'Available',
        },
        {
          id: 'u-2',
          unitNumber: 'U2',
          configuration: '2 Bed',
          floorAreaSqm: 75,
          allocatedCostBasisZAR: 1_200_000,
          listPriceVatInclZAR: 1_650_000,
          estimatedMonthlyRentZAR: 12_500,
          status: 'Retained for Rental',
        },
        // Unit with missing/null optional fields
        {
          id: 'u-3',
          unitNumber: 'U3',
          configuration: 'Studio',
          floorAreaSqm: 0,
          allocatedCostBasisZAR: 0,
          listPriceVatInclZAR: 750_000,
          estimatedMonthlyRentZAR: 0,
          status: 'Available',
        },
      ];

      const dev = createBaseProject({ units });
      const fin = calculateDevelopmentFinancials(dev);

      // Floor area = 45 + 75 + 0 = 120
      expect(fin.totalFloorAreaSqm).toBe(120);

      // Cost basis = 800k + 1.2M + 0 = 2M
      expect(fin.totalAllocatedCostBasisZAR).toBe(2_000_000);

      // Monthly rent = 8.5k + 12.5k + 0 = 21k
      expect(fin.totalMonthlyEstimatedRentZAR).toBe(21_000);
    });

    it('Field 11: unitsNeededForSection13Sex respects 5-unit threshold across all boundaries', () => {
      const makeRetainedUnits = (count: number): DevelopmentUnit[] =>
        Array.from({ length: count }, (_, i) => ({
          id: `u-ret-${i}`,
          unitNumber: `R${i + 1}`,
          configuration: 'Apt',
          floorAreaSqm: 50,
          allocatedCostBasisZAR: 700_000,
          listPriceVatInclZAR: 1_000_000,
          estimatedMonthlyRentZAR: 8_000,
          status: 'Retained for Rental',
        }));

      // 0 units retained -> 5 needed
      const fin0 = calculateDevelopmentFinancials(createBaseProject({ units: makeRetainedUnits(0) }));
      expect(fin0.unitsRetainedCount).toBe(0);
      expect(fin0.unitsNeededForSection13Sex).toBe(5);
      expect(fin0.isSection13SexEligible).toBe(false);

      // 3 units retained -> 2 needed
      const fin3 = calculateDevelopmentFinancials(createBaseProject({ units: makeRetainedUnits(3) }));
      expect(fin3.unitsRetainedCount).toBe(3);
      expect(fin3.unitsNeededForSection13Sex).toBe(2);
      expect(fin3.isSection13SexEligible).toBe(false);

      // 5 units retained -> 0 needed (Eligible!)
      const fin5 = calculateDevelopmentFinancials(createBaseProject({ units: makeRetainedUnits(5) }));
      expect(fin5.unitsRetainedCount).toBe(5);
      expect(fin5.unitsNeededForSection13Sex).toBe(0);
      expect(fin5.isSection13SexEligible).toBe(true);

      // 12 units retained -> 0 needed (Eligible!)
      const fin12 = calculateDevelopmentFinancials(createBaseProject({ units: makeRetainedUnits(12) }));
      expect(fin12.unitsRetainedCount).toBe(12);
      expect(fin12.unitsNeededForSection13Sex).toBe(0);
      expect(fin12.isSection13SexEligible).toBe(true);
    });
  });
});
