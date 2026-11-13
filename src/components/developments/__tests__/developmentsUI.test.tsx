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
import ProjectCommentsLedgerModal from '@/components/developments/ProjectCommentsLedgerModal';
import DealRoomViewer from '@/components/developments/DealRoomViewer';
import TasksPage from '@/app/tasks/page';
import {
  buildProjectCommentTaskId,
  maskDevelopmentForPublicDealRoom,
} from '@/lib/calculations/commentsLedger';
import Sidebar from '@/components/navigation/Sidebar';
import {
  DevelopmentProject,
  DevelopmentUnit,
  PreConstructionApprovals,
  DevelopmentSoftCosts,
} from '@/types';
import {
  calculateDevelopmentFinancials,
  calculateDevelopmentSoftCostsTotal,
} from '@/lib/calculations/developments';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';

vi.mock('next/navigation', () => ({
  usePathname: () => '/developments',
}));

// Realistic South African sample development project
const createSampleDevelopment = (
  overrides?: Partial<DevelopmentProject>
): DevelopmentProject => {
  const units: DevelopmentUnit[] = [
    {
      id: 'unit-1',
      unitNumber: 'Unit 1',
      configuration: '2 Bed 1 Bath',
      floorAreaSqm: 65,
      allocatedCostBasisZAR: 620000,
      listPriceVatInclZAR: 950000,
      estimatedMonthlyRentZAR: 8500,
      status: 'Sold & Transferred',
      buyerName: 'Thabo Mokoena',
      conveyancerRef: 'ST-2026/011',
      soldDate: '2026-10-01',
    },
    {
      id: 'unit-2',
      unitNumber: 'Unit 2',
      configuration: '2 Bed 1 Bath',
      floorAreaSqm: 65,
      allocatedCostBasisZAR: 620000,
      listPriceVatInclZAR: 950000,
      estimatedMonthlyRentZAR: 8500,
      status: 'Reserved (OTP Signed)',
      buyerName: 'Sarah Jenkins',
    },
    {
      id: 'unit-3',
      unitNumber: 'Unit 3',
      configuration: '3 Bed 2 Bath',
      floorAreaSqm: 85,
      allocatedCostBasisZAR: 780000,
      listPriceVatInclZAR: 1250000,
      estimatedMonthlyRentZAR: 11500,
      status: 'Available',
    },
    {
      id: 'unit-4',
      unitNumber: 'Unit 4',
      configuration: '3 Bed 2 Bath',
      floorAreaSqm: 85,
      allocatedCostBasisZAR: 780000,
      listPriceVatInclZAR: 1250000,
      estimatedMonthlyRentZAR: 11500,
      status: 'Retained for Rental',
    },
    {
      id: 'unit-5',
      unitNumber: 'Unit 5',
      configuration: '2 Bed 1 Bath',
      floorAreaSqm: 65,
      allocatedCostBasisZAR: 620000,
      listPriceVatInclZAR: 950000,
      estimatedMonthlyRentZAR: 8500,
      status: 'Retained for Rental',
    },
    {
      id: 'unit-6',
      unitNumber: 'Unit 6',
      configuration: '2 Bed 1 Bath',
      floorAreaSqm: 65,
      allocatedCostBasisZAR: 620000,
      listPriceVatInclZAR: 950000,
      estimatedMonthlyRentZAR: 8500,
      status: 'Retained for Rental',
    },
  ];

  const softCosts: DevelopmentSoftCosts = {
    townPlannerZAR: 45000,
    architectZAR: 85000,
    structuralCivilEngineerZAR: 55000,
    quantitySurveyorZAR: 35000,
    nhbrcEnrolmentFeeZAR: 40000,
    councilBulkContributionsZAR: 120000,
    planScrutinyAndSubdivisionFeesZAR: 25000,
    marketingAndShowUnitZAR: 30000,
  };

  const approvals: PreConstructionApprovals = {
    splumaRezoningSubdivision: {
      status: 'Approved',
      referenceNo: 'MPT-2026/012',
      approvedDate: '2026-08-15',
    },
    sgDiagramApproval: {
      status: 'Approved',
      referenceNo: 'SG-D481/2026',
      approvedDate: '2026-09-01',
    },
    municipalBuildingPlans: {
      status: 'Approved',
      referenceNo: 'BP-2026/884',
      approvedDate: '2026-09-20',
    },
    nhbrcEnrolment: {
      status: 'Approved',
      referenceNo: 'NHBRC-GP-9912',
      approvedDate: '2026-10-05',
    },
    sectionalTitleRegister: {
      status: 'Submitted',
      referenceNo: 'ST-REG-4401',
      targetApprovalDate: '2026-12-15',
    },
    occupancyCertificate: {
      status: 'Not Started',
    },
  };

  return {
    id: 'dev-sample-1',
    title: 'Parkview Infill Clusters',
    address: '14 Tyrone Avenue, Parkview',
    city: 'Johannesburg',
    province: 'Gauteng',
    developmentType: 'Sectional Title Apartments',
    isVatRegisteredDeveloper: true,
    taxEntityType: 'Company (27%)',
    currentPhase: 'Superstructure',
    preApprovalMonths: 6,
    constructionMonths: 10,
    sellDownMonths: 4,
    landPurchasePriceZAR: 1800000,
    acquisitionCostsZAR: 95000,
    sec118ArrearsZAR: 0,
    softCosts,
    totalBuildableAreaSqm: 430,
    budgetedHardCostPerSqmZAR: 9500,
    contingencyPercent: 7.5,
    boqItems: [
      {
        id: 'boq-1',
        category: 'Demolition & Prep',
        itemDescription: 'Site clearance & bulk earthworks',
        unit: 'lump sum',
        quantity: 1,
        baselineUnitCostZAR: 85000,
        baselineTotalZAR: 85000,
        actualCostZAR: 90000,
        varianceZAR: 5000,
        supplierOrContractor: 'Diggers Civil Earthworks',
        status: 'Completed',
        milestonePhase: 'Deposit',
      },
      {
        id: 'boq-2',
        category: 'Roofing & Structural',
        itemDescription: 'Reinforced concrete raft foundation & ground slab',
        unit: 'm2',
        quantity: 430,
        baselineUnitCostZAR: 1200,
        baselineTotalZAR: 516000,
        actualCostZAR: 516000,
        varianceZAR: 0,
        supplierOrContractor: 'Lafarge ReadyMix Concrete',
        status: 'In Progress',
        milestonePhase: 'First Fix / Wet Works',
      },
    ],
    monthlyPreApprovalHoldingBurnZAR: 9500,
    monthlyConstructionHoldingBurnZAR: 16500,
    developmentFacilityLimitZAR: 4500000,
    developmentFacilityDrawnZAR: 2800000,
    developmentFacilityRepaidZAR: 826087,
    preSalesHurdlePercent: 60,
    approvals,
    units,
    notes: 'Sample prime sectional title cluster project in Parkview node.',
    createdAt: '2026-06-01',
    ...overrides,
  };
};

