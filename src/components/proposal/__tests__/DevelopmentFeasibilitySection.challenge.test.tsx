import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  DevelopmentFeasibilitySection,
  mapDevelopmentToProposalDeal,
} from '../DevelopmentFeasibilitySection';
import {
  DevelopmentProject,
  DevelopmentUnit,
} from '@/types';
import {
  calculateDevelopmentFinancials,
  calculateDevelopmentCapitalStack,
  calculateDevelopmentRiskGate,
  calculateDevelopmentDebtWipeoutMatrix,
} from '@/lib/calculations/developments';
import { formatZAR } from '@/lib/formatters';

// Normalizer to remove React 19 SSR comment markers
const cleanHtml = (html: string): string => html.replace(/<!-- -->/g, '');

const createBaseDevelopment = (overrides?: Partial<DevelopmentProject>): DevelopmentProject => ({
  id: 'dev-adv-test',
  title: 'Sandton Gateway Cluster',
  address: '10 Rivonia Road',
  city: 'Sandton',
  province: 'Gauteng',
  developmentType: 'Subdivision & Cluster',
  isVatRegisteredDeveloper: true,
  taxEntityType: 'Company (27%)',
  currentPhase: 'Feasibility',
  landPurchasePriceZAR: 3500000,
  acquisitionCostsZAR: 250000,
  sec118ArrearsZAR: 0,
  budgetedHardCostPerSqmZAR: 9500,
  totalBuildableAreaSqm: 600,
  preApprovalMonths: 6,
  constructionMonths: 10,
  sellDownMonths: 4,
  monthlyPreApprovalHoldingBurnZAR: 15000,
  monthlyConstructionHoldingBurnZAR: 30000,
  contingencyPercent: 10,
  boqItems: [],
  developmentFacilityLimitZAR: 6000000,
  developmentFacilityDrawnZAR: 4000000,
  developmentFacilityRepaidZAR: 1000000,
  preSalesHurdlePercent: 60,
  softCosts: {
    councilBulkContributionsZAR: 180000,
    townPlannerZAR: 95000,
    architectZAR: 140000,
    planScrutinyAndSubdivisionFeesZAR: 35000,
    structuralCivilEngineerZAR: 85000,
    quantitySurveyorZAR: 65000,
    nhbrcEnrolmentFeeZAR: 55000,
    marketingAndShowUnitZAR: 45000,
  },
  approvals: {
    splumaRezoningSubdivision: { status: 'Approved', approvedDate: '2026-01-15' },
    sgDiagramApproval: { status: 'Approved', approvedDate: '2026-03-10' },
    municipalBuildingPlans: { status: 'Approved', approvedDate: '2026-05-20' },
    nhbrcEnrolment: { status: 'Approved', approvedDate: '2026-06-01' },
    sectionalTitleRegister: { status: 'Submitted' },
    occupancyCertificate: { status: 'Not Started' },
  },
  units: [
    {
      id: 'u-1',
      unitNumber: 'Unit 1',
      configuration: '3 Bed 2 Bath',
      floorAreaSqm: 100,
      allocatedCostBasisZAR: 1400000,
      listPriceVatInclZAR: 2200000,
      estimatedMonthlyRentZAR: 16000,
      status: 'Sold & Transferred',
    },
    {
      id: 'u-2',
      unitNumber: 'Unit 2',
      configuration: '3 Bed 2 Bath',
      floorAreaSqm: 100,
      allocatedCostBasisZAR: 1400000,
      listPriceVatInclZAR: 2200000,
      estimatedMonthlyRentZAR: 16000,
      status: 'Bond Approved / Guarantees Issued',
    },
    {
      id: 'u-3',
      unitNumber: 'Unit 3',
      configuration: '3 Bed 2 Bath',
      floorAreaSqm: 100,
      allocatedCostBasisZAR: 1400000,
      listPriceVatInclZAR: 2200000,
      estimatedMonthlyRentZAR: 16000,
      status: 'Available',
    },
    {
      id: 'u-4',
      unitNumber: 'Unit 4',
      configuration: '3 Bed 2 Bath',
      floorAreaSqm: 100,
      allocatedCostBasisZAR: 1400000,
      listPriceVatInclZAR: 2200000,
      estimatedMonthlyRentZAR: 16000,
      status: 'Available',
    },
    {
      id: 'u-5',
      unitNumber: 'Unit 5',
      configuration: '3 Bed 2 Bath',
      floorAreaSqm: 100,
      allocatedCostBasisZAR: 1400000,
      listPriceVatInclZAR: 2200000,
      estimatedMonthlyRentZAR: 16000,
      status: 'Retained for Rental',
    },
    {
      id: 'u-6',
      unitNumber: 'Unit 6',
      configuration: '3 Bed 2 Bath',
      floorAreaSqm: 100,
      allocatedCostBasisZAR: 1400000,
      listPriceVatInclZAR: 2200000,
      estimatedMonthlyRentZAR: 16000,
      status: 'Retained for Rental',
    },
  ],
  ...overrides,
});

