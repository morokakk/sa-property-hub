import { describe, it, expect } from 'vitest';
import {
  calculateDevelopmentFinancials,
  calculateDevelopmentSoftCostsTotal,
} from '../developments';
import type {
  DevelopmentProject,
  DevelopmentSoftCosts,
  DevelopmentUnit,
  BOQItem,
} from '@/types';

describe('Adversarial Financial Verification - Milestone 1 Calculations', () => {
  const baseSoftCosts: DevelopmentSoftCosts = {
    townPlannerZAR: 50_000,
    architectZAR: 100_000,
    structuralCivilEngineerZAR: 50_000,
    quantitySurveyorZAR: 50_000,
    nhbrcEnrolmentFeeZAR: 20_000,
    councilBulkContributionsZAR: 150_000,
    planScrutinyAndSubdivisionFeesZAR: 30_000,
    marketingAndShowUnitZAR: 50_000,
  };

  const createBaseProject = (overrides?: Partial<DevelopmentProject>): DevelopmentProject => ({
    id: 'dev-adv-test',
    title: 'Adversarial Test Development',
    address: '1 Test St',
    city: 'Johannesburg',
    province: 'Gauteng',
    developmentType: 'Subdivision & Cluster',
    isVatRegisteredDeveloper: true,
    taxEntityType: 'Company (27%)',
    currentPhase: 'Feasibility',
    preApprovalMonths: 6,
    constructionMonths: 12,
    sellDownMonths: 6,
    landPurchasePriceZAR: 1_000_000,
    acquisitionCostsZAR: 100_000,
    sec118ArrearsZAR: 0,
    softCosts: { ...baseSoftCosts },
    totalBuildableAreaSqm: 500,
    budgetedHardCostPerSqmZAR: 10_000,
    contingencyPercent: 10,
    boqItems: [],
    monthlyPreApprovalHoldingBurnZAR: 10_000,
    monthlyConstructionHoldingBurnZAR: 20_000,
    developmentFacilityLimitZAR: 5_000_000,
    developmentFacilityDrawnZAR: 3_000_000,
    developmentFacilityRepaidZAR: 1_000_000,
    preSalesHurdlePercent: 60,
    approvals: {
      splumaRezoningSubdivision: { status: 'Approved' },
      sgDiagramApproval: { status: 'Approved' },
      municipalBuildingPlans: { status: 'Submitted' },
      nhbrcEnrolment: { status: 'Not Started' },
      sectionalTitleRegister: { status: 'Not Started' },
      occupancyCertificate: { status: 'Not Started' },
    },
    units: [],
    ...overrides,
  });

  // =========================================================================
  // 1. Pre-sales Hurdle Edge Cases
  // =========================================================================
  describe('1. Pre-sales Hurdle Boundary Conditions', () => {
    it('evaluates exactly at hurdle (60.00% pre-sold vs 60% hurdle)', () => {
      // 10 units @ 1,000,000 each = 10,000,000 GDV.
      // 6 units pre-sold = 6,000,000 (exactly 60.00%)
      const units: DevelopmentUnit[] = Array.from({ length: 10 }, (_, i) => ({
        id: `u-${i}`,
        unitNumber: `U${i + 1}`,
        configuration: '2 Bed',
        floorAreaSqm: 50,
        allocatedCostBasisZAR: 700_000,
        listPriceVatInclZAR: 1_000_000,
        estimatedMonthlyRentZAR: 8_000,
        status: i < 6 ? 'Reserved (OTP Signed)' : 'Available',
      }));

      const dev = createBaseProject({
        preSalesHurdlePercent: 60,
        units,
      });

      const fin = calculateDevelopmentFinancials(dev);
      expect(fin.preSoldGdvZAR).toBe(6_000_000);
      expect(fin.gdvInclVatZAR).toBe(10_000_000);
      expect(fin.preSoldGdvPercent).toBe(60);
      expect(fin.isPreSalesHurdleMet).toBe(true);
    });

    it('evaluates 0.01% below hurdle (59.99% pre-sold vs 60.00% hurdle -> false)', () => {
      // Total GDV: 10,000,000.
      // Pre-sold GDV: 5,999,000 -> 59.99%
      const units: DevelopmentUnit[] = [
        {
          id: 'u-presold',
          unitNumber: 'Presold Units Pool',
          configuration: 'Bulk',
          floorAreaSqm: 300,
          allocatedCostBasisZAR: 4_000_000,
          listPriceVatInclZAR: 5_999_000,
          estimatedMonthlyRentZAR: 0,
          status: 'Bond Approved / Guarantees Issued',
        },
        {
          id: 'u-unsold',
          unitNumber: 'Unsold Units Pool',
          configuration: 'Bulk',
          floorAreaSqm: 200,
          allocatedCostBasisZAR: 3_000_000,
          listPriceVatInclZAR: 4_001_000,
          estimatedMonthlyRentZAR: 0,
          status: 'Available',
        },
      ];

      const dev = createBaseProject({
        preSalesHurdlePercent: 60,
        units,
      });

      const fin = calculateDevelopmentFinancials(dev);
      expect(fin.preSoldGdvPercent).toBeCloseTo(59.99, 2);
      expect(fin.preSoldGdvPercent < 60).toBe(true);
      expect(fin.isPreSalesHurdleMet).toBe(false);
    });

    it('evaluates 0.01% above hurdle (60.01% pre-sold vs 60.00% hurdle -> true)', () => {
      // Total GDV: 10,000,000.
      // Pre-sold GDV: 6,001,000 -> 60.01%
      const units: DevelopmentUnit[] = [
        {
          id: 'u-presold',
          unitNumber: 'Presold Pool',
          configuration: 'Bulk',
          floorAreaSqm: 300,
          allocatedCostBasisZAR: 4_000_000,
          listPriceVatInclZAR: 6_001_000,
          estimatedMonthlyRentZAR: 0,
          status: 'Sold & Transferred',
        },
        {
          id: 'u-unsold',
          unitNumber: 'Unsold Pool',
          configuration: 'Bulk',
          floorAreaSqm: 200,
          allocatedCostBasisZAR: 3_000_000,
          listPriceVatInclZAR: 3_999_000,
          estimatedMonthlyRentZAR: 0,
          status: 'Available',
        },
      ];

      const dev = createBaseProject({
        preSalesHurdlePercent: 60,
        units,
      });

      const fin = calculateDevelopmentFinancials(dev);
      expect(fin.preSoldGdvPercent).toBeCloseTo(60.01, 2);
      expect(fin.preSoldGdvPercent >= 60).toBe(true);
      expect(fin.isPreSalesHurdleMet).toBe(true);
    });

    it('evaluates 0% hurdle when 0% pre-sold (e.g. 100% build-to-rent -> true)', () => {
      const units: DevelopmentUnit[] = Array.from({ length: 8 }, (_, i) => ({
        id: `u-${i}`,
        unitNumber: `B${i + 1}`,
        configuration: '1 Bed',
        floorAreaSqm: 40,
        allocatedCostBasisZAR: 500_000,
        listPriceVatInclZAR: 750_000,
        estimatedMonthlyRentZAR: 6_500,
        status: 'Retained for Rental',
      }));

      const dev = createBaseProject({
        preSalesHurdlePercent: 0,
        units,
      });

      const fin = calculateDevelopmentFinancials(dev);
      expect(fin.preSoldUnitsCount).toBe(0);
      expect(fin.preSoldGdvPercent).toBe(0);
      expect(fin.isPreSalesHurdleMet).toBe(true); // 0 >= 0
    });

    it('evaluates 100% hurdle edge cases', () => {
      const units: DevelopmentUnit[] = [
        {
          id: 'u-1',
          unitNumber: 'U1',
          configuration: '2 Bed',
          floorAreaSqm: 50,
          allocatedCostBasisZAR: 500_000,
          listPriceVatInclZAR: 1_000_000,
          estimatedMonthlyRentZAR: 0,
          status: 'Sold & Transferred',
        },
        {
          id: 'u-2',
          unitNumber: 'U2',
          configuration: '2 Bed',
          floorAreaSqm: 50,
          allocatedCostBasisZAR: 500_000,
          listPriceVatInclZAR: 1_000_000,
          estimatedMonthlyRentZAR: 0,
          status: 'Available',
        },
      ];

      // 50% pre-sold vs 100% hurdle -> false
      const dev50 = createBaseProject({ preSalesHurdlePercent: 100, units });
      expect(calculateDevelopmentFinancials(dev50).isPreSalesHurdleMet).toBe(false);

      // 100% pre-sold vs 100% hurdle -> true
      const units100: DevelopmentUnit[] = units.map((u) => ({ ...u, status: 'Reserved (OTP Signed)' }));
      const dev100 = createBaseProject({ preSalesHurdlePercent: 100, units: units100 });
      expect(calculateDevelopmentFinancials(dev100).isPreSalesHurdleMet).toBe(true);
    });
  });

  // =========================================================================
  // 2. Senior Debt Wipeout Edge Cases
  // =========================================================================
  describe('2. Senior Debt Wipeout Boundary Conditions', () => {
    it('handles zero debt (drawn = 0, repaid = 0)', () => {
      const dev = createBaseProject({
        developmentFacilityDrawnZAR: 0,
        developmentFacilityRepaidZAR: 0,
        units: [
          {
            id: 'u-1',
            unitNumber: 'U1',
            configuration: '2 Bed',
            floorAreaSqm: 60,
            allocatedCostBasisZAR: 800_000,
            listPriceVatInclZAR: 1_200_000,
            estimatedMonthlyRentZAR: 0,
            status: 'Available',
          },
        ],
      });

      const fin = calculateDevelopmentFinancials(dev);
      expect(fin.outstandingDevFacilityZAR).toBe(0);
      expect(fin.unitsRequiredForDebtWipeout).toBe(0);
    });

    it('handles exact debt repayment (drawn = repaid)', () => {
      const dev = createBaseProject({
        developmentFacilityDrawnZAR: 4_500_000,
        developmentFacilityRepaidZAR: 4_500_000,
        units: [
          {
            id: 'u-1',
            unitNumber: 'U1',
            configuration: '2 Bed',
            floorAreaSqm: 60,
            allocatedCostBasisZAR: 800_000,
            listPriceVatInclZAR: 1_500_000,
            estimatedMonthlyRentZAR: 0,
            status: 'Available',
          },
        ],
      });

      const fin = calculateDevelopmentFinancials(dev);
      expect(fin.outstandingDevFacilityZAR).toBe(0);
      expect(fin.unitsRequiredForDebtWipeout).toBe(0);
    });

    it('handles over-repayment (repaid > drawn -> floored at 0)', () => {
      const dev = createBaseProject({
        developmentFacilityDrawnZAR: 3_000_000,
        developmentFacilityRepaidZAR: 4_000_000,
        units: [
          {
            id: 'u-1',
            unitNumber: 'U1',
            configuration: '2 Bed',
            floorAreaSqm: 60,
            allocatedCostBasisZAR: 800_000,
            listPriceVatInclZAR: 1_500_000,
            estimatedMonthlyRentZAR: 0,
            status: 'Available',
          },
        ],
      });

      const fin = calculateDevelopmentFinancials(dev);
      expect(fin.outstandingDevFacilityZAR).toBe(0);
      expect(fin.unitsRequiredForDebtWipeout).toBe(0);
    });

    it('handles single unit with list price higher than debt', () => {
      // Outstanding debt = 800,000; Unit price = 1,200,000
      // 800,000 / 1,200,000 = 0.6667 -> Math.ceil(0.6667) = 1
      const dev = createBaseProject({
        developmentFacilityDrawnZAR: 1_800_000,
        developmentFacilityRepaidZAR: 1_000_000, // outstanding = 800,000
        units: [
          {
            id: 'u-1',
            unitNumber: 'U1',
            configuration: '2 Bed',
            floorAreaSqm: 60,
            allocatedCostBasisZAR: 800_000,
            listPriceVatInclZAR: 1_200_000,
            estimatedMonthlyRentZAR: 0,
            status: 'Available',
          },
        ],
      });

      const fin = calculateDevelopmentFinancials(dev);
      expect(fin.outstandingDevFacilityZAR).toBe(800_000);
      expect(fin.avgUnitListPriceZAR).toBe(1_200_000);
      expect(fin.unitsRequiredForDebtWipeout).toBe(1);
    });

    it('handles exact integer multiple of average unit list price', () => {
      // Outstanding = 3,000,000; 3 units @ 1,000,000
      // 3,000,000 / 1,000,000 = 3 -> 3 units
      const dev = createBaseProject({
        developmentFacilityDrawnZAR: 3_000_000,
        developmentFacilityRepaidZAR: 0,
        units: Array.from({ length: 5 }, (_, i) => ({
          id: `u-${i}`,
          unitNumber: `U${i + 1}`,
          configuration: '2 Bed',
          floorAreaSqm: 50,
          allocatedCostBasisZAR: 600_000,
          listPriceVatInclZAR: 1_000_000,
          estimatedMonthlyRentZAR: 0,
          status: 'Available',
        })),
      });

      const fin = calculateDevelopmentFinancials(dev);
      expect(fin.unitsRequiredForDebtWipeout).toBe(3);
    });

    it('handles exact integer multiple + R1 (Math.ceil must step up)', () => {
      // Outstanding = 3,000,001; Avg price = 1,000,000 -> 3.000001 -> 4 units
      const dev = createBaseProject({
        developmentFacilityDrawnZAR: 3_000_001,
        developmentFacilityRepaidZAR: 0,
        units: Array.from({ length: 5 }, (_, i) => ({
          id: `u-${i}`,
          unitNumber: `U${i + 1}`,
          configuration: '2 Bed',
          floorAreaSqm: 50,
          allocatedCostBasisZAR: 600_000,
          listPriceVatInclZAR: 1_000_000,
          estimatedMonthlyRentZAR: 0,
          status: 'Available',
        })),
      });

      const fin = calculateDevelopmentFinancials(dev);
      expect(fin.unitsRequiredForDebtWipeout).toBe(4);
    });
  });

  // =========================================================================
  // 3. Section 13sex Threshold Verification
  // =========================================================================
  describe('3. Section 13sex Threshold (4 vs 5 vs 6 units)', () => {
    const makeUnitsWithRetainedCount = (retainedCount: number, totalCount = 10): DevelopmentUnit[] => {
      return Array.from({ length: totalCount }, (_, i) => ({
        id: `unit-${i + 1}`,
        unitNumber: `U${i + 1}`,
        configuration: 'Apartment',
        floorAreaSqm: 45,
        allocatedCostBasisZAR: 600_000,
        listPriceVatInclZAR: 900_000,
        estimatedMonthlyRentZAR: 7_000,
        status: i < retainedCount ? 'Retained for Rental' : 'Available',
      }));
    };

    it('evaluates exactly 4 units retained -> false (Section 13sex requires >= 5)', () => {
      const dev = createBaseProject({
        units: makeUnitsWithRetainedCount(4),
      });

      const fin = calculateDevelopmentFinancials(dev);
      expect(fin.unitsRetainedCount).toBe(4);
      expect(fin.isSection13SexEligible).toBe(false);
      expect(fin.section13sexDeductionBaseZAR).toBe(0);
      expect(fin.section13sexAnnualAllowanceZAR).toBe(0);
    });

    it('evaluates exactly 5 units retained -> true (Section 13sex triggered)', () => {
      const dev = createBaseProject({
        units: makeUnitsWithRetainedCount(5),
      });

      const fin = calculateDevelopmentFinancials(dev);
      expect(fin.unitsRetainedCount).toBe(5);
      expect(fin.isSection13SexEligible).toBe(true);

      // Cost basis: 5 * 600,000 = 3,000,000
      // 55% deduction base: 3,000,000 * 0.55 = 1,650,000
      // 5% annual allowance: 1,650,000 * 0.05 = 82,500
      expect(fin.section13sexDeductionBaseZAR).toBe(1_650_000);
      expect(fin.section13sexAnnualAllowanceZAR).toBe(82_500);
    });

    it('evaluates 6 units retained -> true', () => {
      const dev = createBaseProject({
        units: makeUnitsWithRetainedCount(6),
      });

      const fin = calculateDevelopmentFinancials(dev);
      expect(fin.unitsRetainedCount).toBe(6);
      expect(fin.isSection13SexEligible).toBe(true);

      // Cost basis: 6 * 600,000 = 3,600,000
      // 55% deduction base: 3,600,000 * 0.55 = 1,980,000
      // 5% annual allowance: 1,980,000 * 0.05 = 99,000
      expect(fin.section13sexDeductionBaseZAR).toBe(1_980_000);
      expect(fin.section13sexAnnualAllowanceZAR).toBe(99_000);
    });

    it('evaluates 0 units retained -> false', () => {
      const dev = createBaseProject({
        units: makeUnitsWithRetainedCount(0),
      });

      const fin = calculateDevelopmentFinancials(dev);
      expect(fin.unitsRetainedCount).toBe(0);
      expect(fin.isSection13SexEligible).toBe(false);
      expect(fin.section13sexDeductionBaseZAR).toBe(0);
      expect(fin.section13sexAnnualAllowanceZAR).toBe(0);
    });
  });

  // =========================================================================
  // 4. Loss Scenario: TDC Exceeding GDV & Tax Floored at 0
  // =========================================================================
  describe('4. Loss Scenario (TDC > GDV) & Zero Tax Floor', () => {
    it('verifies pre-tax loss is negative and corporate tax provision is strictly floored at R0', () => {
      // TDC setup:
      // Land: 2,000,000 + 200,000 = 2,200,000
      // Soft: baseSoftCosts (500k) with bulk contributions 90k instead of 150k -> 440,000
      // Hard: 500m2 * 15,000 = 7,500,000
      // Contingency 10%: 750,000
      // Carrying: 6 * 20k + 12 * 40k = 120k + 480k = 600,000
      // Total TDC = 2,200,000 + 440,000 + 7,500,000 + 750,000 + 600,000 = 11,490,000
      // GDV: 5 units @ 1,000,000 = 5,000,000 (VAT registered)
      // Net Realizable GDV = round(5,000,000 / 1.15) = 4,347,826
      // Claimable Input VAT = (440,000 + 7,500,000) * 0.15 = 1,191,000
      // Net Revenue = 4,347,826 + 1,191,000 = 5,538,826
      // Net Profit Before Tax = 5,538,826 - 11,490,000 = -5,951,174 (LOSS!)
      const lossUnits: DevelopmentUnit[] = Array.from({ length: 5 }, (_, i) => ({
        id: `loss-u-${i}`,
        unitNumber: `U${i + 1}`,
        configuration: 'Apartment',
        floorAreaSqm: 100,
        allocatedCostBasisZAR: 2_310_000,
        listPriceVatInclZAR: 1_000_000,
        estimatedMonthlyRentZAR: 8_000,
        status: 'Available',
      }));

      const lossDev = createBaseProject({
        landPurchasePriceZAR: 2_000_000,
        acquisitionCostsZAR: 200_000,
        softCosts: { ...baseSoftCosts, councilBulkContributionsZAR: 90_000 }, // Total = 440,000
        totalBuildableAreaSqm: 500,
        budgetedHardCostPerSqmZAR: 15_000,
        contingencyPercent: 10,
        monthlyPreApprovalHoldingBurnZAR: 20_000,
        monthlyConstructionHoldingBurnZAR: 40_000,
        preApprovalMonths: 6,
        constructionMonths: 12,
        units: lossUnits,
      });

      const fin = calculateDevelopmentFinancials(lossDev);

      expect(fin.tdcZAR).toBe(11_490_000);
      expect(fin.gdvInclVatZAR).toBe(5_000_000);
      expect(fin.netProfitBeforeTaxZAR).toBeLessThan(0);
      expect(fin.netProfitBeforeTaxZAR).toBe(-5_951_174);
      expect(fin.pocPercent).toBeLessThan(0);
      expect(fin.pocPercent).toBeCloseTo((-5_951_174 / 11_490_000) * 100, 2);

      // Tax provision MUST BE 0 (no SARS tax liability on a loss)
      expect(fin.estimatedTaxProvisionZAR).toBe(0);
      expect(fin.netProfitAfterTaxZAR).toBe(fin.netProfitBeforeTaxZAR);
      expect(fin.afterTaxPocPercent).toBe(fin.pocPercent);
    });

    it('verifies non-VAT loss scenario also floors tax at 0', () => {
      const nonVatLossDev = createBaseProject({
        isVatRegisteredDeveloper: false,
        landPurchasePriceZAR: 2_000_000,
        totalBuildableAreaSqm: 500,
        budgetedHardCostPerSqmZAR: 15_000,
        units: [
          {
            id: 'u-1',
            unitNumber: 'U1',
            configuration: 'House',
            floorAreaSqm: 500,
            allocatedCostBasisZAR: 10_000_000,
            listPriceVatInclZAR: 4_000_000, // GDV 4M < TDC ~11M
            estimatedMonthlyRentZAR: 0,
            status: 'Available',
          },
        ],
      });

      const fin = calculateDevelopmentFinancials(nonVatLossDev);
      expect(fin.netProfitBeforeTaxZAR).toBeLessThan(0);
      expect(fin.estimatedTaxProvisionZAR).toBe(0);
      expect(fin.netProfitAfterTaxZAR).toBe(fin.netProfitBeforeTaxZAR);
    });

    it('verifies breakeven scenario (profit = 0 -> tax provision = 0)', () => {
      // Non-VAT project where GDV exactly equals TDC
      const breakEvenDev = createBaseProject({
        isVatRegisteredDeveloper: false,
        landPurchasePriceZAR: 500_000,
        acquisitionCostsZAR: 0,
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
        totalBuildableAreaSqm: 100,
        budgetedHardCostPerSqmZAR: 5_000, // 500k
        contingencyPercent: 0,
        monthlyPreApprovalHoldingBurnZAR: 0,
        monthlyConstructionHoldingBurnZAR: 0,
        // TDC = 500k + 500k = 1,000,000
        units: [
          {
            id: 'u-1',
            unitNumber: 'U1',
            configuration: 'Unit',
            floorAreaSqm: 100,
            allocatedCostBasisZAR: 1_000_000,
            listPriceVatInclZAR: 1_000_000, // GDV = 1,000,000
            estimatedMonthlyRentZAR: 0,
            status: 'Available',
          },
        ],
      });

      const fin = calculateDevelopmentFinancials(breakEvenDev);
      expect(fin.tdcZAR).toBe(1_000_000);
      expect(fin.netRealizableGdvZAR).toBe(1_000_000);
      expect(fin.netProfitBeforeTaxZAR).toBe(0);
      expect(fin.estimatedTaxProvisionZAR).toBe(0);
      expect(fin.netProfitAfterTaxZAR).toBe(0);
      expect(fin.pocPercent).toBe(0);
    });
  });

  // =========================================================================
  // 5. VAT Toggle (VAT-Registered vs Non-VAT Registered Developer)
  // =========================================================================
  describe('5. VAT Toggle Comparative Mechanics', () => {
    it('compares the same development under isVatRegisteredDeveloper true vs false', () => {
      const units: DevelopmentUnit[] = Array.from({ length: 6 }, (_, i) => ({
        id: `u-${i + 1}`,
        unitNumber: `Unit ${i + 1}`,
        configuration: '2 Bed',
        floorAreaSqm: 65,
        allocatedCostBasisZAR: 1_200_000,
        listPriceVatInclZAR: 1_610_000, // Total GDV = 9,660,000
        estimatedMonthlyRentZAR: 11_000,
        status: 'Available',
      }));

      const projectVat = createBaseProject({
        isVatRegisteredDeveloper: true,
        units,
      });

      const projectNonVat = createBaseProject({
        isVatRegisteredDeveloper: false,
        units,
      });

      const finVat = calculateDevelopmentFinancials(projectVat);
      const finNonVat = calculateDevelopmentFinancials(projectNonVat);

      // TDC is identical in both
      expect(finVat.tdcZAR).toBe(finNonVat.tdcZAR);

      // Gross GDV is identical
      expect(finVat.gdvInclVatZAR).toBe(9_660_000);
      expect(finNonVat.gdvInclVatZAR).toBe(9_660_000);

      // VAT Registered specifics
      expect(finVat.isVatRegisteredDeveloper).toBe(true);
      expect(finVat.netRealizableGdvZAR).toBe(Math.round(9_660_000 / 1.15)); // 8,400,000
      expect(finVat.outputVatZAR).toBe(9_660_000 - 8_400_000); // 1,260,000
      expect(finVat.claimableInputVatZAR).toBe(Math.round((finVat.totalSoftCostsZAR + finVat.activeHardBuildCostZAR) * 0.15));
      expect(finVat.claimableInputVatZAR).toBeGreaterThan(0);

      // Non-VAT specifics
      expect(finNonVat.isVatRegisteredDeveloper).toBe(false);
      expect(finNonVat.netRealizableGdvZAR).toBe(9_660_000);
      expect(finNonVat.outputVatZAR).toBe(0);
      expect(finNonVat.claimableInputVatZAR).toBe(0);

      // Net profit before tax differences:
      // VAT: (8,400,000 + InputVAT) - TDC
      // Non-VAT: 9,660,000 - TDC
      expect(finVat.netProfitBeforeTaxZAR).toBe(
        finVat.netRealizableGdvZAR + finVat.claimableInputVatZAR - finVat.tdcZAR
      );
      expect(finNonVat.netProfitBeforeTaxZAR).toBe(
        finNonVat.netRealizableGdvZAR - finNonVat.tdcZAR
      );
    });
  });

  // =========================================================================
  // 6. Adversarial Stress & Invariant Checks
  // =========================================================================
  describe('6. Adversarial Stress & Invariants', () => {
    it('maintains non-negative debt wipeout units and debt balance across wild inputs', () => {
      const wildDev = createBaseProject({
        developmentFacilityDrawnZAR: -500_000,
        developmentFacilityRepaidZAR: 10_000_000,
        totalBuildableAreaSqm: -100,
        budgetedHardCostPerSqmZAR: -5_000,
        preApprovalMonths: -5,
        constructionMonths: -10,
      });

      const fin = calculateDevelopmentFinancials(wildDev);
      expect(fin.outstandingDevFacilityZAR).toBe(0);
      expect(fin.unitsRequiredForDebtWipeout).toBe(0);
      expect(fin.budgetedHardBuildCostZAR).toBe(0);
      expect(fin.totalPreApprovalCarryingCostZAR).toBe(0);
      expect(fin.totalConstructionCarryingCostZAR).toBe(0);
    });

    it('verifies netSalesProceedsAfterDebtZAR + remainingDebtOnRetainedUnitsZAR invariants', () => {
      // Invariant: If totalSoldProceeds >= debt, remainingDebt is 0.
      // If totalSoldProceeds < debt, netCashProceeds is 0.
      const testCases = [
        { drawn: 2_000_000, repaid: 0, soldCount: 1, price: 1_000_000 }, // Proceeds 1M < Debt 2M
        { drawn: 2_000_000, repaid: 0, soldCount: 2, price: 1_000_000 }, // Proceeds 2M == Debt 2M
        { drawn: 2_000_000, repaid: 0, soldCount: 3, price: 1_000_000 }, // Proceeds 3M > Debt 2M
      ];

      for (const tc of testCases) {
        const units: DevelopmentUnit[] = Array.from({ length: 4 }, (_, i) => ({
          id: `u-${i}`,
          unitNumber: `U${i + 1}`,
          configuration: 'Flat',
          floorAreaSqm: 50,
          allocatedCostBasisZAR: 500_000,
          listPriceVatInclZAR: tc.price,
          estimatedMonthlyRentZAR: 6_000,
          status: i < tc.soldCount ? 'Sold & Transferred' : 'Retained for Rental',
        }));

        const dev = createBaseProject({
          developmentFacilityDrawnZAR: tc.drawn,
          developmentFacilityRepaidZAR: tc.repaid,
          units,
        });

        const fin = calculateDevelopmentFinancials(dev);
        const outstanding = tc.drawn - tc.repaid;
        const totalSold = tc.soldCount * tc.price;

        if (totalSold >= outstanding) {
          expect(fin.remainingDebtOnRetainedUnitsZAR).toBe(0);
          expect(fin.netSalesProceedsAfterDebtZAR).toBe(totalSold - outstanding);
        } else {
          expect(fin.netSalesProceedsAfterDebtZAR).toBe(0);
          expect(fin.remainingDebtOnRetainedUnitsZAR).toBe(outstanding - totalSold);
        }
      }
    });

    it('verifies trust and individual tax rates (45%) vs company (27%)', () => {
      const units: DevelopmentUnit[] = [
        {
          id: 'u-1',
          unitNumber: 'U1',
          configuration: 'Unit',
          floorAreaSqm: 100,
          allocatedCostBasisZAR: 500_000,
          listPriceVatInclZAR: 2_000_000,
          estimatedMonthlyRentZAR: 0,
          status: 'Available',
        },
      ];

      const devCompany = createBaseProject({ taxEntityType: 'Company (27%)', units });
      const devTrust = createBaseProject({ taxEntityType: 'Trust', units });
      const devIndiv = createBaseProject({ taxEntityType: 'Individual', units });

      const finCompany = calculateDevelopmentFinancials(devCompany);
      const finTrust = calculateDevelopmentFinancials(devTrust);
      const finIndiv = calculateDevelopmentFinancials(devIndiv);

      expect(finCompany.effectiveTaxRatePercent).toBe(27);
      expect(finTrust.effectiveTaxRatePercent).toBe(45);
      expect(finIndiv.effectiveTaxRatePercent).toBe(45);

      if (finCompany.netProfitBeforeTaxZAR > 0) {
        expect(finTrust.estimatedTaxProvisionZAR).toBe(
          Math.round(finCompany.netProfitBeforeTaxZAR * 0.45)
        );
        expect(finIndiv.estimatedTaxProvisionZAR).toBe(
          Math.round(finCompany.netProfitBeforeTaxZAR * 0.45)
        );
      }
    });
  });
});
