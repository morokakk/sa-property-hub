import { describe, it, expect, beforeEach } from 'vitest';
import {
  usePortfolioStore,
  computePortfolioSummary,
  syncDevelopmentApprovalTasks,
  sanitizePersistedDevelopments,
} from '../usePortfolioStore';
import { INITIAL_DEVELOPMENTS, INITIAL_FUNDING } from '../initialData';
import {
  DevelopmentProject,
  DevelopmentUnit,
  OpportunityDeal,
  PreConstructionApprovals,
} from '@/types';

describe('Milestone 2: Development Slice & Cross-Module Bridges Test Suite', () => {
  beforeEach(() => {
    usePortfolioStore.getState().resetToDemoData();
    usePortfolioStore.setState({
      developments: JSON.parse(JSON.stringify(INITIAL_DEVELOPMENTS)),
      funding: JSON.parse(JSON.stringify(INITIAL_FUNDING)),
    });
  });

  describe('1. Slice State Initialization & Seed Data', () => {
    it('initializes with INITIAL_DEVELOPMENTS containing dev-1 and dev-2', () => {
      const state = usePortfolioStore.getState();
      expect(Array.isArray(state.developments)).toBe(true);
      expect(state.developments.length).toBe(2);

      const dev1 = state.developments.find((d) => d.id === 'dev-1');
      expect(dev1).toBeDefined();
      expect(dev1?.title).toBe('Ferndale 6-Unit Cluster Subdivision');
      expect(dev1?.isVatRegisteredDeveloper).toBe(true);
      expect(dev1?.developmentType).toBe('Subdivision & Cluster');
      expect(dev1?.units.length).toBe(6);
      expect(dev1?.linkedFundingSourceId).toBe('fund-dev-ferndale');

      const dev2 = state.developments.find((d) => d.id === 'dev-2');
      expect(dev2).toBeDefined();
      expect(dev2?.title).toBe('Kempton Park 10-Unit Micro-Apartment Infill');
      expect(dev2?.isVatRegisteredDeveloper).toBe(false);
      expect(dev2?.developmentType).toBe('Township Micro-Units (Infill)');
      expect(dev2?.units.length).toBe(10);
      expect(dev2?.units.every((u) => u.status === 'Retained for Rental')).toBe(true);
      expect(dev2?.linkedFundingSourceId).toBe('fund-tuhf-kempton');
    });

    it('contains linked development funding facilities in INITIAL_FUNDING', () => {
      const state = usePortfolioStore.getState();
      const fundDev1 = state.funding.find((f) => f.id === 'fund-dev-ferndale');
      expect(fundDev1).toBeDefined();
      expect(fundDev1?.capitalAmountZAR).toBe(4_200_000);
      expect(fundDev1?.linkedDealId).toBe('dev-1');
      expect(fundDev1?.totalRepaidZAR).toBe(2_750_000);
      expect(fundDev1?.status).toBe('Active');

      const fundDev2 = state.funding.find((f) => f.id === 'fund-tuhf-kempton');
      expect(fundDev2).toBeDefined();
      expect(fundDev2?.capitalAmountZAR).toBe(2_450_000);
      expect(fundDev2?.linkedDealId).toBe('dev-2');
      expect(fundDev2?.returnTermsType).toBe('Monthly Coupon');
    });
  });

  describe('2. addDevelopment, updateDevelopment, and deleteDevelopment', () => {
    it('adds a new development and synchronizes statutory approval tasks', () => {
      const targetApprovalDate = '2027-06-30';
      const newDev: DevelopmentProject = {
        id: 'dev-test-1',
        title: 'Morningside Quad Subdivision',
        address: '12 Rivonia Road, Sandton',
        city: 'Johannesburg',
        province: 'Gauteng',
        developmentType: 'Subdivision & Cluster',
        isVatRegisteredDeveloper: true,
        currentPhase: 'Feasibility',
        preApprovalMonths: 6,
        constructionMonths: 10,
        sellDownMonths: 4,
        landPurchasePriceZAR: 2_500_000,
        acquisitionCostsZAR: 180_000,
        sec118ArrearsZAR: 0,
        softCosts: {
          townPlannerZAR: 50_000,
          architectZAR: 90_000,
          structuralCivilEngineerZAR: 60_000,
          quantitySurveyorZAR: 40_000,
          nhbrcEnrolmentFeeZAR: 45_000,
          councilBulkContributionsZAR: 150_000,
          planScrutinyAndSubdivisionFeesZAR: 30_000,
          marketingAndShowUnitZAR: 35_000,
        },
        totalBuildableAreaSqm: 400,
        budgetedHardCostPerSqmZAR: 10_500,
        contingencyPercent: 7.5,
        boqItems: [],
        monthlyPreApprovalHoldingBurnZAR: 15_000,
        monthlyConstructionHoldingBurnZAR: 28_000,
        developmentFacilityLimitZAR: 5_000_000,
        developmentFacilityDrawnZAR: 0,
        developmentFacilityRepaidZAR: 0,
        preSalesHurdlePercent: 60,
        approvals: {
          splumaRezoningSubdivision: {
            status: 'Submitted',
            targetApprovalDate,
            referenceNo: 'COJ/SPLUMA/2027/99',
          },
          sgDiagramApproval: { status: 'Not Started' },
          municipalBuildingPlans: { status: 'Not Started' },
          nhbrcEnrolment: { status: 'Not Started' },
          sectionalTitleRegister: { status: 'Not Started' },
          occupancyCertificate: { status: 'Not Started' },
        },
        units: [],
      };

      usePortfolioStore.getState().addDevelopment(newDev);

      const state = usePortfolioStore.getState();
      expect(state.developments.find((d) => d.id === 'dev-test-1')).toBeDefined();

      // Verify statutory approval task was auto-generated
      const approvalTask = state.tasks.find(
        (t) => t.id === 'task-dev-approval-dev-test-1-splumaRezoningSubdivision'
      );
      expect(approvalTask).toBeDefined();
      expect(approvalTask?.title).toContain('SPLUMA Rezoning & Subdivision');
      expect(approvalTask?.linkedEntity?.type).toBe('development');
      expect(approvalTask?.linkedEntity?.id).toBe('dev-test-1');
      // Warning date must be 14 days before 2027-06-30 -> 2027-06-16
      expect(approvalTask?.dueDate).toBe('2027-06-16');
    });

    it('updates development and re-synchronizes approval tasks when target date changes', () => {
      usePortfolioStore.getState().updateDevelopment('dev-1', {
        approvals: {
          ...INITIAL_DEVELOPMENTS[0].approvals,
          occupancyCertificate: {
            status: 'Submitted',
            targetApprovalDate: '2027-01-31',
            referenceNo: 'COJ/OCC/2026/910',
          },
        },
      });

      const state = usePortfolioStore.getState();
      const dev1 = state.developments.find((d) => d.id === 'dev-1');
      expect(dev1?.approvals.occupancyCertificate.targetApprovalDate).toBe('2027-01-31');

      const occTask = state.tasks.find(
        (t) => t.id === 'task-dev-approval-dev-1-occupancyCertificate'
      );
      expect(occTask).toBeDefined();
      // 14 days before 2027-01-31 -> 2027-01-17
      expect(occTask?.dueDate).toBe('2027-01-17');
    });

    it('deletes development and cleans up linked approval tasks', () => {
      // First ensure task exists
      usePortfolioStore.getState().updateDevelopment('dev-1', {
        approvals: {
          ...INITIAL_DEVELOPMENTS[0].approvals,
          sectionalTitleRegister: {
            status: 'Submitted',
            targetApprovalDate: '2027-05-15',
          },
        },
      });

      let state = usePortfolioStore.getState();
      expect(
        state.tasks.some((t) => t.id === 'task-dev-approval-dev-1-sectionalTitleRegister')
      ).toBe(true);

      usePortfolioStore.getState().deleteDevelopment('dev-1');

      state = usePortfolioStore.getState();
      expect(state.developments.find((d) => d.id === 'dev-1')).toBeUndefined();
      expect(
        state.tasks.some(
          (t) => t.linkedEntity?.id === 'dev-1' && t.id.startsWith('task-dev-approval-')
        )
      ).toBe(false);
    });
  });

  describe('3. Unit Sales & Waterfall Debt Retirement (sellDevelopmentUnit)', () => {
    it('handles VAT-registered developer sale: strips 15% output VAT, retires debt, and does not credit reserve if debt remains', () => {
      const initialReserve = usePortfolioStore.getState().liquidCapitalReserve;

      // Ferndale dev-1: drawn = 4,200,000, repaid = 2,750,000, outstanding = 1,450,000
      // Sell unit dev1-u3 for R 1,395,000 list price
      usePortfolioStore
        .getState()
        .sellDevelopmentUnit('dev-1', 'dev1-u3', 'Dr. Sizwe Dlamini', 1_395_000);

      const state = usePortfolioStore.getState();
      const dev1 = state.developments.find((d) => d.id === 'dev-1')!;
      const unit3 = dev1.units.find((u) => u.id === 'dev1-u3')!;

      // Unit updated to Sold & Transferred
      expect(unit3.status).toBe('Sold & Transferred');
      expect(unit3.buyerName).toBe('Dr. Sizwe Dlamini');
      expect(unit3.soldDate).toBeDefined();

      // Net proceeds = Math.round(1,395,000 / 1.15) = 1,213,043
      // Outstanding was 1,450,000 > 1,213,043 -> all proceeds go to debt paydown
      const expectedRepaidDebt = 2_750_000 + 1_213_043; // 3,963,043
      expect(dev1.developmentFacilityRepaidZAR).toBe(expectedRepaidDebt);

      // Linked funding facility totalRepaidZAR updated
      const fundDev1 = state.funding.find((f) => f.id === 'fund-dev-ferndale')!;
      expect(fundDev1.totalRepaidZAR).toBe(expectedRepaidDebt);
      expect(fundDev1.status).toBe('Active'); // Still 236,957 remaining

      // Liquid reserve should remain unchanged because all proceeds paid down debt
      expect(state.liquidCapitalReserve).toBe(initialReserve);
    });

    it('credits surplus net cash to liquidCapitalReserve and marks funding Settled when debt is wiped out', () => {
      // First sale pays debt down to 3,963,043 (outstanding: 236,957)
      usePortfolioStore
        .getState()
        .sellDevelopmentUnit('dev-1', 'dev1-u3', 'Buyer A', 1_395_000);

      const reserveBeforeSecondSale = usePortfolioStore.getState().liquidCapitalReserve;

      // Second sale: dev1-u4 for R 1,425,000 -> net proceeds = Math.round(1,425,000 / 1.15) = 1,239,130
      // Outstanding debt = 4,200,000 - 3,963,043 = 236,957
      // Debt payment = 236,957 -> total repaid = 4,200,000 (100% repaid)
      // Surplus cash = 1,239,130 - 236,957 = 1,002,173
      usePortfolioStore
        .getState()
        .sellDevelopmentUnit('dev-1', 'dev1-u4', 'Buyer B', 1_425_000);

      const state = usePortfolioStore.getState();
      const dev1 = state.developments.find((d) => d.id === 'dev-1')!;

      expect(dev1.developmentFacilityRepaidZAR).toBe(4_200_000);

      const fundDev1 = state.funding.find((f) => f.id === 'fund-dev-ferndale')!;
      expect(fundDev1.totalRepaidZAR).toBe(4_200_000);
      expect(fundDev1.status).toBe('Settled');

      const expectedSurplus = 1_239_130 - 236_957;
      expect(state.liquidCapitalReserve).toBe(reserveBeforeSecondSale + expectedSurplus);
    });

    it('handles non-VAT developer sale: applies 100% of gross price without VAT deduction', () => {
      // dev-2 is not VAT registered: drawn = 1,850,000, repaid = 0
      usePortfolioStore
        .getState()
        .sellDevelopmentUnit('dev-2', 'dev2-u1', 'Cash Buyer', 500_000);

      const state = usePortfolioStore.getState();
      const dev2 = state.developments.find((d) => d.id === 'dev-2')!;

      // Entire 500,000 applied to debt (no / 1.15)
      expect(dev2.developmentFacilityRepaidZAR).toBe(500_000);

      const fundDev2 = state.funding.find((f) => f.id === 'fund-tuhf-kempton')!;
      expect(fundDev2.totalRepaidZAR).toBe(500_000);
    });
  });

  describe('4. Hybrid Split-Exit to Rentals (graduateRetainedUnitsToRental)', () => {
    it('graduates retained units from dev-1 (< 5 units): creates RentalProperty with prepaid submeters, vacant leases, and no Section 13sex', () => {
      const initialRentalsCount = usePortfolioStore.getState().rentals.length;

      const newRental = usePortfolioStore
        .getState()
        .graduateRetainedUnitsToRental('dev-1');

      expect(newRental).toBeDefined();
      expect(newRental.numberOfUnits).toBe(2);
      expect(newRental.utilityType).toBe('prepaid_submeter');
      expect(newRental.convertedFromDevelopmentId).toBe('dev-1');
      expect(newRental.section13SexEligible).toBe(false);
      expect(newRental.section13sexAnnualShieldZAR).toBeUndefined();

      // Leases array populated
      expect(newRental.leases.length).toBe(2);
      expect(newRental.leases[0].monthlyRentZAR).toBe(12_000);
      expect(newRental.leases[0].depositHeldZAR).toBe(24_000); // 2 months
      expect(newRental.leases[0].status).toBe('Vacant');
      expect(newRental.leases[0].annualEscalationPercent).toBe(7.0);

      const state = usePortfolioStore.getState();
      expect(state.rentals.length).toBe(initialRentalsCount + 1);

      // Verify dev-1 retained units were tagged with graduatedRentalId
      const dev1 = state.developments.find((d) => d.id === 'dev-1')!;
      const graduatedUnits = dev1.units.filter((u) => u.graduatedRentalId === newRental.id);
      expect(graduatedUnits.length).toBe(2);

      // Verify linked funding source redirect
      const linkedFund = state.funding.find((f) => f.id === 'fund-dev-ferndale')!;
      expect(linkedFund.linkedDealId).toBe(newRental.id);
      expect(linkedFund.linkedDealName).toBe(newRental.title);

      // Verify lease expiry tasks scheduled
      const leaseTasks = state.tasks.filter((t) => t.linkedEntity?.id === newRental.id);
      expect(leaseTasks.length).toBe(2);
    });

    it('graduates retained units from dev-2 (10 units >= 5): qualifies for SARS Section 13sex 55% tax shield', () => {
      const newRental = usePortfolioStore
        .getState()
        .graduateRetainedUnitsToRental('dev-2');

      expect(newRental).toBeDefined();
      expect(newRental.numberOfUnits).toBe(10);
      expect(newRental.section13SexEligible).toBe(true);
      expect(newRental.section13sexAnnualShieldZAR).toBeGreaterThan(0);

      // Outstanding debt for dev-2 carried over: 1,850,000
      expect(newRental.outstandingBondBalanceZAR).toBe(1_850_000);
      expect(newRental.monthlyBondPaymentZAR).toBeGreaterThan(0);
      expect(newRental.utilityType).toBe('prepaid_submeter');
    });

    it('throws error if development has no ungraduated retained units', () => {
      // First graduation works
      usePortfolioStore.getState().graduateRetainedUnitsToRental('dev-1');

      // Second graduation should throw because all retained units are graduated
      expect(() => {
        usePortfolioStore.getState().graduateRetainedUnitsToRental('dev-1');
      }).toThrow(/No ungraduated retained units/);
    });
  });

  describe('5. Opportunity Pipeline Bridge (promoteOpportunityToDevelopment)', () => {
    it('promotes an analyzed deal into a full DevelopmentProject and creates conveyancing task', () => {
      const initialDevsCount = usePortfolioStore.getState().developments.length;
      const targetOpp = usePortfolioStore.getState().opportunities[0];
      expect(targetOpp).toBeDefined();

      usePortfolioStore.getState().promoteOpportunityToDevelopment(targetOpp.id);

      const state = usePortfolioStore.getState();
      expect(state.developments.length).toBe(initialDevsCount + 1);

      const promotedDev = state.developments[0];
      expect(promotedDev.title).toContain(targetOpp.title);
      expect(promotedDev.landPurchasePriceZAR).toBe(targetOpp.purchasePrice);
      expect(promotedDev.units.length).toBeGreaterThanOrEqual(1);

      // Verify opportunity status updated
      const updatedOpp = state.opportunities.find((o) => o.id === targetOpp.id)!;
      expect(updatedOpp.status).toBe('Promoted to Development');

      // Verify conveyancing onboarding task created
      const conveyTask = state.tasks.find(
        (t) => t.linkedEntity?.id === promotedDev.id && t.title.includes('Instruct conveyancer')
      );
      expect(conveyTask).toBeDefined();
      expect(conveyTask?.priority).toBe('Urgent');
    });
  });

  describe('6. BOQ Items Management', () => {
    it('adds, updates, and deletes BOQ items with automatic variance calculation', () => {
      usePortfolioStore.getState().addDevelopmentBOQItem('dev-1', {
        category: 'Electrical & Lighting',
        itemDescription: '8kW Hybrid Inverter & 10kWh Battery backup per cluster',
        unit: 'units',
        quantity: 6,
        baselineUnitCostZAR: 110_000,
        baselineTotalZAR: 660_000,
        actualCostZAR: 690_000,
        supplierOrContractor: 'Solar Dynamics Gauteng',
        status: 'In Progress',
        milestonePhase: 'Finishes',
      });

      let state = usePortfolioStore.getState();
      const dev1 = state.developments.find((d) => d.id === 'dev-1')!;
      const solarItem = dev1.boqItems.find((i) => i.category === 'Electrical & Lighting')!;
      expect(solarItem).toBeDefined();
      expect(solarItem.varianceZAR).toBe(30_000); // 690k - 660k

      // Update actual cost
      usePortfolioStore
        .getState()
        .updateDevelopmentBOQItem('dev-1', solarItem.id, { actualCostZAR: 640_000 });

      state = usePortfolioStore.getState();
      const updatedItem = state.developments
        .find((d) => d.id === 'dev-1')!
        .boqItems.find((i) => i.id === solarItem.id)!;
      expect(updatedItem.varianceZAR).toBe(-20_000); // 640k - 660k

      // Delete BOQ item
      usePortfolioStore.getState().deleteDevelopmentBOQItem('dev-1', solarItem.id);
      state = usePortfolioStore.getState();
      expect(
        state.developments
          .find((d) => d.id === 'dev-1')!
          .boqItems.some((i) => i.id === solarItem.id)
      ).toBe(false);
    });
  });

  describe('7. Statutory Approvals Task Sync (syncDevelopmentApprovalTasks)', () => {
    it('calculates 14-day prior warning date and maintains idempotency', () => {
      const approvals: PreConstructionApprovals = {
        splumaRezoningSubdivision: {
          status: 'Submitted',
          targetApprovalDate: '2026-12-20',
          referenceNo: 'COJ/2026/1',
        },
        sgDiagramApproval: {
          status: 'Approved', // Should be skipped
          targetApprovalDate: '2026-11-01',
        },
        municipalBuildingPlans: {
          status: 'N/A', // Should be skipped
        },
        nhbrcEnrolment: {
          status: 'Not Started', // No target date -> skipped
        },
        sectionalTitleRegister: {
          status: 'Objection / Query',
          targetApprovalDate: '2027-04-10',
          referenceNo: 'STR/2027/2',
        },
        occupancyCertificate: {
          status: 'Submitted',
          targetApprovalDate: '2027-05-01',
        },
      };

      const tasks1 = syncDevelopmentApprovalTasks([], 'dev-99', 'Test Dev', approvals);
      expect(tasks1.length).toBe(3); // spluma, sectionalTitle, occupancy

      const splumaTask = tasks1.find(
        (t) => t.id === 'task-dev-approval-dev-99-splumaRezoningSubdivision'
      );
      expect(splumaTask).toBeDefined();
      // 14 days before 2026-12-20 -> 2026-12-06
      expect(splumaTask?.dueDate).toBe('2026-12-06');
      expect(splumaTask?.priority).toBe('Urgent');

      // Idempotency: calling again with same approvals does not duplicate tasks
      const tasks2 = syncDevelopmentApprovalTasks(tasks1, 'dev-99', 'Test Dev', approvals);
      expect(tasks2.length).toBe(3);
    });
  });

  describe('8. Portfolio Summary Selector Bridge', () => {
    it('aggregates totalDevelopmentValue and development liabilities into portfolio metrics', () => {
      const summary = computePortfolioSummary({
        rentals: usePortfolioStore.getState().rentals,
        flips: usePortfolioStore.getState().flips,
        funding: usePortfolioStore.getState().funding,
        developments: usePortfolioStore.getState().developments,
        liquidCapitalReserve: usePortfolioStore.getState().liquidCapitalReserve,
      });

      expect(summary.totalDevelopmentValue).toBeDefined();
      expect(summary.totalDevelopmentValue).toBeGreaterThan(0);
      expect(summary.activeDevelopmentsCount).toBe(2);

      // Verify totalGrossAssetValue includes development value
      const expectedGAV =
        summary.totalRentalValue +
        summary.totalFlipValue +
        summary.totalDevelopmentValue! +
        summary.liquidCapitalReserve;
      expect(summary.totalGrossAssetValue).toBe(expectedGAV);
    });
  });

  describe('9. Hydration Helper (sanitizePersistedDevelopments)', () => {
    it('safely normalizes missing or corrupted development persistence shapes', () => {
      const raw = [
        {
          id: 'dev-raw-1',
          title: 'Partial Dev',
          // missing softCosts, boqItems, approvals, units
          developmentFacilityLimitZAR: '3000000',
        },
      ];

      const sanitized = sanitizePersistedDevelopments(raw);
      expect(sanitized.length).toBe(1);
      expect(sanitized[0].softCosts).toEqual({});
      expect(Array.isArray(sanitized[0].boqItems)).toBe(true);
      expect(Array.isArray(sanitized[0].units)).toBe(true);
      expect(sanitized[0].developmentFacilityLimitZAR).toBe(3_000_000);
      expect(sanitized[0].developmentFacilityDrawnZAR).toBe(0);
    });

    it('returns defaultDevelopments if raw is non-array', () => {
      const fallback = INITIAL_DEVELOPMENTS;
      expect(sanitizePersistedDevelopments(null, fallback)).toEqual(fallback);
      expect(sanitizePersistedDevelopments('invalid', fallback)).toEqual(fallback);
    });
  });
});