describe('Development Module UI Components & Navigation (Milestone 3)', () => {
  beforeEach(() => {
    usePortfolioStore.setState({
      developments: [createSampleDevelopment()],
    });
  });

  describe('1. DevelopmentKpiBanner Component', () => {
    it('renders all 6 top-level KPI cards with accurate formatted figures', () => {
      const dev = createSampleDevelopment();
      const financials = calculateDevelopmentFinancials(dev);

      const html = renderToString(
        <DevelopmentKpiBanner development={dev} financials={financials} />
      );

      // 1. TDC Card
      expect(html).toContain('TDC (Total Cost)');
      expect(html).toContain(financials.tdcPerSqmZAR.toLocaleString('en-ZA'));
      expect(html).toContain('/m²');
      expect(html).toContain('/unit');

      // 2. GDV Card
      expect(html).toContain('GDV (Gross Value)');
      expect(html).toContain('15% VAT • R0 Buyer Duty');

      // 3. Profit on Cost Card
      expect(html).toContain('Profit on Cost');
      expect(html).toContain(`${financials.pocPercent.toFixed(1)}%`);
      expect(html).toContain('Pre-Tax');

      // 4. Hard Build Rate Card
      expect(html).toContain('Hard Build Rate');
      expect(html).toContain('Actual BOQ:');

      // 5. Pre-Sales & Debt Wipeout Card
      expect(html).toContain('Pre-Sales &amp; Debt');
      expect(html).toContain(`${financials.preSoldUnitsCount}/${financials.totalUnitsCount} Units`);
      expect(html).toContain('Wipeout:');

      // 6. Hybrid Split-Exit Card
      expect(html).toContain('Hybrid Split-Exit');
      expect(html).toContain(`${financials.unitsSoldAndTransferredCount} Sold • ${financials.unitsRetainedCount} Retained`);
    });

    it('displays Direct / Non-VAT pill when developer is not VAT registered', () => {
      const dev = createSampleDevelopment({ isVatRegisteredDeveloper: false });
      const financials = calculateDevelopmentFinancials(dev);

      const html = renderToString(
        <DevelopmentKpiBanner development={dev} financials={financials} />
      );

      expect(html).toContain('Direct / Non-VAT');
      expect(html).not.toContain('15% VAT • R0 Buyer Duty');
    });

    it('renders Section 13sex active badge when >= 5 units are retained', () => {
      // Create 5 retained units
      const dev = createSampleDevelopment();
      dev.units = dev.units.map((u, i) => ({
        ...u,
        status: i < 5 ? ('Retained for Rental' as const) : u.status,
      }));
      const financials = calculateDevelopmentFinancials(dev);
      expect(financials.isSection13SexEligible).toBe(true);

      const html = renderToString(
        <DevelopmentKpiBanner development={dev} financials={financials} />
      );

      expect(html).toContain('Section 13sex Active');
    });

    it('renders after-tax state when showAfterTax prop is true', () => {
      const dev = createSampleDevelopment();
      const financials = calculateDevelopmentFinancials(dev);

      const html = renderToString(
        <DevelopmentKpiBanner
          development={dev}
          financials={financials}
          showAfterTax={true}
        />
      );

      expect(html).toContain('After Tax');
      expect(html).toContain('Switch to Pre-Tax');
      expect(html).toContain(`${financials.afterTaxPocPercent.toFixed(1)}%`);
    });
  });

  describe('2. DevelopmentUnitInventoryTab Component', () => {
    it('renders unit inventory table with all unit numbers, floor areas, and list prices', () => {
      const dev = createSampleDevelopment();
      const financials = calculateDevelopmentFinancials(dev);

      const html = renderToString(
        <DevelopmentUnitInventoryTab
          development={dev}
          financials={financials}
          onUpdateUnit={vi.fn()}
          onMarkUnitSold={vi.fn()}
          onGraduateRetainedUnits={vi.fn()}
        />
      );

      expect(html).toContain('Unit Inventory &amp; Split-Exit Schedule');
      expect(html).toContain('Unit 1');
      expect(html).toContain('Unit 2');
      expect(html).toContain('Unit 3');
      expect(html).toContain('Unit 4');
      expect(html).toContain('65 m²');
      expect(html).toContain('85 m²');
      expect(html).toContain('Thabo Mokoena');
      expect(html).toContain('Ref: ST-2026/011');
    });

    it('renders status counts chips for all statuses', () => {
      const dev = createSampleDevelopment();
      const financials = calculateDevelopmentFinancials(dev);

      const html = renderToString(
        <DevelopmentUnitInventoryTab
          development={dev}
          financials={financials}
          onUpdateUnit={vi.fn()}
          onMarkUnitSold={vi.fn()}
          onGraduateRetainedUnits={vi.fn()}
        />
      );

      expect(html).toContain('Sold &amp; Transferred: 1');
      expect(html).toContain('Reserved (OTP Signed): 1');
      expect(html).toContain('Available: 1');
      expect(html).toContain('Retained for Rental: 3');
    });

    it('enables Graduate Retained Units button when ungraduated retained units exist', () => {
      const dev = createSampleDevelopment();
      const financials = calculateDevelopmentFinancials(dev);

      const html = renderToString(
        <DevelopmentUnitInventoryTab
          development={dev}
          financials={financials}
          onUpdateUnit={vi.fn()}
          onMarkUnitSold={vi.fn()}
          onGraduateRetainedUnits={vi.fn()}
        />
      );

      expect(html).toContain('Graduate Retained Units to Rentals (3)');
      expect(html).not.toContain('cursor-not-allowed');
    });

    it('shows Mark Sold button only for Available or Reserved units', () => {
      const dev = createSampleDevelopment();
      const financials = calculateDevelopmentFinancials(dev);

      const html = renderToString(
        <DevelopmentUnitInventoryTab
          development={dev}
          financials={financials}
          onUpdateUnit={vi.fn()}
          onMarkUnitSold={vi.fn()}
          onGraduateRetainedUnits={vi.fn()}
        />
      );

      // Unit 2 (Reserved) and Unit 3 (Available) can be marked sold
      expect(html).toContain('Mark Sold');
    });

    it('renders sticky totals footer with correct unit count and floor area sum', () => {
      const dev = createSampleDevelopment();
      const financials = calculateDevelopmentFinancials(dev);

      const html = renderToString(
        <DevelopmentUnitInventoryTab
          development={dev}
          financials={financials}
          onUpdateUnit={vi.fn()}
          onMarkUnitSold={vi.fn()}
          onGraduateRetainedUnits={vi.fn()}
        />
      );

      expect(html).toContain('Total / Portfolio');
      expect(html).toContain('6 Units');
      expect(html).toContain('430 m²');
    });
  });

  describe('3. DevelopmentCostStackTab Component', () => {
    it('renders soft costs inputs, hard construction BOQ, and holding burn parameters', () => {
      const dev = createSampleDevelopment();
      const financials = calculateDevelopmentFinancials(dev);

      const html = renderToString(
        <DevelopmentCostStackTab
          development={dev}
          financials={financials}
          onUpdateSoftCosts={vi.fn()}
          onUpdateDevelopment={vi.fn()}
          onUpdateBOQItem={vi.fn()}
          onDeleteBOQItem={vi.fn()}
        />
      );

      // Section A: Professional fees
      expect(html).toContain('Town Planner (SPLUMA)');
      expect(html).toContain('Architect / Draftsperson');
      expect(html).toContain('Structural &amp; Civil Engineer');
      expect(html).toContain('Quantity Surveyor (QS)');
      expect(html).toContain('Council Bulk Contributions');
      expect(html).toContain('NHBRC Enrolment Fee');
      expect(html).toContain('Plan Scrutiny &amp; Council Fees');
      expect(html).toContain('Marketing &amp; Show Unit');

      // Section B: BOQ Table integration
      expect(html).toContain('Hard Construction Bill of Quantities (BOQ)');
      expect(html).toContain('Site clearance &amp; bulk earthworks');
      expect(html).toContain('Diggers Civil Earthworks');

      // Section C: Timeline & Holding
      expect(html).toContain('Timeline, Holding Burn &amp; Contingency Reserves');
      expect(html).toContain('Pre-Approval Months');
      expect(html).toContain('Construction Months');
      expect(html).toContain('Contingency Reserve (%)');
    });
  });

  describe('4. DevelopmentApprovalsTab Component', () => {
    it('renders 6 statutory approval cards and stage-gate governance', () => {
      const dev = createSampleDevelopment();

      const html = renderToString(
        <DevelopmentApprovalsTab
          development={dev}
          onUpdateApproval={vi.fn()}
        />
      );

      expect(html).toContain('6-Card Statutory &quot;Paper Rights&quot; Compliance Tracker');
      expect(html).toContain('SPLUMA Section 42 Rezoning &amp; Subdivision');
      expect(html).toContain('Surveyor-General (SG) Diagram Approval');
      expect(html).toContain('Municipal Building Plans (NBR Sec 7(1))');
      expect(html).toContain('NHBRC Enrolment Certificate');
      expect(html).toContain('Sectional Title Register Proclamation');
      expect(html).toContain('Municipal Occupancy Certificate (Sec 14 NBR)');

      // Stage-Gate indicator
      expect(html).toContain('Stage 1: Paper Rights');
      expect(html).toContain('Simulate Objection Delay');
      expect(html).toContain('Synced to /tasks with 14-day statutory reminder');
    });

    it('indicates when Stage 1 is fully unlocked vs pending', () => {
      const dev = createSampleDevelopment();
      const html = renderToString(
        <DevelopmentApprovalsTab
          development={dev}
          onUpdateApproval={vi.fn()}
        />
      );

      // In sample development, 4 stage 1 approvals are Approved
      expect(html).toContain('Stage 1 Unlocked: Construction Draws Approved');
    });
  });

  describe('5. DevelopmentFinanceTab Component', () => {
    it('renders senior bank facility health, pre-sales hurdle, and debt wipeout waterfall', () => {
      const dev = createSampleDevelopment();
      const financials = calculateDevelopmentFinancials(dev);

      const html = renderToString(
        <DevelopmentFinanceTab
          development={dev}
          financials={financials}
          onUpdateDevelopment={vi.fn()}
        />
      );

      // Facility Health
      expect(html).toContain('Senior Bank Facility');
      expect(html).toContain('Outstanding Facility Debt:');
      expect(html).toContain('Record Repayment');
      expect(html).toContain('+ Record Drawdown');

      // Pre-sales Hurdle
      expect(html).toContain('Pre-Sales Bank Gate');
      expect(html).toContain('Current Pre-Sold GDV:');
      expect(html).toContain('Hurdle Target:');

      // Debt wipeout breakeven
      expect(html).toContain('Debt Wipeout Breakeven');
      expect(html).toContain('Units for 100% Debt Wipeout:');
      expect(html).toContain('Unit-by-Unit Waterfall: Debt Extinguishment vs Unencumbered Equity');
      expect(html).toContain('Senior Debt Repayment');
      expect(html).toContain('Free-Carry Sponsor Equity');
    });
  });

  describe('6. DevelopmentProjectModal Component', () => {
    it('returns null when isOpen is false', () => {
      const html = renderToString(
        <DevelopmentProjectModal
          isOpen={false}
          editingDevelopment={null}
          onClose={vi.fn()}
          onSave={vi.fn()}
        />
      );
      expect(html).toBe('');
    });

    it('renders create modal when isOpen is true and editingDevelopment is null', () => {
      const html = renderToString(
        <DevelopmentProjectModal
          isOpen={true}
          editingDevelopment={null}
          onClose={vi.fn()}
          onSave={vi.fn()}
        />
      );

      expect(html).toContain('Create New Development Project');
      expect(html).toContain('1. Identity, Strategy &amp; Location');
      expect(html).toContain('2. Phase, VAT &amp; Tax Entity');
      expect(html).toContain('3. Land Acquisition &amp; Construction Budget');
      expect(html).toContain('4. Project Timelines &amp; Carrying Burn');
      expect(html).toContain('5. Senior Debt Facility &amp; Bank Hurdle');
      expect(html).toContain('Create Development Project');
    });

    it('renders edit modal with populated project title when editingDevelopment is passed', () => {
      const dev = createSampleDevelopment();
      const html = renderToString(
        <DevelopmentProjectModal
          isOpen={true}
          editingDevelopment={dev}
          onClose={vi.fn()}
          onSave={vi.fn()}
        />
      );

      expect(html).toContain('Edit Parkview Infill Clusters');
      expect(html).toContain('Save Changes');
    });

    it('renders accessible dialog attributes and backdrop for light dismiss', () => {
      const html = renderToString(
        <DevelopmentProjectModal
          isOpen={true}
          editingDevelopment={null}
          onClose={vi.fn()}
          onSave={vi.fn()}
        />
      );

      expect(html).toContain('role="dialog"');
      expect(html).toContain('aria-modal="true"');
      expect(html).toContain('id="development-project-modal-title"');
      expect(html).toContain('cursor-pointer');
    });
  });

  describe('7. DevelopmentsPage Controller Integration', () => {
    it('renders DevelopmentsPage with active development header and tabs', () => {
      usePortfolioStore.setState({ developments: [createSampleDevelopment()] });
      const html = renderToString(<DevelopmentsPage />);

      expect(html).toContain('Developments Manager');
      expect(html).toContain('+ New Development Project');
      expect(html).toContain('Parkview Infill Clusters');
      expect(html).toContain('Unit Inventory &amp; Split-Exit');
      expect(html).toContain('Cost Stack &amp; Hard Build BOQ');
      expect(html).toContain('Paper Rights &amp; Approvals (6)');
      expect(html).toContain('Finance &amp; Pre-Sales Gate');
    });

    it('renders empty state when no developments exist in the store', () => {
      usePortfolioStore.setState({ developments: [] });
      const html = renderToString(<DevelopmentsPage />);

      expect(html).toContain('No Development Projects');
      expect(html).toContain('Get started by creating your first sectional title or township infill project.');
      expect(html).toContain('Create Development Project');
    });
  });

  describe('8. Sidebar Navigation Route Registration', () => {
    it('includes Developments route with HardHat icon in navItems', () => {
      const html = renderToString(<Sidebar />);

      expect(html).toContain('href="/developments"');
      expect(html).toContain('Developments');
    });
  });

  describe('9. Tier 1 Collaboration Ledger, Read-Only View & Task Entity Support', () => {
    it('renders Team Ledger badge count, Export Team Excel button, and Read-Only View toggle on DevelopmentsPage', () => {
      usePortfolioStore.setState({
        developments: [
          createSampleDevelopment({
            commentsLedger: [
              {
                id: 'hdr-c-1',
                authorName: 'K. Naidoo',
                authorRole: 'Quantity Surveyor (QS)',
                sectionTag: 'BOQ & Cost Stack',
                message: 'Confirm raft foundation rate.',
                status: 'In Progress',
                createdAt: '2026-11-10T08:00:00.000Z',
              },
              {
                id: 'hdr-c-2',
                authorName: 'T. Molefe',
                authorRole: 'Co-Developer / JV',
                sectionTag: 'Finance & Pre-Sales',
                message: 'Check Phase 1 price sheet.',
                status: 'Pending',
                createdAt: '2026-11-10T09:00:00.000Z',
              },
              {
                id: 'hdr-c-3',
                authorName: 'L. Mthembu',
                authorRole: 'Town Planner',
                sectionTag: 'Paper Rights & Approvals',
                message: 'SPLUMA cleared.',
                status: 'Resolved',
                createdAt: '2026-11-08T08:00:00.000Z',
                resolvedAt: '2026-11-09T12:00:00.000Z',
              },
            ],
          }),
        ],
      });

      const html = renderToString(<DevelopmentsPage />);
      expect(html).toContain('Team Ledger (2 Open)');
      expect(html).toContain('Export Team Excel (.xlsx)');
      expect(html).toContain('Share Deal Room');
      expect(html).toContain('data-testid="open-team-ledger-btn"');
      expect(html).toContain('data-testid="export-team-excel-btn"');
      expect(html).toContain('data-testid="share-deal-room-btn"');
      expect(html).toContain('data-testid="share-deal-room-menu-btn"');
      expect(html).toContain('data-testid="developments-header-toolbar"');
      expect(html).not.toContain('data-testid="toggle-readonly-btn"');
    });

    it('renders ProjectCommentsLedgerModal controls in editable mode and locks mutations in readOnly mode', () => {
      const dev = createSampleDevelopment({
        commentsLedger: [
          {
            id: 'mod-c-1',
            authorName: 'K. Naidoo',
            authorRole: 'Quantity Surveyor (QS)',
            sectionTag: 'BOQ & Cost Stack',
            message: 'Raft foundation rate under QS review.',
            status: 'Pending',
            createdAt: '2026-11-10T08:00:00.000Z',
          },
          {
            id: 'mod-c-2',
            authorName: 'T. Molefe',
            authorRole: 'Co-Developer / JV',
            sectionTag: 'Finance & Pre-Sales',
            message: 'Lender pricing check underway.',
            status: 'In Progress',
            createdAt: '2026-11-10T09:00:00.000Z',
          },
          {
            id: 'mod-c-3',
            authorName: 'L. Mthembu',
            authorRole: 'Town Planner',
            sectionTag: 'Paper Rights & Approvals',
            message: 'SPLUMA Sec 42 approved.',
            status: 'Resolved',
            createdAt: '2026-11-07T08:00:00.000Z',
            resolvedAt: '2026-11-08T15:00:00.000Z',
          },
        ],
      });

      const syncedSet = new Set<string>([buildProjectCommentTaskId(dev.id, 'mod-c-1')]);

      const editableHtml = renderToString(
        <ProjectCommentsLedgerModal
          isOpen={true}
          onClose={() => {}}
          development={dev}
          defaultAuthorName="Moremela Holdings"
          readOnly={false}
          existingTaskIds={syncedSet}
          onAddComment={() => {}}
          onTransitionStatus={() => {}}
          onDeleteComment={() => {}}
          onSyncCommentToTask={() => {}}
        />
      );

      expect(editableHtml).toContain('data-testid="project-comments-ledger-modal"');
      expect(editableHtml).toContain('All (3)');
      expect(editableHtml).toContain('Pending (1)');
      expect(editableHtml).toContain('In Progress (1)');
      expect(editableHtml).toContain('Resolved (1)');
      expect(editableHtml).toContain('bg-amber-100 text-amber-800 border-amber-300');
      expect(editableHtml).toContain('bg-blue-100 text-blue-800 border-blue-300');
      expect(editableHtml).toContain('bg-emerald-100 text-emerald-800 border-emerald-300');
      expect(editableHtml).toContain('data-testid="add-comment-form"');
      expect(editableHtml).toContain('data-testid="triage-btn-mod-c-1-Resolved"');
      expect(editableHtml).toContain('data-testid="delete-comment-btn-mod-c-2"');
      expect(editableHtml).toContain('data-testid="sync-task-btn-mod-c-1"');
      expect(editableHtml).toContain('data-testid="sync-task-btn-mod-c-2"');
      expect(editableHtml).not.toContain('data-testid="sync-task-btn-mod-c-3"');
      expect(editableHtml).toContain('Synced to /tasks');
      expect(editableHtml).toContain('Sync to /tasks');
      expect(editableHtml).not.toContain('data-testid="ledger-readonly-banner"');

      const readOnlyHtml = renderToString(
        <ProjectCommentsLedgerModal
          isOpen={true}
          onClose={() => {}}
          development={dev}
          defaultAuthorName="Moremela Holdings"
          readOnly={true}
          existingTaskIds={syncedSet}
          onAddComment={() => {}}
          onTransitionStatus={() => {}}
          onDeleteComment={() => {}}
          onSyncCommentToTask={() => {}}
        />
      );

      expect(readOnlyHtml).toContain('data-testid="project-comments-ledger-modal"');
      expect(readOnlyHtml).toContain('data-testid="ledger-readonly-banner"');
      expect(readOnlyHtml).toContain('data-testid="ledger-filter-Pending"');
      expect(readOnlyHtml).toContain('Raft foundation rate under QS review.');
      expect(readOnlyHtml).not.toContain('data-testid="add-comment-form"');
      expect(readOnlyHtml).not.toContain('data-testid="triage-btn-');
      expect(readOnlyHtml).not.toContain('data-testid="delete-comment-btn-');
      expect(readOnlyHtml).not.toContain('data-testid="sync-task-btn-');
    });

    it('locks mutating controls across all 4 tabs in readOnly mode while preserving CSV export and delay simulator', () => {
      const dev = createSampleDevelopment({
        boqItems: [
          {
            id: 'boq-ro-1',
            category: 'Plumbing & Wet Works',
            itemDescription: 'Stormwater drainage pipes',
            unit: 'm',
            quantity: 50,
            baselineUnitCostZAR: 400,
            baselineTotalZAR: 20000,
            actualCostZAR: 19500,
            varianceZAR: -500,
            supplierOrContractor: 'Jozi Civils',
            status: 'In Progress',
          },
        ],
      });
      const fin = calculateDevelopmentFinancials(dev);

      const unitsHtml = renderToString(
        <DevelopmentUnitInventoryTab
          development={dev}
          financials={fin}
          readOnly={true}
          onUpdateUnit={() => {}}
          onAddUnit={() => {}}
          onDeleteUnit={() => {}}
          onMarkUnitSold={() => {}}
          onGraduateRetainedUnits={() => {}}
        />
      );
      expect(unitsHtml).toContain('disabled=""');
      expect(unitsHtml).toContain('Locked in Read-Only View');

      const costsHtml = renderToString(
        <DevelopmentCostStackTab
          development={dev}
          financials={fin}
          readOnly={true}
          onUpdateSoftCosts={() => {}}
          onUpdateDevelopment={() => {}}
          onAddBOQItem={() => {}}
          onUpdateBOQItem={() => {}}
          onDeleteBOQItem={() => {}}
        />
      );
      expect(costsHtml).toContain('Export BOQ (CSV)');
      expect(costsHtml).toContain('disabled=""');

      const approvalsHtml = renderToString(
        <DevelopmentApprovalsTab
          development={dev}
          financials={fin}
          readOnly={true}
          onUpdateApproval={() => {}}
          onOpenDelayMatrix={() => {}}
        />
      );
      expect(approvalsHtml).toContain('Simulate Objection Delay');
      expect(approvalsHtml).toContain('disabled=""');

      const financeHtml = renderToString(
        <DevelopmentFinanceTab
          development={dev}
          financials={fin}
          readOnly={true}
          onUpdateDevelopment={() => {}}
        />
      );
      expect(financeHtml).toContain('+ Record Drawdown');
      expect(financeHtml).toContain('disabled=""');
    });

    it('includes development entity option in TasksPage filter and zero Unicode emojis in ProjectCommentsLedgerModal', async () => {
      const html = renderToString(<TasksPage />);
      expect(html).toContain('value="development"');
      expect(html).toContain('Developments');

      const fs = await import('node:fs');
      const path = await import('node:path');
      const modalSrc = fs.readFileSync(
        path.resolve(process.cwd(), 'src/components/developments/ProjectCommentsLedgerModal.tsx'),
        'utf-8'
      );
      const viewerSrc = fs.readFileSync(
        path.resolve(process.cwd(), 'src/components/developments/DealRoomViewer.tsx'),
        'utf-8'
      );
      const pageSrc = fs.readFileSync(
        path.resolve(process.cwd(), 'src/app/developments/page.tsx'),
        'utf-8'
      );
      expect(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(modalSrc)).toBe(false);
      expect(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(viewerSrc)).toBe(false);
      expect(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(pageSrc)).toBe(false);
    });

    it('renders public DealRoomViewer with POPIA unit buyer/conveyancer masking, Pending comment form, and zero mutation controls', () => {
      const rawDev = createSampleDevelopment({
        shareToken: 'secret-token-should-not-leak',
        units: [
          {
            id: 'u-popia-1',
            unitNumber: 'Unit 1A',
            configuration: '2 Bed 1 Bath',
            floorAreaSqm: 68,
            allocatedCostBasisZAR: 620000,
            listPriceVatInclZAR: 950000,
            estimatedMonthlyRentZAR: 8500,
            status: 'Sold & Transferred',
            buyerName: 'Kagiso Sithole',
            conveyancerRef: 'CV/2026/091',
            depositHeldZAR: 50000,
          },
          {
            id: 'u-popia-2',
            unitNumber: 'Unit 2A',
            configuration: '2 Bed 1 Bath',
            floorAreaSqm: 68,
            allocatedCostBasisZAR: 620000,
            listPriceVatInclZAR: 960000,
            estimatedMonthlyRentZAR: 8600,
            status: 'Available',
            depositHeldZAR: 0,
          },
        ],
        commentsLedger: [
          {
            id: 'dr-c-1',
            authorName: 'K. Naidoo',
            authorRole: 'Quantity Surveyor (QS)',
            sectionTag: 'BOQ & Cost Stack',
            message: 'BOQ foundation rate verified.',
            status: 'In Progress',
            createdAt: '2026-11-10T08:00:00.000Z',
          },
        ],
      });

      const masked = maskDevelopmentForPublicDealRoom(rawDev);
      expect(masked.shareToken).toBeUndefined();
      expect(masked.units[0].buyerName).toBe('Private Buyer (Masked)');
      expect(masked.units[0].conveyancerRef).toBeUndefined();
      expect(masked.units[1].buyerName).toBeUndefined();

      const viewerHtml = renderToString(
        <DealRoomViewer
          token="dev-1"
          dealRoomData={{
            development: rawDev, // Viewer also enforces defense-in-depth masking
            sponsor: {
              entityName: 'L&M Property Investments (Pty) Ltd',
              registrationNumber: '2026/123456/07',
            },
            isDemo: true,
          }}
        />
      );

      expect(viewerHtml).toContain('data-testid="public-deal-room-viewer"');
      expect(viewerHtml).toContain('data-sensitive="true"');
      expect(viewerHtml).toContain('POPIA Privacy Masked');
      expect(viewerHtml).toContain('Private Buyer (Masked)');
      expect(viewerHtml).not.toContain('Kagiso Sithole');
      expect(viewerHtml).not.toContain('CV/2026/091');
      expect(viewerHtml).not.toContain('secret-token-should-not-leak');
      expect(viewerHtml).toContain('data-testid="deal-room-export-excel-btn"');
      expect(viewerHtml).toContain('Team Ledger (1 Open)');
      expect(viewerHtml).toContain('data-testid="deal-room-add-comment-form"');
      expect(viewerHtml).toContain('Logs as Pending');
      expect(viewerHtml).not.toContain('data-testid="triage-btn-');
      expect(viewerHtml).not.toContain('data-testid="delete-comment-btn-');
      expect(viewerHtml).not.toContain('data-testid="sync-task-btn-');
    });
  });
});
