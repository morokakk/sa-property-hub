import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  calculateDevelopmentFinancials,
  calculateDevelopmentCapitalStack,
  calculateDevelopmentRiskGate,
  calculateDevelopmentDebtWipeoutMatrix,
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

describe('Milestone 4 Empirical Challenge Suite: Financial Math & Presentation Consistency', () => {
  const dev1 = INITIAL_DEVELOPMENTS.find((d) => d.id === 'dev-1')!;
  const dev2 = INITIAL_DEVELOPMENTS.find((d) => d.id === 'dev-2')!;

  const createAdversarialProject = (
    overrides?: Partial<DevelopmentProject>
  ): DevelopmentProject => ({
    id: 'dev-adv-challenge',
    title: 'Adversarial Challenge Project',
    address: '42 Challenge Crescent',
    city: 'Sandton',
    province: 'Gauteng',
    developmentType: 'Sectional Title Apartments',
    isVatRegisteredDeveloper: true,
    taxEntityType: 'Company (27%)',
    currentPhase: 'Feasibility',
    preApprovalMonths: 6,
    constructionMonths: 12,
    sellDownMonths: 6,
    landPurchasePriceZAR: 3_000_000,
    acquisitionCostsZAR: 150_000,
    sec118ArrearsZAR: 50_000,
    softCosts: {
      townPlannerZAR: 60_000,
      architectZAR: 120_000,
      structuralCivilEngineerZAR: 75_000,
      quantitySurveyorZAR: 65_000,
      nhbrcEnrolmentFeeZAR: 35_000,
      councilBulkContributionsZAR: 200_000,
      planScrutinyAndSubdivisionFeesZAR: 40_000,
      marketingAndShowUnitZAR: 55_000,
    },
    totalBuildableAreaSqm: 1_200,
    budgetedHardCostPerSqmZAR: 13_500,
    contingencyPercent: 10,
    boqItems: [],
    monthlyPreApprovalHoldingBurnZAR: 25_000,
    monthlyConstructionHoldingBurnZAR: 40_000,
    developmentFacilityLimitZAR: 15_000_000,
    developmentFacilityDrawnZAR: 10_000_000,
    developmentFacilityRepaidZAR: 3_000_000,
    preSalesHurdlePercent: 60,
    approvals: {
      splumaRezoningSubdivision: { status: 'Approved' },
      sgDiagramApproval: { status: 'Approved' },
      municipalBuildingPlans: { status: 'Approved' },
      nhbrcEnrolment: { status: 'Approved' },
      sectionalTitleRegister: { status: 'Not Started' },
      occupancyCertificate: { status: 'Not Started' },
    },
    units: [
      {
        id: 'u-1',
        unitNumber: '101',
        configuration: '2 Bed 2 Bath',
        floorAreaSqm: 70,
        allocatedCostBasisZAR: 1_400_000,
        listPriceVatInclZAR: 2_000_000,
        estimatedMonthlyRentZAR: 14_000,
        status: 'Sold & Transferred',
      },
      {
        id: 'u-2',
        unitNumber: '102',
        configuration: '2 Bed 2 Bath',
        floorAreaSqm: 70,
        allocatedCostBasisZAR: 1_400_000,
        listPriceVatInclZAR: 2_000_000,
        estimatedMonthlyRentZAR: 14_000,
        status: 'Bond Approved / Guarantees Issued',
      },
      {
        id: 'u-3',
        unitNumber: '103',
        configuration: '2 Bed 2 Bath',
        floorAreaSqm: 70,
        allocatedCostBasisZAR: 1_400_000,
        listPriceVatInclZAR: 2_000_000,
        estimatedMonthlyRentZAR: 14_000,
        status: 'Reserved (OTP Signed)',
      },
      {
        id: 'u-4',
        unitNumber: '104',
        configuration: '2 Bed 2 Bath',
        floorAreaSqm: 70,
        allocatedCostBasisZAR: 1_400_000,
        listPriceVatInclZAR: 2_000_000,
        estimatedMonthlyRentZAR: 14_000,
        status: 'Available',
      },
      {
        id: 'u-5',
        unitNumber: '105',
        configuration: '2 Bed 2 Bath',
        floorAreaSqm: 70,
        allocatedCostBasisZAR: 1_400_000,
        listPriceVatInclZAR: 2_000_000,
        estimatedMonthlyRentZAR: 14_000,
        status: 'Retained for Rental',
      },
      {
        id: 'u-6',
        unitNumber: '106',
        configuration: '2 Bed 2 Bath',
        floorAreaSqm: 70,
        allocatedCostBasisZAR: 1_400_000,
        listPriceVatInclZAR: 2_000_000,
        estimatedMonthlyRentZAR: 14_000,
        status: 'Retained for Rental',
      },
    ],
    ...overrides,
  });

  // =========================================================================
  // SECTION 1: calculateDevelopmentCapitalStack VERIFICATION & FUZZING
  // =========================================================================
  describe('Helper 1: calculateDevelopmentCapitalStack Empirical Verification', () => {
    it('verifies seed projects dev-1 and dev-2 capital stack math and percentage consistency', () => {
      for (const dev of [dev1, dev2]) {
        const fin = calculateDevelopmentFinancials(dev);
        const stack = calculateDevelopmentCapitalStack(dev, fin);

        // 1. Check exact match of TDC
        expect(stack.tdcZAR).toBe(fin.tdcZAR);
        expect(stack.tdcZAR).toBeGreaterThan(0);

        // 2. Sum of itemized amounts MUST EQUAL tdcZAR exactly
        const totalItemsAmount = stack.items.reduce((acc, item) => acc + item.amountZAR, 0);
        expect(totalItemsAmount).toBe(stack.tdcZAR);

        // 3. Category amounts match exact financial summary categories
        const landItem = stack.items.find((i) => i.id === 'stack-land')!;
        const softItem = stack.items.find((i) => i.id === 'stack-soft')!;
        const hardItem = stack.items.find((i) => i.id === 'stack-hard')!;
        const carryItem = stack.items.find((i) => i.id === 'stack-carrying')!;
        const contItem = stack.items.find((i) => i.id === 'stack-contingency')!;

        expect(landItem.amountZAR).toBe(fin.totalLandAndAcquisitionZAR);
        expect(softItem.amountZAR).toBe(fin.totalSoftCostsZAR);
        expect(hardItem.amountZAR).toBe(fin.activeHardBuildCostZAR);
        expect(carryItem.amountZAR).toBe(fin.totalCarryingCostZAR);
        expect(contItem.amountZAR).toBe(fin.contingencyReserveZAR);

        // 4. Sum of itemized percentages must equal 100.0% within rounding tolerance (+/- 0.3%)
        const totalItemsPercent = stack.items.reduce((acc, item) => acc + item.percentOfTdc, 0);
        expect(totalItemsPercent).toBeGreaterThanOrEqual(99.7);
        expect(totalItemsPercent).toBeLessThanOrEqual(100.3);

        // 5. Subitems sum check
        const landSubSum = landItem.subItems!.reduce((acc, s) => acc + s.amountZAR, 0);
        expect(landSubSum).toBe(landItem.amountZAR);

        const softSubSum = softItem.subItems!.reduce((acc, s) => acc + s.amountZAR, 0);
        expect(softSubSum).toBe(softItem.amountZAR);

        const carrySubSum = carryItem.subItems!.reduce((acc, s) => acc + s.amountZAR, 0);
        expect(carrySubSum).toBe(carryItem.amountZAR);
      }
    });

    it('fuzzes 100 pseudo-random development projects for percentage sum and category integrity', () => {
      // Deterministic PRNG seed for reproducibility
      let seed = 42;
      const pseudoRandom = () => {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      };

      for (let trial = 0; trial < 100; trial++) {
        const landPrice = Math.floor(pseudoRandom() * 20_000_000) + 500_000;
        const acqCost = Math.floor(pseudoRandom() * 500_000);
        const arrears = Math.floor(pseudoRandom() * 200_000);
        const buildArea = Math.floor(pseudoRandom() * 5_000) + 200;
        const hardCostPerSqm = Math.floor(pseudoRandom() * 15_000) + 8_000;
        const contingencyPct = Math.floor(pseudoRandom() * 20) + 5;
        const preApprovalMos = Math.floor(pseudoRandom() * 18) + 1;
        const constrMos = Math.floor(pseudoRandom() * 24) + 1;
        const preAppBurn = Math.floor(pseudoRandom() * 50_000) + 5_000;
        const constrBurn = Math.floor(pseudoRandom() * 80_000) + 10_000;

        const dev = createAdversarialProject({
          landPurchasePriceZAR: landPrice,
          acquisitionCostsZAR: acqCost,
          sec118ArrearsZAR: arrears,
          totalBuildableAreaSqm: buildArea,
          budgetedHardCostPerSqmZAR: hardCostPerSqm,
          contingencyPercent: contingencyPct,
          preApprovalMonths: preApprovalMos,
          constructionMonths: constrMos,
          monthlyPreApprovalHoldingBurnZAR: preAppBurn,
          monthlyConstructionHoldingBurnZAR: constrBurn,
        });

        const fin = calculateDevelopmentFinancials(dev);
        const stack = calculateDevelopmentCapitalStack(dev, fin);

        // Amounts sum
        const sumAmounts = stack.items.reduce((acc, i) => acc + i.amountZAR, 0);
        expect(sumAmounts).toBe(fin.tdcZAR);

        // Percentages sum within rounding bounds
        const sumPercents = stack.items.reduce((acc, i) => acc + i.percentOfTdc, 0);
        expect(sumPercents).toBeGreaterThanOrEqual(99.7);
        expect(sumPercents).toBeLessThanOrEqual(100.3);

        // Guard against NaN
        for (const item of stack.items) {
          expect(Number.isFinite(item.amountZAR)).toBe(true);
          expect(Number.isFinite(item.percentOfTdc)).toBe(true);
          expect(item.amountZAR).toBeGreaterThanOrEqual(0);
          expect(item.percentOfTdc).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('handles zero TDC project edge case gracefully without NaN or Infinity', () => {
      const zeroDev = createAdversarialProject({
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
        monthlyPreApprovalHoldingBurnZAR: 0,
        monthlyConstructionHoldingBurnZAR: 0,
        units: [],
      });

      const fin = calculateDevelopmentFinancials(zeroDev);
      expect(fin.tdcZAR).toBe(0);

      const stack = calculateDevelopmentCapitalStack(zeroDev, fin);
      expect(stack.tdcZAR).toBe(0);
      expect(stack.gdvToTdcMultiple).toBe(0);

      for (const item of stack.items) {
        expect(item.amountZAR).toBe(0);
        expect(item.percentOfTdc).toBe(0);
        expect(Number.isFinite(item.amountZAR)).toBe(true);
        expect(Number.isFinite(item.percentOfTdc)).toBe(true);
      }
    });

    it('handles extreme multi-billion ZAR figures without precision breakdown', () => {
      const megaDev = createAdversarialProject({
        landPurchasePriceZAR: 5_000_000_000,
        acquisitionCostsZAR: 100_000_000,
        sec118ArrearsZAR: 0,
        totalBuildableAreaSqm: 500_000,
        budgetedHardCostPerSqmZAR: 30_000, // 15 Billion ZAR build
        contingencyPercent: 10,
        preApprovalMonths: 24,
        constructionMonths: 48,
        monthlyPreApprovalHoldingBurnZAR: 5_000_000,
        monthlyConstructionHoldingBurnZAR: 10_000_000,
      });

      const fin = calculateDevelopmentFinancials(megaDev);
      const stack = calculateDevelopmentCapitalStack(megaDev, fin);

      expect(stack.tdcZAR).toBeGreaterThan(20_000_000_000);
      const sumAmounts = stack.items.reduce((acc, i) => acc + i.amountZAR, 0);
      expect(sumAmounts).toBe(fin.tdcZAR);

      const sumPercents = stack.items.reduce((acc, i) => acc + i.percentOfTdc, 0);
      expect(sumPercents).toBeGreaterThanOrEqual(99.7);
      expect(sumPercents).toBeLessThanOrEqual(100.3);
    });
  });

  // =========================================================================
  // SECTION 2: calculateDevelopmentRiskGate VERIFICATION & PERMUTATIONS
  // =========================================================================
  describe('Helper 2: calculateDevelopmentRiskGate Permutation Harness', () => {
    it('exhaustively tests all 16 permutations of Stage 1 statutory approvals', () => {
      // 2^4 = 16 binary combinations of Approved vs Submitted
      for (let i = 0; i < 16; i++) {
        const approvals: PreConstructionApprovals = {
          splumaRezoningSubdivision: { status: (i & 1 ? 'Approved' : 'Submitted') as ApprovalStatus },
          sgDiagramApproval: { status: (i & 2 ? 'Approved' : 'Submitted') as ApprovalStatus },
          municipalBuildingPlans: { status: (i & 4 ? 'Approved' : 'Submitted') as ApprovalStatus },
          nhbrcEnrolment: { status: (i & 8 ? 'Approved' : 'Submitted') as ApprovalStatus },
          sectionalTitleRegister: { status: 'Not Started' },
          occupancyCertificate: { status: 'Not Started' },
        };

        const dev = createAdversarialProject({ approvals });
        const riskGate = calculateDevelopmentRiskGate(dev);

        const approvedCount = (i & 1 ? 1 : 0) + (i & 2 ? 1 : 0) + (i & 4 ? 1 : 0) + (i & 8 ? 1 : 0);
        const isAllApproved = approvedCount === 4;

        expect(riskGate.stage1ApprovedCount).toBe(approvedCount);
        expect(riskGate.stage1TotalCount).toBe(4);
        expect(riskGate.stage1ProgressPercent).toBe(Math.round((approvedCount / 4) * 100));
        expect(riskGate.isStage1Approved).toBe(isAllApproved);
        expect(riskGate.isStage2Unlocked).toBe(isAllApproved);

        if (isAllApproved) {
          expect(riskGate.stage1RingFenceLabel).toBe('Ring-Fence Cleared');
          expect(riskGate.stage2DrawLabel).toBe('Senior Facility Active');
        } else {
          expect(riskGate.stage1RingFenceLabel).toBe('Strictly Ring-Fenced');
          expect(riskGate.stage2DrawLabel).toBe('Draws Locked Pending Stage 1');
        }
      }
    });

    it('verifies N/A approvals correctly qualify as cleared statutory gates', () => {
      const approvalsWithNA: PreConstructionApprovals = {
        splumaRezoningSubdivision: { status: 'N/A' }, // Already has correct zoning
        sgDiagramApproval: { status: 'Approved' },
        municipalBuildingPlans: { status: 'Approved' },
        nhbrcEnrolment: { status: 'N/A' }, // Commercial conversion exemption
        sectionalTitleRegister: { status: 'Not Started' },
        occupancyCertificate: { status: 'Not Started' },
      };

      const dev = createAdversarialProject({ approvals: approvalsWithNA });
      const riskGate = calculateDevelopmentRiskGate(dev);

      expect(riskGate.stage1ApprovedCount).toBe(4);
      expect(riskGate.stage1ProgressPercent).toBe(100);
      expect(riskGate.isStage1Approved).toBe(true);
      expect(riskGate.isStage2Unlocked).toBe(true);
      expect(riskGate.stage1RingFenceLabel).toBe('Ring-Fence Cleared');
      expect(riskGate.stage2DrawLabel).toBe('Senior Facility Active');
    });

    it('guarantees Stage 2 CANNOT unlock even if Stage 2 approvals are cleared while Stage 1 is incomplete', () => {
      // Hostile scenario: contractor rushed Sectional Title registration and occupancy, but building plans were query
      const hostileApprovals: PreConstructionApprovals = {
        splumaRezoningSubdivision: { status: 'Approved' },
        sgDiagramApproval: { status: 'Approved' },
        municipalBuildingPlans: { status: 'Objection / Query' }, // 1 Stage 1 missing!
        nhbrcEnrolment: { status: 'Approved' },
        sectionalTitleRegister: { status: 'Approved' }, // Stage 2 approved
        occupancyCertificate: { status: 'Approved' }, // Stage 2 approved
      };

      const dev = createAdversarialProject({ approvals: hostileApprovals });
      const riskGate = calculateDevelopmentRiskGate(dev);

      expect(riskGate.stage1ApprovedCount).toBe(3);
      expect(riskGate.isStage1Approved).toBe(false);
      expect(riskGate.stage2ApprovedCount).toBe(2);
      expect(riskGate.stage2ProgressPercent).toBe(100);

      // CRITICAL STATUTORY COVENANT: Stage 2 draws MUST remain locked!
      expect(riskGate.isStage2Unlocked).toBe(false);
      expect(riskGate.stage2DrawLabel).toBe('Draws Locked Pending Stage 1');
      expect(riskGate.stage1RingFenceLabel).toBe('Strictly Ring-Fenced');
    });

    it('handles undefined, null, or empty approvals object safely', () => {
      const devEmpty = createAdversarialProject({ approvals: undefined });
      const riskGate = calculateDevelopmentRiskGate(devEmpty);

      expect(riskGate.stage1ApprovedCount).toBe(0);
      expect(riskGate.stage1TotalCount).toBe(4);
      expect(riskGate.stage1ProgressPercent).toBe(0);
      expect(riskGate.isStage1Approved).toBe(false);
      expect(riskGate.isStage2Unlocked).toBe(false);
      expect(riskGate.stage2ApprovedCount).toBe(0);
      expect(riskGate.stage2TotalCount).toBe(2);
      expect(riskGate.stage2ProgressPercent).toBe(0);
      expect(riskGate.overallProgressPercent).toBe(0);
      expect(riskGate.stage1RingFenceLabel).toBe('Strictly Ring-Fenced');
      expect(riskGate.stage2DrawLabel).toBe('Draws Locked Pending Stage 1');
    });

    it('stress-tests senior debt facility tranche controls and hurdle calculations', () => {
      // Scenario A: Overdrawn facility (drawn > limit)
      const devOverdrawn = createAdversarialProject({
        developmentFacilityLimitZAR: 10_000_000,
        developmentFacilityDrawnZAR: 12_000_000,
        developmentFacilityRepaidZAR: 2_000_000,
      });
      const gateOverdrawn = calculateDevelopmentRiskGate(devOverdrawn);
      expect(gateOverdrawn.availableFacilityUndrawnZAR).toBe(0); // Clamped to 0
      expect(gateOverdrawn.debtFacilityRepaidPercent).toBe(17); // 2M / 12M = 16.66% -> 17%

      // Scenario B: Over-repaid facility (repaid > drawn)
      const devOverpaid = createAdversarialProject({
        developmentFacilityLimitZAR: 10_000_000,
        developmentFacilityDrawnZAR: 5_000_000,
        developmentFacilityRepaidZAR: 6_000_000,
      });
      const gateOverpaid = calculateDevelopmentRiskGate(devOverpaid);
      expect(gateOverpaid.debtFacilityRepaidPercent).toBe(100); // Clamped to 100%

      // Scenario C: Zero facility drawn
      const devZeroDrawn = createAdversarialProject({
        developmentFacilityLimitZAR: 10_000_000,
        developmentFacilityDrawnZAR: 0,
        developmentFacilityRepaidZAR: 0,
      });
      const gateZeroDrawn = calculateDevelopmentRiskGate(devZeroDrawn);
      expect(gateZeroDrawn.availableFacilityUndrawnZAR).toBe(10_000_000);
      expect(gateZeroDrawn.debtFacilityRepaidPercent).toBe(100); // Clean debt state

      // Scenario D: Pre-sales hurdle boundary tests
      const devHurdleMet = createAdversarialProject({
        preSalesHurdlePercent: 50,
      });
      const gateHurdleMet = calculateDevelopmentRiskGate(devHurdleMet);
      expect(gateHurdleMet.preSoldGdvPercent).toBe(50); // 3 of 6 units are pre-sold (Sold, Bond, OTP) = 50%
      expect(gateHurdleMet.isPreSalesHurdleMet).toBe(true);

      const devHurdleUnmet = createAdversarialProject({
        preSalesHurdlePercent: 60,
      });
      const gateHurdleUnmet = calculateDevelopmentRiskGate(devHurdleUnmet);
      expect(gateHurdleUnmet.preSoldGdvPercent).toBe(50);
      expect(gateHurdleUnmet.isPreSalesHurdleMet).toBe(false);
    });
  });

  // =========================================================================
  // SECTION 3: calculateDevelopmentDebtWipeoutMatrix VERIFICATION & FUZZING
  // =========================================================================
  describe('Helper 3: calculateDevelopmentDebtWipeoutMatrix Verification', () => {
    it('verifies breakeven wipeout calculation and unencumbered units count', () => {
      // 6 units @ R2,000,000 each = R12,000,000 GDV
      // Facility drawn = R10,000,000, repaid = R3,000,000 -> Outstanding debt = R7,000,000
      // Avg unit list price = R2,000,000
      // Units required for debt wipeout = ceil(7M / 2M) = ceil(3.5) = 4 units
      // Unencumbered units = max(0, 6 - 4) = 2 units
      const dev = createAdversarialProject({
        developmentFacilityDrawnZAR: 10_000_000,
        developmentFacilityRepaidZAR: 3_000_000,
      });

      const matrix = calculateDevelopmentDebtWipeoutMatrix(dev);
      expect(matrix.outstandingDebtZAR).toBe(7_000_000);
      expect(matrix.avgUnitListPriceZAR).toBe(2_000_000);
      expect(matrix.unitsRequiredForDebtWipeout).toBe(4);
      expect(matrix.unencumberedUnitsCount).toBe(2);
      expect(matrix.totalUnitsCount).toBe(6);
    });

    it('verifies exact wipeout division without premature ceil jump', () => {
      // Outstanding debt = R6,000,000, avg price = R2,000,000
      // Units required = ceil(6M / 2M) = 3 units exactly
      const dev = createAdversarialProject({
        developmentFacilityDrawnZAR: 9_000_000,
        developmentFacilityRepaidZAR: 3_000_000,
      });

      const matrix = calculateDevelopmentDebtWipeoutMatrix(dev);
      expect(matrix.outstandingDebtZAR).toBe(6_000_000);
      expect(matrix.unitsRequiredForDebtWipeout).toBe(3);
      expect(matrix.unencumberedUnitsCount).toBe(3);
    });

    it('handles debt > GDV (underwater project) with unencumbered count clamped to 0', () => {
      const devUnderwater = createAdversarialProject({
        developmentFacilityDrawnZAR: 20_000_000,
        developmentFacilityRepaidZAR: 0,
      });

      const matrix = calculateDevelopmentDebtWipeoutMatrix(devUnderwater);
      expect(matrix.outstandingDebtZAR).toBe(20_000_000);
      expect(matrix.unitsRequiredForDebtWipeout).toBe(10); // ceil(20M / 2M) = 10
      expect(matrix.unencumberedUnitsCount).toBe(0); // Clamped, not -4!
    });

    it('verifies unit waterfall roles: Senior Debt Wipeout, Retained Equity, Cash Profit', () => {
      // Project has 6 units:
      // Unit 1: Sold & Transferred (For Sale)
      // Unit 2: Bond Approved (For Sale)
      // Unit 3: Reserved (For Sale)
      // Unit 4: Available (For Sale)
      // Unit 5: Retained for Rental (Retained)
      // Unit 6: Retained for Rental (Retained)
      // Outstanding debt = 4M, avg price = 2M -> wipeout units = 2
      const dev = createAdversarialProject({
        developmentFacilityDrawnZAR: 6_000_000,
        developmentFacilityRepaidZAR: 2_000_000, // 4M debt -> 2 wipeout units
      });

      const matrix = calculateDevelopmentDebtWipeoutMatrix(dev);
      expect(matrix.unitsRequiredForDebtWipeout).toBe(2);

      const waterfall = matrix.unitsWaterfall;
      expect(waterfall).toHaveLength(6);

      // Unit 1 (For Sale #1) -> Senior Debt Wipeout (Debt #1, blue)
      expect(waterfall[0].waterfallRole).toBe('Senior Debt Wipeout');
      expect(waterfall[0].roleBadgeText).toBe('Debt #1');
      expect(waterfall[0].roleBadgeColor).toBe('blue');
      expect(waterfall[0].isDebtExtinguisher).toBe(true);
      expect(waterfall[0].debtSequenceIndex).toBe(1);

      // Unit 2 (For Sale #2) -> Senior Debt Wipeout (Debt #2, blue)
      expect(waterfall[1].waterfallRole).toBe('Senior Debt Wipeout');
      expect(waterfall[1].roleBadgeText).toBe('Debt #2');
      expect(waterfall[1].roleBadgeColor).toBe('blue');
      expect(waterfall[1].isDebtExtinguisher).toBe(true);
      expect(waterfall[1].debtSequenceIndex).toBe(2);

      // Unit 3 (For Sale #3) -> Unencumbered Cash Profit (emerald)
      expect(waterfall[2].waterfallRole).toBe('Unencumbered Cash Profit');
      expect(waterfall[2].roleBadgeText).toBe('Cash Profit');
      expect(waterfall[2].roleBadgeColor).toBe('emerald');
      expect(waterfall[2].isDebtExtinguisher).toBe(false);

      // Unit 4 (For Sale #4) -> Unencumbered Cash Profit (emerald)
      expect(waterfall[3].waterfallRole).toBe('Unencumbered Cash Profit');
      expect(waterfall[3].roleBadgeText).toBe('Cash Profit');
      expect(waterfall[3].roleBadgeColor).toBe('emerald');
      expect(waterfall[3].isDebtExtinguisher).toBe(false);

      // Unit 5 (Retained #1) -> Free-Carry Retained Equity (purple)
      expect(waterfall[4].waterfallRole).toBe('Free-Carry Retained Equity');
      expect(waterfall[4].roleBadgeText).toBe('Retained Equity');
      expect(waterfall[4].roleBadgeColor).toBe('purple');
      expect(waterfall[4].isDebtExtinguisher).toBe(false);

      // Unit 6 (Retained #2) -> Free-Carry Retained Equity (purple)
      expect(waterfall[5].waterfallRole).toBe('Free-Carry Retained Equity');
      expect(waterfall[5].roleBadgeText).toBe('Retained Equity');
      expect(waterfall[5].roleBadgeColor).toBe('purple');
      expect(waterfall[5].isDebtExtinguisher).toBe(false);
    });

    it('verifies Free-Carry metric: R0 remaining debt when sales proceeds exceed outstanding debt', () => {
      // 1 unit sold for R2,000,000.
      // Outstanding facility = R1,500,000 (drawn 1.5M, repaid 0).
      // Remaining debt on retained units = max(0, 1.5M - 2.0M) = 0!
      const devFreeCarry = createAdversarialProject({
        developmentFacilityDrawnZAR: 1_500_000,
        developmentFacilityRepaidZAR: 0,
      });

      const matrix = calculateDevelopmentDebtWipeoutMatrix(devFreeCarry);
      expect(matrix.remainingDebtOnRetainedUnitsZAR).toBe(0);
      expect(matrix.unitsRetainedCount).toBe(2);
      expect(matrix.isFreeCarryAchieved).toBe(true);
      expect(matrix.netCashProceedsAfterDebtZAR).toBe(500_000); // 2M sold - 1.5M debt = 500k surplus cash
    });

    it('verifies Free-Carry is NOT achieved when sold proceeds are less than outstanding debt', () => {
      // 1 unit sold for R2,000,000.
      // Outstanding facility = R5,000,000.
      // Remaining debt on retained units = 5M - 2M = 3,000,000.
      const devPartialDebt = createAdversarialProject({
        developmentFacilityDrawnZAR: 5_000_000,
        developmentFacilityRepaidZAR: 0,
      });

      const matrix = calculateDevelopmentDebtWipeoutMatrix(devPartialDebt);
      expect(matrix.remainingDebtOnRetainedUnitsZAR).toBe(3_000_000);
      expect(matrix.isFreeCarryAchieved).toBe(false);
      expect(matrix.netCashProceedsAfterDebtZAR).toBe(0);
    });

    it('verifies Free-Carry is false if 0 units are retained even if debt is zero', () => {
      const devNoRetained = createAdversarialProject({
        developmentFacilityDrawnZAR: 0,
        developmentFacilityRepaidZAR: 0,
        units: [
          {
            id: 'u-1',
            unitNumber: '1',
            configuration: '1 Bed',
            floorAreaSqm: 50,
            allocatedCostBasisZAR: 500_000,
            listPriceVatInclZAR: 800_000,
            estimatedMonthlyRentZAR: 8_000,
            status: 'Sold & Transferred',
          },
        ],
      });

      const matrix = calculateDevelopmentDebtWipeoutMatrix(devNoRetained);
      expect(matrix.unitsRetainedCount).toBe(0);
      expect(matrix.isFreeCarryAchieved).toBe(false);
    });

    it('tests SARS Section 13sex 5-unit threshold, 55% base, 5% annual allowance, and 20-year cumulative shield', () => {
      // Test Retained Units count from 0 to 6
      const costBasisPerUnit = 1_000_000;

      for (let retainedCount = 0; retainedCount <= 6; retainedCount++) {
        const units: DevelopmentUnit[] = [];
        for (let i = 0; i < 6; i++) {
          units.push({
            id: `u-${i}`,
            unitNumber: `U${i + 1}`,
            configuration: '2 Bed',
            floorAreaSqm: 60,
            allocatedCostBasisZAR: costBasisPerUnit,
            listPriceVatInclZAR: 1_500_000,
            estimatedMonthlyRentZAR: 10_000,
            status: (i < retainedCount ? 'Retained for Rental' : 'Available') as DevUnitStatus,
          });
        }

        const dev = createAdversarialProject({ units });
        const matrix = calculateDevelopmentDebtWipeoutMatrix(dev);

        expect(matrix.unitsRetainedCount).toBe(retainedCount);

        if (retainedCount < 5) {
          // Less than 5 units -> ineligible
          expect(matrix.isSection13SexEligible).toBe(false);
          expect(matrix.section13sexDeductionBaseZAR).toBe(0);
          expect(matrix.section13sexAnnualAllowanceZAR).toBe(0);
          expect(matrix.section13sexTwentyYearSavingsZAR).toBe(0);
          expect(matrix.unitsNeededForSection13Sex).toBe(5 - retainedCount);
        } else {
          // 5 or more units -> eligible
          expect(matrix.isSection13SexEligible).toBe(true);
          expect(matrix.unitsNeededForSection13Sex).toBe(0);

          const expectedTotalRetainedBasis = retainedCount * costBasisPerUnit;
          const expectedDeductionBase = Math.round(expectedTotalRetainedBasis * 0.55);
          const expectedAnnualAllowance = Math.round(expectedDeductionBase * 0.05);
          const expectedTwentyYear = expectedAnnualAllowance * 20;

          expect(matrix.section13sexDeductionBaseZAR).toBe(expectedDeductionBase);
          expect(matrix.section13sexAnnualAllowanceZAR).toBe(expectedAnnualAllowance);
          expect(matrix.section13sexTwentyYearSavingsZAR).toBe(expectedTwentyYear);

          // For retainedCount = 5:
          // basis = 5,000,000
          // 55% base = 2,750,000
          // annual 5% = 137,500
          // 20-year = 2,750,000
          if (retainedCount === 5) {
            expect(matrix.section13sexDeductionBaseZAR).toBe(2_750_000);
            expect(matrix.section13sexAnnualAllowanceZAR).toBe(137_500);
            expect(matrix.section13sexTwentyYearSavingsZAR).toBe(2_750_000);
          }
        }
      }
    });

    it('verifies seed project dev-2 Section 13sex exact values (10 retained micro-apartments)', () => {
      const fin = calculateDevelopmentFinancials(dev2);
      const matrix = calculateDevelopmentDebtWipeoutMatrix(dev2, fin);

      expect(matrix.unitsRetainedCount).toBe(10);
      expect(matrix.isSection13SexEligible).toBe(true);
      expect(matrix.unitsNeededForSection13Sex).toBe(0);

      // dev-2 cost basis is 10 * R345,000 = R3,450,000
      // 55% base = R1,897,500
      // 5% annual allowance = R94,875/yr
      // 20-year cumulative shield = R1,897,500
      expect(matrix.section13sexDeductionBaseZAR).toBe(1_897_500);
      expect(matrix.section13sexAnnualAllowanceZAR).toBe(94_875);
      expect(matrix.section13sexTwentyYearSavingsZAR).toBe(1_897_500);
      expect(matrix.section13sexTwentyYearSavingsZAR).toBe(matrix.section13sexAnnualAllowanceZAR * 20);
    });
  });

  // =========================================================================
  // SECTION 4: DevelopmentFeasibilitySection ZERO DISCREPANCY AUDIT
  // =========================================================================
  describe('Presentation Integrity: DevelopmentFeasibilitySection Discrepancy & AST Audit', () => {
    it('verifies complete rendered HTML alignment with pure helpers across varied projects', () => {
      const testCases = [
        { name: 'dev-1 (Ferndale 6-Unit)', dev: dev1 },
        { name: 'dev-2 (Kempton Park 10-Unit)', dev: dev2 },
        { name: 'Adversarial Challenge Project', dev: createAdversarialProject() },
      ];

      for (const tc of testCases) {
        const fin = calculateDevelopmentFinancials(tc.dev);
        const stack = calculateDevelopmentCapitalStack(tc.dev, fin);
        const riskGate = calculateDevelopmentRiskGate(tc.dev, fin);
        const matrix = calculateDevelopmentDebtWipeoutMatrix(tc.dev, fin);

        const html = renderToString(
          <DevelopmentFeasibilitySection development={tc.dev} financials={fin} />
        );

        // Verify Capital Stack numbers in rendered HTML
        expect(html).toContain(formatZAR(stack.tdcZAR));
        expect(html).toContain(formatZAR(stack.gdvInclVatZAR));
        expect(html).toContain(formatPercent(stack.pocPercent));
        expect(html).toContain(formatZAR(fin.activeHardBuildCostZAR));

        // Verify Risk Gate labels and tranche figures
        expect(html).toContain(riskGate.stage1RingFenceLabel);
        expect(html).toContain(riskGate.stage2DrawLabel);
        expect(html).toContain(formatZAR(riskGate.facilityLimitZAR));
        expect(html).toContain(formatZAR(riskGate.facilityDrawnZAR));
        expect(html).toContain(formatZAR(riskGate.facilityRepaidZAR));
        expect(html).toContain(formatZAR(riskGate.availableFacilityUndrawnZAR));

        // Verify Debt Wipeout figures
        expect(html).toContain(formatZAR(matrix.avgUnitListPriceZAR));
        expect(html).toContain(String(matrix.unitsRequiredForDebtWipeout));
        expect(html).toContain(String(matrix.unencumberedUnitsCount));
        expect(html).toContain(formatZAR(matrix.netCashProceedsAfterDebtZAR));
        expect(html).toContain(formatZAR(matrix.remainingDebtOnRetainedUnitsZAR));

        // Verify Section 13sex rendering
        if (matrix.isSection13SexEligible) {
          expect(html).toContain(formatZAR(matrix.section13sexDeductionBaseZAR));
          expect(html).toContain(formatZAR(matrix.section13sexAnnualAllowanceZAR));
          expect(html).toContain(formatZAR(matrix.section13sexTwentyYearSavingsZAR));
        } else {
          expect(html).toContain(String(matrix.unitsNeededForSection13Sex));
        }
      }
    });

    it('verifies ZERO Unicode emojis or Dingbats glyphs in DevelopmentFeasibilitySection.tsx', () => {
      const filePath = resolve(
        process.cwd(),
        'src/components/proposal/DevelopmentFeasibilitySection.tsx'
      );
      const content = readFileSync(filePath, 'utf-8');

      // Comprehensive emoji / Dingbats regex
      const emojiRegex =
        /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/u;

      const matches = content.match(emojiRegex);
      expect(matches).toBeNull();
    });

    it('verifies ZERO inline arithmetic expressions in DevelopmentFeasibilitySection.tsx JSX', () => {
      const filePath = resolve(
        process.cwd(),
        'src/components/proposal/DevelopmentFeasibilitySection.tsx'
      );
      const content = readFileSync(filePath, 'utf-8');

      // Match all JSX expression containers: { ... }
      // Exclude function bodies or component definitions
      const jsxExprRegex = /\{([^}]+)\}/g;
      let match;
      const expressions: string[] = [];

      while ((match = jsxExprRegex.exec(content)) !== null) {
        const expr = match[1].trim();
        // Ignore style objects {{ ... }}, import blocks, or comments
        if (expr.startsWith('{') || expr.startsWith('/*')) continue;
        expressions.push(expr);
      }

      // Prohibited inline arithmetic operators between numeric tokens:
      // Examples: a + b (numeric), a - b, a * b, a / b, a % b
      // Allowed: string concat with '+', ternary '?', logical '&&', '||', '!', '==='
      const arithmeticRegex =
        /(?:[a-zA-Z0-9_\.]+|\))\s*[\+\-\*\/%]\s*(?:[a-zA-Z0-9_\.]+|\()/;

      const inlineCalculations: string[] = [];
      for (const expr of expressions) {
        // Exclude string template literals (`...`), classNames, ternary conditions
        if (expr.startsWith('`') || expr.startsWith("'") || expr.startsWith('"')) continue;
        if (expr.includes('?') && !arithmeticRegex.test(expr)) continue;

        // Check if expression contains arithmetic operations on numbers/variables
        // We allow '+' if it's string concatenation, but reject numeric math
        const tokens = expr.split(/\s+/);
        for (let i = 1; i < tokens.length - 1; i++) {
          const op = tokens[i];
          if (['-', '*', '/', '%'].includes(op)) {
            // Check if not part of a string or arrow function
            if (!expr.includes('=>') && !expr.includes('"') && !expr.includes("'")) {
              inlineCalculations.push(expr);
            }
          }
        }
      }

      expect(inlineCalculations).toEqual([]);
    });
  });
});
