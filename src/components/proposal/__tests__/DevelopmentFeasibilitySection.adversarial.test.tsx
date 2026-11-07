import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString as baseRenderToString } from 'react-dom/server';
const renderToString = (element: React.ReactElement): string => {
  return baseRenderToString(element).replace(/<!-- -->/g, '');
};
import {
  DevelopmentFeasibilitySection,
  mapDevelopmentToProposalDeal,
} from '../DevelopmentFeasibilitySection';
import { DevelopmentProject, DevelopmentUnit } from '@/types';
import {
  calculateDevelopmentFinancials,
  calculateDevelopmentCapitalStack,
  calculateDevelopmentRiskGate,
  calculateDevelopmentDebtWipeoutMatrix,
} from '@/lib/calculations/developments';
import { formatZAR, formatPercent } from '@/lib/formatters';

describe('Adversarial & Edge State Suite: DevelopmentFeasibilitySection', () => {
  const zeroDev: DevelopmentProject = {
    id: 'dev-edge-zero',
    title: 'Zero Unit Bare Land Project',
    address: 'Plot 0, Nowhere',
    city: 'Johannesburg',
    province: 'Gauteng',
    developmentType: 'Subdivision & Cluster',
    isVatRegisteredDeveloper: false,
    currentPhase: 'Feasibility',
    preApprovalMonths: 0,
    constructionMonths: 0,
    sellDownMonths: 0,
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
    developmentFacilityLimitZAR: 0,
    developmentFacilityDrawnZAR: 0,
    developmentFacilityRepaidZAR: 0,
    preSalesHurdlePercent: 0,
    approvals: undefined as any,
    units: [],
  };

  const createTestDev = (overrides?: Partial<DevelopmentProject>): DevelopmentProject => ({
    ...zeroDev,
    approvals: {
      splumaRezoningSubdivision: { status: 'Approved' },
      sgDiagramApproval: { status: 'Approved' },
      municipalBuildingPlans: { status: 'Approved' },
      nhbrcEnrolment: { status: 'Approved' },
      sectionalTitleRegister: { status: 'Approved' },
      occupancyCertificate: { status: 'Approved' },
    },
    ...overrides,
  });

  // =========================================================================
  // EDGE CASE 1: 0 Units, 0 TDC, 0 GDV, Missing Approvals, Zero Division Guards
  // =========================================================================
  describe('Edge Case 1: Extreme Zero / Missing / Corrupt States', () => {

    it('calculates 0 financial metrics without NaN, Infinity, or division-by-zero errors', () => {
      const fin = calculateDevelopmentFinancials(zeroDev);

      expect(fin.tdcZAR).toBe(0);
      expect(fin.tdcPerSqmZAR).toBe(0);
      expect(fin.tdcPerUnitZAR).toBe(0);
      expect(fin.gdvInclVatZAR).toBe(0);
      expect(fin.netRealizableGdvZAR).toBe(0);
      expect(fin.netProfitBeforeTaxZAR).toBe(0);
      expect(fin.pocPercent).toBe(0);
      expect(fin.afterTaxPocPercent).toBe(0);
      expect(fin.avgUnitListPriceZAR).toBe(0);
      expect(fin.unitsRequiredForDebtWipeout).toBe(0);
      expect(fin.unencumberedUnitsCount).toBe(0);
      expect(fin.isSection13SexEligible).toBe(false);
      expect(fin.actualBoqSpendPerSqmZAR).toBe(0);
      expect(fin.gdvToTdcMultiple).toBe(0);

      // Verify no NaN or Infinity exists in any numerical summary field
      Object.entries(fin).forEach(([key, val]) => {
        if (typeof val === 'number') {
          expect(Number.isNaN(val)).toBe(false);
          expect(Number.isFinite(val)).toBe(true);
        }
      });
    });

    it('renders DevelopmentFeasibilitySection for 0-unit, 0-TDC, 0-GDV project without crashing', () => {
      const html = renderToString(<DevelopmentFeasibilitySection development={zeroDev} />);

      // Verify header renders with fallback
      expect(html).toContain('Development Feasibility &amp; Institutional Capital Stack');
      expect(html).toContain('Non-VAT Developer');

      // Verify Part 1 renders zeroed values without NaN or Infinity
      expect(html).toContain('Total Development Cost (TDC)');
      expect(html).toContain('R 0');
      expect(html).toContain('0.0% Pre-Tax');
      expect(html).not.toContain('NaN');
      expect(html).not.toContain('Infinity');

      // Verify Part 2 handles missing approvals cleanly
      expect(html).toContain('Strictly Ring-Fenced');
      expect(html).toContain('Draws Locked Pending Stage 1');

      // Verify Part 3 renders 0 of 0 units cleanly
      expect(html).toContain('0 of 0 Units');
      expect(html).toContain('0 Units');
    });

    it('handles missing or undefined approvals object by defaulting all gates to unapproved and ring-fenced', () => {
      const devNoApprovals = { ...zeroDev, approvals: undefined as any };
      const riskGate = calculateDevelopmentRiskGate(devNoApprovals);

      expect(riskGate.isStage1Approved).toBe(false);
      expect(riskGate.isStage2Unlocked).toBe(false);
      expect(riskGate.stage1ApprovedCount).toBe(0);
      expect(riskGate.stage1TotalCount).toBe(4);
      expect(riskGate.stage1ProgressPercent).toBe(0);
      expect(riskGate.stage1RingFenceLabel).toBe('Strictly Ring-Fenced');
      expect(riskGate.stage2DrawLabel).toBe('Draws Locked Pending Stage 1');

      const html = renderToString(<DevelopmentFeasibilitySection development={devNoApprovals} />);
      expect(html).toContain('Strictly Ring-Fenced');
      expect(html).toContain('Draws Locked Pending Stage 1');
    });

    it('handles partially approved statutory state: 1 stage-1 item approved, rest pending', () => {
      const devPartial: DevelopmentProject = {
        ...zeroDev,
        approvals: {
          splumaRezoningSubdivision: { status: 'Approved', approvedDate: '2026-01-15' },
          sgDiagramApproval: { status: 'Objection / Query' },
          municipalBuildingPlans: { status: 'Not Started' },
          nhbrcEnrolment: { status: 'Not Started' },
          sectionalTitleRegister: { status: 'Not Started' },
          occupancyCertificate: { status: 'Not Started' },
        },
      };

      const riskGate = calculateDevelopmentRiskGate(devPartial);
      expect(riskGate.stage1ApprovedCount).toBe(1);
      expect(riskGate.isStage1Approved).toBe(false);
      expect(riskGate.isStage2Unlocked).toBe(false);
      expect(riskGate.stage1ProgressPercent).toBe(25); // 1 of 4

      const html = renderToString(<DevelopmentFeasibilitySection development={devPartial} />);
      expect(html).toContain('SPLUMA Section 42 Rezoning &amp; Subdivision');
      expect(html).toContain('Objection / Query');
      expect(html).toContain('Strictly Ring-Fenced');
    });

    it('handles 0 TDC with positive GDV without dividing by zero', () => {
      const units: DevelopmentUnit[] = [
        {
          id: 'u-pos-1',
          unitNumber: '101',
          configuration: '1 Bed',
          floorAreaSqm: 50,
          allocatedCostBasisZAR: 0,
          listPriceVatInclZAR: 1200000,
          estimatedMonthlyRentZAR: 9000,
          status: 'Available',
        },
      ];
      const devDonatedLand: DevelopmentProject = {
        ...zeroDev,
        units,
      };

      const fin = calculateDevelopmentFinancials(devDonatedLand);
      expect(fin.tdcZAR).toBe(0);
      expect(fin.gdvInclVatZAR).toBe(1200000);
      expect(fin.pocPercent).toBe(0); // guarded, not Infinity
      expect(fin.gdvToTdcMultiple).toBe(0); // guarded, not Infinity

      const capStack = calculateDevelopmentCapitalStack(devDonatedLand, fin);
      expect(capStack.pocPercent).toBe(0);
      expect(capStack.gdvToTdcMultiple).toBe(0);

      const html = renderToString(<DevelopmentFeasibilitySection development={devDonatedLand} />);
      expect(html).not.toContain('Infinity');
      expect(html).not.toContain('NaN');
    });

    it('handles positive TDC with 0 GDV (underwriting unpriced units)', () => {
      const devUnpriced: DevelopmentProject = {
        ...zeroDev,
        landPurchasePriceZAR: 2000000,
        acquisitionCostsZAR: 100000,
        budgetedHardCostPerSqmZAR: 12000,
        totalBuildableAreaSqm: 200,
      };

      const fin = calculateDevelopmentFinancials(devUnpriced);
      expect(fin.tdcZAR).toBe(4500000);
      expect(fin.gdvInclVatZAR).toBe(0);
      expect(fin.pocPercent).toBe(-100);
      expect(fin.unitsRequiredForDebtWipeout).toBe(0);

      const html = renderToString(<DevelopmentFeasibilitySection development={devUnpriced} />);
      expect(html).toContain('-100.0% Pre-Tax');
      expect(html).not.toContain('NaN');
    });

    it('handles undefined dev.units gracefully', () => {
      const devUndefinedUnits: DevelopmentProject = {
        ...zeroDev,
        units: undefined as any,
      };

      const fin = calculateDevelopmentFinancials(devUndefinedUnits);
      expect(fin.totalUnitsCount).toBe(0);
      expect(fin.gdvInclVatZAR).toBe(0);

      const wipeout = calculateDevelopmentDebtWipeoutMatrix(devUndefinedUnits, fin);
      expect(wipeout.unitsWaterfall).toHaveLength(0);

      const html = renderToString(<DevelopmentFeasibilitySection development={devUndefinedUnits} />);
      expect(html).toContain('0 of 0 Units');
    });

    it('mapDevelopmentToProposalDeal handles 0 holding months and 0 TDC without crashing', () => {
      const mapped = mapDevelopmentToProposalDeal(zeroDev);

      expect(mapped.holdingDurationMonths).toBe(1); // guarded: Math.max(1, ...)
      expect(mapped.monthlyHoldingCost).toBe(0);
      expect(mapped.builtInEquityPercent).toBe(0); // guarded: tdcZAR > 0 ? ... : 0
      expect(mapped.strategy).toBe('Flip'); // empty units defaults to Flip
      expect(mapped.purchasePrice).toBe(0);
    });
  });

  // =========================================================================
  // EDGE CASE 2: Debt Wipeout Matrix & Unit Mix Extremes
  // =========================================================================
  describe('Edge Case 2: Debt Wipeout Matrix Unit Mix Extremes', () => {
    const createUnit = (id: string, num: string, status: any, price: number, rent: number, basis: number): DevelopmentUnit => ({
      id,
      unitNumber: num,
      configuration: '2 Bed 1 Bath',
      floorAreaSqm: 60,
      allocatedCostBasisZAR: basis,
      listPriceVatInclZAR: price,
      estimatedMonthlyRentZAR: rent,
      status,
    });

    it('Scenario 2.1: 100% retained units with debt (Build-To-Rent) — all units marked Retained Equity, none as Debt Wipeout', () => {
      const units: DevelopmentUnit[] = Array.from({ length: 8 }, (_, i) =>
        createUnit(`u-ret-${i + 1}`, `${i + 1}`, 'Retained for Rental', 1000000, 8500, 650000)
      );

      const btrDev: DevelopmentProject = createTestDev({
        id: 'dev-btr-100',
        title: 'BTR 8-Unit Complex',
        address: '100 Main Road',
        city: 'Pretoria',
        province: 'Gauteng',
        developmentType: 'Sectional Title Apartments',
        isVatRegisteredDeveloper: true,
        currentPhase: 'Superstructure',
        preApprovalMonths: 3,
        constructionMonths: 9,
        sellDownMonths: 0,
        landPurchasePriceZAR: 1500000,
        acquisitionCostsZAR: 100000,
        sec118ArrearsZAR: 0,
        totalBuildableAreaSqm: 480,
        budgetedHardCostPerSqmZAR: 11000,
        contingencyPercent: 5,
        boqItems: [],
        monthlyPreApprovalHoldingBurnZAR: 10000,
        monthlyConstructionHoldingBurnZAR: 15000,
        developmentFacilityLimitZAR: 4000000,
        developmentFacilityDrawnZAR: 3000000,
        developmentFacilityRepaidZAR: 0,
        preSalesHurdlePercent: 0,
        units,
      });

      const fin = calculateDevelopmentFinancials(btrDev);
      const wipeout = calculateDevelopmentDebtWipeoutMatrix(btrDev, fin);

      expect(wipeout.unitsForSaleCount).toBe(0);
      expect(wipeout.unitsRetainedCount).toBe(8);
      expect(wipeout.outstandingDebtZAR).toBe(3000000);
      expect(wipeout.unitsRequiredForDebtWipeout).toBe(3); // Math.ceil(3M / 1M avg) = 3
      expect(wipeout.unencumberedUnitsCount).toBe(5); // 8 - 3 = 5

      // All 8 units in waterfall MUST be 'Free-Carry Retained Equity' because none are for sale
      wipeout.unitsWaterfall.forEach((u) => {
        expect(u.waterfallRole).toBe('Free-Carry Retained Equity');
        expect(u.roleBadgeText).toBe('Retained Equity');
        expect(u.roleBadgeColor).toBe('purple');
        expect(u.isDebtExtinguisher).toBe(false);
      });

      // Free-carry not achieved yet because remaining debt > 0
      expect(wipeout.remainingDebtOnRetainedUnitsZAR).toBe(3000000);
      expect(wipeout.isFreeCarryAchieved).toBe(false);

      const html = renderToString(<DevelopmentFeasibilitySection development={btrDev} financials={fin} />);
      expect(html).toContain('0 for Sale • 8 Retained for Rental');
      expect(html).toContain('Partial Debt Remaining');
      expect(html).toContain(formatZAR(3000000));
    });

    it('Scenario 2.2: 100% retained units with 0 debt achieves 100% Free-Carry (Debt-Free)', () => {
      const units: DevelopmentUnit[] = Array.from({ length: 6 }, (_, i) =>
        createUnit(`u-ret0-${i + 1}`, `${i + 1}`, 'Retained for Rental', 900000, 7500, 500000)
      );

      const devZeroDebt: DevelopmentProject = createTestDev({
        id: 'dev-zero-debt',
        title: 'Equity Funded 6-Pack',
        address: '50 Park Lane',
        city: 'Durban',
        developmentType: 'Township Micro-Units (Infill)',
        isVatRegisteredDeveloper: false,
        currentPhase: 'Completed',
        preApprovalMonths: 2,
        constructionMonths: 6,
        sellDownMonths: 0,
        landPurchasePriceZAR: 800000,
        acquisitionCostsZAR: 50000,
        sec118ArrearsZAR: 0,
        totalBuildableAreaSqm: 360,
        budgetedHardCostPerSqmZAR: 9000,
        contingencyPercent: 5,
        boqItems: [],
        monthlyPreApprovalHoldingBurnZAR: 5000,
        monthlyConstructionHoldingBurnZAR: 8000,
        developmentFacilityLimitZAR: 0,
        developmentFacilityDrawnZAR: 0,
        developmentFacilityRepaidZAR: 0,
        preSalesHurdlePercent: 0,
        units,
      });

      const fin = calculateDevelopmentFinancials(devZeroDebt);
      const wipeout = calculateDevelopmentDebtWipeoutMatrix(devZeroDebt, fin);

      expect(wipeout.unitsRequiredForDebtWipeout).toBe(0);
      expect(wipeout.unencumberedUnitsCount).toBe(6);
      expect(wipeout.remainingDebtOnRetainedUnitsZAR).toBe(0);
      expect(wipeout.isFreeCarryAchieved).toBe(true);

      const html = renderToString(<DevelopmentFeasibilitySection development={devZeroDebt} financials={fin} />);
      expect(html).toContain('100% Free-Carry (Debt-Free)');
    });

    it('Scenario 2.3: 100% sold units partitions correctly between debt wipeout and cash profit', () => {
      const units: DevelopmentUnit[] = Array.from({ length: 6 }, (_, i) =>
        createUnit(`u-sold-${i + 1}`, `${i + 1}`, 'Sold & Transferred', 1500000, 0, 900000)
      );

      const devSold: DevelopmentProject = createTestDev({
        id: 'dev-100-sold',
        title: 'Sold Out Townhouse Development',
        address: '1 Sandton Drive',
        city: 'Sandton',
        developmentType: 'Subdivision & Cluster',
        isVatRegisteredDeveloper: true,
        currentPhase: 'Sell-Down / Handover',
        preApprovalMonths: 4,
        constructionMonths: 8,
        sellDownMonths: 3,
        landPurchasePriceZAR: 2000000,
        acquisitionCostsZAR: 150000,
        sec118ArrearsZAR: 0,
        totalBuildableAreaSqm: 600,
        budgetedHardCostPerSqmZAR: 12000,
        contingencyPercent: 5,
        boqItems: [],
        monthlyPreApprovalHoldingBurnZAR: 12000,
        monthlyConstructionHoldingBurnZAR: 20000,
        developmentFacilityLimitZAR: 6000000,
        developmentFacilityDrawnZAR: 4500000, // 4.5M debt
        developmentFacilityRepaidZAR: 0,
        preSalesHurdlePercent: 50,
        units,
      });

      const fin = calculateDevelopmentFinancials(devSold);
      const wipeout = calculateDevelopmentDebtWipeoutMatrix(devSold, fin);

      expect(wipeout.unitsForSaleCount).toBe(6);
      expect(wipeout.unitsRetainedCount).toBe(0);
      expect(wipeout.unitsRequiredForDebtWipeout).toBe(3); // Math.ceil(4.5M / 1.5M) = 3
      expect(wipeout.unencumberedUnitsCount).toBe(3); // 6 - 3 = 3

      // Units 1, 2, 3 must be 'Senior Debt Wipeout'
      expect(wipeout.unitsWaterfall[0].waterfallRole).toBe('Senior Debt Wipeout');
      expect(wipeout.unitsWaterfall[0].roleBadgeText).toBe('Debt #1');
      expect(wipeout.unitsWaterfall[0].roleBadgeColor).toBe('blue');

      expect(wipeout.unitsWaterfall[1].waterfallRole).toBe('Senior Debt Wipeout');
      expect(wipeout.unitsWaterfall[1].roleBadgeText).toBe('Debt #2');

      expect(wipeout.unitsWaterfall[2].waterfallRole).toBe('Senior Debt Wipeout');
      expect(wipeout.unitsWaterfall[2].roleBadgeText).toBe('Debt #3');

      // Units 4, 5, 6 must be 'Unencumbered Cash Profit'
      expect(wipeout.unitsWaterfall[3].waterfallRole).toBe('Unencumbered Cash Profit');
      expect(wipeout.unitsWaterfall[3].roleBadgeText).toBe('Cash Profit');
      expect(wipeout.unitsWaterfall[3].roleBadgeColor).toBe('emerald');

      expect(wipeout.unitsWaterfall[4].waterfallRole).toBe('Unencumbered Cash Profit');
      expect(wipeout.unitsWaterfall[5].waterfallRole).toBe('Unencumbered Cash Profit');

      // Proceeds: Total sales = 9M, debt = 4.5M => net cash proceeds = 4.5M
      expect(wipeout.totalSoldProceedsZAR).toBe(9000000);
      expect(wipeout.netCashProceedsAfterDebtZAR).toBe(4500000);
      expect(wipeout.isSection13SexEligible).toBe(false);

      const html = renderToString(<DevelopmentFeasibilitySection development={devSold} financials={fin} />);
      expect(html).toContain('3 of 6 Units');
      expect(html).toContain('3 Units');
      expect(html).toContain('Debt #1');
      expect(html).toContain('Debt #3');
      expect(html).toContain('Cash Profit');
    });

    it('Scenario 2.4: Underwater project where debt wipeout requires MORE units than exist', () => {
      // 4 units @ R 1M each = R 4M GDV, but facility drawn is R 8M
      const units: DevelopmentUnit[] = Array.from({ length: 4 }, (_, i) =>
        createUnit(`u-under-${i + 1}`, `${i + 1}`, 'Available', 1000000, 0, 1500000)
      );

      const devUnderwater: DevelopmentProject = createTestDev({
        id: 'dev-underwater',
        title: 'Overleveraged 4-Unit Project',
        address: '10 Distress Ave',
        city: 'Johannesburg',
        developmentType: 'Subdivision & Cluster',
        isVatRegisteredDeveloper: false,
        currentPhase: 'Finishes & Practical Completion',
        preApprovalMonths: 6,
        constructionMonths: 12,
        sellDownMonths: 6,
        landPurchasePriceZAR: 3000000,
        acquisitionCostsZAR: 200000,
        sec118ArrearsZAR: 0,
        totalBuildableAreaSqm: 400,
        budgetedHardCostPerSqmZAR: 14000,
        contingencyPercent: 10,
        boqItems: [],
        monthlyPreApprovalHoldingBurnZAR: 15000,
        monthlyConstructionHoldingBurnZAR: 25000,
        developmentFacilityLimitZAR: 10000000,
        developmentFacilityDrawnZAR: 8000000,
        developmentFacilityRepaidZAR: 0,
        preSalesHurdlePercent: 75,
        units,
      });

      const fin = calculateDevelopmentFinancials(devUnderwater);
      const wipeout = calculateDevelopmentDebtWipeoutMatrix(devUnderwater, fin);

      expect(wipeout.unitsRequiredForDebtWipeout).toBe(8); // Math.ceil(8M / 1M) = 8
      expect(wipeout.totalUnitsCount).toBe(4);
      // unencumbered units must NOT be negative! Guarded via Math.max(0, ...)
      expect(wipeout.unencumberedUnitsCount).toBe(0);

      // All 4 units in waterfall are tagged Debt #1 to Debt #4, 0 cash profit units
      expect(wipeout.unitsWaterfall).toHaveLength(4);
      wipeout.unitsWaterfall.forEach((u, idx) => {
        expect(u.waterfallRole).toBe('Senior Debt Wipeout');
        expect(u.roleBadgeText).toBe(`Debt #${idx + 1}`);
        expect(u.isDebtExtinguisher).toBe(true);
      });

      const html = renderToString(<DevelopmentFeasibilitySection development={devUnderwater} financials={fin} />);
      expect(html).toContain('8 of 4 Units');
      expect(html).toContain('0 Units');
      expect(html).not.toContain('-4 Units');
    });
  });

  // =========================================================================
  // EDGE CASE 3: SARS Section 13sex Threshold Boundary (< 5 vs >= 5 units)
  // =========================================================================
  describe('Edge Case 3: Section 13sex Threshold Boundary Evaluation', () => {
    const createRetainedUnit = (num: number, costBasis: number, rent: number): DevelopmentUnit => ({
      id: `u-sec13-${num}`,
      unitNumber: `${num}`,
      configuration: '1 Bed Studio',
      floorAreaSqm: 45,
      allocatedCostBasisZAR: costBasis,
      listPriceVatInclZAR: 750000,
      estimatedMonthlyRentZAR: rent,
      status: 'Retained for Rental',
    });

    const createDevWithRetainedUnits = (count: number, costPerUnit = 500000): DevelopmentProject => createTestDev({
      id: `dev-sec13-${count}`,
      title: `Section 13sex ${count}-Unit Test Project`,
      address: '77 Tax Lane',
      city: 'Johannesburg',
      developmentType: 'Township Micro-Units (Infill)',
      isVatRegisteredDeveloper: true,
      currentPhase: 'Sell-Down / Handover',
      preApprovalMonths: 2,
      constructionMonths: 6,
      sellDownMonths: 2,
      landPurchasePriceZAR: 1000000,
      acquisitionCostsZAR: 50000,
      sec118ArrearsZAR: 0,
      totalBuildableAreaSqm: count * 45,
      budgetedHardCostPerSqmZAR: 9000,
      contingencyPercent: 5,
      boqItems: [],
      monthlyPreApprovalHoldingBurnZAR: 5000,
      monthlyConstructionHoldingBurnZAR: 8000,
      developmentFacilityLimitZAR: 2000000,
      developmentFacilityDrawnZAR: 1000000,
      developmentFacilityRepaidZAR: 0,
      preSalesHurdlePercent: 0,
      units: Array.from({ length: count }, (_, i) =>
        createRetainedUnit(i + 1, costPerUnit, 6000)
      ),
    });

    it('Boundary 3.1: 0 units retained — ineligible, displays 5 units needed notice', () => {
      const dev0 = createDevWithRetainedUnits(0);
      const fin = calculateDevelopmentFinancials(dev0);
      const wipeout = calculateDevelopmentDebtWipeoutMatrix(dev0, fin);

      expect(wipeout.isSection13SexEligible).toBe(false);
      expect(wipeout.unitsRetainedCount).toBe(0);
      expect(wipeout.unitsNeededForSection13Sex).toBe(5);
      expect(wipeout.section13sexDeductionBaseZAR).toBe(0);
      expect(wipeout.section13sexAnnualAllowanceZAR).toBe(0);
      expect(wipeout.section13sexTwentyYearSavingsZAR).toBe(0);

      const html = renderToString(<DevelopmentFeasibilitySection development={dev0} financials={fin} />);
      expect(html).toContain('Requires 5+ units retained for rental (0 currently retained; 5 more needed');
      expect(html).not.toContain('Active &amp; Unlocked');
    });

    it('Boundary 3.2: Exactly 4 units retained (N = 4, threshold - 1) — strictly ineligible', () => {
      const dev4 = createDevWithRetainedUnits(4, 500000);
      const fin = calculateDevelopmentFinancials(dev4);
      const wipeout = calculateDevelopmentDebtWipeoutMatrix(dev4, fin);

      expect(wipeout.isSection13SexEligible).toBe(false);
      expect(wipeout.unitsRetainedCount).toBe(4);
      expect(wipeout.unitsNeededForSection13Sex).toBe(1);
      expect(wipeout.section13sexDeductionBaseZAR).toBe(0);
      expect(wipeout.section13sexAnnualAllowanceZAR).toBe(0);
      expect(wipeout.section13sexTwentyYearSavingsZAR).toBe(0);

      const html = renderToString(<DevelopmentFeasibilitySection development={dev4} financials={fin} />);
      expect(html).toContain('Requires 5+ units retained for rental (4 currently retained; 1 more needed');
      expect(html).not.toContain('Active &amp; Unlocked');
    });

    it('Boundary 3.3: Exactly 5 units retained (N = 5, threshold met) — unlocks 55% tax write-off', () => {
      const dev5 = createDevWithRetainedUnits(5, 600000); // 5 * 600k = 3M total cost basis
      const fin = calculateDevelopmentFinancials(dev5);
      const wipeout = calculateDevelopmentDebtWipeoutMatrix(dev5, fin);

      expect(wipeout.isSection13SexEligible).toBe(true);
      expect(wipeout.unitsRetainedCount).toBe(5);
      expect(wipeout.unitsNeededForSection13Sex).toBe(0);

      // Math: 3,000,000 * 55% = 1,650,000 deduction base
      // Annual 5%: 1,650,000 * 5% = 82,500
      // 20-Year cumulative: 82,500 * 20 = 1,650,000
      expect(wipeout.section13sexDeductionBaseZAR).toBe(1650000);
      expect(wipeout.section13sexAnnualAllowanceZAR).toBe(82500);
      expect(wipeout.section13sexTwentyYearSavingsZAR).toBe(1650000);

      const html = renderToString(<DevelopmentFeasibilitySection development={dev5} financials={fin} />);
      expect(html).toContain('SARS Section 13sex 55% Residential Building Tax Shield (Active &amp; Unlocked)');
      expect(html).toContain(formatZAR(1650000));
      expect(html).toContain(formatZAR(82500));
      expect(html).not.toContain('1 more needed');
    });

    it('Boundary 3.4: 6 units retained (N = 6, threshold exceeded) — aggregates all 6 units basis', () => {
      const dev6 = createDevWithRetainedUnits(6, 500000); // 6 * 500k = 3M basis
      const fin = calculateDevelopmentFinancials(dev6);
      const wipeout = calculateDevelopmentDebtWipeoutMatrix(dev6, fin);

      expect(wipeout.isSection13SexEligible).toBe(true);
      expect(wipeout.unitsRetainedCount).toBe(6);
      expect(wipeout.unitsNeededForSection13Sex).toBe(0);
      expect(wipeout.section13sexDeductionBaseZAR).toBe(1650000);
      expect(wipeout.section13sexAnnualAllowanceZAR).toBe(82500);

      const html = renderToString(<DevelopmentFeasibilitySection development={dev6} financials={fin} />);
      expect(html).toContain('Active &amp; Unlocked');
    });

    it('Boundary 3.5: Retained units with 0 allocated cost basis yields 0 allowance without NaN', () => {
      const devZeroBasis = createDevWithRetainedUnits(5, 0);
      const fin = calculateDevelopmentFinancials(devZeroBasis);
      const wipeout = calculateDevelopmentDebtWipeoutMatrix(devZeroBasis, fin);

      expect(wipeout.isSection13SexEligible).toBe(true);
      expect(wipeout.section13sexDeductionBaseZAR).toBe(0);
      expect(wipeout.section13sexAnnualAllowanceZAR).toBe(0);
      expect(wipeout.section13sexTwentyYearSavingsZAR).toBe(0);

      const html = renderToString(<DevelopmentFeasibilitySection development={devZeroBasis} financials={fin} />);
      expect(html).not.toContain('NaN');
      expect(html).toContain('R 0');
    });
  });
});
