/**
 * South African Property Portfolio Hub — Empirical UI Math Verification Suite
 * Milestone 3: Financial Presentation & Boundary Fidelity Testing
 * 
 * Verifies exact parity between pure calculations engine (developments.ts, holdingSensitivity.ts)
 * and rendered UI presentation (DevelopmentKpiBanner, DevelopmentFinanceTab, DevelopmentCostStackTab, DevelopmentApprovalsTab).
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { DevelopmentKpiBanner } from '../DevelopmentKpiBanner';
import { DevelopmentFinanceTab } from '../DevelopmentFinanceTab';
import { DevelopmentCostStackTab } from '../DevelopmentCostStackTab';
import { DevelopmentApprovalsTab } from '../DevelopmentApprovalsTab';
import {
  DevelopmentProject,
  DevelopmentUnit,
  PreConstructionApprovals,
  DevelopmentSoftCosts,
  BOQItem,
} from '@/types';
import {
  calculateDevelopmentFinancials,
  calculateDevelopmentSoftCostsTotal,
  DevelopmentFinancialSummary,
} from '@/lib/calculations/developments';
import {
  calculateDelaySensitivityMatrix,
  calculateZeroMarginDelayDays,
} from '@/lib/calculations/holdingSensitivity';
import { formatZAR, formatPercent } from '@/lib/formatters';

vi.mock('next/navigation', () => ({
  usePathname: () => '/developments',
}));

// Helper to strip React SSR comments (e.g. <!-- -->) inserted between adjacent JSX text nodes
const cleanHtml = (html: string): string => html.replace(/<!--[\s\S]*?-->/g, '');

// Helper generator to construct fully typed, realistic South African developments
function createFixtureDevelopment(
  overrides?: Partial<DevelopmentProject>
): DevelopmentProject {
  const units: DevelopmentUnit[] = [
    {
      id: 'u-1',
      unitNumber: 'Unit 1',
      configuration: '2 Bed 1 Bath',
      floorAreaSqm: 65,
      allocatedCostBasisZAR: 650000,
      listPriceVatInclZAR: 1600000,
      estimatedMonthlyRentZAR: 10500,
      status: 'Sold & Transferred',
      buyerName: 'Kagiso Rabada',
    },
    {
      id: 'u-2',
      unitNumber: 'Unit 2',
      configuration: '2 Bed 1 Bath',
      floorAreaSqm: 65,
      allocatedCostBasisZAR: 650000,
      listPriceVatInclZAR: 1600000,
      estimatedMonthlyRentZAR: 10500,
      status: 'Bond Approved / Guarantees Issued',
      buyerName: 'Dean Elgar',
    },
    {
      id: 'u-3',
      unitNumber: 'Unit 3',
      configuration: '3 Bed 2 Bath',
      floorAreaSqm: 85,
      allocatedCostBasisZAR: 820000,
      listPriceVatInclZAR: 1950000,
      estimatedMonthlyRentZAR: 14000,
      status: 'Reserved (OTP Signed)',
      buyerName: 'Temba Bavuma',
    },
    {
      id: 'u-4',
      unitNumber: 'Unit 4',
      configuration: '3 Bed 2 Bath',
      floorAreaSqm: 85,
      allocatedCostBasisZAR: 820000,
      listPriceVatInclZAR: 1950000,
      estimatedMonthlyRentZAR: 14000,
      status: 'Available',
    },
    {
      id: 'u-5',
      unitNumber: 'Unit 5',
      configuration: '2 Bed 1 Bath',
      floorAreaSqm: 65,
      allocatedCostBasisZAR: 650000,
      listPriceVatInclZAR: 1600000,
      estimatedMonthlyRentZAR: 10500,
      status: 'Retained for Rental',
    },
    {
      id: 'u-6',
      unitNumber: 'Unit 6',
      configuration: '2 Bed 1 Bath',
      floorAreaSqm: 65,
      allocatedCostBasisZAR: 650000,
      listPriceVatInclZAR: 1600000,
      estimatedMonthlyRentZAR: 10500,
      status: 'Retained for Rental',
    },
  ];

  const softCosts: DevelopmentSoftCosts = {
    townPlannerZAR: 50000,
    architectZAR: 90000,
    structuralCivilEngineerZAR: 60000,
    quantitySurveyorZAR: 40000,
    nhbrcEnrolmentFeeZAR: 45000,
    councilBulkContributionsZAR: 130000,
    planScrutinyAndSubdivisionFeesZAR: 30000,
    marketingAndShowUnitZAR: 35000,
  };

  const boqItems: BOQItem[] = [
    {
      id: 'boq-1',
      category: 'Demolition & Prep',
      itemDescription: 'Site clearance and bulk excavations',
      unit: 'm3',
      quantity: 500,
      baselineUnitCostZAR: 180,
      baselineTotalZAR: 90000,
      actualCostZAR: 95000,
      varianceZAR: 5000,
      supplierOrContractor: 'Gauteng Earthworks',
      status: 'Completed',
    },
    {
      id: 'boq-2',
      category: 'Roofing & Structural',
      itemDescription: 'Raft foundation and concrete ground slabs',
      unit: 'm2',
      quantity: 430,
      baselineUnitCostZAR: 1400,
      baselineTotalZAR: 602000,
      actualCostZAR: 602000,
      varianceZAR: 0,
      supplierOrContractor: 'Afrisam Concrete',
      status: 'In Progress',
    },
  ];

  const approvals: PreConstructionApprovals = {
    splumaRezoningSubdivision: { status: 'Approved', approvedDate: '2026-07-01' },
    sgDiagramApproval: { status: 'Approved', approvedDate: '2026-08-15' },
    municipalBuildingPlans: { status: 'Approved', approvedDate: '2026-09-10' },
    nhbrcEnrolment: { status: 'Approved', approvedDate: '2026-10-01' },
    sectionalTitleRegister: { status: 'Submitted', targetApprovalDate: '2026-12-01' },
    occupancyCertificate: { status: 'Not Started' },
  };

  return {
    id: 'dev-empirical-1',
    title: 'Bryanston Infill Clusters',
    address: '42 Hobart Road, Bryanston',
    city: 'Johannesburg',
    province: 'Gauteng',
    developmentType: 'Sectional Title Apartments',
    isVatRegisteredDeveloper: true,
    taxEntityType: 'Company (27%)',
    currentPhase: 'Superstructure',
    preApprovalMonths: 6,
    constructionMonths: 10,
    sellDownMonths: 4,
    landPurchasePriceZAR: 1950000,
    acquisitionCostsZAR: 110000,
    sec118ArrearsZAR: 0,
    softCosts,
    totalBuildableAreaSqm: 430,
    budgetedHardCostPerSqmZAR: 9800,
    contingencyPercent: 7.5,
    boqItems,
    monthlyPreApprovalHoldingBurnZAR: 12000,
    monthlyConstructionHoldingBurnZAR: 18500,
    developmentFacilityLimitZAR: 5000000,
    developmentFacilityDrawnZAR: 3200000,
    developmentFacilityRepaidZAR: 980000,
    preSalesHurdlePercent: 50,
    approvals,
    units,
    notes: 'Empirical challenge baseline project',
    createdAt: '2026-01-01',
    ...overrides,
  };
}

describe('Empirical Financial Presentation & Calculation Fidelity Challenge', () => {
  // =========================================================================
  // CHALLENGE 1: Exact Match of Rendered Currency Values
  // =========================================================================
  describe('1. Exact Match of Rendered Currency Values against calculateDevelopmentFinancials', () => {
    it('accurately renders TDC, TDC/m², TDC/unit, and GDV in DevelopmentKpiBanner', () => {
      const dev = createFixtureDevelopment();
      const financials = calculateDevelopmentFinancials(dev);

      const html = cleanHtml(
        renderToString(<DevelopmentKpiBanner development={dev} financials={financials} />)
      );

      // Verify Total Development Cost
      expect(html).toContain(formatZAR(financials.tdcZAR));
      expect(html).toContain(`${formatZAR(financials.tdcPerSqmZAR)}/m²`);
      expect(html).toContain(`${formatZAR(financials.tdcPerUnitZAR)}/unit`);

      // Verify Gross Development Value
      expect(html).toContain(formatZAR(financials.gdvInclVatZAR));

      // Verify Pre-sales & Debt wipeout numbers
      expect(html).toContain(`${financials.preSoldUnitsCount}/${financials.totalUnitsCount} Units`);
      expect(html).toContain(formatPercent(financials.preSoldGdvPercent));
      expect(html).toContain(formatPercent(dev.preSalesHurdlePercent));
      expect(html).toContain(`Wipeout: ${financials.unitsRequiredForDebtWipeout} units required`);

      // Verify Split-exit metrics
      expect(html).toContain(
        `${financials.unitsSoldAndTransferredCount} Sold • ${financials.unitsRetainedCount} Retained`
      );
      expect(html).toContain(formatZAR(financials.retainedMonthlyGrossRentZAR));
    });

    it('accurately renders Senior Debt Facility, Pre-Sales Hurdle, and Debt Wipeout waterfall in DevelopmentFinanceTab', () => {
      const dev = createFixtureDevelopment();
      const financials = calculateDevelopmentFinancials(dev);

      const html = cleanHtml(
        renderToString(
          <DevelopmentFinanceTab
            development={dev}
            financials={financials}
            onUpdateDevelopment={vi.fn()}
          />
        )
      );

      // Card 1: Facility Health
      expect(html).toContain(formatZAR(financials.outstandingDevFacilityZAR));
      expect(html).toContain(formatZAR(dev.developmentFacilityLimitZAR));
      expect(html).toContain(formatZAR(dev.developmentFacilityDrawnZAR));
      expect(html).toContain(formatZAR(dev.developmentFacilityRepaidZAR));
      const undrawn = Math.max(0, dev.developmentFacilityLimitZAR - dev.developmentFacilityDrawnZAR);
      expect(html).toContain(formatZAR(undrawn));

      // Card 2: Pre-sales Bank Gate
      expect(html).toContain(formatPercent(financials.preSoldGdvPercent));
      expect(html).toContain(formatZAR(financials.preSoldGdvZAR));
      expect(html).toContain(formatPercent(dev.preSalesHurdlePercent));
      expect(html).toContain(
        `${financials.preSoldUnitsCount} of ${financials.totalUnitsCount} units contracted`
      );

      // Card 3: Debt Wipeout Breakeven
      expect(html).toContain(`${financials.unitsRequiredForDebtWipeout} Units`);
      expect(html).toContain(formatZAR(financials.avgUnitListPriceZAR));
      expect(html).toContain(formatZAR(financials.outstandingDevFacilityZAR));
      const surplus = Math.max(0, financials.totalUnitsCount - financials.unitsRequiredForDebtWipeout);
      expect(html).toContain(`${surplus} Units`);

      // Waterfall Grid: exact number of Debt Extinguishers vs Free-Carry
      expect(financials.unitsRequiredForDebtWipeout).toBeGreaterThan(0);
      expect(html).toContain(`Debt #${financials.unitsRequiredForDebtWipeout}`);
      expect(html).toContain('Free-Carry');
    });

    it('accurately renders Land, Soft Costs, Active Hard Build, and Carrying Burn in DevelopmentCostStackTab', () => {
      // Scenario where BOQ spend exceeds budgeted build cost
      const dev = createFixtureDevelopment({
        budgetedHardCostPerSqmZAR: 8000,
        totalBuildableAreaSqm: 100, // Budget = 800,000
        sec118ArrearsZAR: 45000,
        boqItems: [
          {
            id: 'boq-heavy',
            category: 'Plumbing & Wet Works',
            itemDescription: 'Full plumbing overhaul and water main',
            unit: 'sum',
            quantity: 1,
            baselineUnitCostZAR: 950000,
            baselineTotalZAR: 950000,
            actualCostZAR: 980000, // Actual > Budget
            varianceZAR: 30000,
            status: 'Completed',
            supplierOrContractor: 'PlumbRite SA',
          },
        ],
      });
      const financials = calculateDevelopmentFinancials(dev);

      // Active hard build cost must strictly take max(budget, actual BOQ)
      expect(financials.budgetedHardBuildCostZAR).toBe(800000);
      expect(financials.actualBoqSpendZAR).toBe(980000);
      expect(financials.activeHardBuildCostZAR).toBe(980000);

      const html = cleanHtml(
        renderToString(
          <DevelopmentCostStackTab
            development={dev}
            financials={financials}
            onUpdateSoftCosts={vi.fn()}
            onUpdateDevelopment={vi.fn()}
            onUpdateBOQItem={vi.fn()}
            onDeleteBOQItem={vi.fn()}
          />
        )
      );

      expect(html).toContain(formatZAR(financials.totalLandAndAcquisitionZAR));
      expect(html).toContain(`Sec 118 Arrears: ${formatZAR(dev.sec118ArrearsZAR)}`);
      expect(html).toContain(formatZAR(financials.totalSoftCostsZAR));
      expect(html).toContain(formatZAR(financials.activeHardBuildCostZAR));
      expect(html).toContain(formatZAR(financials.budgetedHardBuildCostZAR));
      expect(html).toContain(formatZAR(financials.actualBoqSpendZAR));
      expect(html).toContain(formatZAR(financials.totalCarryingCostZAR));
      expect(html).toContain(formatZAR(financials.contingencyReserveZAR));
      expect(html).toContain(formatZAR(financials.totalCarryingCostZAR + financials.contingencyReserveZAR));
    });

    it('correctly handles zero-drawn senior debt facility (zero debt wipeout units)', () => {
      const dev = createFixtureDevelopment({
        developmentFacilityDrawnZAR: 0,
        developmentFacilityRepaidZAR: 0,
      });
      const financials = calculateDevelopmentFinancials(dev);

      expect(financials.outstandingDevFacilityZAR).toBe(0);
      expect(financials.unitsRequiredForDebtWipeout).toBe(0);

      const html = cleanHtml(
        renderToString(
          <DevelopmentFinanceTab
            development={dev}
            financials={financials}
            onUpdateDevelopment={vi.fn()}
          />
        )
      );

      expect(html).toContain('0 Units');
      expect(html).toContain('Unencumbered Surplus:');
      expect(html).toContain(`${financials.totalUnitsCount} Units`);
      // Since unitsRequiredForDebtWipeout is 0, no unit should have Debt # badge
      expect(html).not.toContain('Debt #1');
      expect(html).toContain('Free-Carry');
    });

    it('correctly handles overdrawn facility exceeding total GDV (100% units needed for debt)', () => {
      // Extremely high debt: R 20,000,000 drawn against R 10.3M GDV (6 units @ avg ~1.716M)
      const dev = createFixtureDevelopment({
        developmentFacilityLimitZAR: 25000000,
        developmentFacilityDrawnZAR: 20000000,
        developmentFacilityRepaidZAR: 0,
      });
      const financials = calculateDevelopmentFinancials(dev);

      expect(financials.outstandingDevFacilityZAR).toBe(20000000);
      expect(financials.unitsRequiredForDebtWipeout).toBeGreaterThan(financials.totalUnitsCount);

      const html = cleanHtml(
        renderToString(
          <DevelopmentFinanceTab
            development={dev}
            financials={financials}
            onUpdateDevelopment={vi.fn()}
          />
        )
      );

      // Unencumbered surplus must not be negative
      expect(html).toContain('Unencumbered Surplus:');
      expect(html).toContain('0 Units');
      // All 6 units are debt extinguishers
      expect(html).toContain('Debt #1');
      expect(html).toContain('Debt #6');
    });
  });

  // =========================================================================
  // CHALLENGE 2: Profit on Cost (POC %) Styling & Boundary Conditions
  // =========================================================================
  describe('2. Profit on Cost (POC %) Dynamic Styling & Boundary Conditions', () => {
    it('renders Emerald badge and border when POC >= 20.0%', () => {
      const devHighMargin = createFixtureDevelopment();
      const financialsHigh = calculateDevelopmentFinancials(devHighMargin);

      // Boundary: exact 20.0%
      const boundary20Financials: DevelopmentFinancialSummary = {
        ...financialsHigh,
        pocPercent: 20.0,
      };

      const html20 = cleanHtml(
        renderToString(
          <DevelopmentKpiBanner development={devHighMargin} financials={boundary20Financials} />
        )
      );

      expect(html20).toContain('text-emerald-700 bg-emerald-50 border-emerald-200');
      expect(html20).toContain('border-emerald-200');
      expect(html20).toContain('20.0%');

      // 32.5% margin
      const boundary32Financials: DevelopmentFinancialSummary = {
        ...financialsHigh,
        pocPercent: 32.5,
      };
      const html32 = cleanHtml(
        renderToString(
          <DevelopmentKpiBanner development={devHighMargin} financials={boundary32Financials} />
        )
      );
      expect(html32).toContain('text-emerald-700 bg-emerald-50 border-emerald-200');
      expect(html32).toContain('border-emerald-200');
      expect(html32).toContain('32.5%');
    });

    it('renders Amber badge and border when POC is between 12.0% and 19.9%', () => {
      const dev = createFixtureDevelopment();
      const baseFinancials = calculateDevelopmentFinancials(dev);

      // Upper boundary: 19.9%
      const upperAmberFinancials: DevelopmentFinancialSummary = {
        ...baseFinancials,
        pocPercent: 19.9,
      };
      const htmlUpper = cleanHtml(
        renderToString(
          <DevelopmentKpiBanner development={dev} financials={upperAmberFinancials} />
        )
      );
      expect(htmlUpper).toContain('text-amber-700 bg-amber-50 border-amber-200');
      expect(htmlUpper).toContain('border-amber-200');
      expect(htmlUpper).toContain('19.9%');

      // Mid-range: 15.0%
      const midAmberFinancials: DevelopmentFinancialSummary = {
        ...baseFinancials,
        pocPercent: 15.0,
      };
      const htmlMid = cleanHtml(
        renderToString(
          <DevelopmentKpiBanner development={dev} financials={midAmberFinancials} />
        )
      );
      expect(htmlMid).toContain('text-amber-700 bg-amber-50 border-amber-200');
      expect(htmlMid).toContain('border-amber-200');
      expect(htmlMid).toContain('15.0%');

      // Lower boundary: 12.0%
      const lowerAmberFinancials: DevelopmentFinancialSummary = {
        ...baseFinancials,
        pocPercent: 12.0,
      };
      const htmlLower = cleanHtml(
        renderToString(
          <DevelopmentKpiBanner development={dev} financials={lowerAmberFinancials} />
        )
      );
      expect(htmlLower).toContain('text-amber-700 bg-amber-50 border-amber-200');
      expect(htmlLower).toContain('border-amber-200');
      expect(htmlLower).toContain('12.0%');
    });

    it('renders Rose badge and border when POC < 12.0%, including zero and negative margins', () => {
      const dev = createFixtureDevelopment();
      const baseFinancials = calculateDevelopmentFinancials(dev);

      // Upper boundary of Rose: 11.9%
      const sub12Financials: DevelopmentFinancialSummary = {
        ...baseFinancials,
        pocPercent: 11.9,
      };
      const html119 = cleanHtml(
        renderToString(
          <DevelopmentKpiBanner development={dev} financials={sub12Financials} />
        )
      );
      expect(html119).toContain('text-rose-700 bg-rose-50 border-rose-200');
      expect(html119).toContain('border-rose-200');
      expect(html119).toContain('11.9%');

      // Breakeven / Zero POC: 0.0%
      const zeroFinancials: DevelopmentFinancialSummary = {
        ...baseFinancials,
        pocPercent: 0.0,
        netProfitBeforeTaxZAR: 0,
      };
      const htmlZero = cleanHtml(
        renderToString(
          <DevelopmentKpiBanner development={dev} financials={zeroFinancials} />
        )
      );
      expect(htmlZero).toContain('text-rose-700 bg-rose-50 border-rose-200');
      expect(htmlZero).toContain('border-rose-200');
      expect(htmlZero).toContain('0.0%');

      // Loss-making / Negative margin: -15.4%
      const lossFinancials: DevelopmentFinancialSummary = {
        ...baseFinancials,
        pocPercent: -15.4,
        netProfitBeforeTaxZAR: -850000,
      };
      const htmlLoss = cleanHtml(
        renderToString(
          <DevelopmentKpiBanner development={dev} financials={lossFinancials} />
        )
      );
      expect(htmlLoss).toContain('text-rose-700 bg-rose-50 border-rose-200');
      expect(htmlLoss).toContain('border-rose-200');
      expect(htmlLoss).toContain('-15.4%');
      expect(htmlLoss).toContain(formatZAR(-850000));
    });

    it('dynamically switches color styling across boundaries when after-tax provision is applied', () => {
      // Scenario where Pre-Tax POC is 23.5% (Emerald >= 20%),
      // but After-Tax POC is 17.155% (Amber 12-19.9%)
      const dev = createFixtureDevelopment();
      const baseFinancials = calculateDevelopmentFinancials(dev);

      const crossBoundaryFinancials: DevelopmentFinancialSummary = {
        ...baseFinancials,
        pocPercent: 23.5,
        afterTaxPocPercent: 17.155,
      };

      // In Pre-Tax mode (showAfterTax = false) -> Emerald
      const htmlPreTax = cleanHtml(
        renderToString(
          <DevelopmentKpiBanner
            development={dev}
            financials={crossBoundaryFinancials}
            showAfterTax={false}
          />
        )
      );
      expect(htmlPreTax).toContain('border-emerald-200');
      expect(htmlPreTax).toContain('text-emerald-700 bg-emerald-50 border-emerald-200');
      expect(htmlPreTax).toContain('23.5%');
      expect(htmlPreTax).toContain('Pre-Tax');

      // In After-Tax mode (showAfterTax = true) -> Amber
      const htmlAfterTax = cleanHtml(
        renderToString(
          <DevelopmentKpiBanner
            development={dev}
            financials={crossBoundaryFinancials}
            showAfterTax={true}
          />
        )
      );
      expect(htmlAfterTax).toContain('border-amber-200');
      expect(htmlAfterTax).toContain('text-amber-700 bg-amber-50 border-amber-200');
      expect(htmlAfterTax).toContain('17.2%');
      expect(htmlAfterTax).toContain('After Tax');
    });
  });

  // =========================================================================
  // CHALLENGE 3: 27% Corporate Tax Provision Toggle Behavior
  // =========================================================================
  describe('3. 27% Corporate Tax Provision Toggle Behavior', () => {
    it('correctly toggles between pre-tax and after-tax values and button states', () => {
      const dev = createFixtureDevelopment();
      const financials = calculateDevelopmentFinancials(dev);

      // 1. Pre-Tax mode
      const htmlPreTax = cleanHtml(
        renderToString(
          <DevelopmentKpiBanner
            development={dev}
            financials={financials}
            showAfterTax={false}
          />
        )
      );
      expect(htmlPreTax).toContain(formatPercent(financials.pocPercent));
      expect(htmlPreTax).toContain(formatZAR(financials.netProfitBeforeTaxZAR));
      expect(htmlPreTax).toContain('Pre-Tax');
      expect(htmlPreTax).toContain('Apply 27% Tax');

      // 2. After-Tax mode
      const htmlAfterTax = cleanHtml(
        renderToString(
          <DevelopmentKpiBanner
            development={dev}
            financials={financials}
            showAfterTax={true}
          />
        )
      );
      expect(htmlAfterTax).toContain(formatPercent(financials.afterTaxPocPercent));
      expect(htmlAfterTax).toContain(formatZAR(financials.netProfitAfterTaxZAR));
      expect(htmlAfterTax).toContain('After Tax');
      expect(htmlAfterTax).toContain('Switch to Pre-Tax');
    });

    it('verifies pure calculation fidelity of 27% Corporate Tax provision', () => {
      const dev = createFixtureDevelopment();
      const financials = calculateDevelopmentFinancials(dev);

      // For profitable developments, tax provision is exactly 27%
      expect(financials.netProfitBeforeTaxZAR).toBeGreaterThan(0);
      expect(financials.taxEntityType).toBe('Company (27%)');
      expect(financials.effectiveTaxRatePercent).toBe(27);

      const expectedTax = Math.round(financials.netProfitBeforeTaxZAR * 0.27);
      expect(financials.estimatedTaxProvisionZAR).toBe(expectedTax);
      expect(financials.netProfitAfterTaxZAR).toBe(
        financials.netProfitBeforeTaxZAR - expectedTax
      );
      const expectedAfterTaxPoc = (financials.netProfitAfterTaxZAR / financials.tdcZAR) * 100;
      expect(financials.afterTaxPocPercent).toBeCloseTo(expectedAfterTaxPoc, 5);
    });

    it('handles alternative tax entity types: Trust (45%) and Individual (45%)', () => {
      const trustDev = createFixtureDevelopment({ taxEntityType: 'Trust' });
      const individualDev = createFixtureDevelopment({ taxEntityType: 'Individual' });

      const trustFin = calculateDevelopmentFinancials(trustDev);
      const indFin = calculateDevelopmentFinancials(individualDev);

      expect(trustFin.effectiveTaxRatePercent).toBe(45);
      expect(indFin.effectiveTaxRatePercent).toBe(45);

      const expectedTrustTax = Math.round(trustFin.netProfitBeforeTaxZAR * 0.45);
      expect(trustFin.estimatedTaxProvisionZAR).toBe(expectedTrustTax);
      expect(trustFin.netProfitAfterTaxZAR).toBe(trustFin.netProfitBeforeTaxZAR - expectedTrustTax);
    });

    it('handles negative profit (loss-making development) with R0 tax provision', () => {
      // Overprice land and build to make development loss-making
      const lossDev = createFixtureDevelopment({
        landPurchasePriceZAR: 10000000,
        budgetedHardCostPerSqmZAR: 20000,
      });
      const financials = calculateDevelopmentFinancials(lossDev);

      expect(financials.netProfitBeforeTaxZAR).toBeLessThan(0);
      expect(financials.estimatedTaxProvisionZAR).toBe(0);
      expect(financials.netProfitAfterTaxZAR).toBe(financials.netProfitBeforeTaxZAR);
      expect(financials.afterTaxPocPercent).toBe(financials.pocPercent);

      const html = cleanHtml(
        renderToString(
          <DevelopmentKpiBanner
            development={lossDev}
            financials={financials}
            showAfterTax={true}
          />
        )
      );

      // In loss scenario, after-tax profit is identical to pre-tax loss
      expect(html).toContain(formatZAR(financials.netProfitAfterTaxZAR));
      expect(html).toContain(formatPercent(financials.afterTaxPocPercent));
    });
  });

  // =========================================================================
  // CHALLENGE 4: VAT Registered vs Non-VAT Registered Fidelity
  // =========================================================================
  describe('4. VAT Registered vs Non-VAT Registered Presentation Fidelity', () => {
    it('renders 15% VAT • R0 Buyer Duty badge for VAT registered developers', () => {
      const vatDev = createFixtureDevelopment({ isVatRegisteredDeveloper: true });
      const financials = calculateDevelopmentFinancials(vatDev);

      const html = cleanHtml(
        renderToString(<DevelopmentKpiBanner development={vatDev} financials={financials} />)
      );

      expect(html).toContain('15% VAT • R0 Buyer Duty');
      expect(html).not.toContain('Direct / Non-VAT');
    });

    it('renders Direct / Non-VAT badge for non-VAT developers', () => {
      const nonVatDev = createFixtureDevelopment({ isVatRegisteredDeveloper: false });
      const financials = calculateDevelopmentFinancials(nonVatDev);

      const html = cleanHtml(
        renderToString(<DevelopmentKpiBanner development={nonVatDev} financials={financials} />)
      );

      expect(html).toContain('Direct / Non-VAT');
      expect(html).not.toContain('15% VAT • R0 Buyer Duty');
    });

    it('empirically verifies SARS VAT mechanics: 15% output stripped vs input claimed', () => {
      const vatDev = createFixtureDevelopment({ isVatRegisteredDeveloper: true });
      const nonVatDev = createFixtureDevelopment({ isVatRegisteredDeveloper: false });

      const vatFin = calculateDevelopmentFinancials(vatDev);
      const nonVatFin = calculateDevelopmentFinancials(nonVatDev);

      // Both have identical list prices sum
      expect(vatFin.gdvInclVatZAR).toBe(nonVatFin.gdvInclVatZAR);

      // VAT Developer strips 15% output VAT via / 1.15
      const expectedNetRealizable = Math.round(vatFin.gdvInclVatZAR / 1.15);
      expect(vatFin.netRealizableGdvZAR).toBe(expectedNetRealizable);
      expect(vatFin.outputVatZAR).toBe(vatFin.gdvInclVatZAR - expectedNetRealizable);

      // VAT Developer claims 15% input VAT on soft costs and active hard build
      const expectedInputVat = Math.round(
        (vatFin.totalSoftCostsZAR + vatFin.activeHardBuildCostZAR) * 0.15
      );
      expect(vatFin.claimableInputVatZAR).toBe(expectedInputVat);

      // Non-VAT Developer: no output VAT stripped, no input VAT claimed
      expect(nonVatFin.netRealizableGdvZAR).toBe(nonVatFin.gdvInclVatZAR);
      expect(nonVatFin.outputVatZAR).toBe(0);
      expect(nonVatFin.claimableInputVatZAR).toBe(0);

      // Render both in UI and check GDV presentation
      const htmlVat = cleanHtml(
        renderToString(<DevelopmentKpiBanner development={vatDev} financials={vatFin} />)
      );
      const htmlNonVat = cleanHtml(
        renderToString(<DevelopmentKpiBanner development={nonVatDev} financials={nonVatFin} />)
      );

      expect(htmlVat).toContain(formatZAR(vatFin.gdvInclVatZAR));
      expect(htmlNonVat).toContain(formatZAR(nonVatFin.gdvInclVatZAR));
    });
  });

  // =========================================================================
  // CHALLENGE 5: Delay Matrix Simulator Formula Fidelity
  // =========================================================================
  describe('5. Delay Matrix Simulator Formula Fidelity', () => {
    it('accurately computes daily holding burn and monthly delay carrying cost', () => {
      const dev = createFixtureDevelopment({
        monthlyPreApprovalHoldingBurnZAR: 15000,
        monthlyConstructionHoldingBurnZAR: 24000,
        developmentFacilityDrawnZAR: 4000000,
        preApprovalMonths: 6,
        constructionMonths: 12,
      });

      const monthlyHolding = 15000 + 24000 / 2; // 27,000 ZAR
      const debtPrincipal = 4000000;
      const interestRate = 12.5; // percent p.a.
      const totalCostBasis =
        dev.landPurchasePriceZAR +
        dev.acquisitionCostsZAR +
        dev.totalBuildableAreaSqm * dev.budgetedHardCostPerSqmZAR;

      const matrix = calculateDelaySensitivityMatrix({
        baselineDurationMonths: dev.preApprovalMonths + dev.constructionMonths,
        monthlyHoldingBurnZAR: monthlyHolding,
        syndicateDebtBalanceZAR: debtPrincipal,
        syndicateInterestRatePercent: interestRate,
        targetExitPriceZAR: totalCostBasis * 1.25,
        totalCostBasisZAR: totalCostBasis,
        taxRatePercent: 27,
      });

      // Monthly debt interest = Math.round((4,000,000 * 0.125) / 12) = 41,667
      const expectedMonthlyDebtInterest = Math.round((4000000 * 0.125) / 12);
      expect(matrix.monthlyDebtInterestZAR).toBe(expectedMonthlyDebtInterest);

      // Total monthly burn = 27,000 + 41,667 = 68,667
      const expectedTotalMonthlyBurn = monthlyHolding + expectedMonthlyDebtInterest;
      expect(matrix.totalMonthlyDelayBurnZAR).toBe(expectedTotalMonthlyBurn);

      // Daily burn = Math.round(totalMonthlyBurn / 30)
      const expectedDailyBurn = Math.round(expectedTotalMonthlyBurn / 30);
      expect(matrix.dailyDelayBurnZAR).toBe(expectedDailyBurn);
    });

    it('accurately projects incremental delay erosion across +30, +60, +90, +120 days scenarios', () => {
      const monthlyHolding = 20000;
      const debtPrincipal = 3000000;
      const costBasis = 5000000;

      const matrix = calculateDelaySensitivityMatrix({
        baselineDurationMonths: 12,
        monthlyHoldingBurnZAR: monthlyHolding,
        syndicateDebtBalanceZAR: debtPrincipal,
        syndicateInterestRatePercent: 12.5,
        targetExitPriceZAR: 7500000,
        totalCostBasisZAR: costBasis,
        taxRatePercent: 27,
      });

      expect(matrix.scenarios).toHaveLength(5);

      const [s0, s30, s60, s90, s120] = matrix.scenarios;

      // Baseline scenario (0 days delay)
      expect(s0.delayDays).toBe(0);
      expect(s0.totalAdditionalCarryingCostZAR).toBe(0);
      expect(s0.netProfitErosionZAR).toBe(0);
      expect(s0.netProfitAfterTaxZAR).toBe(matrix.baselineNetProfitZAR);

      // +30 Days (1 month)
      const monthlyBurn = matrix.totalMonthlyDelayBurnZAR;
      expect(s30.delayDays).toBe(30);
      expect(s30.totalAdditionalCarryingCostZAR).toBe(monthlyBurn);
      expect(s30.netProfitAfterTaxZAR).toBeLessThan(s0.netProfitAfterTaxZAR);
      expect(s30.netProfitErosionZAR).toBeGreaterThan(0);

      // +60 Days (2 months)
      expect(s60.delayDays).toBe(60);
      expect(s60.totalAdditionalCarryingCostZAR).toBe(monthlyBurn * 2);
      expect(s60.netProfitErosionZAR).toBeGreaterThan(s30.netProfitErosionZAR);

      // Monotonic profit erosion test
      expect(s30.netProfitAfterTaxZAR).toBeGreaterThan(s60.netProfitAfterTaxZAR);
      expect(s60.netProfitAfterTaxZAR).toBeGreaterThan(s90.netProfitAfterTaxZAR);
      expect(s90.netProfitAfterTaxZAR).toBeGreaterThan(s120.netProfitAfterTaxZAR);
    });

    it('accurately calculates Zero-Margin Delay Days breakeven', () => {
      const baselineProfit = 300000;
      const monthlyBurn = 60000;

      // Burn per day = 60,000 / 30 = 2,000 ZAR/day
      // Days to wipe out R 300,000 = 300,000 / 2,000 = 150 days
      const days = calculateZeroMarginDelayDays(baselineProfit, monthlyBurn);
      expect(days).toBe(150);

      // Edge case: baseline profit <= 0 returns 0 days (already wiped out)
      expect(calculateZeroMarginDelayDays(0, monthlyBurn)).toBe(0);
      expect(calculateZeroMarginDelayDays(-50000, monthlyBurn)).toBe(0);

      // Edge case: zero monthly burn returns 9999 days (unconstrained)
      expect(calculateZeroMarginDelayDays(baselineProfit, 0)).toBe(9999);
    });

    it('renders Statutory Approvals stage-gate banner unlocked vs ring-fenced', () => {
      // Unlocked scenario: all Stage 1 approved
      const devUnlocked = createFixtureDevelopment();
      const htmlUnlocked = cleanHtml(
        renderToString(
          <DevelopmentApprovalsTab
            development={devUnlocked}
            onUpdateApproval={vi.fn()}
          />
        )
      );
      expect(htmlUnlocked).toContain('Stage 1 Unlocked: Construction Draws Approved');

      // Ring-fenced scenario: SPLUMA still Submitted
      const devLocked = createFixtureDevelopment({
        approvals: {
          ...devUnlocked.approvals,
          splumaRezoningSubdivision: { status: 'Submitted' },
        },
      });
      const htmlLocked = cleanHtml(
        renderToString(
          <DevelopmentApprovalsTab
            development={devLocked}
            onUpdateApproval={vi.fn()}
          />
        )
      );
      expect(htmlLocked).toContain('Stage 1 Ring-Fenced: Wet Works Draws Locked');
    });
  });

  // =========================================================================
  // CHALLENGE 6: Hybrid Split-Exit & Section 13sex Thresholds
  // =========================================================================
  describe('6. Hybrid Split-Exit & Section 13sex Threshold Fidelity', () => {
    it('activates Section 13sex tax shield badge if and only if retained units >= 5', () => {
      // 4 retained units -> Not eligible (shows "1 more for Sec 13sex")
      const dev4 = createFixtureDevelopment({
        units: [
          { id: '1', unitNumber: 'U1', configuration: '2B', floorAreaSqm: 50, allocatedCostBasisZAR: 500000, listPriceVatInclZAR: 800000, estimatedMonthlyRentZAR: 8000, status: 'Retained for Rental' },
          { id: '2', unitNumber: 'U2', configuration: '2B', floorAreaSqm: 50, allocatedCostBasisZAR: 500000, listPriceVatInclZAR: 800000, estimatedMonthlyRentZAR: 8000, status: 'Retained for Rental' },
          { id: '3', unitNumber: 'U3', configuration: '2B', floorAreaSqm: 50, allocatedCostBasisZAR: 500000, listPriceVatInclZAR: 800000, estimatedMonthlyRentZAR: 8000, status: 'Retained for Rental' },
          { id: '4', unitNumber: 'U4', configuration: '2B', floorAreaSqm: 50, allocatedCostBasisZAR: 500000, listPriceVatInclZAR: 800000, estimatedMonthlyRentZAR: 8000, status: 'Retained for Rental' },
          { id: '5', unitNumber: 'U5', configuration: '2B', floorAreaSqm: 50, allocatedCostBasisZAR: 500000, listPriceVatInclZAR: 800000, estimatedMonthlyRentZAR: 8000, status: 'Available' },
        ],
      });
      const fin4 = calculateDevelopmentFinancials(dev4);
      expect(fin4.isSection13SexEligible).toBe(false);
      expect(fin4.section13sexDeductionBaseZAR).toBe(0);
      expect(fin4.section13sexAnnualAllowanceZAR).toBe(0);

      const html4 = cleanHtml(
        renderToString(<DevelopmentKpiBanner development={dev4} financials={fin4} />)
      );
      expect(html4).toContain('1 more for Sec 13sex');
      expect(html4).not.toContain('Section 13sex Active');

      // 5 retained units -> Eligible and active!
      const dev5 = createFixtureDevelopment({
        units: [
          { id: '1', unitNumber: 'U1', configuration: '2B', floorAreaSqm: 50, allocatedCostBasisZAR: 500000, listPriceVatInclZAR: 800000, estimatedMonthlyRentZAR: 8000, status: 'Retained for Rental' },
          { id: '2', unitNumber: 'U2', configuration: '2B', floorAreaSqm: 50, allocatedCostBasisZAR: 500000, listPriceVatInclZAR: 800000, estimatedMonthlyRentZAR: 8000, status: 'Retained for Rental' },
          { id: '3', unitNumber: 'U3', configuration: '2B', floorAreaSqm: 50, allocatedCostBasisZAR: 500000, listPriceVatInclZAR: 800000, estimatedMonthlyRentZAR: 8000, status: 'Retained for Rental' },
          { id: '4', unitNumber: 'U4', configuration: '2B', floorAreaSqm: 50, allocatedCostBasisZAR: 500000, listPriceVatInclZAR: 800000, estimatedMonthlyRentZAR: 8000, status: 'Retained for Rental' },
          { id: '5', unitNumber: 'U5', configuration: '2B', floorAreaSqm: 50, allocatedCostBasisZAR: 500000, listPriceVatInclZAR: 800000, estimatedMonthlyRentZAR: 8000, status: 'Retained for Rental' },
        ],
      });
      const fin5 = calculateDevelopmentFinancials(dev5);
      expect(fin5.isSection13SexEligible).toBe(true);

      // Section 13sex: 55% write-off base, 5% annual allowance
      const totalCostBasis = 5 * 500000; // 2,500,000
      expect(fin5.section13sexDeductionBaseZAR).toBe(Math.round(totalCostBasis * 0.55)); // 1,375,000
      expect(fin5.section13sexAnnualAllowanceZAR).toBe(Math.round(1375000 * 0.05)); // 68,750

      const html5 = cleanHtml(
        renderToString(<DevelopmentKpiBanner development={dev5} financials={fin5} />)
      );
      expect(html5).toContain('Section 13sex Active');
    });
  });
});
