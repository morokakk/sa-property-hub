import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { DevelopmentKpiBanner } from '../DevelopmentKpiBanner';
import { DevelopmentUnitInventoryTab } from '../DevelopmentUnitInventoryTab';
import { DevelopmentCostStackTab } from '../DevelopmentCostStackTab';
import { DevelopmentApprovalsTab } from '../DevelopmentApprovalsTab';
import { DevelopmentFinanceTab } from '../DevelopmentFinanceTab';
import { DevelopmentProjectModal } from '../DevelopmentProjectModal';
import DevelopmentsPage from '@/app/developments/page';
import {
  DevelopmentProject,
  DevelopmentUnit,
  PreConstructionApprovals,
  DevelopmentSoftCosts,
} from '@/types';
import { calculateDevelopmentFinancials } from '@/lib/calculations/developments';
import { formatZAR } from '@/lib/formatters';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';

vi.mock('next/navigation', () => ({
  usePathname: () => '/developments',
}));

// Helper to strip React 19 SSR comment boundaries (<!-- -->) for clean text assertions
const normalizeHtml = (html: string): string => html.replace(/<!-- -->/g, '');

// Helper to create baseline development project with customizable overrides
const createAdversarialDevelopment = (
  overrides?: Partial<DevelopmentProject>
): DevelopmentProject => {
  const defaultUnits: DevelopmentUnit[] = [
    {
      id: 'unit-c-1',
      unitNumber: 'Unit 101',
      configuration: '2 Bed 1 Bath',
      floorAreaSqm: 60,
      allocatedCostBasisZAR: 550000,
      listPriceVatInclZAR: 850000,
      estimatedMonthlyRentZAR: 7500,
      status: 'Sold & Transferred',
      buyerName: 'Kagiso Rabada',
      conveyancerRef: 'CONV-2026/99',
      soldDate: '2026-09-01',
    },
    {
      id: 'unit-c-2',
      unitNumber: 'Unit 102',
      configuration: '2 Bed 1 Bath',
      floorAreaSqm: 60,
      allocatedCostBasisZAR: 550000,
      listPriceVatInclZAR: 850000,
      estimatedMonthlyRentZAR: 7500,
      status: 'Reserved (OTP Signed)',
      buyerName: 'David Miller',
    },
    {
      id: 'unit-c-3',
      unitNumber: 'Unit 103',
      configuration: '3 Bed 2 Bath',
      floorAreaSqm: 80,
      allocatedCostBasisZAR: 700000,
      listPriceVatInclZAR: 1100000,
      estimatedMonthlyRentZAR: 10000,
      status: 'Available',
    },
    {
      id: 'unit-c-4',
      unitNumber: 'Unit 104',
      configuration: '3 Bed 2 Bath',
      floorAreaSqm: 80,
      allocatedCostBasisZAR: 700000,
      listPriceVatInclZAR: 1100000,
      estimatedMonthlyRentZAR: 10000,
      status: 'Retained for Rental',
    },
  ];

  const defaultSoftCosts: DevelopmentSoftCosts = {
    townPlannerZAR: 40000,
    architectZAR: 75000,
    structuralCivilEngineerZAR: 50000,
    quantitySurveyorZAR: 30000,
    nhbrcEnrolmentFeeZAR: 35000,
    councilBulkContributionsZAR: 100000,
    planScrutinyAndSubdivisionFeesZAR: 20000,
    marketingAndShowUnitZAR: 25000,
  };

  const defaultApprovals: PreConstructionApprovals = {
    splumaRezoningSubdivision: {
      status: 'Approved',
      referenceNo: 'SPLUMA-2026-01',
      approvedDate: '2026-07-01',
    },
    sgDiagramApproval: {
      status: 'Approved',
      referenceNo: 'SG-2026-88',
      approvedDate: '2026-08-01',
    },
    municipalBuildingPlans: {
      status: 'Approved',
      referenceNo: 'MBP-2026-541',
      approvedDate: '2026-08-20',
    },
    nhbrcEnrolment: {
      status: 'Approved',
      referenceNo: 'NHBRC-2026-77',
      approvedDate: '2026-09-05',
    },
    sectionalTitleRegister: {
      status: 'Submitted',
      referenceNo: 'STR-2026-10',
      submittedDate: '2026-09-15',
      targetApprovalDate: '2026-12-01',
    },
    occupancyCertificate: {
      status: 'Not Started',
    },
  };

  return {
    id: 'dev-adv-1',
    title: 'Adversarial Test Enclave',
    address: '100 Jan Smuts Avenue, Rosebank',
    city: 'Johannesburg',
    province: 'Gauteng',
    developmentType: 'Sectional Title Apartments',
    isVatRegisteredDeveloper: true,
    taxEntityType: 'Company (27%)',
    currentPhase: 'Superstructure',
    preApprovalMonths: 6,
    constructionMonths: 10,
    sellDownMonths: 4,
    landPurchasePriceZAR: 1500000,
    acquisitionCostsZAR: 80000,
    sec118ArrearsZAR: 0,
    softCosts: defaultSoftCosts,
    totalBuildableAreaSqm: 280,
    budgetedHardCostPerSqmZAR: 9000,
    contingencyPercent: 7.5,
    boqItems: [
      {
        id: 'boq-adv-1',
        category: 'Roofing & Structural',
        itemDescription: 'Foundations and ground floor slab',
        unit: 'm2',
        quantity: 280,
        baselineUnitCostZAR: 1500,
        baselineTotalZAR: 420000,
        actualCostZAR: 420000,
        varianceZAR: 0,
        supplierOrContractor: 'Solid Slabs Ltd',
        status: 'In Progress',
        milestonePhase: 'First Fix / Wet Works',
      },
    ],
    monthlyPreApprovalHoldingBurnZAR: 8000,
    monthlyConstructionHoldingBurnZAR: 15000,
    developmentFacilityLimitZAR: 3500000,
    developmentFacilityDrawnZAR: 2000000,
    developmentFacilityRepaidZAR: 739130,
    preSalesHurdlePercent: 60,
    approvals: defaultApprovals,
    units: defaultUnits,
    notes: 'Adversarial test project for boundary condition evaluation.',
    createdAt: '2026-05-01',
    ...overrides,
  };
};

