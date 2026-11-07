import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  calculateDevelopmentFinancials,
  calculateDevelopmentCapitalStack,
  calculateDevelopmentRiskGate,
  calculateDevelopmentDebtWipeoutMatrix,
  calculateDevelopmentSoftCostsTotal,
  type DevelopmentFinancialSummary,
  type DevelopmentCapitalStackSummary,
  type DevelopmentRiskGateSummary,
  type DevelopmentDebtWipeoutMatrix,
} from '../developments';
import {
  DevelopmentFeasibilitySection,
  mapDevelopmentToProposalDeal,
} from '@/components/proposal/DevelopmentFeasibilitySection';
import { INITIAL_DEVELOPMENTS } from '@/lib/store/initialData';
import { formatZAR, formatPercent } from '@/lib/formatters';
import type {
  DevelopmentProject,
  DevelopmentUnit,
  DevUnitStatus,
  ApprovalStatus,
  PreConstructionApprovals,
} from '@/types';

describe('Milestone 4 Empirical Challenge: Financial Math & Presentation Consistency Harness', () => {
  const dev1 = INITIAL_DEVELOPMENTS.find((d) => d.id === 'dev-1')!;
  const dev2 = INITIAL_DEVELOPMENTS.find((d) => d.id === 'dev-2')!;

  const createBaseProject = (overrides?: Partial<DevelopmentProject>): DevelopmentProject => ({
    id: 'dev-m4-challenger',
    title: 'M4 Challenger Project',
    address: '100 Rivonia Road, Sandton',
    city: 'Johannesburg',
    province: 'Gauteng',
    developmentType: 'Sectional Title Apartments',
    isVatRegisteredDeveloper: true,
    taxEntityType: 'Company (27%)',
    currentPhase: 'Feasibility',
    preApprovalMonths: 6,
    constructionMonths: 12,
    sellDownMonths: 6,
    landPurchasePriceZAR: 2_500_000,
    acquisitionCostsZAR: 150_000,
    sec118ArrearsZAR: 25_000,
    softCosts: {
      townPlannerZAR: 75_000,
      architectZAR: 150_000,
      structuralCivilEngineerZAR: 90_000,
      quantitySurveyorZAR: 60_000,
      nhbrcEnrolmentFeeZAR: 45_000,
      councilBulkContributionsZAR: 200_000,
      planScrutinyAndSubdivisionFeesZAR: 30_000,
      marketingAndShowUnitZAR: 50_000,
    },
    totalBuildableAreaSqm: 800,
    budgetedHardCostPerSqmZAR: 11_500,
    contingencyPercent: 10,
    boqItems: [],
    monthlyPreApprovalHoldingBurnZAR: 15_000,
    monthlyConstructionHoldingBurnZAR: 25_000,
    developmentFacilityLimitZAR: 8_000_000,
    developmentFacilityDrawnZAR: 5_000_000,
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
    units: Array.from({ length: 8 }, (_, i) => ({
      id: `m4-u-${i + 1}`,
      unitNumber: `${i + 1}`,
      configuration: '2 Bed 2 Bath',
      floorAreaSqm: 75,
      allocatedCostBasisZAR: 1_250_000,
      listPriceVatInclZAR: 1_850_000,
      estimatedMonthlyRentZAR: 14_000,
      status: (i < 4
        ? 'Sold & Transferred'
        : i < 6
        ? 'Reserved (OTP Signed)'
        : 'Retained for Rental') as DevUnitStatus,
    })),
    ...overrides,
  });

  // =========================================================================
  // 1. HELPER 1: calculateDevelopmentCapitalStack
  // =========================================================================
  describe('Helper 1: calculateDevelopmentCapitalStack', () => {
    it('verifies that the 5 itemized amounts sum exactly to TDC', () => {
      const dev = createBaseProject();
      const fin = calculateDevelopmentFinancials(dev);
      const stack = calculateDevelopmentCapitalStack(dev, fin);

      expect(stack.items).toHaveLength(5);

      const itemsSum = stack.items.reduce((acc, itm) => acc + itm.amountZAR, 0);
      expect(itemsSum).toBe(stack.tdcZAR);
      expect(stack.tdcZAR).toBe(fin.tdcZAR);

      // Verify category-by-category amounts match fin breakdowns
      const landItem = stack.items.find((i) => i.id === 'stack-land')!;
      const softItem = stack.items.find((i) => i.id === 'stack-soft')!;
      const hardItem = stack.items.find((i) => i.id === 'stack-hard')!;
      const carryingItem = stack.items.find((i) => i.id === 'stack-carrying')!;
      const contingencyItem = stack.items.find((i) => i.id === 'stack-contingency')!;

      expect(landItem.amountZAR).toBe(fin.totalLandAndAcquisitionZAR);
      expect(softItem.amountZAR).toBe(fin.totalSoftCostsZAR);
      expect(hardItem.amountZAR).toBe(fin.activeHardBuildCostZAR);
      expect(carryingItem.amountZAR).toBe(fin.totalCarryingCostZAR);
      expect(contingencyItem.amountZAR).toBe(fin.contingencyReserveZAR);
    });

    it('verifies that itemized percentages sum to 100% within rounding tolerance (+-0.2%)', () => {
      const dev = createBaseProject();
      const fin = calculateDevelopmentFinancials(dev);
      const stack = calculateDevelopmentCapitalStack(dev, fin);

      const percentSum = stack.items.reduce((acc, itm) => acc + itm.percentOfTdc, 0);
      expect(percentSum).toBeGreaterThanOrEqual(99.8);
      expect(percentSum).toBeLessThanOrEqual(100.2);

      // Verify each individual percentage formula
      for (const item of stack.items) {
        const expectedPercent = Math.round((item.amountZAR / fin.tdcZAR) * 1000) / 10;
        expect(item.percentOfTdc).toBe(expectedPercent);
      }
    });

    it('verifies sub-items in stack-land, stack-soft, and stack-carrying match parent amounts', () => {
      const dev = createBaseProject();
      const fin = calculateDevelopmentFinancials(dev);
      const stack = calculateDevelopmentCapitalStack(dev, fin);

      // Land sub-items
      const landItem = stack.items.find((i) => i.id === 'stack-land')!;
      const landSubSum = landItem.subItems!.reduce((acc, s) => acc + s.amountZAR, 0);
      expect(landSubSum).toBe(landItem.amountZAR);

      // Soft costs sub-items
      const softItem = stack.items.find((i) => i.id === 'stack-soft')!;
      const softSubSum = softItem.subItems!.reduce((acc, s) => acc + s.amountZAR, 0);
      expect(softSubSum).toBe(softItem.amountZAR);

      // Carrying costs sub-items
      const carryingItem = stack.items.find((i) => i.id === 'stack-carrying')!;
      const carryingSubSum = carryingItem.subItems!.reduce((acc, s) => acc + s.amountZAR, 0);
      expect(carryingSubSum).toBe(carryingItem.amountZAR);
    });

    it('handles zero TDC safely without NaN or division by zero errors', () => {
      const zeroDev = createBaseProject({
        landPurchasePriceZAR: 0,
        acquisitionCostsZAR: 0,
        sec118ArrearsZAR: 0,
        softCosts: {
          townPlannerZAR: 0,
          architectZAR: 0,
          structuralCivilEngineerZAR: 0,
          quantitySurveyorZAR: 0,
          nhbrcEnrolmentFeeZAR: 0,
          councilBulkContributionsZAR: 0,
          planScrutinyAndSubdivisionFeesZAR: 0,
          marketingAndShowUnitZAR: 0,
        },
        totalBuildableAreaSqm: 0,
        budgetedHardCostPerSqmZAR: 0,
        contingencyPercent: 0,
        boqItems: [],
        monthlyPreApprovalHoldingBurnZAR: 0,
        monthlyConstructionHoldingBurnZAR: 0,
        units: [],
      });
      const fin = calculateDevelopmentFinancials(zeroDev);
      expect(fin.tdcZAR).toBe(0);

      const stack = calculateDevelopmentCapitalStack(zeroDev, fin);
      expect(stack.tdcZAR).toBe(0);
      expect(stack.landPercentOfTdc).toBe(0);
      expect(stack.softCostsPercentOfTdc).toBe(0);
      expect(stack.hardBuildPercentOfTdc).toBe(0);
      expect(stack.carryingCostPercentOfTdc).toBe(0);
      expect(stack.contingencyPercentOfTdc).toBe(0);
      expect(stack.gdvToTdcMultiple).toBe(0);

      for (const itm of stack.items) {
        expect(itm.amountZAR).toBe(0);
        expect(itm.percentOfTdc).toBe(0);
      }
    });

    it('produces identical capital stack whether financials parameter is supplied or omitted', () => {
      const dev = createBaseProject();
      const withFin = calculateDevelopmentCapitalStack(dev, calculateDevelopmentFinancials(dev));
      const withoutFin = calculateDevelopmentCapitalStack(dev);

      expect(withFin).toEqual(withoutFin);
    });
  });

  // =========================================================================
  // 2. HELPER 2: calculateDevelopmentRiskGate
  // =========================================================================
  describe('Helper 2: calculateDevelopmentRiskGate', () => {
    it('verifies all 16 permutations of Stage 1 statutory approvals ring-fencing', () => {
      // Test all 2^4 = 16 permutations of status: Approved vs Submitted
      for (let mask = 0; mask < 16; mask++) {
        const approvalsObj: PreConstructionApprovals = {
          splumaRezoningSubdivision: { status: (mask & 1) ? 'Approved' : 'Submitted' },
          sgDiagramApproval: { status: (mask & 2) ? 'Approved' : 'Submitted' },
          municipalBuildingPlans: { status: (mask & 4) ? 'Approved' : 'Submitted' },
          nhbrcEnrolment: { status: (mask & 8) ? 'Approved' : 'Submitted' },
          sectionalTitleRegister: { status: 'Not Started' },
          occupancyCertificate: { status: 'Not Started' },
        };

        const dev = createBaseProject({ approvals: approvalsObj });
        const gate = calculateDevelopmentRiskGate(dev);

        const approvedCount = [mask & 1, mask & 2, mask & 4, mask & 8].filter(Boolean).length;
        expect(gate.stage1ApprovedCount).toBe(approvedCount);
        expect(gate.stage1TotalCount).toBe(4);
        expect(gate.stage1ProgressPercent).toBe(Math.round((approvedCount / 4) * 100));

        if (mask === 15) {
          // All 4 approved
          expect(gate.isStage1Approved).toBe(true);
          expect(gate.stage1RingFenceLabel).toBe('Ring-Fence Cleared');
          expect(gate.isStage2Unlocked).toBe(true);
          expect(gate.stage2DrawLabel).toBe('Senior Facility Active');
        } else {
          // At least 1 missing
          expect(gate.isStage1Approved).toBe(false);
          expect(gate.stage1RingFenceLabel).toBe('Strictly Ring-Fenced');
          expect(gate.isStage2Unlocked).toBe(false);
          expect(gate.stage2DrawLabel).toBe('Draws Locked Pending Stage 1');
        }
      }
    });

    it('verifies that N/A counts as approved for statutory ring-fencing', () => {
      const dev = createBaseProject({
        approvals: {
          splumaRezoningSubdivision: { status: 'Approved' },
          sgDiagramApproval: { status: 'N/A' },
          municipalBuildingPlans: { status: 'Approved' },
          nhbrcEnrolment: { status: 'N/A' },
          sectionalTitleRegister: { status: 'N/A' },
          occupancyCertificate: { status: 'Approved' },
        },
      });

      const gate = calculateDevelopmentRiskGate(dev);
      expect(gate.isStage1Approved).toBe(true);
      expect(gate.stage1ApprovedCount).toBe(4);
      expect(gate.stage2ApprovedCount).toBe(2);
      expect(gate.totalApprovedCount).toBe(6);
      expect(gate.overallProgressPercent).toBe(100);
      expect(gate.isStage2Unlocked).toBe(true);
    });

    it('verifies Stage 2 cannot unlock if Stage 1 is incomplete even if Stage 2 items are approved', () => {
      const dev = createBaseProject({
        approvals: {
          splumaRezoningSubdivision: { status: 'Submitted' }, // Missing Stage 1
          sgDiagramApproval: { status: 'Approved' },
          municipalBuildingPlans: { status: 'Approved' },
          nhbrcEnrolment: { status: 'Approved' },
          sectionalTitleRegister: { status: 'Approved' }, // Stage 2 approved
          occupancyCertificate: { status: 'Approved' }, // Stage 2 approved
        },
      });

      const gate = calculateDevelopmentRiskGate(dev);
      expect(gate.isStage1Approved).toBe(false);
      expect(gate.stage1RingFenceLabel).toBe('Strictly Ring-Fenced');
      expect(gate.stage2ApprovedCount).toBe(2);
      expect(gate.stage2ProgressPercent).toBe(100);
      // Stage 2 draw is LOCKED because Stage 1 is not approved!
      expect(gate.isStage2Unlocked).toBe(false);
      expect(gate.stage2DrawLabel).toBe('Draws Locked Pending Stage 1');
    });

    it('verifies senior debt tranche metrics and repayment percentages', () => {
      const dev = createBaseProject({
        developmentFacilityLimitZAR: 10_000_000,
        developmentFacilityDrawnZAR: 6_000_000,
        developmentFacilityRepaidZAR: 3_000_000,
      });

      const gate = calculateDevelopmentRiskGate(dev);
      expect(gate.facilityLimitZAR).toBe(10_000_000);
      expect(gate.facilityDrawnZAR).toBe(6_000_000);
      expect(gate.facilityRepaidZAR).toBe(3_000_000);
      expect(gate.availableFacilityUndrawnZAR).toBe(4_000_000); // 10M - 6M
      expect(gate.debtFacilityRepaidPercent).toBe(50); // 3M / 6M = 50%
    });

    it('handles zero facility drawn safely without division by zero', () => {
      const dev = createBaseProject({
        developmentFacilityLimitZAR: 5_000_000,
        developmentFacilityDrawnZAR: 0,
        developmentFacilityRepaidZAR: 0,
      });

      const gate = calculateDevelopmentRiskGate(dev);
      expect(gate.availableFacilityUndrawnZAR).toBe(5_000_000);
      expect(gate.debtFacilityRepaidPercent).toBe(100); // No debt burden
    });

    it('handles null/undefined approvals gracefully', () => {
      const dev = createBaseProject({ approvals: undefined });
      const gate = calculateDevelopmentRiskGate(dev);

      expect(gate.stage1ApprovedCount).toBe(0);
      expect(gate.stage2ApprovedCount).toBe(0);
      expect(gate.totalApprovedCount).toBe(0);
      expect(gate.isStage1Approved).toBe(false);
      expect(gate.isStage2Unlocked).toBe(false);
      expect(gate.overallProgressPercent).toBe(0);
    });
  });

  // =========================================================================
  // 3. HELPER 3: calculateDevelopmentDebtWipeoutMatrix
  // =========================================================================
  describe('Helper 3: calculateDevelopmentDebtWipeoutMatrix', () => {
    it('verifies discrete integer ceiling for debt wipeout units calculation', () => {
      // Outstanding debt = 3,000,000; 8 units @ 1,850,000 each
      // 3,000,000 / 1,850,000 = 1.6216... units -> Math.ceil = 2 units
      const dev = createBaseProject({
        developmentFacilityDrawnZAR: 5_000_000,
        developmentFacilityRepaidZAR: 2_000_000, // outstanding = 3M
      });
      const fin = calculateDevelopmentFinancials(dev);
      const matrix = calculateDevelopmentDebtWipeoutMatrix(dev, fin);

      expect(matrix.outstandingDebtZAR).toBe(3_000_000);
      expect(matrix.avgUnitListPriceZAR).toBe(1_850_000);
      expect(matrix.unitsRequiredForDebtWipeout).toBe(2);
      expect(matrix.unencumberedUnitsCount).toBe(6); // 8 - 2 = 6
    });

    it('verifies unit inventory waterfall role tagging (Debt Wipeout vs Cash Profit vs Retained Equity)', () => {
      const dev = createBaseProject({
        developmentFacilityDrawnZAR: 5_000_000,
        developmentFacilityRepaidZAR: 2_000_000, // outstanding = 3M -> requires 2 units
      });
      const fin = calculateDevelopmentFinancials(dev);
      const matrix = calculateDevelopmentDebtWipeoutMatrix(dev, fin);

      expect(matrix.unitsWaterfall).toHaveLength(8);

      // Units 1 and 2 should be Debt Wipeout
      expect(matrix.unitsWaterfall[0].waterfallRole).toBe('Senior Debt Wipeout');
      expect(matrix.unitsWaterfall[0].roleBadgeText).toBe('Debt #1');
      expect(matrix.unitsWaterfall[0].roleBadgeColor).toBe('blue');
      expect(matrix.unitsWaterfall[0].isDebtExtinguisher).toBe(true);

      expect(matrix.unitsWaterfall[1].waterfallRole).toBe('Senior Debt Wipeout');
      expect(matrix.unitsWaterfall[1].roleBadgeText).toBe('Debt #2');
      expect(matrix.unitsWaterfall[1].roleBadgeColor).toBe('blue');
      expect(matrix.unitsWaterfall[1].isDebtExtinguisher).toBe(true);

      // Units 3, 4, 5, 6 (for sale) should be Unencumbered Cash Profit
      for (let i = 2; i < 6; i++) {
        expect(matrix.unitsWaterfall[i].waterfallRole).toBe('Unencumbered Cash Profit');
        expect(matrix.unitsWaterfall[i].roleBadgeText).toBe('Cash Profit');
        expect(matrix.unitsWaterfall[i].roleBadgeColor).toBe('emerald');
        expect(matrix.unitsWaterfall[i].isDebtExtinguisher).toBe(false);
      }

      // Units 7 and 8 (status: Retained for Rental) should be Free-Carry Retained Equity
      expect(matrix.unitsWaterfall[6].waterfallRole).toBe('Free-Carry Retained Equity');
      expect(matrix.unitsWaterfall[6].roleBadgeText).toBe('Retained Equity');
      expect(matrix.unitsWaterfall[6].roleBadgeColor).toBe('purple');
      expect(matrix.unitsWaterfall[6].isDebtExtinguisher).toBe(false);

      expect(matrix.unitsWaterfall[7].waterfallRole).toBe('Free-Carry Retained Equity');
      expect(matrix.unitsWaterfall[7].roleBadgeText).toBe('Retained Equity');
      expect(matrix.unitsWaterfall[7].roleBadgeColor).toBe('purple');
      expect(matrix.unitsWaterfall[7].isDebtExtinguisher).toBe(false);
    });

    it('verifies Free-Carry status when sales proceeds extinguish 100% of debt', () => {
      // 4 units sold @ 1,850,000 = 7,400,000 proceeds. Debt is 3,000,000.
      // Net cash proceeds = 7,400,000 - 3,000,000 = 4,400,000
      // Remaining debt on retained units = 0
      // Retained units = 2 > 0 -> isFreeCarryAchieved = true
      const dev = createBaseProject({
        developmentFacilityDrawnZAR: 5_000_000,
        developmentFacilityRepaidZAR: 2_000_000,
      });
      const fin = calculateDevelopmentFinancials(dev);
      const matrix = calculateDevelopmentDebtWipeoutMatrix(dev, fin);

      expect(matrix.totalSoldProceedsZAR).toBe(7_400_000);
      expect(matrix.netCashProceedsAfterDebtZAR).toBe(4_400_000);
      expect(matrix.remainingDebtOnRetainedUnitsZAR).toBe(0);
      expect(matrix.isFreeCarryAchieved).toBe(true);
    });

    it('verifies Partial Debt Remaining when sales proceeds do not fully cover debt', () => {
      // Only 1 unit sold @ 1,850,000. Outstanding debt = 5,000,000.
      // Remaining debt on retained units = 5,000,000 - 1,850,000 = 3,150,000 > 0.
      const dev = createBaseProject({
        developmentFacilityDrawnZAR: 5_000_000,
        developmentFacilityRepaidZAR: 0,
        units: [
          {
            id: 'u-sold',
            unitNumber: '1',
            configuration: '2 Bed',
            floorAreaSqm: 75,
            allocatedCostBasisZAR: 1_250_000,
            listPriceVatInclZAR: 1_850_000,
            estimatedMonthlyRentZAR: 14_000,
            status: 'Sold & Transferred',
          },
          {
            id: 'u-retained',
            unitNumber: '2',
            configuration: '2 Bed',
            floorAreaSqm: 75,
            allocatedCostBasisZAR: 1_250_000,
            listPriceVatInclZAR: 1_850_000,
            estimatedMonthlyRentZAR: 14_000,
            status: 'Retained for Rental',
          },
        ],
      });
      const fin = calculateDevelopmentFinancials(dev);
      const matrix = calculateDevelopmentDebtWipeoutMatrix(dev, fin);

      expect(matrix.remainingDebtOnRetainedUnitsZAR).toBe(3_150_000);
      expect(matrix.isFreeCarryAchieved).toBe(false);
    });

    it('verifies Section 13sex eligibility threshold, 55% base, 5% annual allowance, and 20-year cumulative shield', () => {
      // 4 retained units: Ineligible
      const dev4 = createBaseProject({
        units: Array.from({ length: 4 }, (_, i) => ({
          id: `u-${i + 1}`,
          unitNumber: `${i + 1}`,
          configuration: '1 Bed',
          floorAreaSqm: 40,
          allocatedCostBasisZAR: 500_000,
          listPriceVatInclZAR: 750_000,
          estimatedMonthlyRentZAR: 6_000,
          status: 'Retained for Rental',
        })),
      });
      const matrix4 = calculateDevelopmentDebtWipeoutMatrix(dev4);
      expect(matrix4.unitsRetainedCount).toBe(4);
      expect(matrix4.isSection13SexEligible).toBe(false);
      expect(matrix4.unitsNeededForSection13Sex).toBe(1);
      expect(matrix4.section13sexDeductionBaseZAR).toBe(0);
      expect(matrix4.section13sexAnnualAllowanceZAR).toBe(0);
      expect(matrix4.section13sexTwentyYearSavingsZAR).toBe(0);

      // Exactly 5 retained units: Eligible!
      const dev5 = createBaseProject({
        units: Array.from({ length: 5 }, (_, i) => ({
          id: `u-${i + 1}`,
          unitNumber: `${i + 1}`,
          configuration: '1 Bed',
          floorAreaSqm: 40,
          allocatedCostBasisZAR: 500_000,
          listPriceVatInclZAR: 750_000,
          estimatedMonthlyRentZAR: 6_000,
          status: 'Retained for Rental',
        })),
      });
      const matrix5 = calculateDevelopmentDebtWipeoutMatrix(dev5);
      expect(matrix5.unitsRetainedCount).toBe(5);
      expect(matrix5.isSection13SexEligible).toBe(true);
      expect(matrix5.unitsNeededForSection13Sex).toBe(0);

      // Total cost basis = 5 * 500,000 = 2,500,000
      // 55% deduction base = 2,500,000 * 0.55 = 1,375,000
      // 5% annual allowance = 1,375,000 * 0.05 = 68,750
      // 20-year savings = 68,750 * 20 = 1,375,000
      expect(matrix5.section13sexDeductionBaseZAR).toBe(1_375_000);
      expect(matrix5.section13sexAnnualAllowanceZAR).toBe(68_750);
      expect(matrix5.section13sexTwentyYearSavingsZAR).toBe(1_375_000);
      expect(matrix5.section13sexTwentyYearSavingsZAR).toBe(matrix5.section13sexAnnualAllowanceZAR * 20);
    });

    it('handles zero units, zero price, and over-indebted edge cases', () => {
      const devZero = createBaseProject({ units: [], developmentFacilityDrawnZAR: 0 });
      const matrixZero = calculateDevelopmentDebtWipeoutMatrix(devZero);

      expect(matrixZero.unitsRequiredForDebtWipeout).toBe(0);
      expect(matrixZero.unencumberedUnitsCount).toBe(0);
      expect(matrixZero.totalUnitsCount).toBe(0);
      expect(matrixZero.avgUnitListPriceZAR).toBe(0);
      expect(matrixZero.isFreeCarryAchieved).toBe(false);

      // Over-indebted: debt is 20M, but total GDV is only 3.7M (2 units @ 1.85M)
      // 20M / 1.85M = 10.81... -> requires 11 units.
      // totalUnits = 2. unencumbered = max(0, 2 - 11) = 0.
      const devOverDebt = createBaseProject({
        developmentFacilityDrawnZAR: 20_000_000,
        developmentFacilityRepaidZAR: 0,
        units: [
          {
            id: 'u1',
            unitNumber: '1',
            configuration: '2 Bed',
            floorAreaSqm: 75,
            allocatedCostBasisZAR: 1_250_000,
            listPriceVatInclZAR: 1_850_000,
            estimatedMonthlyRentZAR: 14_000,
            status: 'Available',
          },
          {
            id: 'u2',
            unitNumber: '2',
            configuration: '2 Bed',
            floorAreaSqm: 75,
            allocatedCostBasisZAR: 1_250_000,
            listPriceVatInclZAR: 1_850_000,
            estimatedMonthlyRentZAR: 14_000,
            status: 'Available',
          },
        ],
      });
      const matrixOverDebt = calculateDevelopmentDebtWipeoutMatrix(devOverDebt);
      expect(matrixOverDebt.unitsRequiredForDebtWipeout).toBe(11);
      expect(matrixOverDebt.unencumberedUnitsCount).toBe(0);
    });
  });

  // =========================================================================
  // 4. RANDOMIZED FUZZING STRESS TEST (100 ITERATIONS)
  // =========================================================================
  describe('Fuzzing & Invariant Stress Harness (100 Iterations)', () => {
    it('executes 100 random development permutations without NaN or crashes, satisfying all invariants', () => {
      const statuses: DevUnitStatus[] = [
        'Available',
        'Reserved (OTP Signed)',
        'Bond Approved / Guarantees Issued',
        'Sold & Transferred',
        'Retained for Rental',
      ];

      for (let seed = 1; seed <= 100; seed++) {
        const unitCount = (seed * 7) % 25; // 0 to 24 units
        const buildableArea = unitCount > 0 ? unitCount * 65 : 0;
        const hardCostRate = 8000 + ((seed * 313) % 12000);
        const landPrice = ((seed * 123456) % 15_000_000);
        const drawnFacility = ((seed * 654321) % 20_000_000);
        const repaidFacility = ((seed * 321654) % 10_000_000);

        const units: DevelopmentUnit[] = Array.from({ length: unitCount }, (_, i) => ({
          id: `fuzz-u-${seed}-${i}`,
          unitNumber: `${i + 1}`,
          configuration: 'Standard Unit',
          floorAreaSqm: 65,
          allocatedCostBasisZAR: 800_000 + ((seed * 41) % 400_000),
          listPriceVatInclZAR: 1_200_000 + ((seed * 73 + i * 50_000) % 800_000),
          estimatedMonthlyRentZAR: 9_000 + ((seed * 19) % 5_000),
          status: statuses[(seed + i) % statuses.length],
        }));

        const dev: DevelopmentProject = {
          id: `fuzz-dev-${seed}`,
          title: `Fuzz Project ${seed}`,
          address: `${seed} Fuzz Lane`,
          city: 'Johannesburg',
          province: 'Gauteng',
          developmentType: 'Sectional Title Apartments',
          isVatRegisteredDeveloper: seed % 2 === 0,
          taxEntityType: 'Company (27%)',
          currentPhase: 'Superstructure',
          preApprovalMonths: (seed % 12),
          constructionMonths: 6 + (seed % 18),
          sellDownMonths: 4,
          landPurchasePriceZAR: landPrice,
          acquisitionCostsZAR: Math.round(landPrice * 0.05),
          sec118ArrearsZAR: seed % 3 === 0 ? 15_000 : 0,
          softCosts: {
            townPlannerZAR: 50_000,
            architectZAR: 100_000,
            structuralCivilEngineerZAR: 50_000,
            quantitySurveyorZAR: 40_000,
            nhbrcEnrolmentFeeZAR: 30_000,
            councilBulkContributionsZAR: 120_000,
            planScrutinyAndSubdivisionFeesZAR: 20_000,
            marketingAndShowUnitZAR: 35_000,
          },
          totalBuildableAreaSqm: buildableArea,
          budgetedHardCostPerSqmZAR: hardCostRate,
          contingencyPercent: 5 + (seed % 10),
          boqItems: [],
          monthlyPreApprovalHoldingBurnZAR: 10_000,
          monthlyConstructionHoldingBurnZAR: 20_000,
          developmentFacilityLimitZAR: 25_000_000,
          developmentFacilityDrawnZAR: drawnFacility,
          developmentFacilityRepaidZAR: repaidFacility,
          preSalesHurdlePercent: 50,
          approvals: {
            splumaRezoningSubdivision: { status: seed % 2 === 0 ? 'Approved' : 'Submitted' },
            sgDiagramApproval: { status: seed % 3 === 0 ? 'Approved' : 'Submitted' },
            municipalBuildingPlans: { status: seed % 4 === 0 ? 'Approved' : 'Submitted' },
            nhbrcEnrolment: { status: seed % 5 === 0 ? 'Approved' : 'Submitted' },
            sectionalTitleRegister: { status: 'Not Started' },
            occupancyCertificate: { status: 'Not Started' },
          },
          units,
        };

        const fin = calculateDevelopmentFinancials(dev);
        const stack = calculateDevelopmentCapitalStack(dev, fin);
        const gate = calculateDevelopmentRiskGate(dev, fin);
        const wipeout = calculateDevelopmentDebtWipeoutMatrix(dev, fin);

        // Invariant 1: No NaN or Infinite numbers
        expect(Number.isFinite(fin.tdcZAR)).toBe(true);
        expect(Number.isFinite(stack.tdcZAR)).toBe(true);
        expect(Number.isFinite(gate.facilityLimitZAR)).toBe(true);
        expect(Number.isFinite(wipeout.avgUnitListPriceZAR)).toBe(true);
        expect(Number.isFinite(wipeout.unitsRequiredForDebtWipeout)).toBe(true);
        expect(Number.isFinite(wipeout.unencumberedUnitsCount)).toBe(true);

        // Invariant 2: Items sum strictly matches TDC
        const stackItemsSum = stack.items.reduce((acc, itm) => acc + itm.amountZAR, 0);
        expect(stackItemsSum).toBe(stack.tdcZAR);

        // Invariant 3: Stack percentages sum to 100% within tolerance if TDC > 0
        if (stack.tdcZAR > 0) {
          const stackPercentSum = stack.items.reduce((acc, itm) => acc + itm.percentOfTdc, 0);
          expect(stackPercentSum).toBeGreaterThanOrEqual(99.6);
          expect(stackPercentSum).toBeLessThanOrEqual(100.4);
        }

        // Invariant 4: Stage 1 counts within bounds [0..4] and Stage 2 within [0..2]
        expect(gate.stage1ApprovedCount).toBeGreaterThanOrEqual(0);
        expect(gate.stage1ApprovedCount).toBeLessThanOrEqual(4);
        expect(gate.stage2ApprovedCount).toBeGreaterThanOrEqual(0);
        expect(gate.stage2ApprovedCount).toBeLessThanOrEqual(2);
        expect(gate.isStage2Unlocked).toBe(gate.isStage1Approved);

        // Invariant 5: Unencumbered units >= 0
        expect(wipeout.unencumberedUnitsCount).toBeGreaterThanOrEqual(0);
        expect(wipeout.unencumberedUnitsCount).toBeLessThanOrEqual(unitCount);

        // Invariant 6: 20-Year Section 13sex shield is exactly 20 * annual allowance
        expect(wipeout.section13sexTwentyYearSavingsZAR).toBe(wipeout.section13sexAnnualAllowanceZAR * 20);
      }
    });
  });

  // =========================================================================
  // 5. PRESENTATION INTEGRITY: DevelopmentFeasibilitySection
  // =========================================================================
  describe('Presentation Integrity: DevelopmentFeasibilitySection Component', () => {
    it('verifies that DOM string rendering has zero mathematical discrepancies against pure helpers for dev-1', () => {
      const fin = calculateDevelopmentFinancials(dev1);
      const stack = calculateDevelopmentCapitalStack(dev1, fin);
      const gate = calculateDevelopmentRiskGate(dev1, fin);
      const wipeout = calculateDevelopmentDebtWipeoutMatrix(dev1, fin);

      const rawHtml = renderToString(<DevelopmentFeasibilitySection development={dev1} financials={fin} />);
      const html = rawHtml.replace(/<!--.*?-->/g, '');

      // Part 1: Capital Stack Figures
      expect(html).toContain(formatZAR(stack.tdcZAR));
      expect(html).toContain(formatZAR(stack.tdcPerSqmZAR));
      expect(html).toContain(formatZAR(stack.tdcPerUnitZAR));
      expect(html).toContain(formatZAR(stack.gdvInclVatZAR));
      expect(html).toContain(formatZAR(stack.netRealizableGdvZAR));
      expect(html).toContain(`${stack.gdvToTdcMultiple}x GDV`);
      expect(html).toContain(formatPercent(stack.pocPercent));
      expect(html).toContain(formatPercent(stack.afterTaxPocPercent));
      expect(html).toContain(formatZAR(stack.netProfitAfterTaxZAR));
      expect(html).toContain(formatZAR(fin.activeHardBuildCostZAR));

      // Waterfall items
      for (const item of stack.items) {
        expect(html).toContain(formatZAR(item.amountZAR));
        expect(html).toContain(formatPercent(item.percentOfTdc));
      }

      // Part 2: Risk Gate Figures
      expect(html).toContain(gate.stage1RingFenceLabel);
      expect(html).toContain(gate.stage2DrawLabel);
      expect(html).toContain(formatZAR(gate.facilityLimitZAR));
      expect(html).toContain(formatZAR(gate.facilityDrawnZAR));
      expect(html).toContain(formatZAR(gate.facilityRepaidZAR));
      expect(html).toContain(formatZAR(gate.availableFacilityUndrawnZAR));

      // Part 3: Debt Wipeout Figures
      expect(html).toContain(formatZAR(wipeout.avgUnitListPriceZAR));
      expect(html).toContain(`${wipeout.unitsRequiredForDebtWipeout} of ${wipeout.totalUnitsCount} Units`);
      expect(html).toContain(formatZAR(wipeout.outstandingDebtZAR));
      expect(html).toContain(`${wipeout.unencumberedUnitsCount} Units`);
      expect(html).toContain(`${wipeout.preSoldGdvPercent.toFixed(1)}% Pre-Sold`);
      expect(html).toContain(`${wipeout.preSalesHurdlePercent}% Required`);
      expect(html).toContain(formatZAR(wipeout.netCashProceedsAfterDebtZAR));
      expect(html).toContain(formatZAR(wipeout.remainingDebtOnRetainedUnitsZAR));
      expect(html).toContain(formatZAR(wipeout.retainedMonthlyGrossRentZAR));
    });

    it('verifies that DOM string rendering has zero mathematical discrepancies against pure helpers for dev-2', () => {
      const fin = calculateDevelopmentFinancials(dev2);
      const stack = calculateDevelopmentCapitalStack(dev2, fin);
      const gate = calculateDevelopmentRiskGate(dev2, fin);
      const wipeout = calculateDevelopmentDebtWipeoutMatrix(dev2, fin);

      const rawHtml = renderToString(<DevelopmentFeasibilitySection development={dev2} financials={fin} />);
      const html = rawHtml.replace(/<!--.*?-->/g, '');

      // Section 13sex 55% active shield values
      expect(wipeout.isSection13SexEligible).toBe(true);
      expect(html).toContain(formatZAR(wipeout.section13sexDeductionBaseZAR));
      expect(html).toContain(formatZAR(wipeout.section13sexAnnualAllowanceZAR));
      expect(html).toContain(formatZAR(wipeout.section13sexTwentyYearSavingsZAR));

      // Undrawn capacity & wiped debt metrics
      expect(html).toContain(formatZAR(gate.availableFacilityUndrawnZAR));
      expect(html).toContain(formatZAR(wipeout.outstandingDebtZAR));
    });

    it('renders cleanly without crashing for degenerate zero-value project', () => {
      const emptyDev = createBaseProject({
        units: [],
        landPurchasePriceZAR: 0,
        acquisitionCostsZAR: 0,
        totalBuildableAreaSqm: 0,
        budgetedHardCostPerSqmZAR: 0,
        developmentFacilityLimitZAR: 0,
        developmentFacilityDrawnZAR: 0,
        developmentFacilityRepaidZAR: 0,
      });

      const rawHtml = renderToString(<DevelopmentFeasibilitySection development={emptyDev} />);
      const html = rawHtml.replace(/<!--.*?-->/g, '');
      expect(html).toContain('TOTAL DEVELOPMENT COST (TDC)');
      expect(html).toContain('0 of 0 Units');
      expect(html).toContain('0 Units');
    });
  });
});