describe('Milestone 4 Challenger: DevelopmentFeasibilitySection Adversarial Stress Tests', () => {

  // =========================================================================
  // EDGE CASE 1: Extreme Zero / Corrupted / Missing State Robustness
  // =========================================================================
  describe('Edge Case 1: Zero Units, Zero TDC, Zero GDV, and Missing Approvals', () => {
    it('handles development with 0 units, 0 TDC, 0 GDV without crashing or NaN/Infinity rendering', () => {
      const zeroDev: DevelopmentProject = {
        id: 'zero-dev-1',
        title: 'Empty Greenfield Site',
        address: 'Zero Road',
        city: 'Pretoria',
        province: 'Gauteng',
        developmentType: 'Sectional Title Apartments',
        isVatRegisteredDeveloper: false,
        taxEntityType: 'Company (27%)',
        currentPhase: 'Feasibility',
        landPurchasePriceZAR: 0,
        acquisitionCostsZAR: 0,
        sec118ArrearsZAR: 0,
        budgetedHardCostPerSqmZAR: 0,
        totalBuildableAreaSqm: 0,
        preApprovalMonths: 0,
        constructionMonths: 0,
        sellDownMonths: 0,
        monthlyPreApprovalHoldingBurnZAR: 0,
        monthlyConstructionHoldingBurnZAR: 0,
        contingencyPercent: 0,
        boqItems: [],
        developmentFacilityLimitZAR: 0,
        developmentFacilityDrawnZAR: 0,
        developmentFacilityRepaidZAR: 0,
        preSalesHurdlePercent: 0,
        softCosts: {
          councilBulkContributionsZAR: 0,
          townPlannerZAR: 0,
          architectZAR: 0,
          planScrutinyAndSubdivisionFeesZAR: 0,
          structuralCivilEngineerZAR: 0,
          quantitySurveyorZAR: 0,
          nhbrcEnrolmentFeeZAR: 0,
          marketingAndShowUnitZAR: 0,
        },
        approvals: undefined as any,
        units: [],
      };

      const fin = calculateDevelopmentFinancials(zeroDev);
      expect(fin.tdcZAR).toBe(0);
      expect(fin.gdvInclVatZAR).toBe(0);
      expect(fin.totalUnitsCount).toBe(0);
      expect(fin.pocPercent).toBe(0);
      expect(fin.tdcPerSqmZAR).toBe(0);
      expect(fin.tdcPerUnitZAR).toBe(0);
      expect(fin.unitsRequiredForDebtWipeout).toBe(0);
      expect(fin.unencumberedUnitsCount).toBe(0);

      const html = cleanHtml(renderToString(<DevelopmentFeasibilitySection development={zeroDev} />));

      // Assert zero crashing and zero NaN / Infinity
      expect(html).not.toContain('NaN');
      expect(html).not.toContain('Infinity');
      expect(html).not.toContain('undefined');
      expect(html).toContain('Sectional Title Apartments');
      expect(html).toContain('R 0');
      expect(html).toContain('0.0% Pre-Tax');
      expect(html).toContain('0 of 0 Units');
      expect(html).toContain('0 Units');
    });

    it('handles totally missing approvals object gracefully with 0% progress and strict ring-fencing', () => {
      const devWithoutApprovals = createBaseDevelopment({
        approvals: undefined,
      });

      const riskGate = calculateDevelopmentRiskGate(devWithoutApprovals);
      expect(riskGate.isStage1Approved).toBe(false);
      expect(riskGate.isStage2Unlocked).toBe(false);
      expect(riskGate.stage1ApprovedCount).toBe(0);
      expect(riskGate.stage1TotalCount).toBe(4);
      expect(riskGate.stage1ProgressPercent).toBe(0);
      expect(riskGate.stage1RingFenceLabel).toBe('Strictly Ring-Fenced');
      expect(riskGate.stage2DrawLabel).toBe('Draws Locked Pending Stage 1');

      const html = cleanHtml(
        renderToString(<DevelopmentFeasibilitySection development={devWithoutApprovals} />)
      );

      expect(html).toContain('Strictly Ring-Fenced');
      expect(html).toContain('Draws Locked Pending Stage 1');
      expect(html).not.toContain('NaN');
    });

    it('mapDevelopmentToProposalDeal normalizes zero-value development safely', () => {
      const emptyDev: DevelopmentProject = createBaseDevelopment({
        id: 'empty-1',
        title: 'Vacant Land Option',
        address: '1 Empty Way',
        city: 'Durban',
        province: 'KwaZulu-Natal',
        developmentType: 'Subdivision & Cluster',
        isVatRegisteredDeveloper: true,
        taxEntityType: 'Company (27%)',
        landPurchasePriceZAR: 0,
        acquisitionCostsZAR: 0,
        budgetedHardCostPerSqmZAR: 0,
        totalBuildableAreaSqm: 0,
        preApprovalMonths: 0,
        constructionMonths: 0,
        sellDownMonths: 0,
        monthlyPreApprovalHoldingBurnZAR: 0,
        monthlyConstructionHoldingBurnZAR: 0,
        contingencyPercent: 0,
        developmentFacilityLimitZAR: 0,
        developmentFacilityDrawnZAR: 0,
        developmentFacilityRepaidZAR: 0,
        preSalesHurdlePercent: 0,
        softCosts: {
          councilBulkContributionsZAR: 0,
          townPlannerZAR: 0,
          architectZAR: 0,
          planScrutinyAndSubdivisionFeesZAR: 0,
          structuralCivilEngineerZAR: 0,
          quantitySurveyorZAR: 0,
          nhbrcEnrolmentFeeZAR: 0,
          marketingAndShowUnitZAR: 0,
        },
        units: [],
      });

      const mapped = mapDevelopmentToProposalDeal(emptyDev);
      expect(mapped.id).toBe('empty-1');
      expect(mapped.type).toBe('development');
      expect(mapped.strategy).toBe('Flip');
      expect(mapped.builtInEquity).toBe(0);
      expect(mapped.builtInEquityPercent).toBe(0);
      expect(mapped.holdingDurationMonths).toBe(1); // Min bounded to 1
      expect(mapped.monthlyHoldingCost).toBe(0);
      expect(isNaN(mapped.builtInEquityPercent)).toBe(false);
    });
  });

  // =========================================================================
  // EDGE CASE 2: Retained vs Sold Units vs Partial Sales & Debt Wipeout
  // =========================================================================
  describe('Edge Case 2: 100% Retained (dev-2) vs 100% Sold vs Partial Sales Debt Wipeout', () => {
    it('100% Retained Units: all units allocated to Free-Carry Retained Equity, 0 for sale', () => {
      const tenRetainedUnits: DevelopmentUnit[] = Array.from({ length: 10 }, (_, i) => ({
        id: `unit-ret-${i + 1}`,
        unitNumber: `Unit ${i + 1}`,
        configuration: '1 Bed Studio',
        floorAreaSqm: 35,
        allocatedCostBasisZAR: 400000,
        listPriceVatInclZAR: 600000,
        estimatedMonthlyRentZAR: 5500,
        status: 'Retained for Rental' as const,
      }));

      const dev100Retained = createBaseDevelopment({
        units: tenRetainedUnits,
        developmentFacilityDrawnZAR: 3000000,
        developmentFacilityRepaidZAR: 0,
      });

      const fin = calculateDevelopmentFinancials(dev100Retained);
      const wipeout = calculateDevelopmentDebtWipeoutMatrix(dev100Retained, fin);

      expect(wipeout.unitsForSaleCount).toBe(0);
      expect(wipeout.unitsRetainedCount).toBe(10);
      expect(wipeout.unitsSoldAndTransferredCount).toBe(0);
      expect(wipeout.totalSoldProceedsZAR).toBe(0);
      expect(wipeout.netCashProceedsAfterDebtZAR).toBe(0);
      expect(wipeout.remainingDebtOnRetainedUnitsZAR).toBe(3000000);
      expect(wipeout.isFreeCarryAchieved).toBe(false);

      // Verify all units in waterfall are Retained Equity with purple badge
      expect(wipeout.unitsWaterfall.length).toBe(10);
      for (const item of wipeout.unitsWaterfall) {
        expect(item.waterfallRole).toBe('Free-Carry Retained Equity');
        expect(item.roleBadgeText).toBe('Retained Equity');
        expect(item.roleBadgeColor).toBe('purple');
        expect(item.isDebtExtinguisher).toBe(false);
      }

      const html = cleanHtml(
        renderToString(<DevelopmentFeasibilitySection development={dev100Retained} financials={fin} />)
      );

      expect(html).toContain('0 for Sale');
      expect(html).toContain('10 Retained for Rental');
      expect(html).toContain('Partial Debt Remaining');
      expect(html).toContain(formatZAR(3000000));
    });

    it('100% Retained Units with ZERO debt achieves 100% Free-Carry status', () => {
      const tenRetainedUnits: DevelopmentUnit[] = Array.from({ length: 10 }, (_, i) => ({
        id: `unit-ret-free-${i + 1}`,
        unitNumber: `Unit ${i + 1}`,
        configuration: '1 Bed Studio',
        floorAreaSqm: 35,
        allocatedCostBasisZAR: 400000,
        listPriceVatInclZAR: 600000,
        estimatedMonthlyRentZAR: 5500,
        status: 'Retained for Rental' as const,
      }));

      const devZeroDebt = createBaseDevelopment({
        units: tenRetainedUnits,
        developmentFacilityDrawnZAR: 0,
        developmentFacilityRepaidZAR: 0,
      });

      const fin = calculateDevelopmentFinancials(devZeroDebt);
      const wipeout = calculateDevelopmentDebtWipeoutMatrix(devZeroDebt, fin);

      expect(wipeout.remainingDebtOnRetainedUnitsZAR).toBe(0);
      expect(wipeout.isFreeCarryAchieved).toBe(true);

      const html = cleanHtml(
        renderToString(<DevelopmentFeasibilitySection development={devZeroDebt} financials={fin} />)
      );

      expect(html).toContain('100% Free-Carry (Debt-Free)');
    });

    it('100% Sold Units: extinguishes debt sequence and converts surplus to unencumbered cash profit', () => {
      const fourUnitsForSale: DevelopmentUnit[] = [
        {
          id: 'u-sale-1',
          unitNumber: 'Unit 1',
          configuration: '2 Bed',
          floorAreaSqm: 65,
          allocatedCostBasisZAR: 600000,
          listPriceVatInclZAR: 1000000,
          estimatedMonthlyRentZAR: 8000,
          status: 'Sold & Transferred',
        },
        {
          id: 'u-sale-2',
          unitNumber: 'Unit 2',
          configuration: '2 Bed',
          floorAreaSqm: 65,
          allocatedCostBasisZAR: 600000,
          listPriceVatInclZAR: 1000000,
          estimatedMonthlyRentZAR: 8000,
          status: 'Sold & Transferred',
        },
        {
          id: 'u-sale-3',
          unitNumber: 'Unit 3',
          configuration: '2 Bed',
          floorAreaSqm: 65,
          allocatedCostBasisZAR: 600000,
          listPriceVatInclZAR: 1000000,
          estimatedMonthlyRentZAR: 8000,
          status: 'Available',
        },
        {
          id: 'u-sale-4',
          unitNumber: 'Unit 4',
          configuration: '2 Bed',
          floorAreaSqm: 65,
          allocatedCostBasisZAR: 600000,
          listPriceVatInclZAR: 1000000,
          estimatedMonthlyRentZAR: 8000,
          status: 'Available',
        },
      ];

      // Facility outstanding is R2,000,000. Each unit is R1,000,000. Exactly 2 units needed to wipe out debt.
      const devSold = createBaseDevelopment({
        units: fourUnitsForSale,
        developmentFacilityDrawnZAR: 2000000,
        developmentFacilityRepaidZAR: 0,
      });

      const fin = calculateDevelopmentFinancials(devSold);
      const wipeout = calculateDevelopmentDebtWipeoutMatrix(devSold, fin);

      expect(wipeout.unitsRequiredForDebtWipeout).toBe(2);
      expect(wipeout.unencumberedUnitsCount).toBe(2);
      expect(wipeout.unitsForSaleCount).toBe(4);
      expect(wipeout.unitsRetainedCount).toBe(0);

      // Check unit waterfall sequence
      expect(wipeout.unitsWaterfall[0].waterfallRole).toBe('Senior Debt Wipeout');
      expect(wipeout.unitsWaterfall[0].roleBadgeText).toBe('Debt #1');
      expect(wipeout.unitsWaterfall[0].roleBadgeColor).toBe('blue');

      expect(wipeout.unitsWaterfall[1].waterfallRole).toBe('Senior Debt Wipeout');
      expect(wipeout.unitsWaterfall[1].roleBadgeText).toBe('Debt #2');
      expect(wipeout.unitsWaterfall[1].roleBadgeColor).toBe('blue');

      expect(wipeout.unitsWaterfall[2].waterfallRole).toBe('Unencumbered Cash Profit');
      expect(wipeout.unitsWaterfall[2].roleBadgeText).toBe('Cash Profit');
      expect(wipeout.unitsWaterfall[2].roleBadgeColor).toBe('emerald');

      expect(wipeout.unitsWaterfall[3].waterfallRole).toBe('Unencumbered Cash Profit');
      expect(wipeout.unitsWaterfall[3].roleBadgeText).toBe('Cash Profit');
      expect(wipeout.unitsWaterfall[3].roleBadgeColor).toBe('emerald');
    });

    it('Debt wipeout required EXCEEDS total unit count (Extreme Leverage Stress)', () => {
      // 3 units at R1,000,000 each = R3,000,000 GDV. Facility outstanding is R10,000,000.
      const devOverLeveraged = createBaseDevelopment({
        units: [
          {
            id: 'ol-1',
            unitNumber: 'Unit 1',
            configuration: '1 Bed',
            floorAreaSqm: 50,
            allocatedCostBasisZAR: 500000,
            listPriceVatInclZAR: 1000000,
            estimatedMonthlyRentZAR: 7000,
            status: 'Available',
          },
          {
            id: 'ol-2',
            unitNumber: 'Unit 2',
            configuration: '1 Bed',
            floorAreaSqm: 50,
            allocatedCostBasisZAR: 500000,
            listPriceVatInclZAR: 1000000,
            estimatedMonthlyRentZAR: 7000,
            status: 'Available',
          },
          {
            id: 'ol-3',
            unitNumber: 'Unit 3',
            configuration: '1 Bed',
            floorAreaSqm: 50,
            allocatedCostBasisZAR: 500000,
            listPriceVatInclZAR: 1000000,
            estimatedMonthlyRentZAR: 7000,
            status: 'Available',
          },
        ],
        developmentFacilityDrawnZAR: 10000000,
        developmentFacilityRepaidZAR: 0,
      });

      const fin = calculateDevelopmentFinancials(devOverLeveraged);
      const wipeout = calculateDevelopmentDebtWipeoutMatrix(devOverLeveraged, fin);

      expect(wipeout.avgUnitListPriceZAR).toBe(1000000);
      expect(wipeout.unitsRequiredForDebtWipeout).toBe(10); // 10,000,000 / 1,000,000
      expect(wipeout.unencumberedUnitsCount).toBe(0); // Clamped at 0 (not -7)

      // All 3 units become Senior Debt Wipeout, none become Cash Profit
      expect(wipeout.unitsWaterfall.every((u) => u.waterfallRole === 'Senior Debt Wipeout')).toBe(true);

      const html = cleanHtml(
        renderToString(<DevelopmentFeasibilitySection development={devOverLeveraged} financials={fin} />)
      );

      expect(html).toContain('10 of 3 Units');
      expect(html).toContain('0 Units');
      expect(html).not.toContain('NaN');
    });
  });

  // =========================================================================
  // EDGE CASE 3: Section 13sex Threshold Boundary (< 5 units vs >= 5 units)
  // =========================================================================
  describe('Edge Case 3: SARS Section 13sex Threshold Boundary (< 5 units vs >= 5 units)', () => {
    const makeUnitsWithRetainedCount = (retainedCount: number): DevelopmentUnit[] => {
      const units: DevelopmentUnit[] = [];
      for (let i = 0; i < 6; i++) {
        const isRetained = i < retainedCount;
        units.push({
          id: `u-sec-${i + 1}`,
          unitNumber: `Unit ${i + 1}`,
          configuration: '2 Bed 1 Bath',
          floorAreaSqm: 55,
          allocatedCostBasisZAR: 500000,
          listPriceVatInclZAR: 800000,
          estimatedMonthlyRentZAR: 6500,
          status: isRetained ? 'Retained for Rental' : 'Available',
        });
      }
      return units;
    };

    it('Retained count = 0: Section 13sex INELIGIBLE, shows 5 more needed', () => {
      const dev = createBaseDevelopment({ units: makeUnitsWithRetainedCount(0) });
      const fin = calculateDevelopmentFinancials(dev);
      const wipeout = calculateDevelopmentDebtWipeoutMatrix(dev, fin);

      expect(wipeout.isSection13SexEligible).toBe(false);
      expect(wipeout.unitsRetainedCount).toBe(0);
      expect(wipeout.unitsNeededForSection13Sex).toBe(5);

      const html = cleanHtml(renderToString(<DevelopmentFeasibilitySection development={dev} financials={fin} />));
      expect(html).toContain('SARS Section 13sex Tax Shield: Requires 5+ units retained for rental (0 currently retained; 5 more needed');
      expect(html).not.toContain('SARS Section 13sex 55% Residential Building Tax Shield (Active &amp; Unlocked)');
    });

    it('Retained count = 4 (Boundary - 1): Section 13sex INELIGIBLE, shows 1 more needed', () => {
      const dev = createBaseDevelopment({ units: makeUnitsWithRetainedCount(4) });
      const fin = calculateDevelopmentFinancials(dev);
      const wipeout = calculateDevelopmentDebtWipeoutMatrix(dev, fin);

      expect(wipeout.isSection13SexEligible).toBe(false);
      expect(wipeout.unitsRetainedCount).toBe(4);
      expect(wipeout.unitsNeededForSection13Sex).toBe(1);
      expect(wipeout.section13sexDeductionBaseZAR).toBe(0);
      expect(wipeout.section13sexAnnualAllowanceZAR).toBe(0);

      const html = cleanHtml(renderToString(<DevelopmentFeasibilitySection development={dev} financials={fin} />));
      expect(html).toContain('SARS Section 13sex Tax Shield: Requires 5+ units retained for rental (4 currently retained; 1 more needed');
      expect(html).not.toContain('Active &amp; Unlocked');
    });

    it('Retained count = 5 (Boundary threshold): Section 13sex ACTIVATED & UNLOCKED', () => {
      const dev = createBaseDevelopment({ units: makeUnitsWithRetainedCount(5) });
      const fin = calculateDevelopmentFinancials(dev);
      const wipeout = calculateDevelopmentDebtWipeoutMatrix(dev, fin);

      expect(wipeout.isSection13SexEligible).toBe(true);
      expect(wipeout.unitsRetainedCount).toBe(5);
      expect(wipeout.unitsNeededForSection13Sex).toBe(0);

      // Math verification: 5 * 500,000 = 2,500,000 cost basis.
      // 55% base = 1,375,000
      // 5% annual allowance = 68,750
      // 20-year savings = 1,375,000
      expect(wipeout.section13sexDeductionBaseZAR).toBe(1375000);
      expect(wipeout.section13sexAnnualAllowanceZAR).toBe(68750);
      expect(wipeout.section13sexTwentyYearSavingsZAR).toBe(1375000);

      const html = cleanHtml(renderToString(<DevelopmentFeasibilitySection development={dev} financials={fin} />));
      expect(html).toContain('SARS Section 13sex 55% Residential Building Tax Shield (Active &amp; Unlocked)');
      expect(html).toContain('Portfolio qualifies with 5 or more new residential units retained for rental');
      expect(html).toContain(formatZAR(1375000));
      expect(html).toContain(formatZAR(68750));
      expect(html).not.toContain('1 more needed');
    });

    it('Retained count = 6 (Above boundary): Section 13sex remains fully ACTIVE with scaled figures', () => {
      const dev = createBaseDevelopment({ units: makeUnitsWithRetainedCount(6) });
      const fin = calculateDevelopmentFinancials(dev);
      const wipeout = calculateDevelopmentDebtWipeoutMatrix(dev, fin);

      expect(wipeout.isSection13SexEligible).toBe(true);
      expect(wipeout.unitsRetainedCount).toBe(6);

      // 6 * 500,000 = 3,000,000 cost basis.
      // 55% base = 1,650,000
      // 5% annual allowance = 82,500
      // 20-year savings = 1,650,000
      expect(wipeout.section13sexDeductionBaseZAR).toBe(1650000);
      expect(wipeout.section13sexAnnualAllowanceZAR).toBe(82500);
      expect(wipeout.section13sexTwentyYearSavingsZAR).toBe(1650000);

      const html = cleanHtml(renderToString(<DevelopmentFeasibilitySection development={dev} financials={fin} />));
      expect(html).toContain('SARS Section 13sex 55% Residential Building Tax Shield (Active &amp; Unlocked)');
      expect(html).toContain(formatZAR(1650000));
      expect(html).toContain(formatZAR(82500));
    });
  });

  // =========================================================================
  // ARCHITECTURAL CONFORMANCE: Data Sensitivity and Unicode Emoji Audit
  // =========================================================================
  describe('Architectural Conformance & Unicode Emoji Audit', () => {
    it('contains data-sensitive tags on all sensitive numbers in all 3 parts', () => {
      const dev = createBaseDevelopment();
      const html = cleanHtml(renderToString(<DevelopmentFeasibilitySection development={dev} />));

      // Check presence of data-sensitive tags
      expect(html).toContain('data-sensitive="true"');
      const sensitiveMatches = html.match(/data-sensitive="true"/g);
      expect(sensitiveMatches).not.toBeNull();
      // Should have at least 10 sensitive fields across the 3 sections
      expect(sensitiveMatches!.length).toBeGreaterThanOrEqual(10);
    });

    it('contains zero Unicode emojis or Dingbats glyphs', () => {
      const dev = createBaseDevelopment();
      const html = cleanHtml(renderToString(<DevelopmentFeasibilitySection development={dev} />));

      // Regex matching common emoji and dingbat unicode ranges:
      // \u{1F300}-\u{1F9FF} (Misc Symbols, Pictographs, Supplemental)
      // \u{2600}-\u{26FF} (Misc Symbols)
      // \u{2700}-\u{27BF} (Dingbats)
      const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
      const foundEmoji = emojiRegex.test(html);
      expect(foundEmoji).toBe(false);
    });
  });
});
