import { describe, it, expect } from 'vitest';
import {
  calculateDevelopmentSoftCostsTotal,
  calculateDevelopmentFinancials,
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
  DevUnitStatus,
} from '@/types';

describe('Developments Pure Calculation Engine', () => {
  // Reference Sample BOQ items for construction works
  const sampleBOQ: BOQItem[] = [
    {
      id: 'boq-1',
      category: 'Plumbing & Wet Works',
      itemDescription: 'Sewer, water connections & retaining walls',
      unit: 'lump sum',
      quantity: 1,
      baselineUnitCostZAR: 350_000,
      baselineTotalZAR: 350_000,
      actualCostZAR: 350_000,
      varianceZAR: 0,
      supplierOrContractor: 'Gauteng Civils',
      status: 'Completed',
      milestonePhase: 'Deposit',
      retentionPercent: 5,
    },
    {
      id: 'boq-2',
      category: 'Roofing & Structural',
      itemDescription: 'Brickwork, concrete slabs & roof trusses',
      unit: 'm2',
      quantity: 390,
      baselineUnitCostZAR: 7_500,
      baselineTotalZAR: 2_925_000,
      actualCostZAR: 2_925_000,
      varianceZAR: 0,
      supplierOrContractor: 'Apex Builders',
      status: 'In Progress',
      milestonePhase: 'First Fix / Wet Works',
      retentionPercent: 10,
    },
  ];

  // Reference Development Soft Costs (8 itemized statutory and professional fees)
  const sampleSoftCosts: DevelopmentSoftCosts = {
    townPlannerZAR: 45_000,
    architectZAR: 120_000,
    structuralCivilEngineerZAR: 65_000,
    quantitySurveyorZAR: 50_000,
    nhbrcEnrolmentFeeZAR: 25_000,
    councilBulkContributionsZAR: 180_000, // SPLUMA Section 42
    planScrutinyAndSubdivisionFeesZAR: 35_000,
    marketingAndShowUnitZAR: 40_000,
  };

  // 6 Reference Units for Ferndale Cluster Scheme (4 for sale, 2 retained)
  const sampleUnits: DevelopmentUnit[] = [
    {
      id: 'unit-1',
      unitNumber: 'Unit 1',
      configuration: '2 Bed 2 Bath',
      floorAreaSqm: 65,
      allocatedCostBasisZAR: 1_237_500,
      listPriceVatInclZAR: 1_610_000,
      estimatedMonthlyRentZAR: 11_500,
      status: 'Sold & Transferred',
      buyerName: 'M. Ndlovu',
      depositHeldZAR: 161_000,
      conveyancerRef: 'KNS/2026/089',
      soldDate: '2026-04-01',
    },
    {
      id: 'unit-2',
      unitNumber: 'Unit 2',
      configuration: '2 Bed 2 Bath',
      floorAreaSqm: 65,
      allocatedCostBasisZAR: 1_237_500,
      listPriceVatInclZAR: 1_610_000,
      estimatedMonthlyRentZAR: 11_500,
      status: 'Bond Approved / Guarantees Issued',
      buyerName: 'J. van der Merwe',
      depositHeldZAR: 161_000,
    },
    {
      id: 'unit-3',
      unitNumber: 'Unit 3',
      configuration: '2 Bed 2 Bath',
      floorAreaSqm: 65,
      allocatedCostBasisZAR: 1_237_500,
      listPriceVatInclZAR: 1_610_000,
      estimatedMonthlyRentZAR: 11_500,
      status: 'Reserved (OTP Signed)',
      buyerName: 'S. Pillay',
      depositHeldZAR: 50_000,
    },
    {
      id: 'unit-4',
      unitNumber: 'Unit 4',
      configuration: '2 Bed 2 Bath',
      floorAreaSqm: 65,
      allocatedCostBasisZAR: 1_237_500,
      listPriceVatInclZAR: 1_610_000,
      estimatedMonthlyRentZAR: 11_500,
      status: 'Available',
    },
    {
      id: 'unit-5',
      unitNumber: 'Unit 5',
      configuration: '2 Bed 2 Bath',
      floorAreaSqm: 65,
      allocatedCostBasisZAR: 1_237_500,
      listPriceVatInclZAR: 1_610_000,
      estimatedMonthlyRentZAR: 11_500,
      status: 'Retained for Rental',
    },
    {
      id: 'unit-6',
      unitNumber: 'Unit 6',
      configuration: '2 Bed 2 Bath',
      floorAreaSqm: 65,
      allocatedCostBasisZAR: 1_237_500,
      listPriceVatInclZAR: 1_610_000,
      estimatedMonthlyRentZAR: 12_000,
      status: 'Retained for Rental',
    },
  ];

  // Comprehensive Reference Project: Ferndale 6-Unit Cluster Subdivision
  const sampleDevelopment: DevelopmentProject = {
    id: 'dev-ferndale-1',
    title: 'Ferndale 6-Unit Cluster Subdivision',
    address: '142 Main Ave, Ferndale',
    city: 'Randburg',
    province: 'Gauteng',
    investmentNodeId: 'node-randburg-1',
    developmentType: 'Subdivision & Cluster',
    isVatRegisteredDeveloper: true,
    taxEntityType: 'Company (27%)',

    // Timeline
    currentPhase: 'Feasibility',
    preApprovalMonths: 8,
    constructionMonths: 10,
    sellDownMonths: 6,

    // Cost Stack
    landPurchasePriceZAR: 1_500_000,
    acquisitionCostsZAR: 120_000,
    sec118ArrearsZAR: 45_000,
    softCosts: sampleSoftCosts,
    totalBuildableAreaSqm: 390, // 6 units * 65m2
    budgetedHardCostPerSqmZAR: 12_000,
    contingencyPercent: 10,
    boqItems: sampleBOQ,

    // Carrying & Finance
    monthlyPreApprovalHoldingBurnZAR: 15_000,
    monthlyConstructionHoldingBurnZAR: 30_000,
    developmentFacilityLimitZAR: 5_000_000,
    developmentFacilityDrawnZAR: 4_200_000,
    developmentFacilityRepaidZAR: 1_000_000,
    preSalesHurdlePercent: 60,
    linkedFundingSourceId: 'fund-nedbank-dev-1',

    // Approvals & Units
    approvals: {
      splumaRezoningSubdivision: { status: 'Approved', approvedDate: '2026-01-15' },
      sgDiagramApproval: { status: 'Approved', approvedDate: '2026-02-20' },
      municipalBuildingPlans: { status: 'Submitted', submittedDate: '2026-03-01', targetApprovalDate: '2026-04-15' },
      nhbrcEnrolment: { status: 'Not Started' },
      sectionalTitleRegister: { status: 'Not Started' },
      occupancyCertificate: { status: 'Not Started' },
    },
    units: sampleUnits,
  };

  // =========================================================================
  // 1. Soft Costs Total Calculation
  // =========================================================================
  describe('calculateDevelopmentSoftCostsTotal', () => {
    it('sums all 8 itemized municipal and professional soft costs accurately', () => {
      // 45k + 120k + 65k + 50k + 25k + 180k + 35k + 40k = 560,000
      const total = calculateDevelopmentSoftCostsTotal(sampleSoftCosts);
      expect(total).toBe(560_000);
    });

    it('returns 0 when soft costs object is null or undefined', () => {
      expect(calculateDevelopmentSoftCostsTotal(null)).toBe(0);
      expect(calculateDevelopmentSoftCostsTotal(undefined)).toBe(0);
      expect(calculateDevelopmentSoftCostsTotal({} as any)).toBe(0);
    });

    it('handles partial soft costs with missing or undefined fields without returning NaN', () => {
      const partial: Partial<DevelopmentSoftCosts> = {
        townPlannerZAR: 30_000,
        architectZAR: 80_000,
      };
      const total = calculateDevelopmentSoftCostsTotal(partial as DevelopmentSoftCosts);
      expect(total).toBe(110_000);
    });

    it('strictly respects zero-override inputs without falling back to defaults', () => {
      const zeroOverrides: DevelopmentSoftCosts = {
        townPlannerZAR: 0,
        architectZAR: 0,
        structuralCivilEngineerZAR: 0,
        quantitySurveyorZAR: 0,
        nhbrcEnrolmentFeeZAR: 0,
        councilBulkContributionsZAR: 0,
        planScrutinyAndSubdivisionFeesZAR: 0,
        marketingAndShowUnitZAR: 0,
      };
      expect(calculateDevelopmentSoftCostsTotal(zeroOverrides)).toBe(0);
    });

    it('handles floating point numbers and decimal cents accurately', () => {
      const centsSoftCosts: DevelopmentSoftCosts = {
        ...sampleSoftCosts,
        townPlannerZAR: 45_000.50,
        architectZAR: 120_000.25,
      };
      const total = calculateDevelopmentSoftCostsTotal(centsSoftCosts);
      expect(total).toBeCloseTo(560_000.75, 2);
    });
  });

  // =========================================================================
  // 2. Total Development Cost (TDC) Stack & Hard Build Mechanics
  // =========================================================================
  describe('calculateDevelopmentFinancials - Total Development Cost (TDC) Stack', () => {
    it('calculates budgeted hard build cost from total area and rate per m2', () => {
      const fin = calculateDevelopmentFinancials(sampleDevelopment);
      // 390m2 * R12,000/m2 = 4,680,000
      expect(fin.budgetedHardBuildCostZAR).toBe(4_680_000);
    });

    it('uses budgeted hard build cost when actual BOQ spend is lower (active = max)', () => {
      const fin = calculateDevelopmentFinancials(sampleDevelopment);
      // actualBoqSpend = 350,000 + 2,925,000 = 3,275,000
      expect(fin.actualBoqSpendZAR).toBe(3_275_000);
      // activeHardBuildCost = max(4,680,000, 3,275,000) = 4,680,000
      expect(fin.activeHardBuildCostZAR).toBe(4_680_000);
    });

    it('switches to actual BOQ spend when construction costs overrun the budget', () => {
      const overrunDev: DevelopmentProject = {
        ...sampleDevelopment,
        boqItems: [
          {
            ...sampleBOQ[0],
            actualCostZAR: 500_000,
          },
          {
            ...sampleBOQ[1],
            actualCostZAR: 4_750_000,
          },
        ],
      };
      const fin = calculateDevelopmentFinancials(overrunDev);
      // actualBoqSpend = 500k + 4.75M = 5,250,000 > budgeted 4,680,000
      expect(fin.actualBoqSpendZAR).toBe(5_250_000);
      expect(fin.activeHardBuildCostZAR).toBe(5_250_000);
      // Contingency recalculated on overrun active spend: 10% of 5.25M = 525,000
      expect(fin.contingencyReserveZAR).toBe(525_000);
    });

    it('handles empty BOQ items array gracefully and falls back to budgeted hard cost', () => {
      const devNoBoq: DevelopmentProject = {
        ...sampleDevelopment,
        boqItems: [],
      };
      const fin = calculateDevelopmentFinancials(devNoBoq);
      expect(fin.actualBoqSpendZAR).toBe(0);
      expect(fin.activeHardBuildCostZAR).toBe(4_680_000);
    });

    it('calculates contingency reserve as exact percentage of active hard build cost', () => {
      const fin = calculateDevelopmentFinancials(sampleDevelopment);
      // 10% of 4,680,000 = 468,000
      expect(fin.contingencyReserveZAR).toBe(468_000);

      const zeroContingencyDev: DevelopmentProject = {
        ...sampleDevelopment,
        contingencyPercent: 0,
      };
      const finZero = calculateDevelopmentFinancials(zeroContingencyDev);
      expect(finZero.contingencyReserveZAR).toBe(0);
    });

    it('aggregates pre-approval and construction carrying holding burn', () => {
      const fin = calculateDevelopmentFinancials(sampleDevelopment);
      // Pre-approval: 8 months * 15,000 = 120,000
      expect(fin.totalPreApprovalCarryingCostZAR).toBe(120_000);
      // Construction: 10 months * 30,000 = 300,000
      expect(fin.totalConstructionCarryingCostZAR).toBe(300_000);
      // Total carrying = 120k + 300k = 420,000
      expect(fin.totalCarryingCostZAR).toBe(420_000);
    });

    it('computes total land and acquisition outlay including Sec 118 arrears', () => {
      const fin = calculateDevelopmentFinancials(sampleDevelopment);
      // 1,500,000 (land) + 120,000 (acq) + 45,000 (sec118) = 1,665,000
      expect(fin.totalLandAndAcquisitionZAR).toBe(1_665_000);
    });

    it('computes Total Development Cost (TDC), TDC per m2, and TDC per unit', () => {
      const fin = calculateDevelopmentFinancials(sampleDevelopment);
      // TDC = Land/Acq(1,665,000) + Soft(560,000) + ActiveHard(4,680,000) + Contingency(468,000) + Carrying(420,000)
      //     = 7,793,000
      expect(fin.tdcZAR).toBe(7_793_000);
      // TDC per m2 = round(7,793,000 / 390) = 19,982
      expect(fin.tdcPerSqmZAR).toBe(Math.round(7_793_000 / 390));
      expect(fin.tdcPerSqmZAR).toBe(19_982);
      // TDC per unit = round(7,793,000 / 6) = 1,298,833
      expect(fin.tdcPerUnitZAR).toBe(Math.round(7_793_000 / 6));
      expect(fin.tdcPerUnitZAR).toBe(1_298_833);
    });

    it('guards against division by zero when buildable area or unit count is zero', () => {
      const zeroAreaDev: DevelopmentProject = {
        ...sampleDevelopment,
        totalBuildableAreaSqm: 0,
        units: [],
      };
      const fin = calculateDevelopmentFinancials(zeroAreaDev);
      expect(fin.tdcPerSqmZAR).toBe(0);
      expect(fin.tdcPerUnitZAR).toBe(0);
      expect(Number.isFinite(fin.tdcPerSqmZAR)).toBe(true);
      expect(Number.isFinite(fin.tdcPerUnitZAR)).toBe(true);
    });
  });

  // =========================================================================
  // 3. Gross Development Value (GDV) & South African VAT Stripping
  // =========================================================================
  describe('calculateDevelopmentFinancials - GDV & South African VAT Stripping', () => {
    it('strips 15% output VAT on sold GDV and calculates 15% claimable input VAT for VAT-registered developer', () => {
      const fin = calculateDevelopmentFinancials(sampleDevelopment);

      // Total units count = 6
      expect(fin.totalUnitsCount).toBe(6);
      // Gross GDV (VAT inclusive): 6 * 1,610,000 = 9,660,000
      expect(fin.gdvInclVatZAR).toBe(9_660_000);
      expect(fin.isVatRegisteredDeveloper).toBe(true);

      // Net Realizable GDV (excl 15% VAT): round(9,660,000 / 1.15) = 8,400,000
      expect(fin.netRealizableGdvZAR).toBe(8_400_000);
      // Output VAT stripped: 9,660,000 - 8,400,000 = 1,260,000
      expect(fin.outputVatZAR).toBe(1_260_000);

      // Claimable Input VAT on soft costs (560k) + active hard build (4.68M) = 5,240,000
      // 5,240,000 * 15% = 786,000
      expect(fin.claimableInputVatZAR).toBe(786_000);
    });

    it('preserves full gross GDV and sets VAT claims to zero for non-VAT developer', () => {
      const nonVatDev: DevelopmentProject = {
        ...sampleDevelopment,
        isVatRegisteredDeveloper: false,
      };
      const fin = calculateDevelopmentFinancials(nonVatDev);

      expect(fin.isVatRegisteredDeveloper).toBe(false);
      // Net realizable GDV remains equal to gross GDV
      expect(fin.netRealizableGdvZAR).toBe(9_660_000);
      expect(fin.outputVatZAR).toBe(0);
      expect(fin.claimableInputVatZAR).toBe(0);

      // Net profit before tax for non-VAT = 9,660,000 - 7,793,000 = 1,867,000
      expect(fin.netProfitBeforeTaxZAR).toBe(1_867_000);
    });

    it('handles zero GDV when units array is empty', () => {
      const emptyUnitsDev: DevelopmentProject = {
        ...sampleDevelopment,
        units: [],
      };
      const fin = calculateDevelopmentFinancials(emptyUnitsDev);

      expect(fin.totalUnitsCount).toBe(0);
      expect(fin.gdvInclVatZAR).toBe(0);
      expect(fin.netRealizableGdvZAR).toBe(0);
      expect(fin.outputVatZAR).toBe(0);
    });
  });

  // =========================================================================
  // 4. Profit on Cost (POC %) & 27% Corporate Tax Provision
  // =========================================================================
  describe('calculateDevelopmentFinancials - Profit on Cost (POC %) & 27% Corporate Tax', () => {
    it('calculates pre-tax POC % and 27% corporate tax provision for profitable corporate entity', () => {
      const fin = calculateDevelopmentFinancials(sampleDevelopment);

      // Net profit before tax: (Net GDV 8,400,000 + Input VAT 786,000) - TDC 7,793,000
      //                     = 9,186,000 - 7,793,000 = 1,393,000
      expect(fin.netProfitBeforeTaxZAR).toBe(1_393_000);

      // Pre-tax POC %: (1,393,000 / 7,793,000) * 100 = ~17.875%
      expect(fin.pocPercent).toBeCloseTo((1_393_000 / 7_793_000) * 100, 2);

      // 27% Corporate Tax provision: round(1,393,000 * 0.27) = 376,110
      expect(fin.estimatedTaxProvisionZAR).toBe(376_110);

      // Net profit after tax: 1,393,000 - 376,110 = 1,016,890
      expect(fin.netProfitAfterTaxZAR).toBe(1_016_890);

      // After-tax POC %: (1,016,890 / 7,793,000) * 100 = ~13.049%
      expect(fin.afterTaxPocPercent).toBeCloseTo((1_016_890 / 7_793_000) * 100, 2);
    });

    it('floors corporate tax provision to zero when project is in a deficit / loss position', () => {
      // Reduce list price so project incurs a development loss
      const lossDev: DevelopmentProject = {
        ...sampleDevelopment,
        units: sampleUnits.map((u) => ({
          ...u,
          listPriceVatInclZAR: 1_000_000, // Total GDV = 6M vs TDC = 7.793M
        })),
      };
      const fin = calculateDevelopmentFinancials(lossDev);

      // Net Realizable GDV: round(6,000,000 / 1.15) = 5,217,391
      // Total Net Revenue = 5,217,391 + 786,000 = 6,003,391
      // Net Profit Before Tax = 6,003,391 - 7,793,000 = -1,789,609
      expect(fin.netProfitBeforeTaxZAR).toBeLessThan(0);
      expect(fin.pocPercent).toBeLessThan(0);

      // Corporate tax provision must be strictly floored to R0 (no negative tax)
      expect(fin.estimatedTaxProvisionZAR).toBe(0);
      expect(fin.netProfitAfterTaxZAR).toBe(fin.netProfitBeforeTaxZAR);
      expect(fin.afterTaxPocPercent).toBe(fin.pocPercent);
    });

    it('guards POC % calculation when TDC is zero', () => {
      const zeroTdcDev: DevelopmentProject = {
        ...sampleDevelopment,
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
        boqItems: [],
        monthlyPreApprovalHoldingBurnZAR: 0,
        monthlyConstructionHoldingBurnZAR: 0,
      };
      const fin = calculateDevelopmentFinancials(zeroTdcDev);

      expect(fin.tdcZAR).toBe(0);
      expect(fin.pocPercent).toBe(0);
      expect(fin.afterTaxPocPercent).toBe(0);
      expect(Number.isFinite(fin.pocPercent)).toBe(true);
    });
  });

  // =========================================================================
  // 5. Pre-Sales Hurdle Tracking
  // =========================================================================
  describe('calculateDevelopmentFinancials - Pre-Sales Hurdle Tracking', () => {
    it('evaluates pre-sales hurdle as false when pre-sold GDV is strictly below the hurdle percentage', () => {
      // In sampleDevelopment, units 1, 2, 3 qualify (Sold, Bond Approved, Reserved)
      // 3 units * 1,610,000 = 4,830,000 out of 9,660,000 = 50.0%
      // Pre-sales hurdle is 60.0% -> NOT MET
      const fin = calculateDevelopmentFinancials(sampleDevelopment);

      expect(fin.preSoldUnitsCount).toBe(3);
      expect(fin.preSoldGdvZAR).toBe(4_830_000);
      expect(fin.preSoldGdvPercent).toBeCloseTo(50.0, 1);
      expect(fin.preSalesHurdlePercent).toBe(60);
      expect(fin.isPreSalesHurdleMet).toBe(false);
    });

    it('evaluates pre-sales hurdle as true when pre-sold GDV exactly meets the hurdle percentage', () => {
      // 5 units @ 1M each = 5M GDV. 3 units pre-sold = 3M (60.0%). Hurdle = 60%
      const exactHurdleDev: DevelopmentProject = {
        ...sampleDevelopment,
        preSalesHurdlePercent: 60,
        units: [
          { ...sampleUnits[0], listPriceVatInclZAR: 1_000_000, status: 'Sold & Transferred' },
          { ...sampleUnits[1], listPriceVatInclZAR: 1_000_000, status: 'Bond Approved / Guarantees Issued' },
          { ...sampleUnits[2], listPriceVatInclZAR: 1_000_000, status: 'Reserved (OTP Signed)' },
          { ...sampleUnits[3], listPriceVatInclZAR: 1_000_000, status: 'Available' },
          { ...sampleUnits[4], listPriceVatInclZAR: 1_000_000, status: 'Available' },
        ],
      };
      const fin = calculateDevelopmentFinancials(exactHurdleDev);

      expect(fin.preSoldGdvPercent).toBe(60);
      expect(fin.isPreSalesHurdleMet).toBe(true);
    });

    it('evaluates pre-sales hurdle as true when pre-sold GDV exceeds the hurdle percentage', () => {
      // Mark Unit 4 as Reserved so 4 out of 6 units qualify (66.67% > 60%)
      const metDev: DevelopmentProject = {
        ...sampleDevelopment,
        units: sampleUnits.map((u, i) =>
          i <= 3 ? { ...u, status: 'Reserved (OTP Signed)' } : u
        ),
      };
      const fin = calculateDevelopmentFinancials(metDev);

      expect(fin.preSoldUnitsCount).toBe(4);
      expect(fin.preSoldGdvPercent).toBeCloseTo((4 / 6) * 100, 2);
      expect(fin.isPreSalesHurdleMet).toBe(true);
    });

    it('recognizes all valid pre-sale statuses (Reserved, Bond Approved, Sold & Transferred)', () => {
      const statusesToTest: { status: DevUnitStatus; shouldCount: boolean }[] = [
        { status: 'Available', shouldCount: false },
        { status: 'Reserved (OTP Signed)', shouldCount: true },
        { status: 'Bond Approved / Guarantees Issued', shouldCount: true },
        { status: 'Sold & Transferred', shouldCount: true },
        { status: 'Retained for Rental', shouldCount: false },
      ];

      for (const { status, shouldCount } of statusesToTest) {
        const testDev: DevelopmentProject = {
          ...sampleDevelopment,
          units: [{ ...sampleUnits[0], status, listPriceVatInclZAR: 1_000_000 }],
        };
        const fin = calculateDevelopmentFinancials(testDev);
        expect(fin.preSoldUnitsCount).toBe(shouldCount ? 1 : 0);
        expect(fin.preSoldGdvZAR).toBe(shouldCount ? 1_000_000 : 0);
      }
    });

    it('evaluates as true when pre-sales hurdle is 0% (e.g. 100% build-to-rent infill)', () => {
      const buildToRentDev: DevelopmentProject = {
        ...sampleDevelopment,
        preSalesHurdlePercent: 0,
        units: sampleUnits.map((u) => ({ ...u, status: 'Retained for Rental' })),
      };
      const fin = calculateDevelopmentFinancials(buildToRentDev);

      expect(fin.preSoldUnitsCount).toBe(0);
      expect(fin.preSoldGdvPercent).toBe(0);
      expect(fin.isPreSalesHurdleMet).toBe(true); // 0 >= 0
    });
  });

  // =========================================================================
  // 6. Senior Debt Wipeout Breakeven (Integer Ceiling)
  // =========================================================================
  describe('calculateDevelopmentFinancials - Debt Wipeout Breakeven (Integer Ceiling)', () => {
    it('calculates integer ceiling of units required to wipe out outstanding development debt', () => {
      // Drawn = 4,200,000; Repaid = 1,000,000 -> Outstanding = 3,200,000
      // GDV = 9,660,000 for 6 units -> Avg price = 1,610,000
      // 3,200,000 / 1,610,000 = 1.98757... units
      // Math.ceil(1.98757...) = 2 units required
      const fin = calculateDevelopmentFinancials(sampleDevelopment);

      expect(fin.outstandingDevFacilityZAR).toBe(3_200_000);
      expect(fin.avgUnitListPriceZAR).toBe(1_610_000);
      expect(fin.unitsRequiredForDebtWipeout).toBe(2);
    });

    it('rounds up to the next integer when partial unit price is needed (Math.ceil)', () => {
      // Outstanding = 3,500,000; Avg price = 1,610,000
      // 3,500,000 / 1,610,000 = 2.1739... -> requires 3 units to extinguish debt
      const debtDev: DevelopmentProject = {
        ...sampleDevelopment,
        developmentFacilityDrawnZAR: 4_500_000,
        developmentFacilityRepaidZAR: 1_000_000,
      };
      const fin = calculateDevelopmentFinancials(debtDev);

      expect(fin.outstandingDevFacilityZAR).toBe(3_500_000);
      expect(fin.unitsRequiredForDebtWipeout).toBe(3);
    });

    it('returns 0 units required when development facility is fully repaid or zero', () => {
      const repaidDev: DevelopmentProject = {
        ...sampleDevelopment,
        developmentFacilityDrawnZAR: 4_000_000,
        developmentFacilityRepaidZAR: 4_000_000,
      };
      const fin = calculateDevelopmentFinancials(repaidDev);

      expect(fin.outstandingDevFacilityZAR).toBe(0);
      expect(fin.unitsRequiredForDebtWipeout).toBe(0);
    });

    it('floors outstanding debt to 0 if repayments exceed drawn amount', () => {
      const overRepaidDev: DevelopmentProject = {
        ...sampleDevelopment,
        developmentFacilityDrawnZAR: 3_000_000,
        developmentFacilityRepaidZAR: 3_500_000,
      };
      const fin = calculateDevelopmentFinancials(overRepaidDev);

      expect(fin.outstandingDevFacilityZAR).toBe(0);
      expect(fin.unitsRequiredForDebtWipeout).toBe(0);
    });

    it('handles zero unit list price or zero units safely without NaN', () => {
      const zeroPriceDev: DevelopmentProject = {
        ...sampleDevelopment,
        units: [],
      };
      const fin = calculateDevelopmentFinancials(zeroPriceDev);

      expect(fin.avgUnitListPriceZAR).toBe(0);
      expect(fin.unitsRequiredForDebtWipeout).toBe(0);
      expect(Number.isFinite(fin.unitsRequiredForDebtWipeout)).toBe(true);
    });
  });

  // =========================================================================
  // 7. Hybrid Split-Exit Metrics & Free-Carry
  // =========================================================================
  describe('calculateDevelopmentFinancials - Hybrid Split-Exit Metrics & Free-Carry', () => {
    it('partitions units into units for sale vs units retained for rental', () => {
      // 4 for sale (units 1..4), 2 retained for rental (units 5, 6)
      const fin = calculateDevelopmentFinancials(sampleDevelopment);

      expect(fin.unitsForSaleCount).toBe(4);
      expect(fin.unitsRetainedCount).toBe(2);
      expect(fin.unitsSoldAndTransferredCount).toBe(1); // Unit 1
    });

    it('calculates remaining debt on retained units when sold proceeds are insufficient to wipe out facility', () => {
      // Only Unit 1 is 'Sold & Transferred' @ 1,610,000
      // Outstanding debt = 3,200,000
      // Sold proceeds = 1,610,000 < debt (3,200,000)
      // Net cash proceeds after debt = 0
      // Remaining debt on retained units = 3,200,000 - 1,610,000 = 1,590,000
      const fin = calculateDevelopmentFinancials(sampleDevelopment);

      expect(fin.totalSoldProceedsZAR).toBe(1_610_000);
      expect(fin.netSalesProceedsAfterDebtZAR).toBe(0);
      expect(fin.remainingDebtOnRetainedUnitsZAR).toBe(1_590_000);
    });

    it('achieves full Free-Carry (R0 remaining debt) and generates surplus cash when sold proceeds exceed debt', () => {
      // Mark Units 1, 2, 3 as 'Sold & Transferred'
      // Sold proceeds = 3 * 1,610,000 = 4,830,000
      // Outstanding debt = 3,200,000
      // Net cash proceeds after debt = 4,830,000 - 3,200,000 = 1,630,000
      // Remaining debt on retained units = 0 (100% Free-Carry!)
      const surplusSalesDev: DevelopmentProject = {
        ...sampleDevelopment,
        units: sampleUnits.map((u, i) =>
          i <= 2 ? { ...u, status: 'Sold & Transferred' } : u
        ),
      };
      const fin = calculateDevelopmentFinancials(surplusSalesDev);

      expect(fin.unitsSoldAndTransferredCount).toBe(3);
      expect(fin.totalSoldProceedsZAR).toBe(4_830_000);
      expect(fin.netSalesProceedsAfterDebtZAR).toBe(1_630_000);
      expect(fin.remainingDebtOnRetainedUnitsZAR).toBe(0);
    });

    it('aggregates estimated monthly gross rent for retained units', () => {
      // Unit 5 rent: 11,500; Unit 6 rent: 12,000 -> Total = 23,500
      const fin = calculateDevelopmentFinancials(sampleDevelopment);
      expect(fin.retainedMonthlyGrossRentZAR).toBe(23_500);
    });
  });

  // =========================================================================
  // 8. Section 13sex Tax Shield Eligibility
  // =========================================================================
  describe('calculateDevelopmentFinancials - Section 13sex Tax Shield Eligibility', () => {
    it('evaluates isSection13SexEligible as false when fewer than 5 units are retained for rental', () => {
      // sampleDevelopment has 2 retained units < 5
      const fin = calculateDevelopmentFinancials(sampleDevelopment);
      expect(fin.unitsRetainedCount).toBe(2);
      expect(fin.isSection13SexEligible).toBe(false);

      // 4 retained units also fails
      const fourRetainedDev: DevelopmentProject = {
        ...sampleDevelopment,
        units: sampleUnits.map((u, i) =>
          i <= 3 ? { ...u, status: 'Retained for Rental' } : { ...u, status: 'Available' }
        ),
      };
      const fin4 = calculateDevelopmentFinancials(fourRetainedDev);
      expect(fin4.unitsRetainedCount).toBe(4);
      expect(fin4.isSection13SexEligible).toBe(false);
    });

    it('evaluates isSection13SexEligible as true when exactly 5 units are retained for rental', () => {
      const fiveRetainedDev: DevelopmentProject = {
        ...sampleDevelopment,
        units: sampleUnits.map((u, i) =>
          i <= 4 ? { ...u, status: 'Retained for Rental' } : { ...u, status: 'Available' }
        ),
      };
      const fin5 = calculateDevelopmentFinancials(fiveRetainedDev);
      expect(fin5.unitsRetainedCount).toBe(5);
      expect(fin5.isSection13SexEligible).toBe(true);
    });

    it('evaluates isSection13SexEligible as true when more than 5 units are retained (e.g. 10-unit infill)', () => {
      // 10-unit micro-apartment development with all units retained for rental
      const tenUnits: DevelopmentUnit[] = Array.from({ length: 10 }, (_, i) => ({
        id: `infill-unit-${i + 1}`,
        unitNumber: `A${i + 1}`,
        configuration: 'Studio Micro-Unit',
        floorAreaSqm: 28,
        allocatedCostBasisZAR: 450_000,
        listPriceVatInclZAR: 650_000,
        estimatedMonthlyRentZAR: 5_500,
        status: 'Retained for Rental',
      }));

      const infillDev: DevelopmentProject = {
        ...sampleDevelopment,
        id: 'dev-kempton-2',
        title: 'Kempton Park 10-Unit Micro-Apartment Infill',
        developmentType: 'Township Micro-Units (Infill)',
        totalBuildableAreaSqm: 280,
        units: tenUnits,
      };
      const fin10 = calculateDevelopmentFinancials(infillDev);

      expect(fin10.unitsRetainedCount).toBe(10);
      expect(fin10.isSection13SexEligible).toBe(true);
      expect(fin10.retainedMonthlyGrossRentZAR).toBe(55_000); // 10 * 5,500
    });
  });

  // =========================================================================
  // 9. Nullish, Zero & Defensive Boundary Conditions
  // =========================================================================
  describe('calculateDevelopmentFinancials - Nullish, Zero & Boundary Conditions', () => {
    it('returns a complete zero-safe financial summary when passed null or undefined', () => {
      const finNull = calculateDevelopmentFinancials(null);

      expect(finNull.tdcZAR).toBe(0);
      expect(finNull.tdcPerSqmZAR).toBe(0);
      expect(finNull.tdcPerUnitZAR).toBe(0);
      expect(finNull.gdvInclVatZAR).toBe(0);
      expect(finNull.netRealizableGdvZAR).toBe(0);
      expect(finNull.outputVatZAR).toBe(0);
      expect(finNull.claimableInputVatZAR).toBe(0);
      expect(finNull.pocPercent).toBe(0);
      expect(finNull.estimatedTaxProvisionZAR).toBe(0);
      expect(finNull.netProfitAfterTaxZAR).toBe(0);
      expect(finNull.preSoldUnitsCount).toBe(0);
      expect(finNull.isPreSalesHurdleMet).toBe(false);
      expect(finNull.outstandingDevFacilityZAR).toBe(0);
      expect(finNull.unitsRequiredForDebtWipeout).toBe(0);
      expect(finNull.unitsForSaleCount).toBe(0);
      expect(finNull.unitsRetainedCount).toBe(0);
      expect(finNull.isSection13SexEligible).toBe(false);

      const finUndefined = calculateDevelopmentFinancials(undefined);
      expect(finUndefined.tdcZAR).toBe(0);
    });

    it('handles large multi-unit development schemes deterministically', () => {
      // 50-unit scheme
      const fiftyUnits: DevelopmentUnit[] = Array.from({ length: 50 }, (_, i) => ({
        id: `dev-unit-${i + 1}`,
        unitNumber: `U${i + 1}`,
        configuration: '2 Bed 1 Bath',
        floorAreaSqm: 55,
        allocatedCostBasisZAR: 800_000,
        listPriceVatInclZAR: 1_150_000,
        estimatedMonthlyRentZAR: 8_500,
        status: i < 30 ? 'Sold & Transferred' : 'Retained for Rental',
      }));

      const largeDev: DevelopmentProject = {
        ...sampleDevelopment,
        totalBuildableAreaSqm: 2_750,
        budgetedHardCostPerSqmZAR: 10_000,
        units: fiftyUnits,
        developmentFacilityDrawnZAR: 25_000_000,
        developmentFacilityRepaidZAR: 10_000_000,
      };

      const finLarge = calculateDevelopmentFinancials(largeDev);
      expect(finLarge.totalUnitsCount).toBe(50);
      expect(finLarge.unitsSoldAndTransferredCount).toBe(30);
      expect(finLarge.unitsRetainedCount).toBe(20);
      expect(finLarge.isSection13SexEligible).toBe(true); // 20 >= 5
      expect(finLarge.gdvInclVatZAR).toBe(50 * 1_150_000);
      expect(finLarge.outstandingDevFacilityZAR).toBe(15_000_000);
    });

    it('handles zero buildable area and zero land cost without crashing', () => {
      const minimalDev: DevelopmentProject = {
        ...sampleDevelopment,
        landPurchasePriceZAR: 0,
        acquisitionCostsZAR: 0,
        sec118ArrearsZAR: 0,
        totalBuildableAreaSqm: 0,
        budgetedHardCostPerSqmZAR: 0,
        boqItems: [],
        monthlyPreApprovalHoldingBurnZAR: 0,
        monthlyConstructionHoldingBurnZAR: 0,
      };

      const fin = calculateDevelopmentFinancials(minimalDev);
      expect(fin.budgetedHardBuildCostZAR).toBe(0);
      expect(fin.activeHardBuildCostZAR).toBe(0);
      expect(fin.totalCarryingCostZAR).toBe(0);
      expect(fin.tdcPerSqmZAR).toBe(0);
    });
  });

  // =========================================================================
  // 10. Milestone 3 Forensic Remediation — New Summary Fields & Pure Helpers
  // =========================================================================
  describe('Milestone 3 Remediation — New Fields and Pure Deterministic Helpers', () => {
    it('computes all 11 new fields in DevelopmentFinancialSummary accurately', () => {
      const fin = calculateDevelopmentFinancials(sampleDevelopment);

      // 1. actualBoqSpendPerSqmZAR = round(actualBoqSpendZAR / totalBuildableAreaSqm)
      expect(fin.actualBoqSpendPerSqmZAR).toBe(
        Math.round(fin.actualBoqSpendZAR / sampleDevelopment.totalBuildableAreaSqm)
      );
      expect(fin.actualBoqSpendPerSqmZAR).toBe(8_397);

      // 2. softCostsPercentOfTdc = (totalSoftCostsZAR / tdcZAR) * 100
      expect(fin.softCostsPercentOfTdc).toBeCloseTo(
        (fin.totalSoftCostsZAR / fin.tdcZAR) * 100,
        5
      );

      // 3. totalHoldingAndContingencyZAR = totalCarryingCostZAR + contingencyReserveZAR
      expect(fin.totalHoldingAndContingencyZAR).toBe(
        fin.totalCarryingCostZAR + fin.contingencyReserveZAR
      );

      // 4. availableFacilityUndrawnZAR = max(0, limit - drawn) = 5M - 4.2M = 800k
      expect(fin.availableFacilityUndrawnZAR).toBe(800_000);

      // 5. preSalesHurdleProgressRatioPercent = min(100, round((preSoldGdvPercent / hurdlePercent) * 100))
      expect(fin.preSalesHurdleProgressRatioPercent).toBe(83);

      // 6. debtFacilityRepaidPercent = min(100, round((1M / 4.2M) * 100)) = 24
      expect(fin.debtFacilityRepaidPercent).toBe(24);

      // 7. unencumberedUnitsCount = max(0, totalUnitsCount - unitsRequiredForDebtWipeout)
      // total = 6, wipeout = 2 (debt 3.2M / avg price 1.61M = 2) -> unencumbered = 4
      expect(fin.unencumberedUnitsCount).toBe(4);

      // 8. totalFloorAreaSqm = 6 * 65 = 390
      expect(fin.totalFloorAreaSqm).toBe(390);

      // 9. totalAllocatedCostBasisZAR = 6 * 1,237,500 = 7,425,000
      expect(fin.totalAllocatedCostBasisZAR).toBe(7_425_000);

      // 10. totalMonthlyEstimatedRentZAR = 5 * 11,500 + 12,000 = 69,500
      expect(fin.totalMonthlyEstimatedRentZAR).toBe(69_500);

      // 11. unitsNeededForSection13Sex = max(0, 5 - 2) = 3
      expect(fin.unitsNeededForSection13Sex).toBe(3);
    });

    it('calculateBOQItemTotals computes baselineTotalZAR and varianceZAR accurately', () => {
      // Standard positive values
      const res1 = calculateBOQItemTotals(10, 2500, 28000);
      expect(res1.baselineTotalZAR).toBe(25_000);
      expect(res1.varianceZAR).toBe(3_000);

      // Favorable variance (cost savings)
      const res2 = calculateBOQItemTotals(5, 1000, 4500);
      expect(res2.baselineTotalZAR).toBe(5_000);
      expect(res2.varianceZAR).toBe(-500);

      // Missing / zero fallbacks
      const res3 = calculateBOQItemTotals(0, 0, 0);
      expect(res3.baselineTotalZAR).toBe(0);
      expect(res3.varianceZAR).toBe(0);
    });

    it('calculateDevelopmentHoldingSensitivity encapsulates delay sensitivity analysis', () => {
      const matrix = calculateDevelopmentHoldingSensitivity(sampleDevelopment);
      expect(matrix).toBeDefined();
      expect(matrix.monthlyHoldingBurnZAR).toBeGreaterThan(0);
      expect(matrix.scenarios.length).toBeGreaterThan(0);
      expect(matrix.zeroMarginDelayDays).toBeGreaterThan(0);
    });

    it('calculateApprovalsProgress determines completion counts and Stage 1 unlocked state', () => {
      // Sample dev has SPLUMA and SG Diagram approved, Municipal Building Plans submitted -> Stage 1 locked
      const resLocked = calculateApprovalsProgress(sampleDevelopment.approvals, 6);
      expect(resLocked.approvedCount).toBe(2);
      expect(resLocked.totalItems).toBe(6);
      expect(resLocked.progressPercent).toBe(33);
      expect(resLocked.isStage1Approved).toBe(false);

      // Fully approved Stage 1
      const stage1FullyApproved = {
        splumaRezoningSubdivision: { status: 'Approved' as const },
        sgDiagramApproval: { status: 'Approved' as const },
        municipalBuildingPlans: { status: 'Approved' as const },
        nhbrcEnrolment: { status: 'Approved' as const },
        sectionalTitleRegister: { status: 'Not Started' as const },
        occupancyCertificate: { status: 'Not Started' as const },
      };
      const resUnlocked = calculateApprovalsProgress(stage1FullyApproved, 6);
      expect(resUnlocked.approvedCount).toBe(4);
      expect(resUnlocked.progressPercent).toBe(67);
      expect(resUnlocked.isStage1Approved).toBe(true);

      // Handles null or empty approvals safely
      const resNull = calculateApprovalsProgress(null);
      expect(resNull.approvedCount).toBe(0);
      expect(resNull.progressPercent).toBe(0);
      expect(resNull.isStage1Approved).toBe(false);
    });

    it('calculateIncreasedAmount safely adds deltas with null fallbacks', () => {
      expect(calculateIncreasedAmount(1_000_000, 500_000)).toBe(1_500_000);
      expect(calculateIncreasedAmount(null, 500_000)).toBe(500_000);
      expect(calculateIncreasedAmount(1_000_000, null)).toBe(1_000_000);
      expect(calculateIncreasedAmount(undefined, undefined)).toBe(0);
    });
  });
});
