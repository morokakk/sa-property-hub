import { describe, it, expect } from 'vitest';
import {
  calculateDevelopmentSoftCostsTotal,
  calculateDevelopmentFinancials,
  calculateBOQItemTotals,
  calculateDevelopmentHoldingSensitivity,
  calculateApprovalsProgress,
  calculateDevelopmentCapitalStack,
  calculateDevelopmentRiskGate,
  calculateDevelopmentDebtWipeoutMatrix,
  type DevelopmentFinancialSummary,
} from '../developments';
import type {
  DevelopmentProject,
  DevelopmentSoftCosts,
  DevelopmentUnit,
  BOQItem,
  DevUnitStatus,
  DevelopmentTaxEntityType,
} from '@/types';

describe('Milestone 5.2 Challenger: SA Real Estate Math, SARS Tax & Communication Hygiene Harness', () => {
  const createBaseProject = (overrides: Partial<DevelopmentProject> = {}): DevelopmentProject => ({
    id: 'm5-challenger-project',
    title: 'M5 Feasibility Cluster Scheme',
    address: '100 Republic Road, Ferndale',
    city: 'Randburg',
    province: 'Gauteng',
    investmentNodeId: 'node-randburg-1',
    developmentType: 'Subdivision & Cluster',
    isVatRegisteredDeveloper: true,
    taxEntityType: 'Company (27%)',
    currentPhase: 'Feasibility',
    preApprovalMonths: 4,
    constructionMonths: 8,
    sellDownMonths: 3,
    landPurchasePriceZAR: 1_800_000,
    acquisitionCostsZAR: 120_000,
    sec118ArrearsZAR: 30_000,
    softCosts: {
      townPlannerZAR: 35_000,
      architectZAR: 85_000,
      structuralCivilEngineerZAR: 55_000,
      quantitySurveyorZAR: 40_000,
      nhbrcEnrolmentFeeZAR: 20_000,
      councilBulkContributionsZAR: 140_000,
      planScrutinyAndSubdivisionFeesZAR: 25_000,
      marketingAndShowUnitZAR: 30_000,
    },
    totalBuildableAreaSqm: 500,
    budgetedHardCostPerSqmZAR: 10_000,
    contingencyPercent: 10,
    boqItems: [],
    monthlyPreApprovalHoldingBurnZAR: 15_000,
    monthlyConstructionHoldingBurnZAR: 25_000,
    developmentFacilityLimitZAR: 10_000_000,
    developmentFacilityDrawnZAR: 6_000_000,
    developmentFacilityRepaidZAR: 1_500_000,
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
        configuration: '2 Bed 2 Bath',
        floorAreaSqm: 100,
        allocatedCostBasisZAR: 1_200_000,
        listPriceVatInclZAR: 1_800_000,
        estimatedMonthlyRentZAR: 12_000,
        status: 'Sold & Transferred',
      },
      {
        id: 'u-2',
        unitNumber: 'Unit 2',
        configuration: '2 Bed 2 Bath',
        floorAreaSqm: 100,
        allocatedCostBasisZAR: 1_200_000,
        listPriceVatInclZAR: 1_800_000,
        estimatedMonthlyRentZAR: 12_000,
        status: 'Bond Approved / Guarantees Issued',
      },
      {
        id: 'u-3',
        unitNumber: 'Unit 3',
        configuration: '2 Bed 2 Bath',
        floorAreaSqm: 100,
        allocatedCostBasisZAR: 1_200_000,
        listPriceVatInclZAR: 1_800_000,
        estimatedMonthlyRentZAR: 12_000,
        status: 'Reserved (OTP Signed)',
      },
      {
        id: 'u-4',
        unitNumber: 'Unit 4',
        configuration: '2 Bed 2 Bath',
        floorAreaSqm: 100,
        allocatedCostBasisZAR: 1_200_000,
        listPriceVatInclZAR: 1_800_000,
        estimatedMonthlyRentZAR: 12_000,
        status: 'Available',
      },
      {
        id: 'u-5',
        unitNumber: 'Unit 5',
        configuration: '2 Bed 2 Bath',
        floorAreaSqm: 100,
        allocatedCostBasisZAR: 1_200_000,
        listPriceVatInclZAR: 1_800_000,
        estimatedMonthlyRentZAR: 12_000,
        status: 'Retained for Rental',
      },
    ],
    ...overrides,
  });

  // =========================================================================
  // 1. Total Development Cost (TDC) Composition Verification
  // =========================================================================
  describe('1. Total Development Cost (TDC) Precision', () => {
    it('accurately computes land, soft costs, active hard build, holding burn, and contingency', () => {
      const dev = createBaseProject();
      const fin = calculateDevelopmentFinancials(dev);

      // Expected sub-totals:
      // Land: 1_800_000 + 120_000 + 30_000 = 1_950_000
      expect(fin.totalLandAndAcquisitionZAR).toBe(1_950_000);

      // Soft costs: 35k + 85k + 55k + 40k + 20k + 140k + 25k + 30k = 430_000
      expect(fin.totalSoftCostsZAR).toBe(430_000);

      // Budgeted hard build: 500 sqm * 10_000 = 5_000_000
      expect(fin.budgetedHardBuildCostZAR).toBe(5_000_000);
      expect(fin.actualBoqSpendZAR).toBe(0);
      expect(fin.activeHardBuildCostZAR).toBe(5_000_000);

      // Contingency: 10% of 5_000_000 = 500_000
      expect(fin.contingencyReserveZAR).toBe(500_000);

      // Carrying:
      // Pre-approval: 4 mos * 15_000 = 60_000
      // Construction: 8 mos * 25_000 = 200_000
      // Total carrying: 260_000
      expect(fin.totalPreApprovalCarryingCostZAR).toBe(60_000);
      expect(fin.totalConstructionCarryingCostZAR).toBe(200_000);
      expect(fin.totalCarryingCostZAR).toBe(260_000);

      // Expected TDC: 1_950_000 + 430_000 + 5_000_000 + 500_000 + 260_000 = 8_140_000
      expect(fin.tdcZAR).toBe(8_140_000);

      // Metrics per sqm and per unit
      expect(fin.tdcPerSqmZAR).toBe(Math.round(8_140_000 / 500)); // 16_280
      expect(fin.tdcPerUnitZAR).toBe(Math.round(8_140_000 / 5));   // 1_628_000
    });

    it('uses actual BOQ spend when BOQ exceeds budgeted hard cost', () => {
      const dev = createBaseProject({
        totalBuildableAreaSqm: 500,
        budgetedHardCostPerSqmZAR: 10_000, // Budget = 5_000_000
        contingencyPercent: 10,
        boqItems: [
          {
            id: 'boq-overrun',
            category: 'Roofing & Structural',
            itemDescription: 'High-spec masonry and concrete',
            unit: 'lump sum',
            quantity: 1,
            baselineUnitCostZAR: 5_000_000,
            baselineTotalZAR: 5_000_000,
            actualCostZAR: 5_600_000, // 600k overrun
            varianceZAR: 600_000,
            supplierOrContractor: 'Apex Civils',
            status: 'Completed',
          },
        ],
      });
      const fin = calculateDevelopmentFinancials(dev);

      expect(fin.budgetedHardBuildCostZAR).toBe(5_000_000);
      expect(fin.actualBoqSpendZAR).toBe(5_600_000);
      expect(fin.activeHardBuildCostZAR).toBe(5_600_000); // Must be active
      expect(fin.contingencyReserveZAR).toBe(560_000); // 10% of 5_600_000

      // TDC must include activeHardBuildCostZAR (5.6M) + contingency (560k)
      const expectedTdc =
        1_950_000 + 430_000 + 5_600_000 + 560_000 + 260_000;
      expect(fin.tdcZAR).toBe(expectedTdc);
    });

    it('safely handles zero-override and missing soft costs', () => {
      expect(calculateDevelopmentSoftCostsTotal(null)).toBe(0);
      expect(calculateDevelopmentSoftCostsTotal(undefined)).toBe(0);
      expect(calculateDevelopmentSoftCostsTotal({} as unknown as DevelopmentSoftCosts)).toBe(0);

      // Explicit 0 is respected
      const softZero: DevelopmentSoftCosts = {
        townPlannerZAR: 0,
        architectZAR: 0,
        structuralCivilEngineerZAR: 0,
        quantitySurveyorZAR: 0,
        nhbrcEnrolmentFeeZAR: 0,
        councilBulkContributionsZAR: 0,
        planScrutinyAndSubdivisionFeesZAR: 0,
        marketingAndShowUnitZAR: 0,
      };
      expect(calculateDevelopmentSoftCostsTotal(softZero)).toBe(0);
    });
  });

  // =========================================================================
  // 2. Gross Development Value (GDV) & SARS 15% VAT Mechanics Verification
  // =========================================================================
  describe('2. GDV & SARS 15% VAT Mechanics', () => {
    it('applies standard 15% output VAT stripping (gdv / 1.15) and input VAT claim for VAT-registered developers', () => {
      const dev = createBaseProject({
        isVatRegisteredDeveloper: true,
      });
      const fin = calculateDevelopmentFinancials(dev);

      // GDV = 5 units * 1_800_000 = 9_000_000
      expect(fin.gdvInclVatZAR).toBe(9_000_000);
      expect(fin.isVatRegisteredDeveloper).toBe(true);

      // Net Realizable GDV = 9_000_000 / 1.15 = 7_826_086.956... -> rounded to 7_826_087
      const expectedNetRealizableGdv = Math.round(9_000_000 / 1.15);
      expect(fin.netRealizableGdvZAR).toBe(expectedNetRealizableGdv);
      expect(fin.outputVatZAR).toBe(9_000_000 - expectedNetRealizableGdv);

      // Claimable Input VAT = 15% on (soft costs + active hard build)
      // Soft costs = 430_000, Hard build = 5_000_000 => Total = 5_430_000
      // 5_430_000 * 0.15 = 814_500
      const expectedInputVat = Math.round((430_000 + 5_000_000) * 0.15);
      expect(fin.claimableInputVatZAR).toBe(expectedInputVat);
      expect(fin.claimableInputVatZAR).toBe(814_500);

      // Net Profit Before Tax = (netRealizableGdvZAR + claimableInputVatZAR) - tdcZAR
      // (7_826_087 + 814_500) - 8_140_000 = 8_640_587 - 8_140_000 = 500_587
      expect(fin.netProfitBeforeTaxZAR).toBe(
        expectedNetRealizableGdv + expectedInputVat - 8_140_000
      );
    });

    it('realizes 100% of GDV without output VAT stripping and 0 input VAT credits for non-VAT developers', () => {
      const dev = createBaseProject({
        isVatRegisteredDeveloper: false,
      });
      const fin = calculateDevelopmentFinancials(dev);

      expect(fin.isVatRegisteredDeveloper).toBe(false);
      expect(fin.gdvInclVatZAR).toBe(9_000_000);
      expect(fin.netRealizableGdvZAR).toBe(9_000_000);
      expect(fin.outputVatZAR).toBe(0);
      expect(fin.claimableInputVatZAR).toBe(0);

      // Net Profit Before Tax = gdv - tdc = 9_000_000 - 8_140_000 = 860_000
      expect(fin.netProfitBeforeTaxZAR).toBe(9_000_000 - 8_140_000);
      expect(fin.netProfitBeforeTaxZAR).toBe(860_000);
    });
  });

  // =========================================================================
  // 3. Profit on Cost (POC %) & 27% Corporate Tax Verification
  // =========================================================================
  describe('3. Profit on Cost (POC %) & SARS Corporate Tax', () => {
    it('computes pre-tax POC % and applies exactly 27% tax for Company (27%)', () => {
      const dev = createBaseProject({
        taxEntityType: 'Company (27%)',
      });
      const fin = calculateDevelopmentFinancials(dev);

      expect(fin.taxEntityType).toBe('Company (27%)');
      expect(fin.effectiveTaxRatePercent).toBe(27);

      // Pre-tax POC % = (netProfitBeforeTax / tdc) * 100
      const expectedPoc = (fin.netProfitBeforeTaxZAR / fin.tdcZAR) * 100;
      expect(fin.pocPercent).toBeCloseTo(expectedPoc, 5);

      // Tax provision: 27% of netProfitBeforeTaxZAR
      const expectedTax = Math.round(fin.netProfitBeforeTaxZAR * 0.27);
      expect(fin.estimatedTaxProvisionZAR).toBe(expectedTax);

      // Net profit after tax
      expect(fin.netProfitAfterTaxZAR).toBe(fin.netProfitBeforeTaxZAR - expectedTax);

      // After-tax POC %
      const expectedAfterTaxPoc = (fin.netProfitAfterTaxZAR / fin.tdcZAR) * 100;
      expect(fin.afterTaxPocPercent).toBeCloseTo(expectedAfterTaxPoc, 5);
    });

    it('applies 45% statutory tax rate for Individual and Trust tax entity types', () => {
      const devTrust = createBaseProject({ taxEntityType: 'Trust' });
      const finTrust = calculateDevelopmentFinancials(devTrust);
      expect(finTrust.effectiveTaxRatePercent).toBe(45);
      expect(finTrust.estimatedTaxProvisionZAR).toBe(
        Math.round(finTrust.netProfitBeforeTaxZAR * 0.45)
      );

      const devIndiv = createBaseProject({ taxEntityType: 'Individual' });
      const finIndiv = calculateDevelopmentFinancials(devIndiv);
      expect(finIndiv.effectiveTaxRatePercent).toBe(45);
      expect(finIndiv.estimatedTaxProvisionZAR).toBe(
        Math.round(finIndiv.netProfitBeforeTaxZAR * 0.45)
      );
    });

    it('handles projects in a loss situation with zero tax provision (no negative tax)', () => {
      const devLoss = createBaseProject({
        landPurchasePriceZAR: 10_000_000, // Blow out cost to force loss
      });
      const finLoss = calculateDevelopmentFinancials(devLoss);

      expect(finLoss.netProfitBeforeTaxZAR).toBeLessThan(0);
      expect(finLoss.estimatedTaxProvisionZAR).toBe(0);
      expect(finLoss.netProfitAfterTaxZAR).toBe(finLoss.netProfitBeforeTaxZAR);
      expect(finLoss.pocPercent).toBeLessThan(0);
      expect(finLoss.afterTaxPocPercent).toBeLessThan(0);
    });
  });

  // =========================================================================
  // 4. Senior Debt Wipeout Breakeven Verification
  // =========================================================================
  describe('4. Senior Debt Wipeout Breakeven', () => {
    it('calculates the exact unit sales count needed at average list price to reduce senior debt to R0', () => {
      const dev = createBaseProject({
        developmentFacilityDrawnZAR: 6_000_000,
        developmentFacilityRepaidZAR: 1_500_000, // Outstanding = 4_500_000
      });
      const fin = calculateDevelopmentFinancials(dev);

      // Outstanding dev facility = 6_000_000 - 1_500_000 = 4_500_000
      expect(fin.outstandingDevFacilityZAR).toBe(4_500_000);

      // Average list price = 9_000_000 / 5 units = 1_800_000
      expect(fin.avgUnitListPriceZAR).toBe(1_800_000);

      // 4_500_000 / 1_800_000 = 2.5 units -> Math.ceil(2.5) = 3 units
      expect(fin.unitsRequiredForDebtWipeout).toBe(3);

      // Unencumbered units = 5 - 3 = 2 units
      expect(fin.unencumberedUnitsCount).toBe(2);
    });

    it('returns 0 units required when senior debt is fully settled', () => {
      const dev = createBaseProject({
        developmentFacilityDrawnZAR: 5_000_000,
        developmentFacilityRepaidZAR: 5_000_000,
      });
      const fin = calculateDevelopmentFinancials(dev);

      expect(fin.outstandingDevFacilityZAR).toBe(0);
      expect(fin.unitsRequiredForDebtWipeout).toBe(0);
      expect(fin.unencumberedUnitsCount).toBe(5);
    });

    it('correctly maps waterfall roles across units in calculateDevelopmentDebtWipeoutMatrix', () => {
      const dev = createBaseProject({
        developmentFacilityDrawnZAR: 6_000_000,
        developmentFacilityRepaidZAR: 1_500_000, // 4.5M debt -> 3 units to wipe out
      });
      const matrix = calculateDevelopmentDebtWipeoutMatrix(dev);

      expect(matrix.unitsRequiredForDebtWipeout).toBe(3);
      expect(matrix.unitsWaterfall.length).toBe(5);

      // Units 1 to 3 are debt extinguishers (first 3 for-sale units)
      expect(matrix.unitsWaterfall[0].waterfallRole).toBe('Senior Debt Wipeout');
      expect(matrix.unitsWaterfall[1].waterfallRole).toBe('Senior Debt Wipeout');
      expect(matrix.unitsWaterfall[2].waterfallRole).toBe('Senior Debt Wipeout');

      // Unit 4 is for sale, exceeding debt wipeout hurdle -> Unencumbered Cash Profit
      expect(matrix.unitsWaterfall[3].waterfallRole).toBe('Unencumbered Cash Profit');

      // Unit 5 is Retained for Rental -> Free-Carry Retained Equity
      expect(matrix.unitsWaterfall[4].waterfallRole).toBe('Free-Carry Retained Equity');
    });
  });

  // =========================================================================
  // 5. SARS Section 13sex 55% Write-Off Eligibility Verification
  // =========================================================================
  describe('5. SARS Section 13sex Tax Shield & 5-Unit Threshold', () => {
    it('evaluates Section 13sex as FALSE when retained residential units < 5', () => {
      // 1 unit retained out of 5
      const dev = createBaseProject();
      const fin = calculateDevelopmentFinancials(dev);

      expect(fin.unitsRetainedCount).toBe(1);
      expect(fin.isSection13SexEligible).toBe(false);
      expect(fin.section13sexDeductionBaseZAR).toBe(0);
      expect(fin.section13sexAnnualAllowanceZAR).toBe(0);
      expect(fin.section13sexTwentyYearSavingsZAR).toBe(0);
      expect(fin.unitsNeededForSection13Sex).toBe(4); // 5 - 1 = 4
    });

    it('triggers Section 13sex as TRUE when exactly 5 residential units are retained', () => {
      const unitsWith5Retained: DevelopmentUnit[] = [
        {
          id: 'u-1',
          unitNumber: 'Unit 1',
          configuration: '1 Bed',
          floorAreaSqm: 50,
          allocatedCostBasisZAR: 800_000,
          listPriceVatInclZAR: 1_100_000,
          estimatedMonthlyRentZAR: 7_500,
          status: 'Retained for Rental',
        },
        {
          id: 'u-2',
          unitNumber: 'Unit 2',
          configuration: '1 Bed',
          floorAreaSqm: 50,
          allocatedCostBasisZAR: 800_000,
          listPriceVatInclZAR: 1_100_000,
          estimatedMonthlyRentZAR: 7_500,
          status: 'Retained for Rental',
        },
        {
          id: 'u-3',
          unitNumber: 'Unit 3',
          configuration: '1 Bed',
          floorAreaSqm: 50,
          allocatedCostBasisZAR: 800_000,
          listPriceVatInclZAR: 1_100_000,
          estimatedMonthlyRentZAR: 7_500,
          status: 'Retained for Rental',
        },
        {
          id: 'u-4',
          unitNumber: 'Unit 4',
          configuration: '1 Bed',
          floorAreaSqm: 50,
          allocatedCostBasisZAR: 800_000,
          listPriceVatInclZAR: 1_100_000,
          estimatedMonthlyRentZAR: 7_500,
          status: 'Retained for Rental',
        },
        {
          id: 'u-5',
          unitNumber: 'Unit 5',
          configuration: '1 Bed',
          floorAreaSqm: 50,
          allocatedCostBasisZAR: 800_000,
          listPriceVatInclZAR: 1_100_000,
          estimatedMonthlyRentZAR: 7_500,
          status: 'Retained for Rental',
        },
      ];

      const dev = createBaseProject({ units: unitsWith5Retained });
      const fin = calculateDevelopmentFinancials(dev);

      expect(fin.unitsRetainedCount).toBe(5);
      expect(fin.isSection13SexEligible).toBe(true);
      expect(fin.unitsNeededForSection13Sex).toBe(0);

      // Total retained cost basis = 5 * 800_000 = 4_000_000
      // 55% deduction base = 4_000_000 * 0.55 = 2_200_000
      expect(fin.section13sexDeductionBaseZAR).toBe(2_200_000);

      // 5% annual allowance = 2_200_000 * 0.05 = 110_000
      expect(fin.section13sexAnnualAllowanceZAR).toBe(110_000);

      // 20-Year cumulative savings = 110_000 * 20 = 2_200_000
      expect(fin.section13sexTwentyYearSavingsZAR).toBe(2_200_000);
    });

    it('triggers Section 13sex for Kempton Park seed project (dev-2) with 10 retained units', () => {
      // 10 micro-apartments retained
      const units10: DevelopmentUnit[] = Array.from({ length: 10 }, (_, i) => ({
        id: `kp-unit-${i + 1}`,
        unitNumber: `Unit ${i + 1}`,
        configuration: 'Studio Micro',
        floorAreaSqm: 26,
        allocatedCostBasisZAR: 320_000,
        listPriceVatInclZAR: 450_000,
        estimatedMonthlyRentZAR: 4_200,
        status: 'Retained for Rental',
      }));

      const dev = createBaseProject({
        title: 'Kempton Park 10-Unit Micro-Apartment Infill',
        units: units10,
        isVatRegisteredDeveloper: false,
      });
      const fin = calculateDevelopmentFinancials(dev);

      expect(fin.unitsRetainedCount).toBe(10);
      expect(fin.isSection13SexEligible).toBe(true);

      // Retained cost basis = 10 * 320_000 = 3_200_000
      // 55% deduction base = 3_200_000 * 0.55 = 1_760_000
      expect(fin.section13sexDeductionBaseZAR).toBe(1_760_000);
      // Annual allowance = 1_760_000 * 0.05 = 88_000
      expect(fin.section13sexAnnualAllowanceZAR).toBe(88_000);
      // 20-Year total = 88_000 * 20 = 1_760_000
      expect(fin.section13sexTwentyYearSavingsZAR).toBe(1_760_000);
    });
  });

  // =========================================================================
  // 6. WhatsApp ASCII & Zero Unicode Emojis Hygiene Verification
  // =========================================================================
  describe('6. WhatsApp ASCII Hygiene & Zero Unicode Emojis', () => {
    // Comprehensive emoji and Dingbat regex matching all unicode emoji blocks
    const emojiRegex = /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/u;

    it('verifies developments calculation engine and presentation helpers contain 0 Unicode emojis', () => {
      const dev = createBaseProject();
      const fin = calculateDevelopmentFinancials(dev);
      const stack = calculateDevelopmentCapitalStack(dev, fin);
      const gate = calculateDevelopmentRiskGate(dev, fin);
      const matrix = calculateDevelopmentDebtWipeoutMatrix(dev, fin);

      const inspectString = (str: string, label: string) => {
        expect(str, `${label} contains emoji`).not.toMatch(emojiRegex);
      };

      // Check capital stack items
      stack.items.forEach((item) => {
        inspectString(item.title, `item.title ${item.id}`);
        inspectString(item.statutoryBasis, `item.statutoryBasis ${item.id}`);
        inspectString(item.drawCondition, `item.drawCondition ${item.id}`);
      });

      // Check risk gate items
      gate.stage1Items.forEach((item) => {
        inspectString(item.title, `stage1 title ${item.key}`);
        inspectString(item.statutoryAct, `stage1 act ${item.key}`);
        inspectString(item.authority, `stage1 auth ${item.key}`);
      });
      inspectString(gate.stage1RingFenceLabel, 'stage1RingFenceLabel');
      inspectString(gate.stage1RingFenceDescription, 'stage1RingFenceDescription');
      inspectString(gate.stage2DrawLabel, 'stage2DrawLabel');
      inspectString(gate.stage2DrawDescription, 'stage2DrawDescription');

      // Check debt wipeout matrix
      matrix.unitsWaterfall.forEach((u) => {
        inspectString(u.roleBadgeText, `roleBadgeText ${u.unitNumber}`);
        inspectString(u.waterfallRole, `waterfallRole ${u.unitNumber}`);
      });
    });
  });
});
