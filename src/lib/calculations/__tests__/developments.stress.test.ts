import { describe, it, expect } from 'vitest';
import {
  calculateDevelopmentSoftCostsTotal,
  calculateDevelopmentFinancials,
  type DevelopmentFinancialSummary,
} from '../developments';
import type {
  DevelopmentProject,
  DevelopmentSoftCosts,
  DevelopmentUnit,
  BOQItem,
} from '@/types';

describe('Empirical Adversarial Stress Testing — developments.ts', () => {
  // Helper to construct a baseline valid project
  const createBaseProject = (overrides: Partial<DevelopmentProject> = {}): DevelopmentProject => ({
    id: 'dev-stress-test',
    title: 'Adversarial Stress Test Project',
    address: '100 Stress Way',
    city: 'Johannesburg',
    province: 'Gauteng',
    developmentType: 'Subdivision & Cluster',
    isVatRegisteredDeveloper: true,
    taxEntityType: 'Company (27%)',
    currentPhase: 'Feasibility',
    preApprovalMonths: 6,
    constructionMonths: 12,
    sellDownMonths: 6,
    landPurchasePriceZAR: 2_000_000,
    acquisitionCostsZAR: 150_000,
    sec118ArrearsZAR: 50_000,
    softCosts: {
      townPlannerZAR: 40_000,
      architectZAR: 100_000,
      structuralCivilEngineerZAR: 60_000,
      quantitySurveyorZAR: 50_000,
      nhbrcEnrolmentFeeZAR: 20_000,
      councilBulkContributionsZAR: 150_000,
      planScrutinyAndSubdivisionFeesZAR: 30_000,
      marketingAndShowUnitZAR: 50_000,
    },
    totalBuildableAreaSqm: 1_000,
    budgetedHardCostPerSqmZAR: 12_000,
    contingencyPercent: 10,
    boqItems: [],
    monthlyPreApprovalHoldingBurnZAR: 20_000,
    monthlyConstructionHoldingBurnZAR: 35_000,
    developmentFacilityLimitZAR: 15_000_000,
    developmentFacilityDrawnZAR: 10_000_000,
    developmentFacilityRepaidZAR: 2_000_000,
    preSalesHurdlePercent: 60,
    approvals: {
      splumaRezoningSubdivision: { status: 'Approved' },
      sgDiagramApproval: { status: 'Approved' },
      municipalBuildingPlans: { status: 'Approved' },
      nhbrcEnrolment: { status: 'Approved' },
      sectionalTitleRegister: { status: 'Approved' },
      occupancyCertificate: { status: 'Approved' },
    },
    units: [
      {
        id: 'u-1',
        unitNumber: 'Unit 1',
        configuration: '2 Bed',
        floorAreaSqm: 100,
        allocatedCostBasisZAR: 1_500_000,
        listPriceVatInclZAR: 2_000_000,
        estimatedMonthlyRentZAR: 15_000,
        status: 'Sold & Transferred',
      },
    ],
    ...overrides,
  });

  // =========================================================================
  // 1. Extreme Unit Volumes: 0, 1, 500, 2000 Units
  // =========================================================================
  describe('Extreme Unit Volumes', () => {
    it('handles exactly zero units without NaN or Infinity', () => {
      const dev = createBaseProject({ units: [] });
      const fin = calculateDevelopmentFinancials(dev);

      expect(fin.totalUnitsCount).toBe(0);
      expect(fin.gdvInclVatZAR).toBe(0);
      expect(fin.netRealizableGdvZAR).toBe(0);
      expect(fin.outputVatZAR).toBe(0);
      expect(fin.tdcPerUnitZAR).toBe(0);
      expect(fin.avgUnitListPriceZAR).toBe(0);
      expect(fin.preSoldUnitsCount).toBe(0);
      expect(fin.preSoldGdvPercent).toBe(0);
      expect(fin.unitsRequiredForDebtWipeout).toBe(0);
      expect(fin.unitsForSaleCount).toBe(0);
      expect(fin.unitsRetainedCount).toBe(0);
      expect(fin.isSection13SexEligible).toBe(false);
      expect(Number.isFinite(fin.tdcPerUnitZAR)).toBe(true);
      expect(Number.isFinite(fin.avgUnitListPriceZAR)).toBe(true);
    });

    it('handles a single unit scheme (1 unit) correctly', () => {
      const dev = createBaseProject({
        units: [
          {
            id: 'sole-unit',
            unitNumber: 'Villa 1',
            configuration: '4 Bed Luxury',
            floorAreaSqm: 450,
            allocatedCostBasisZAR: 4_500_000,
            listPriceVatInclZAR: 7_500_000,
            estimatedMonthlyRentZAR: 45_000,
            status: 'Sold & Transferred',
          },
        ],
      });
      const fin = calculateDevelopmentFinancials(dev);

      expect(fin.totalUnitsCount).toBe(1);
      expect(fin.gdvInclVatZAR).toBe(7_500_000);
      expect(fin.avgUnitListPriceZAR).toBe(7_500_000);
      expect(fin.tdcPerUnitZAR).toBe(fin.tdcZAR);
      expect(fin.preSoldUnitsCount).toBe(1);
      expect(fin.preSoldGdvPercent).toBe(100);
      expect(fin.isPreSalesHurdleMet).toBe(true);
      expect(fin.isSection13SexEligible).toBe(false); // 1 < 5
    });

    it('handles high volume schemes (500 units) deterministically and fast', () => {
      const fiveHundredUnits: DevelopmentUnit[] = Array.from({ length: 500 }, (_, i) => ({
        id: `mass-unit-${i + 1}`,
        unitNumber: `Flat ${i + 1}`,
        configuration: '1 Bed Studio',
        floorAreaSqm: 40,
        allocatedCostBasisZAR: 500_000,
        listPriceVatInclZAR: 750_000,
        estimatedMonthlyRentZAR: 6_000,
        status: i < 350
          ? 'Sold & Transferred'
          : i < 400
            ? 'Bond Approved / Guarantees Issued'
            : i < 450
              ? 'Reserved (OTP Signed)'
              : 'Retained for Rental', // 50 retained
      }));

      const dev = createBaseProject({
        totalBuildableAreaSqm: 20_000,
        units: fiveHundredUnits,
        developmentFacilityDrawnZAR: 200_000_000,
        developmentFacilityRepaidZAR: 50_000_000,
      });

      const start = performance.now();
      const fin = calculateDevelopmentFinancials(dev);
      const elapsedMs = performance.now() - start;

      // Expect execution time to be sub-millisecond or well within bounds
      expect(elapsedMs).toBeLessThan(100);

      expect(fin.totalUnitsCount).toBe(500);
      // GDV = 500 * 750,000 = 375,000,000
      expect(fin.gdvInclVatZAR).toBe(375_000_000);
      expect(fin.avgUnitListPriceZAR).toBe(750_000);

      // Pre-sold = 350 + 50 + 50 = 450 units (90%)
      expect(fin.preSoldUnitsCount).toBe(450);
      expect(fin.preSoldGdvPercent).toBeCloseTo(90, 1);
      expect(fin.isPreSalesHurdleMet).toBe(true);

      // Hybrid split: 50 retained >= 5 -> Sec 13sex eligible
      expect(fin.unitsRetainedCount).toBe(50);
      expect(fin.isSection13SexEligible).toBe(true);
      // Retained rent: 50 * 6,000 = 300,000 / month
      expect(fin.retainedMonthlyGrossRentZAR).toBe(300_000);
      expect(fin.retainedAnnualGrossRentZAR).toBe(3_600_000);

      // Debt wipeout: outstanding debt = 150M. Avg price = 750k.
      // 150,000,000 / 750,000 = 200 units required
      expect(fin.outstandingDevFacilityZAR).toBe(150_000_000);
      expect(fin.unitsRequiredForDebtWipeout).toBe(200);

      // Sold proceeds: 350 * 750,000 = 262,500,000
      // 262.5M > 150M debt -> remaining debt on retained = 0 (Free-Carry)
      expect(fin.totalSoldProceedsZAR).toBe(262_500_000);
      expect(fin.remainingDebtOnRetainedUnitsZAR).toBe(0);
      expect(fin.netCashProceedsAfterDebtZAR).toBe(112_500_000);
    });
  });

  // =========================================================================
  // 2. Zero & Negative Values: Area, Hard Cost, Contingency, Carrying
  // =========================================================================
  describe('Zero & Negative Value Clamping', () => {
    it('clamps zero buildable area safely: tdcPerSqm is 0, not Infinity', () => {
      const dev = createBaseProject({
        totalBuildableAreaSqm: 0,
      });
      const fin = calculateDevelopmentFinancials(dev);

      expect(fin.budgetedHardBuildCostZAR).toBe(0);
      expect(fin.tdcPerSqmZAR).toBe(0);
      expect(Number.isFinite(fin.tdcPerSqmZAR)).toBe(true);
    });

    it('clamps negative buildable area to 0 safely', () => {
      const dev = createBaseProject({
        totalBuildableAreaSqm: -500,
        budgetedHardCostPerSqmZAR: 10_000,
      });
      const fin = calculateDevelopmentFinancials(dev);

      expect(fin.budgetedHardBuildCostZAR).toBe(0);
      expect(fin.tdcPerSqmZAR).toBe(0);
    });

    it('clamps negative budgeted hard cost rate to 0 safely', () => {
      const dev = createBaseProject({
        totalBuildableAreaSqm: 1_000,
        budgetedHardCostPerSqmZAR: -12_000,
      });
      const fin = calculateDevelopmentFinancials(dev);

      expect(fin.budgetedHardBuildCostZAR).toBe(0);
      expect(fin.activeHardBuildCostZAR).toBe(0);
    });

    it('clamps negative contingency percent to 0 (does not reduce TDC)', () => {
      const dev = createBaseProject({
        contingencyPercent: -25,
      });
      const fin = calculateDevelopmentFinancials(dev);

      expect(fin.contingencyReserveZAR).toBe(0);
      expect(fin.contingencyReserveZAR).not.toBeLessThan(0);
    });

    it('clamps negative pre-approval and construction months to 0', () => {
      const dev = createBaseProject({
        preApprovalMonths: -10,
        constructionMonths: -12,
        monthlyPreApprovalHoldingBurnZAR: 20_000,
        monthlyConstructionHoldingBurnZAR: 30_000,
      });
      const fin = calculateDevelopmentFinancials(dev);

      expect(fin.totalPreApprovalCarryingCostZAR).toBe(0);
      expect(fin.totalConstructionCarryingCostZAR).toBe(0);
      expect(fin.totalCarryingCostZAR).toBe(0);
    });

    it('clamps negative monthly holding burn to 0', () => {
      const dev = createBaseProject({
        preApprovalMonths: 6,
        monthlyPreApprovalHoldingBurnZAR: -50_000,
      });
      const fin = calculateDevelopmentFinancials(dev);

      expect(fin.totalPreApprovalCarryingCostZAR).toBe(0);
    });
  });

  // =========================================================================
  // 3. Division by Zero Invariant Proving
  // =========================================================================
  describe('Division by Zero Invariant Proving', () => {
    it('returns zero for all ratios when all inputs and denominators are zero', () => {
      const allZeroDev: DevelopmentProject = {
        id: 'zero-dev',
        title: 'Zero Dev',
        address: 'Nowhere',
        city: 'ZeroCity',
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
        approvals: {
          splumaRezoningSubdivision: { status: 'Not Started' },
          sgDiagramApproval: { status: 'Not Started' },
          municipalBuildingPlans: { status: 'Not Started' },
          nhbrcEnrolment: { status: 'Not Started' },
          sectionalTitleRegister: { status: 'Not Started' },
          occupancyCertificate: { status: 'Not Started' },
        },
        units: [],
      };

      const fin = calculateDevelopmentFinancials(allZeroDev);

      expect(fin.tdcZAR).toBe(0);
      expect(fin.tdcPerSqmZAR).toBe(0);
      expect(fin.tdcPerUnitZAR).toBe(0);
      expect(fin.gdvInclVatZAR).toBe(0);
      expect(fin.pocPercent).toBe(0);
      expect(fin.afterTaxPocPercent).toBe(0);
      expect(fin.preSoldGdvPercent).toBe(0);
      expect(fin.avgUnitListPriceZAR).toBe(0);
      expect(fin.unitsRequiredForDebtWipeout).toBe(0);

      // Verify no NaN or Infinity exists anywhere in summary
      for (const [key, val] of Object.entries(fin)) {
        if (typeof val === 'number') {
          expect(Number.isFinite(val), `Field ${key} must be finite number`).toBe(true);
          expect(Number.isNaN(val), `Field ${key} must not be NaN`).toBe(false);
        }
      }
    });

    it('safely handles debt wipeout when units exist but list prices are all 0', () => {
      const dev = createBaseProject({
        developmentFacilityDrawnZAR: 5_000_000,
        developmentFacilityRepaidZAR: 0,
        units: [
          {
            id: 'u-zero-price',
            unitNumber: 'U1',
            configuration: 'Studio',
            floorAreaSqm: 30,
            allocatedCostBasisZAR: 100_000,
            listPriceVatInclZAR: 0,
            estimatedMonthlyRentZAR: 0,
            status: 'Available',
          },
        ],
      });
      const fin = calculateDevelopmentFinancials(dev);

      expect(fin.outstandingDevFacilityZAR).toBe(5_000_000);
      expect(fin.avgUnitListPriceZAR).toBe(0);
      // Denominator is 0: must return 0, NOT Infinity or NaN
      expect(fin.unitsRequiredForDebtWipeout).toBe(0);
      expect(Number.isFinite(fin.unitsRequiredForDebtWipeout)).toBe(true);
    });
  });

  // =========================================================================
  // 4. Undefined / Nullish / Partial Optional Properties
  // =========================================================================
  describe('Undefined, Nullish & Degenerate Inputs', () => {
    it('handles totally bare object with no properties without throwing', () => {
      const bareDev = {} as DevelopmentProject;
      const fin = calculateDevelopmentFinancials(bareDev);

      expect(fin.tdcZAR).toBe(0);
      expect(fin.totalUnitsCount).toBe(0);
      expect(fin.isVatRegisteredDeveloper).toBe(false);
      expect(fin.taxEntityType).toBe('Company (27%)');
      expect(fin.effectiveTaxRatePercent).toBe(27);
      expect(fin.isSection13SexEligible).toBe(false);
    });

    it('handles null and undefined dev safely', () => {
      const finNull = calculateDevelopmentFinancials(null);
      expect(finNull.tdcZAR).toBe(0);

      const finUndef = calculateDevelopmentFinancials(undefined);
      expect(finUndef.tdcZAR).toBe(0);
    });

    it('handles units with missing or undefined price and rent fields without NaN', () => {
      const dev = createBaseProject({
        units: [
          {
            id: 'partial-u1',
            unitNumber: 'U1',
            configuration: '1 Bed',
            floorAreaSqm: 50,
            allocatedCostBasisZAR: undefined as any,
            listPriceVatInclZAR: undefined as any,
            estimatedMonthlyRentZAR: undefined as any,
            status: 'Retained for Rental',
          },
          {
            id: 'partial-u2',
            unitNumber: 'U2',
            configuration: '1 Bed',
            floorAreaSqm: 50,
            allocatedCostBasisZAR: 600_000,
            listPriceVatInclZAR: 800_000,
            estimatedMonthlyRentZAR: 7_000,
            status: 'Sold & Transferred',
          },
        ],
      });

      const fin = calculateDevelopmentFinancials(dev);
      expect(fin.totalUnitsCount).toBe(2);
      expect(fin.gdvInclVatZAR).toBe(800_000);
      expect(fin.totalSoldProceedsZAR).toBe(800_000);
      expect(fin.retainedMonthlyGrossRentZAR).toBe(0);
      expect(Number.isFinite(fin.gdvInclVatZAR)).toBe(true);
    });

    it('handles boqItems with missing actualCostZAR falling back to baselineTotalZAR', () => {
      const boqWithNullActuals: BOQItem[] = [
        {
          id: 'boq-sub-1',
          category: 'Plumbing & Wet Works',
          itemDescription: 'Excavation',
          unit: 'lump sum',
          quantity: 1,
          baselineUnitCostZAR: 250_000,
          baselineTotalZAR: 250_000,
          varianceZAR: 0,
          supplierOrContractor: 'Earthworks Co',
          status: 'In Progress',
          milestonePhase: 'Deposit',
          retentionPercent: 5,
          actualCostZAR: undefined as any,
        },
      ];

      const dev = createBaseProject({
        totalBuildableAreaSqm: 100,
        budgetedHardCostPerSqmZAR: 1_000, // Budget = 100k
        boqItems: boqWithNullActuals, // BOQ baseline = 250k
      });

      const fin = calculateDevelopmentFinancials(dev);
      // actualBoqSpend should fall back to baselineTotalZAR = 250_000
      expect(fin.actualBoqSpendZAR).toBe(250_000);
      // activeHardBuildCost = max(100k, 250k) = 250k
      expect(fin.activeHardBuildCostZAR).toBe(250_000);
    });
  });

  // =========================================================================
  // 5. Tax Entity Types & Effective Tax Rates
  // =========================================================================
  describe('Tax Entity Types & Rates', () => {
    it('applies 27% tax rate for Company', () => {
      const dev = createBaseProject({
        taxEntityType: 'Company (27%)',
        isVatRegisteredDeveloper: false,
        landPurchasePriceZAR: 1_000_000,
        acquisitionCostsZAR: 0,
        sec118ArrearsZAR: 0,
        totalBuildableAreaSqm: 0,
        softCosts: undefined,
        monthlyPreApprovalHoldingBurnZAR: 0,
        monthlyConstructionHoldingBurnZAR: 0,
        units: [
          {
            id: 'u1',
            unitNumber: 'U1',
            configuration: '1B',
            floorAreaSqm: 50,
            allocatedCostBasisZAR: 1_000_000,
            listPriceVatInclZAR: 2_000_000,
            estimatedMonthlyRentZAR: 0,
            status: 'Available',
          },
        ],
      });
      // TDC = 1,000,000. GDV = 2,000,000. Profit = 1,000,000.
      const fin = calculateDevelopmentFinancials(dev);
      expect(fin.effectiveTaxRatePercent).toBe(27);
      expect(fin.estimatedTaxProvisionZAR).toBe(270_000);
      expect(fin.netProfitAfterTaxZAR).toBe(730_000);
    });

    it('applies 45% tax rate for Individual and Trust', () => {
      const devTrust = createBaseProject({
        taxEntityType: 'Trust',
        isVatRegisteredDeveloper: false,
        landPurchasePriceZAR: 1_000_000,
        acquisitionCostsZAR: 0,
        sec118ArrearsZAR: 0,
        totalBuildableAreaSqm: 0,
        softCosts: undefined,
        monthlyPreApprovalHoldingBurnZAR: 0,
        monthlyConstructionHoldingBurnZAR: 0,
        units: [
          {
            id: 'u1',
            unitNumber: 'U1',
            configuration: '1B',
            floorAreaSqm: 50,
            allocatedCostBasisZAR: 1_000_000,
            listPriceVatInclZAR: 2_000_000,
            estimatedMonthlyRentZAR: 0,
            status: 'Available',
          },
        ],
      });
      const finTrust = calculateDevelopmentFinancials(devTrust);
      expect(finTrust.effectiveTaxRatePercent).toBe(45);
      expect(finTrust.estimatedTaxProvisionZAR).toBe(450_000);
      expect(finTrust.netProfitAfterTaxZAR).toBe(550_000);

      const devIndiv = createBaseProject({
        ...devTrust,
        taxEntityType: 'Individual',
      });
      const finIndiv = calculateDevelopmentFinancials(devIndiv);
      expect(finIndiv.effectiveTaxRatePercent).toBe(45);
      expect(finIndiv.estimatedTaxProvisionZAR).toBe(450_000);
    });
  });

  // =========================================================================
  // 6. Floating-point Cents & Rounding Stability
  // =========================================================================
  describe('Floating-point Cents & Rounding Stability', () => {
    it('preserves exact cents in soft costs summation without floating point drift', () => {
      const softCosts: DevelopmentSoftCosts = {
        townPlannerZAR: 12_345.67,
        architectZAR: 23_456.78,
        structuralCivilEngineerZAR: 34_567.89,
        quantitySurveyorZAR: 45_678.90,
        nhbrcEnrolmentFeeZAR: 1_234.56,
        councilBulkContributionsZAR: 56_789.01,
        planScrutinyAndSubdivisionFeesZAR: 2_345.67,
        marketingAndShowUnitZAR: 3_456.78,
      };

      // 12345.67 + 23456.78 + 34567.89 + 45678.90 + 1234.56 + 56789.01 + 2345.67 + 3456.78 = 179875.26
      const total = calculateDevelopmentSoftCostsTotal(softCosts);
      expect(total).toBe(179_875.26);
    });

    it('handles fractional units and odd rand amounts in debt wipeout calculation', () => {
      const dev = createBaseProject({
        developmentFacilityDrawnZAR: 1_000_001,
        developmentFacilityRepaidZAR: 0,
        units: [
          {
            id: 'u1',
            unitNumber: 'U1',
            configuration: '1B',
            floorAreaSqm: 50,
            allocatedCostBasisZAR: 500_000,
            listPriceVatInclZAR: 1_000_000,
            estimatedMonthlyRentZAR: 0,
            status: 'Available',
          },
        ],
      });
      const fin = calculateDevelopmentFinancials(dev);
      // 1,000,001 / 1,000,000 = 1.000001 -> ceil gives 2 units
      expect(fin.unitsRequiredForDebtWipeout).toBe(2);
    });

    it('handles large billion-rand capital stack without numerical instability', () => {
      const megaUnits: DevelopmentUnit[] = Array.from({ length: 100 }, (_, i) => ({
        id: `mega-${i}`,
        unitNumber: `M${i}`,
        configuration: 'Penthouse',
        floorAreaSqm: 300,
        allocatedCostBasisZAR: 10_000_000,
        listPriceVatInclZAR: 15_000_000,
        estimatedMonthlyRentZAR: 100_000,
        status: 'Sold & Transferred',
      }));

      const dev = createBaseProject({
        landPurchasePriceZAR: 250_000_000,
        totalBuildableAreaSqm: 30_000,
        budgetedHardCostPerSqmZAR: 25_000, // 750M build cost
        units: megaUnits, // 1.5B GDV
        developmentFacilityDrawnZAR: 800_000_000,
        developmentFacilityRepaidZAR: 300_000_000,
      });

      const fin = calculateDevelopmentFinancials(dev);
      expect(fin.gdvInclVatZAR).toBe(1_500_000_000);
      expect(fin.budgetedHardBuildCostZAR).toBe(750_000_000);
      expect(fin.outstandingDevFacilityZAR).toBe(500_000_000);
      expect(fin.totalSoldProceedsZAR).toBe(1_500_000_000);
      expect(fin.netCashProceedsAfterDebtZAR).toBe(1_000_000_000);
      expect(fin.remainingDebtOnRetainedUnitsZAR).toBe(0);
      expect(Number.isFinite(fin.tdcZAR)).toBe(true);
      expect(Number.isFinite(fin.pocPercent)).toBe(true);
    });
  });

  // =========================================================================
  // 7. Section 13sex Exact Boundary Proving
  // =========================================================================
  describe('Section 13sex Exact Boundary Proving', () => {
    it.each([
      [0, false],
      [1, false],
      [2, false],
      [3, false],
      [4, false],
      [5, true],
      [6, true],
      [20, true],
    ])('given %i retained units, isSection13SexEligible is %s', (retainedCount, expectedEligible) => {
      const units: DevelopmentUnit[] = Array.from({ length: 20 }, (_, i) => ({
        id: `u-${i}`,
        unitNumber: `U${i}`,
        configuration: 'Unit',
        floorAreaSqm: 50,
        allocatedCostBasisZAR: 1_000_000,
        listPriceVatInclZAR: 1_500_000,
        estimatedMonthlyRentZAR: 10_000,
        status: i < retainedCount ? 'Retained for Rental' : 'Available',
      }));

      const dev = createBaseProject({ units });
      const fin = calculateDevelopmentFinancials(dev);

      expect(fin.unitsRetainedCount).toBe(retainedCount);
      expect(fin.isSection13SexEligible).toBe(expectedEligible);

      if (expectedEligible) {
        // Deduction base: 55% of retained cost basis (retainedCount * 1M * 55%), rounded to ZAR
        const expectedBase = Math.round(retainedCount * 1_000_000 * 0.55);
        expect(fin.section13sexDeductionBaseZAR).toBe(expectedBase);
        // Annual allowance: 5% of deduction base, rounded to ZAR
        expect(fin.section13sexAnnualAllowanceZAR).toBe(Math.round(expectedBase * 0.05));
      } else {
        expect(fin.section13sexDeductionBaseZAR).toBe(0);
        expect(fin.section13sexAnnualAllowanceZAR).toBe(0);
      }
    });
  });

  // =========================================================================
  // 8. Algebraic Invariants & Conservation Laws
  // =========================================================================
  describe('Algebraic Invariants & Conservation Laws', () => {
    it('preserves unit count partition invariant: unitsForSale + unitsRetained === totalUnits', () => {
      const statuses: ('Available' | 'Reserved (OTP Signed)' | 'Bond Approved / Guarantees Issued' | 'Sold & Transferred' | 'Retained for Rental')[] = [
        'Available',
        'Reserved (OTP Signed)',
        'Bond Approved / Guarantees Issued',
        'Sold & Transferred',
        'Retained for Rental',
      ];

      const units: DevelopmentUnit[] = Array.from({ length: 15 }, (_, i) => ({
        id: `u-${i}`,
        unitNumber: `U${i}`,
        configuration: 'Unit',
        floorAreaSqm: 50,
        allocatedCostBasisZAR: 1_000_000,
        listPriceVatInclZAR: 1_200_000,
        estimatedMonthlyRentZAR: 8_000,
        status: statuses[i % statuses.length],
      }));

      const dev = createBaseProject({ units });
      const fin = calculateDevelopmentFinancials(dev);

      expect(fin.unitsForSaleCount + fin.unitsRetainedCount).toBe(fin.totalUnitsCount);
      expect(fin.totalUnitsCount).toBe(15);
    });

    it('preserves debt waterfall conservation law across varying sales and debt levels', () => {
      const testCases = [
        { drawn: 10_000_000, repaid: 2_000_000, soldCount: 0 },
        { drawn: 10_000_000, repaid: 2_000_000, soldCount: 3 }, // partial
        { drawn: 10_000_000, repaid: 2_000_000, soldCount: 4 }, // exact: 4 * 2M = 8M = debt
        { drawn: 10_000_000, repaid: 2_000_000, soldCount: 5 }, // surplus: 5 * 2M = 10M > 8M
      ];

      for (const tc of testCases) {
        const units: DevelopmentUnit[] = Array.from({ length: 6 }, (_, i) => ({
          id: `u-${i}`,
          unitNumber: `U${i}`,
          configuration: 'Unit',
          floorAreaSqm: 60,
          allocatedCostBasisZAR: 1_200_000,
          listPriceVatInclZAR: 2_000_000,
          estimatedMonthlyRentZAR: 12_000,
          status: i < tc.soldCount ? 'Sold & Transferred' : 'Retained for Rental',
        }));

        const dev = createBaseProject({
          developmentFacilityDrawnZAR: tc.drawn,
          developmentFacilityRepaidZAR: tc.repaid,
          units,
        });

        const fin = calculateDevelopmentFinancials(dev);
        const debt = Math.max(0, tc.drawn - tc.repaid);
        const proceeds = tc.soldCount * 2_000_000;

        expect(fin.outstandingDevFacilityZAR).toBe(debt);
        expect(fin.totalSoldProceedsZAR).toBe(proceeds);

        // Conservation law: Net Cash - Remaining Debt === Proceeds - Debt
        expect(fin.netCashProceedsAfterDebtZAR - fin.remainingDebtOnRetainedUnitsZAR).toBe(
          proceeds - debt
        );
      }
    });

    it('respects zero-override on BOQ item actualCostZAR = 0 without falling back to baseline', () => {
      const boqWithExplicitZero: BOQItem[] = [
        {
          id: 'boq-waived',
          category: 'Roofing & Structural',
          itemDescription: 'Pro-bono geotechnical report',
          unit: 'lump sum',
          quantity: 1,
          baselineUnitCostZAR: 80_000,
          baselineTotalZAR: 80_000,
          actualCostZAR: 0, // Explicit zero: fee waived
          varianceZAR: -80_000,
          supplierOrContractor: 'Geo Pro',
          status: 'Completed',
          milestonePhase: 'Deposit',
          retentionPercent: 0,
        },
      ];

      const dev = createBaseProject({
        totalBuildableAreaSqm: 0, // zero budgeted hard cost
        budgetedHardCostPerSqmZAR: 0,
        boqItems: boqWithExplicitZero,
      });

      const fin = calculateDevelopmentFinancials(dev);
      // actualCostZAR is explicitly 0, so actualBoqSpend must be 0 (not 80_000)
      expect(fin.actualBoqSpendZAR).toBe(0);
      expect(fin.activeHardBuildCostZAR).toBe(0);
    });
  });

  // =========================================================================
  // 9. Monte Carlo Adversarial Fuzzing (100 Iterations)
  // =========================================================================
  describe('Monte Carlo Adversarial Fuzzing', () => {
    it('guarantees 100% finite outputs and zero crashes across 100 pseudo-random stress configurations', () => {
      const pseudoRandom = (seed: number) => {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
      };

      const devStatuses: ('Available' | 'Reserved (OTP Signed)' | 'Bond Approved / Guarantees Issued' | 'Sold & Transferred' | 'Retained for Rental')[] = [
        'Available',
        'Reserved (OTP Signed)',
        'Bond Approved / Guarantees Issued',
        'Sold & Transferred',
        'Retained for Rental',
      ];

      for (let i = 0; i < 100; i++) {
        const unitCount = Math.floor(pseudoRandom(i * 10 + 1) * 30); // 0 to 29 units
        const units: DevelopmentUnit[] = Array.from({ length: unitCount }, (_, uIdx) => ({
          id: `fuzz-u-${uIdx}`,
          unitNumber: `F${uIdx}`,
          configuration: 'Apt',
          floorAreaSqm: Math.floor(pseudoRandom(i * 100 + uIdx) * 150),
          allocatedCostBasisZAR: Math.floor(pseudoRandom(i * 100 + uIdx + 1) * 2_000_000),
          listPriceVatInclZAR: Math.floor(pseudoRandom(i * 100 + uIdx + 2) * 3_000_000),
          estimatedMonthlyRentZAR: Math.floor(pseudoRandom(i * 100 + uIdx + 3) * 25_000),
          status: devStatuses[Math.floor(pseudoRandom(i * 100 + uIdx + 4) * devStatuses.length)],
        }));

        const fuzzedDev: DevelopmentProject = {
          id: `fuzz-dev-${i}`,
          title: `Fuzzed Dev ${i}`,
          address: 'Fuzz',
          city: 'FuzzCity',
          developmentType: 'Sectional Title Apartments',
          isVatRegisteredDeveloper: pseudoRandom(i * 7 + 1) > 0.5,
          taxEntityType: pseudoRandom(i * 7 + 2) > 0.5 ? 'Company (27%)' : 'Trust',
          currentPhase: 'Feasibility',
          preApprovalMonths: Math.floor(pseudoRandom(i * 7 + 3) * 24),
          constructionMonths: Math.floor(pseudoRandom(i * 7 + 4) * 36),
          sellDownMonths: 6,
          landPurchasePriceZAR: Math.floor(pseudoRandom(i * 7 + 5) * 10_000_000),
          acquisitionCostsZAR: Math.floor(pseudoRandom(i * 7 + 6) * 500_000),
          sec118ArrearsZAR: Math.floor(pseudoRandom(i * 7 + 7) * 200_000),
          softCosts: {
            townPlannerZAR: Math.floor(pseudoRandom(i * 13 + 1) * 100_000),
            architectZAR: Math.floor(pseudoRandom(i * 13 + 2) * 200_000),
            structuralCivilEngineerZAR: Math.floor(pseudoRandom(i * 13 + 3) * 100_000),
            quantitySurveyorZAR: Math.floor(pseudoRandom(i * 13 + 4) * 100_000),
            nhbrcEnrolmentFeeZAR: Math.floor(pseudoRandom(i * 13 + 5) * 50_000),
            councilBulkContributionsZAR: Math.floor(pseudoRandom(i * 13 + 6) * 300_000),
            planScrutinyAndSubdivisionFeesZAR: Math.floor(pseudoRandom(i * 13 + 7) * 50_000),
            marketingAndShowUnitZAR: Math.floor(pseudoRandom(i * 13 + 8) * 100_000),
          },
          totalBuildableAreaSqm: Math.floor(pseudoRandom(i * 17 + 1) * 5_000),
          budgetedHardCostPerSqmZAR: Math.floor(pseudoRandom(i * 17 + 2) * 20_000),
          contingencyPercent: Math.floor(pseudoRandom(i * 17 + 3) * 25),
          boqItems: [],
          monthlyPreApprovalHoldingBurnZAR: Math.floor(pseudoRandom(i * 19 + 1) * 50_000),
          monthlyConstructionHoldingBurnZAR: Math.floor(pseudoRandom(i * 19 + 2) * 80_000),
          developmentFacilityLimitZAR: 20_000_000,
          developmentFacilityDrawnZAR: Math.floor(pseudoRandom(i * 23 + 1) * 15_000_000),
          developmentFacilityRepaidZAR: Math.floor(pseudoRandom(i * 23 + 2) * 10_000_000),
          preSalesHurdlePercent: Math.floor(pseudoRandom(i * 29 + 1) * 100),
          approvals: {
            splumaRezoningSubdivision: { status: 'Approved' },
            sgDiagramApproval: { status: 'Approved' },
            municipalBuildingPlans: { status: 'Approved' },
            nhbrcEnrolment: { status: 'Approved' },
            sectionalTitleRegister: { status: 'Approved' },
            occupancyCertificate: { status: 'Approved' },
          },
          units,
        };

        const fin = calculateDevelopmentFinancials(fuzzedDev);

        // Assert all numeric fields are finite and not NaN
        for (const [prop, val] of Object.entries(fin)) {
          if (typeof val === 'number') {
            expect(Number.isFinite(val), `Iteration ${i}: ${prop} must be finite (got ${val})`).toBe(true);
            expect(Number.isNaN(val), `Iteration ${i}: ${prop} must not be NaN`).toBe(false);
          }
        }
      }
    });
  });
});