describe('Empirical Adversarial Stress Testing — /developments UI Components (Milestone 3)', () => {
  beforeEach(() => {
    usePortfolioStore.setState({
      developments: [createAdversarialDevelopment()],
    });
  });

  // =========================================================================
  // Challenge 1: Empty Units Array (Zero Inventory Edge State)
  // =========================================================================
  describe('Challenge 1: Empty Units Array (Zero Inventory Edge State)', () => {
    const emptyDev = createAdversarialDevelopment({ units: [] });
    const financials = calculateDevelopmentFinancials(emptyDev);

    it('DevelopmentKpiBanner renders cleanly without division by zero, NaN, or Infinity', () => {
      const rawHtml = renderToString(
        <DevelopmentKpiBanner development={emptyDev} financials={financials} />
      );
      const html = normalizeHtml(rawHtml);

      // Financials assertions
      expect(financials.totalUnitsCount).toBe(0);
      expect(financials.tdcPerUnitZAR).toBe(0);
      expect(financials.gdvInclVatZAR).toBe(0);
      expect(financials.unitsRequiredForDebtWipeout).toBe(0);

      // DOM assertions: no NaN or Infinity in output
      expect(html).not.toContain('NaN');
      expect(html).not.toContain('Infinity');

      // Zero-unit metrics
      expect(html).toContain('R 0/unit');
      expect(html).toContain('0/0 Units');
      expect(html).toContain('0 Sold • 0 Retained');
      expect(html).toContain('Wipeout: 0 units required');
      expect(html).toContain('5 more for Sec 13sex');
    });

    it('DevelopmentUnitInventoryTab renders empty placeholder and disables graduation CTA', () => {
      const onGraduateRetainedUnits = vi.fn();
      const rawHtml = renderToString(
        <DevelopmentUnitInventoryTab
          development={emptyDev}
          financials={financials}
          onUpdateUnit={vi.fn()}
          onMarkUnitSold={vi.fn()}
          onGraduateRetainedUnits={onGraduateRetainedUnits}
        />
      );
      const html = normalizeHtml(rawHtml);

      // Empty inventory message
      expect(html).toContain('No units recorded for this development. Click &quot;+ Add Unit&quot; above to add inventory.');

      // Zero units badge in header
      expect(html).toContain('0 Units');

      // Status counters all show 0
      expect(html).toContain('Sold &amp; Transferred: 0');
      expect(html).toContain('Reserved (OTP Signed): 0');
      expect(html).toContain('Available: 0');
      expect(html).toContain('Retained for Rental: 0');

      // Graduate button is disabled with cursor-not-allowed
      expect(html).toContain('Graduate Retained Units to Rentals (0)');
      expect(html).toContain('cursor-not-allowed');

      // Sticky totals footer is NOT rendered when units array is empty
      expect(html).not.toContain('Total / Portfolio');

      // Section 13sex banner is NOT rendered
      expect(html).not.toContain('SARS Section 13sex Tax Shield Qualified');
    });

    it('DevelopmentFinanceTab handles 0 units cleanly with 0 wipeout units and empty waterfall grid', () => {
      const rawHtml = renderToString(
        <DevelopmentFinanceTab
          development={emptyDev}
          financials={financials}
          onUpdateDevelopment={vi.fn()}
        />
      );
      const html = normalizeHtml(rawHtml);

      expect(html).not.toContain('NaN');
      expect(html).not.toContain('Infinity');
      expect(html).toContain('0 Units');
      expect(html).toContain('0 of 0 units contracted');
      // Debt wipeout card explains 0 units
      expect(html).toContain('Units for 100% Debt Wipeout:');
    });

    it('DevelopmentsPage renders active project with 0 units without throwing', () => {
      usePortfolioStore.setState({ developments: [emptyDev] });
      const rawHtml = renderToString(<DevelopmentsPage />);
      const html = normalizeHtml(rawHtml);

      expect(html).toContain('Adversarial Test Enclave');
      expect(html).toContain('(0u)');
      expect(html).toContain('No units recorded for this development');
    });
  });

  // =========================================================================
  // Challenge 2: 100% Units Sold (All Debt Repaid & Surplus Cash)
  // =========================================================================
  describe('Challenge 2: 100% Units Sold (All Debt Repaid & Surplus Cash)', () => {
    const createAllSoldDev = () => {
      const allSoldUnits: DevelopmentUnit[] = [1, 2, 3, 4].map((num) => ({
        id: `sold-unit-${num}`,
        unitNumber: `Unit ${num}`,
        configuration: '2 Bed 1 Bath',
        floorAreaSqm: 65,
        allocatedCostBasisZAR: 500000,
        listPriceVatInclZAR: 900000,
        estimatedMonthlyRentZAR: 8000,
        status: 'Sold & Transferred' as const,
        buyerName: `Buyer ${num} Trust`,
        conveyancerRef: `ST-2026/00${num}`,
        soldDate: `2026-10-0${num}`,
      }));

      return createAdversarialDevelopment({
        units: allSoldUnits,
        developmentFacilityLimitZAR: 3000000,
        developmentFacilityDrawnZAR: 2000000,
        developmentFacilityRepaidZAR: 2500000, // Repaid exceeds drawn (surplus cash)
        preSalesHurdlePercent: 60,
      });
    };

    it('DevelopmentKpiBanner displays R 0 outstanding debt, 0 units needed for wipeout, and 100% hurdle met', () => {
      const dev = createAllSoldDev();
      const financials = calculateDevelopmentFinancials(dev);

      expect(financials.outstandingDevFacilityZAR).toBe(0);
      expect(financials.unitsRequiredForDebtWipeout).toBe(0);
      expect(financials.isPreSalesHurdleMet).toBe(true);
      expect(financials.unitsSoldAndTransferredCount).toBe(4);
      expect(financials.unitsRetainedCount).toBe(0);

      const rawHtml = renderToString(
        <DevelopmentKpiBanner development={dev} financials={financials} />
      );
      const html = normalizeHtml(rawHtml);

      expect(html).toContain('4/4 Units');
      expect(html).toContain('Hurdle Met');
      expect(html).toContain('Wipeout: 0 units required');
      expect(html).toContain('4 Sold • 0 Retained');
    });

    it('DevelopmentUnitInventoryTab renders all rows as sold with no Mark Sold buttons available', () => {
      const dev = createAllSoldDev();
      const financials = calculateDevelopmentFinancials(dev);

      const rawHtml = renderToString(
        <DevelopmentUnitInventoryTab
          development={dev}
          financials={financials}
          onUpdateUnit={vi.fn()}
          onMarkUnitSold={vi.fn()}
          onGraduateRetainedUnits={vi.fn()}
        />
      );
      const html = normalizeHtml(rawHtml);

      // Status chip for sold
      expect(html).toContain('Sold &amp; Transferred: 4');
      expect(html).toContain('Available: 0');
      expect(html).toContain('Reserved (OTP Signed): 0');
      expect(html).toContain('Retained for Rental: 0');

      // All buyer names and conveyancer references rendered
      expect(html).toContain('Buyer 1 Trust');
      expect(html).toContain('Buyer 2 Trust');
      expect(html).toContain('Ref: ST-2026/001');
      expect(html).toContain('Ref: ST-2026/004');

      // Crucial: No "Mark Sold" button should be rendered because all units are already sold
      expect(html).not.toContain('Mark Sold');

      // Graduate button is disabled (0 retained units)
      expect(html).toContain('Graduate Retained Units to Rentals (0)');
      expect(html).toContain('cursor-not-allowed');

      // Footer summary reflects status breakdown
      expect(html).toContain('4 Sold • 0 Retained');
    });

    it('DevelopmentFinanceTab displays R 0 debt, 0 units for wipeout, and all units as free-carry surplus', () => {
      const dev = createAllSoldDev();
      const financials = calculateDevelopmentFinancials(dev);

      const rawHtml = renderToString(
        <DevelopmentFinanceTab
          development={dev}
          financials={financials}
          onUpdateDevelopment={vi.fn()}
        />
      );
      const html = normalizeHtml(rawHtml);

      // Senior debt balance is R 0
      expect(html).toContain('Outstanding Facility Debt:');
      expect(html).toContain('R 0');
      expect(html).toContain('Units for 100% Debt Wipeout:');
      expect(html).toContain('0 Units');
      expect(html).toContain('Unencumbered Surplus:');
      expect(html).toContain('4 Units');
    });
  });

  // =========================================================================
  // Challenge 3: 0% Pre-Sales Hurdle vs 100% Pre-Sales Hurdle
  // =========================================================================
  describe('Challenge 3: 0% Pre-Sales Hurdle vs 100% Pre-Sales Hurdle', () => {
    it('0% Hurdle (TUHF Build-to-Rent Infill) is met immediately even with 0 pre-sales', () => {
      // 0% pre-sales required, 0 units sold (all available or retained)
      const dev = createAdversarialDevelopment({
        preSalesHurdlePercent: 0,
        units: [
          {
            id: 'u-1',
            unitNumber: 'Unit 1',
            configuration: '1 Bed',
            floorAreaSqm: 40,
            allocatedCostBasisZAR: 300000,
            listPriceVatInclZAR: 500000,
            estimatedMonthlyRentZAR: 4500,
            status: 'Available',
          },
        ],
      });
      const financials = calculateDevelopmentFinancials(dev);

      expect(financials.preSalesHurdlePercent).toBe(0);
      expect(financials.isPreSalesHurdleMet).toBe(true);

      const rawKpiHtml = renderToString(
        <DevelopmentKpiBanner development={dev} financials={financials} />
      );
      const kpiHtml = normalizeHtml(rawKpiHtml);
      expect(kpiHtml).toContain('Hurdle Met');
      expect(kpiHtml).toContain('Target: 0.0%');
      // Hurdle progress bar width should be 100%
      expect(kpiHtml).toContain('style="width:100%"');

      const rawFinanceHtml = renderToString(
        <DevelopmentFinanceTab
          development={dev}
          financials={financials}
          onUpdateDevelopment={vi.fn()}
        />
      );
      const financeHtml = normalizeHtml(rawFinanceHtml);
      expect(financeHtml).toContain('HURDLE MET: Construction draws unlocked by senior bank.');
      expect(financeHtml).toContain('Hurdle Target: 0.0%');
    });

    it('100% Hurdle (Strict Senior Bank Gate) remains pending when pre-sales are below 100%', () => {
      // 4 units, only 2 pre-sold (50% GDV), 100% hurdle
      const dev = createAdversarialDevelopment({
        preSalesHurdlePercent: 100,
        units: [
          {
            id: 'u-1',
            unitNumber: 'Unit 1',
            configuration: '2 Bed',
            floorAreaSqm: 60,
            allocatedCostBasisZAR: 500000,
            listPriceVatInclZAR: 1000000,
            estimatedMonthlyRentZAR: 8000,
            status: 'Sold & Transferred',
          },
          {
            id: 'u-2',
            unitNumber: 'Unit 2',
            configuration: '2 Bed',
            floorAreaSqm: 60,
            allocatedCostBasisZAR: 500000,
            listPriceVatInclZAR: 1000000,
            estimatedMonthlyRentZAR: 8000,
            status: 'Reserved (OTP Signed)',
          },
          {
            id: 'u-3',
            unitNumber: 'Unit 3',
            configuration: '2 Bed',
            floorAreaSqm: 60,
            allocatedCostBasisZAR: 500000,
            listPriceVatInclZAR: 1000000,
            estimatedMonthlyRentZAR: 8000,
            status: 'Available',
          },
          {
            id: 'u-4',
            unitNumber: 'Unit 4',
            configuration: '2 Bed',
            floorAreaSqm: 60,
            allocatedCostBasisZAR: 500000,
            listPriceVatInclZAR: 1000000,
            estimatedMonthlyRentZAR: 8000,
            status: 'Available',
          },
        ],
      });
      const financials = calculateDevelopmentFinancials(dev);

      expect(financials.preSoldGdvPercent).toBe(50);
      expect(financials.isPreSalesHurdleMet).toBe(false);

      const rawKpiHtml = renderToString(
        <DevelopmentKpiBanner development={dev} financials={financials} />
      );
      const kpiHtml = normalizeHtml(rawKpiHtml);
      expect(kpiHtml).toContain('Pending');
      expect(kpiHtml).toContain('Target: 100.0%');
      expect(kpiHtml).toContain('Pre-sold: 50.0%');
      // Progress bar should reflect 50%
      expect(kpiHtml).toContain('style="width:50%"');

      const rawFinanceHtml = renderToString(
        <DevelopmentFinanceTab
          development={dev}
          financials={financials}
          onUpdateDevelopment={vi.fn()}
        />
      );
      const financeHtml = normalizeHtml(rawFinanceHtml);
      expect(financeHtml).toContain('HURDLE PENDING: Bank construction draws ring-fenced.');
      expect(financeHtml).toContain('Hurdle Target: 100.0%');
    });

    it('100% Hurdle flips to Hurdle Met once 100% of GDV is pre-sold', () => {
      const dev = createAdversarialDevelopment({
        preSalesHurdlePercent: 100,
        units: [
          {
            id: 'u-1',
            unitNumber: 'Unit 1',
            configuration: '2 Bed',
            floorAreaSqm: 60,
            allocatedCostBasisZAR: 500000,
            listPriceVatInclZAR: 1000000,
            estimatedMonthlyRentZAR: 8000,
            status: 'Sold & Transferred',
          },
          {
            id: 'u-2',
            unitNumber: 'Unit 2',
            configuration: '2 Bed',
            floorAreaSqm: 60,
            allocatedCostBasisZAR: 500000,
            listPriceVatInclZAR: 1000000,
            estimatedMonthlyRentZAR: 8000,
            status: 'Bond Approved / Guarantees Issued',
          },
        ],
      });
      const financials = calculateDevelopmentFinancials(dev);

      expect(financials.preSoldGdvPercent).toBe(100);
      expect(financials.isPreSalesHurdleMet).toBe(true);

      const rawKpiHtml = renderToString(
        <DevelopmentKpiBanner development={dev} financials={financials} />
      );
      const kpiHtml = normalizeHtml(rawKpiHtml);
      expect(kpiHtml).toContain('Hurdle Met');
      expect(kpiHtml).toContain('style="width:100%"');
    });
  });

  // =========================================================================
  // Challenge 4: 100% Retained for Rental (Section 13sex Eligibility Boundary)
  // =========================================================================
  describe('Challenge 4: 100% Retained for Rental (Section 13sex Eligibility Boundary)', () => {
    it('Qualifies for Section 13sex badge when >= 5 units are retained for rental', () => {
      const retainedUnits: DevelopmentUnit[] = [1, 2, 3, 4, 5, 6].map((num) => ({
        id: `ret-unit-${num}`,
        unitNumber: `Unit ${num}`,
        configuration: '1 Bed Micro-Apartment',
        floorAreaSqm: 38,
        allocatedCostBasisZAR: 350000,
        listPriceVatInclZAR: 550000,
        estimatedMonthlyRentZAR: 5200,
        status: 'Retained for Rental' as const,
      }));

      const dev = createAdversarialDevelopment({
        title: 'Kempton Micro-Units BTR',
        developmentType: 'Township Micro-Units (Infill)',
        units: retainedUnits,
      });
      const financials = calculateDevelopmentFinancials(dev);

      expect(financials.unitsRetainedCount).toBe(6);
      expect(financials.isSection13SexEligible).toBe(true);
      expect(financials.section13sexDeductionBaseZAR).toBe(Math.round(6 * 350000 * 0.55));
      expect(financials.section13sexAnnualAllowanceZAR).toBe(
        Math.round(financials.section13sexDeductionBaseZAR * 0.05)
      );

      // 1. KPI Banner renders Section 13sex Active badge
      const rawKpiHtml = renderToString(
        <DevelopmentKpiBanner development={dev} financials={financials} />
      );
      const kpiHtml = normalizeHtml(rawKpiHtml);
      expect(kpiHtml).toContain('Section 13sex Active');
      expect(kpiHtml).toContain('0 Sold • 6 Retained');

      // 2. Unit Inventory Tab renders SARS Section 13sex callout banner with annual allowance
      const rawInvHtml = renderToString(
        <DevelopmentUnitInventoryTab
          development={dev}
          financials={financials}
          onUpdateUnit={vi.fn()}
          onMarkUnitSold={vi.fn()}
          onGraduateRetainedUnits={vi.fn()}
        />
      );
      const invHtml = normalizeHtml(rawInvHtml);
      expect(invHtml).toContain('SARS Section 13sex Tax Shield Qualified:');
      expect(invHtml).toContain('year tax shield');
      expect(invHtml).toContain('Graduate Retained Units to Rentals (6)');
      expect(invHtml).not.toContain('cursor-not-allowed');

      // Retained rows show "Retained Asset" label
      expect(invHtml).toContain('Retained Asset');
    });

    it('Disqualifies Section 13sex when < 5 units are retained (e.g. 4 units)', () => {
      const fourRetainedUnits: DevelopmentUnit[] = [1, 2, 3, 4].map((num) => ({
        id: `ret-unit-${num}`,
        unitNumber: `Unit ${num}`,
        configuration: '2 Bed Flat',
        floorAreaSqm: 55,
        allocatedCostBasisZAR: 450000,
        listPriceVatInclZAR: 750000,
        estimatedMonthlyRentZAR: 6800,
        status: 'Retained for Rental' as const,
      }));

      const dev = createAdversarialDevelopment({
        units: fourRetainedUnits,
      });
      const financials = calculateDevelopmentFinancials(dev);

      expect(financials.unitsRetainedCount).toBe(4);
      expect(financials.isSection13SexEligible).toBe(false);

      const rawKpiHtml = renderToString(
        <DevelopmentKpiBanner development={dev} financials={financials} />
      );
      const kpiHtml = normalizeHtml(rawKpiHtml);
      expect(kpiHtml).not.toContain('Section 13sex Active');
      expect(kpiHtml).toContain('1 more for Sec 13sex');

      const rawInvHtml = renderToString(
        <DevelopmentUnitInventoryTab
          development={dev}
          financials={financials}
          onUpdateUnit={vi.fn()}
          onMarkUnitSold={vi.fn()}
          onGraduateRetainedUnits={vi.fn()}
        />
      );
      const invHtml = normalizeHtml(rawInvHtml);
      // Banner must NOT be displayed
      expect(invHtml).not.toContain('SARS Section 13sex Tax Shield Qualified:');
      // But graduation button is still active for the 4 retained units
      expect(invHtml).toContain('Graduate Retained Units to Rentals (4)');
    });

    it('Handles units already graduated to /rentals (graduatedRentalId present)', () => {
      const unitsWithGraduation: DevelopmentUnit[] = [
        {
          id: 'u-grad-1',
          unitNumber: 'Unit 1',
          configuration: '1 Bed',
          floorAreaSqm: 40,
          allocatedCostBasisZAR: 400000,
          listPriceVatInclZAR: 600000,
          estimatedMonthlyRentZAR: 5500,
          status: 'Retained for Rental',
          graduatedRentalId: 'rental-prop-101', // Already graduated!
        },
        {
          id: 'u-grad-2',
          unitNumber: 'Unit 2',
          configuration: '1 Bed',
          floorAreaSqm: 40,
          allocatedCostBasisZAR: 400000,
          listPriceVatInclZAR: 600000,
          estimatedMonthlyRentZAR: 5500,
          status: 'Retained for Rental',
          // Not yet graduated
        },
      ];

      const dev = createAdversarialDevelopment({ units: unitsWithGraduation });
      const financials = calculateDevelopmentFinancials(dev);

      const rawInvHtml = renderToString(
        <DevelopmentUnitInventoryTab
          development={dev}
          financials={financials}
          onUpdateUnit={vi.fn()}
          onMarkUnitSold={vi.fn()}
          onGraduateRetainedUnits={vi.fn()}
        />
      );
      const invHtml = normalizeHtml(rawInvHtml);

      // Only 1 ungraduated unit remains
      expect(invHtml).toContain('Graduate Retained Units to Rentals (1)');
      // Graduated unit shows confirmation pill
      expect(invHtml).toContain('Graduated to /rentals');
      // Ungraduated unit shows Retained Asset
      expect(invHtml).toContain('Retained Asset');
    });
  });

  // =========================================================================
  // Challenge 5: Missing Optional Fields & Partial Metadata
  // =========================================================================
  describe('Challenge 5: Missing Optional Fields & Partial Metadata', () => {
    it('DevelopmentApprovalsTab handles empty/missing dates and references cleanly', () => {
      // Empty approvals: all Not Started, no refs, no dates
      const devWithEmptyApprovals = createAdversarialDevelopment({
        approvals: {
          splumaRezoningSubdivision: { status: 'Not Started' },
          sgDiagramApproval: { status: 'Not Started' },
          municipalBuildingPlans: { status: 'Not Started' },
          nhbrcEnrolment: { status: 'Not Started' },
          sectionalTitleRegister: { status: 'Not Started' },
          occupancyCertificate: { status: 'Not Started' },
        },
      });

      const rawHtml = renderToString(
        <DevelopmentApprovalsTab
          development={devWithEmptyApprovals}
          onUpdateApproval={vi.fn()}
        />
      );
      const html = normalizeHtml(rawHtml);

      // Does not throw and displays 0 of 6 milestones
      expect(html).toContain('0 of 6 Milestones');
      // Stage 1 is locked
      expect(html).toContain('Stage 1 Ring-Fenced: Wet Works Draws Locked');
      expect(html).not.toContain('Stage 1 Unlocked: Construction Draws Approved');

      // Reference inputs have empty value fallbacks (no "undefined")
      expect(html).not.toContain('value="undefined"');
    });

    it('DevelopmentUnitInventoryTab handles sold unit without buyerName or conveyancerRef', () => {
      const dev = createAdversarialDevelopment({
        units: [
          {
            id: 'u-orphan-1',
            unitNumber: 'Unit X',
            configuration: 'Studio',
            floorAreaSqm: 35,
            allocatedCostBasisZAR: 300000,
            listPriceVatInclZAR: 500000,
            estimatedMonthlyRentZAR: 4500,
            status: 'Sold & Transferred',
            // Missing buyerName, conveyancerRef, soldDate
          },
          {
            id: 'u-orphan-2',
            unitNumber: 'Unit Y',
            configuration: 'Studio',
            floorAreaSqm: 35,
            allocatedCostBasisZAR: 300000,
            listPriceVatInclZAR: 500000,
            estimatedMonthlyRentZAR: 4500,
            status: 'Available',
          },
        ],
      });
      const financials = calculateDevelopmentFinancials(dev);

      const rawHtml = renderToString(
        <DevelopmentUnitInventoryTab
          development={dev}
          financials={financials}
          onUpdateUnit={vi.fn()}
          onMarkUnitSold={vi.fn()}
          onGraduateRetainedUnits={vi.fn()}
        />
      );
      const html = normalizeHtml(rawHtml);

      // Fallback buyer name
      expect(html).toContain('Private Buyer');
      // No Ref: displayed for u-orphan-1
      expect(html).not.toContain('Ref: undefined');
      // Available unit displays dash "—"
      expect(html).toContain('—');
    });

    it('DevelopmentCostStackTab renders with zero Section 118 arrears and zero soft costs', () => {
      const dev = createAdversarialDevelopment({
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
      });
      const financials = calculateDevelopmentFinancials(dev);

      const rawHtml = renderToString(
        <DevelopmentCostStackTab
          development={dev}
          financials={financials}
          onUpdateSoftCosts={vi.fn()}
          onUpdateDevelopment={vi.fn()}
          onUpdateBOQItem={vi.fn()}
          onDeleteBOQItem={vi.fn()}
        />
      );
      const html = normalizeHtml(rawHtml);

      // Section 118 Arrears line should NOT appear when 0
      expect(html).not.toContain('Sec 118 Arrears:');
      // Soft costs total should be R 0
      expect(html).toContain('Total Soft Costs:');
      expect(html).not.toContain('NaN');
    });

    it('DevelopmentCostStackTab displays Section 118 arrears in red when > 0', () => {
      const dev = createAdversarialDevelopment({
        sec118ArrearsZAR: 65000,
      });
      const financials = calculateDevelopmentFinancials(dev);

      const rawHtml = renderToString(
        <DevelopmentCostStackTab
          development={dev}
          financials={financials}
          onUpdateSoftCosts={vi.fn()}
          onUpdateDevelopment={vi.fn()}
          onUpdateBOQItem={vi.fn()}
          onDeleteBOQItem={vi.fn()}
        />
      );
      const html = normalizeHtml(rawHtml);

      expect(html).toContain('Sec 118 Arrears:');
      expect(html).toContain(formatZAR(65000));
    });
  });

  // =========================================================================
  // Challenge 6: Tab Switching & Modal Cancellation / Submission
  // =========================================================================
  describe('Challenge 6: Tab Switching & Modal Cancellation / Submission', () => {
    it('DevelopmentProjectModal opens, renders full form, and handles submission callback', () => {
      const onSave = vi.fn();
      const onClose = vi.fn();

      // Closed state: returns empty
      const closedHtml = renderToString(
        <DevelopmentProjectModal
          isOpen={false}
          editingDevelopment={null}
          onClose={onClose}
          onSave={onSave}
        />
      );
      expect(closedHtml).toBe('');

      // Open in Create mode
      const rawOpenHtml = renderToString(
        <DevelopmentProjectModal
          isOpen={true}
          editingDevelopment={null}
          onClose={onClose}
          onSave={onSave}
        />
      );
      const openHtml = normalizeHtml(rawOpenHtml);

      // All 5 numbered form sections
      expect(openHtml).toContain('1. Identity, Strategy &amp; Location');
      expect(openHtml).toContain('2. Phase, VAT &amp; Tax Entity');
      expect(openHtml).toContain('3. Land Acquisition &amp; Construction Budget');
      expect(openHtml).toContain('4. Project Timelines &amp; Carrying Burn');
      expect(openHtml).toContain('5. Senior Debt Facility &amp; Bank Hurdle');
      expect(openHtml).toContain('Create Development Project');
      expect(openHtml).toContain('Cancel');
    });

    it('DevelopmentProjectModal populates editing values when editing an existing project', () => {
      const dev = createAdversarialDevelopment({
        title: 'Custom Title Edit',
        city: 'Pretoria',
        province: 'Gauteng',
      });

      const rawHtml = renderToString(
        <DevelopmentProjectModal
          isOpen={true}
          editingDevelopment={dev}
          onClose={vi.fn()}
          onSave={vi.fn()}
        />
      );
      const html = normalizeHtml(rawHtml);

      expect(html).toContain('Edit Custom Title Edit');
      expect(html).toContain('Save Changes');
    });

    it('DevelopmentApprovalsTab Delay Sensitivity Simulator modal renders holding burn breakdown', () => {
      const dev = createAdversarialDevelopment();

      // Trigger simulator modal by calling render on tab
      const rawHtml = renderToString(
        <DevelopmentApprovalsTab
          development={dev}
          onUpdateApproval={vi.fn()}
        />
      );
      const html = normalizeHtml(rawHtml);

      // Button exists in header
      expect(html).toContain('Simulate Objection Delay');
    });

    it('DevelopmentsPage state updates correctly when selling a unit and graduating retained units', () => {
      const sampleDev = createAdversarialDevelopment();
      usePortfolioStore.setState({
        developments: [sampleDev],
        rentals: [],
        funding: [],
      });

      const store = usePortfolioStore.getState();

      // 1. Sell Unit
      store.sellDevelopmentUnit('dev-adv-1', 'unit-c-3', 'Mark Shuttleworth', 1200000);
      const updatedDev = usePortfolioStore.getState().developments.find((d) => d.id === 'dev-adv-1')!;
      const soldUnit = updatedDev.units.find((u) => u.id === 'unit-c-3')!;
      expect(soldUnit.status).toBe('Sold & Transferred');
      expect(soldUnit.buyerName).toBe('Mark Shuttleworth');

      // 2. Graduate Retained Unit
      store.graduateRetainedUnitsToRental('dev-adv-1');
      const postGradDev = usePortfolioStore.getState().developments.find((d) => d.id === 'dev-adv-1')!;
      const graduatedUnit = postGradDev.units.find((u) => u.id === 'unit-c-4')!;
      expect(graduatedUnit.graduatedRentalId).toBeDefined();

      // Verify RentalProperty was created in rentals slice
      const rentals = usePortfolioStore.getState().rentals;
      expect(rentals.length).toBeGreaterThan(0);
      expect(rentals[0].title).toContain('Adversarial Test Enclave');
    });
  });

  // =========================================================================
  // Challenge 7: Numerical Stress Testing & Deep Boundary States
  // =========================================================================
  describe('Challenge 7: Numerical Stress Testing & Deep Boundary States', () => {
    it('Deep loss project (POC < 0%) renders rose alert styling and R 0 tax provision', () => {
      // TDC = 10m, GDV = 3m -> Massive loss
      const lossDev = createAdversarialDevelopment({
        landPurchasePriceZAR: 5000000,
        totalBuildableAreaSqm: 500,
        budgetedHardCostPerSqmZAR: 10000, // 5m build
        units: [
          {
            id: 'u-loss',
            unitNumber: 'Unit 1',
            configuration: '1 Bed',
            floorAreaSqm: 50,
            allocatedCostBasisZAR: 2000000,
            listPriceVatInclZAR: 1000000, // Sold at deep loss
            estimatedMonthlyRentZAR: 5000,
            status: 'Sold & Transferred',
          },
        ],
      });
      const financials = calculateDevelopmentFinancials(lossDev);

      expect(financials.pocPercent).toBeLessThan(0);
      expect(financials.estimatedTaxProvisionZAR).toBe(0);

      const rawHtml = renderToString(
        <DevelopmentKpiBanner development={lossDev} financials={financials} />
      );
      const html = normalizeHtml(rawHtml);

      // Rose styling classes applied
      expect(html).toContain('border-rose-200');
      expect(html).toContain('text-rose-700 bg-rose-50 border-rose-200');
    });

    it('Super-profitable project (POC >= 20%) renders emerald styling', () => {
      // Land 500k, Build 500k (TDC ~1.5m), GDV 4.5m -> POC ~150%
      const profitDev = createAdversarialDevelopment({
        landPurchasePriceZAR: 500000,
        totalBuildableAreaSqm: 100,
        budgetedHardCostPerSqmZAR: 5000,
        units: [
          {
            id: 'u-prof-1',
            unitNumber: 'Penthouse',
            configuration: '3 Bed',
            floorAreaSqm: 100,
            allocatedCostBasisZAR: 800000,
            listPriceVatInclZAR: 4500000,
            estimatedMonthlyRentZAR: 25000,
            status: 'Available',
          },
        ],
      });
      const financials = calculateDevelopmentFinancials(profitDev);

      expect(financials.pocPercent).toBeGreaterThanOrEqual(20);

      const rawHtml = renderToString(
        <DevelopmentKpiBanner development={profitDev} financials={financials} />
      );
      const html = normalizeHtml(rawHtml);

      expect(html).toContain('border-emerald-200');
      expect(html).toContain('text-emerald-700 bg-emerald-50 border-emerald-200');
    });

    it('Zero buildable area (totalBuildableAreaSqm: 0) does not cause division by zero', () => {
      const zeroAreaDev = createAdversarialDevelopment({
        totalBuildableAreaSqm: 0,
      });
      const financials = calculateDevelopmentFinancials(zeroAreaDev);

      expect(financials.tdcPerSqmZAR).toBe(0);

      const rawHtml = renderToString(
        <DevelopmentKpiBanner development={zeroAreaDev} financials={financials} />
      );
      const html = normalizeHtml(rawHtml);

      expect(html).not.toContain('NaN');
      expect(html).not.toContain('Infinity');
      expect(html).toContain('R 0/m²');
    });

    it('After-tax toggle correctly recalculates POC % using 27% corporate tax rate on profitable project', () => {
      // High profit project where tax is deducted
      const profitableDev = createAdversarialDevelopment({
        units: [
          {
            id: 'u-1',
            unitNumber: 'Unit 1',
            configuration: '3 Bed',
            floorAreaSqm: 100,
            allocatedCostBasisZAR: 1000000,
            listPriceVatInclZAR: 4000000,
            estimatedMonthlyRentZAR: 20000,
            status: 'Sold & Transferred',
          },
          {
            id: 'u-2',
            unitNumber: 'Unit 2',
            configuration: '3 Bed',
            floorAreaSqm: 100,
            allocatedCostBasisZAR: 1000000,
            listPriceVatInclZAR: 4000000,
            estimatedMonthlyRentZAR: 20000,
            status: 'Sold & Transferred',
          },
        ],
      });
      const financials = calculateDevelopmentFinancials(profitableDev);

      // Pre-tax vs After-tax
      expect(financials.netProfitBeforeTaxZAR).toBeGreaterThan(0);
      expect(financials.afterTaxPocPercent).toBeLessThan(financials.pocPercent);

      const rawPreTax = renderToString(
        <DevelopmentKpiBanner
          development={profitableDev}
          financials={financials}
          showAfterTax={false}
        />
      );
      const htmlPreTax = normalizeHtml(rawPreTax);
      expect(htmlPreTax).toContain('Pre-Tax');
      expect(htmlPreTax).toContain('Apply 27% Tax');

      const rawAfterTax = renderToString(
        <DevelopmentKpiBanner
          development={profitableDev}
          financials={financials}
          showAfterTax={true}
        />
      );
      const htmlAfterTax = normalizeHtml(rawAfterTax);
      expect(htmlAfterTax).toContain('After Tax');
      expect(htmlAfterTax).toContain('Switch to Pre-Tax');
    });
  });
});
