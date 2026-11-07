import { describe, it, expect, beforeEach } from 'vitest';
import { usePortfolioStore } from '../usePortfolioStore';
import { INITIAL_DEVELOPMENTS, INITIAL_FUNDING } from '../initialData';
import { syncDevelopmentApprovalTasks, STATUTORY_GATE_NAMES } from '../utils/taskSync';
import { DevelopmentProject, PreConstructionApprovals, TaskItem } from '@/types';

describe('Milestone 2 Challenger Suite: State Integrity & Statutory Task Sync', () => {
  beforeEach(() => {
    // Reset store state prior to each test
    usePortfolioStore.setState({
      developments: JSON.parse(JSON.stringify(INITIAL_DEVELOPMENTS)),
      funding: JSON.parse(JSON.stringify(INITIAL_FUNDING)),
      tasks: [],
      rentals: [],
      flips: [],
      opportunities: [],
    });
  });

  // =========================================================================
  // 1. DEVELOPMENT CRUD STRESS TESTS
  // =========================================================================
  describe('1. Development CRUD State Operations', () => {
    it('successfully adds a valid development project to store', () => {
      const dev: DevelopmentProject = {
        id: 'dev-crud-1',
        title: 'Bryanston Ridge Clusters',
        address: '150 Bryanston Drive',
        city: 'Sandton',
        province: 'Gauteng',
        developmentType: 'Subdivision & Cluster',
        isVatRegisteredDeveloper: true,
        currentPhase: 'Feasibility',
        preApprovalMonths: 4,
        constructionMonths: 8,
        sellDownMonths: 3,
        landPurchasePriceZAR: 3_200_000,
        acquisitionCostsZAR: 150_000,
        sec118ArrearsZAR: 0,
        softCosts: {
          townPlannerZAR: 40_000,
          architectZAR: 80_000,
          structuralCivilEngineerZAR: 50_000,
          quantitySurveyorZAR: 35_000,
          nhbrcEnrolmentFeeZAR: 45_000,
          councilBulkContributionsZAR: 120_000,
          planScrutinyAndSubdivisionFeesZAR: 25_000,
          marketingAndShowUnitZAR: 30_000,
        },
        totalBuildableAreaSqm: 500,
        budgetedHardCostPerSqmZAR: 11_000,
        contingencyPercent: 7.5,
        boqItems: [],
        monthlyPreApprovalHoldingBurnZAR: 10_000,
        monthlyConstructionHoldingBurnZAR: 20_000,
        developmentFacilityLimitZAR: 4_500_000,
        developmentFacilityDrawnZAR: 0,
        developmentFacilityRepaidZAR: 0,
        preSalesHurdlePercent: 60,
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

      const initialCount = usePortfolioStore.getState().developments.length;
      usePortfolioStore.getState().addDevelopment(dev);

      const state = usePortfolioStore.getState();
      expect(state.developments.length).toBe(initialCount + 1);
      expect(state.developments[0].id).toBe('dev-crud-1');
      expect(state.developments[0].title).toBe('Bryanston Ridge Clusters');
    });

    it('gracefully handles adding development with undefined/sparse approvals without throwing', () => {
      const devSparse = {
        id: 'dev-sparse-1',
        title: 'Sparse Project',
        address: '1 Main Rd',
        city: 'Cape Town',
        developmentType: 'Subdivision & Cluster',
        isVatRegisteredDeveloper: false,
        currentPhase: 'Feasibility',
        preApprovalMonths: 3,
        constructionMonths: 6,
        sellDownMonths: 2,
        landPurchasePriceZAR: 1_000_000,
        acquisitionCostsZAR: 50_000,
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
        totalBuildableAreaSqm: 200,
        budgetedHardCostPerSqmZAR: 8000,
        contingencyPercent: 5,
        boqItems: [],
        monthlyPreApprovalHoldingBurnZAR: 5000,
        monthlyConstructionHoldingBurnZAR: 10000,
        developmentFacilityLimitZAR: 1000000,
        developmentFacilityDrawnZAR: 0,
        developmentFacilityRepaidZAR: 0,
        preSalesHurdlePercent: 50,
        approvals: undefined as any,
        units: [],
      } as DevelopmentProject;

      expect(() => {
        usePortfolioStore.getState().addDevelopment(devSparse);
      }).not.toThrow();

      const found = usePortfolioStore.getState().developments.find((d) => d.id === 'dev-sparse-1');
      expect(found).toBeDefined();
    });

    it('updates development attributes and preserves unmodified properties', () => {
      usePortfolioStore.getState().updateDevelopment('dev-1', {
        title: 'Ferndale Luxury 6-Unit Subdivision',
        currentPhase: 'Sell-Down / Handover',
        developmentFacilityRepaidZAR: 3_500_000,
      });

      const updated = usePortfolioStore.getState().developments.find((d) => d.id === 'dev-1');
      expect(updated?.title).toBe('Ferndale Luxury 6-Unit Subdivision');
      expect(updated?.currentPhase).toBe('Sell-Down / Handover');
      expect(updated?.developmentFacilityRepaidZAR).toBe(3_500_000);
      // Verify other fields remain intact
      expect(updated?.landPurchasePriceZAR).toBe(1_850_000);
      expect(updated?.units.length).toBe(6);
    });

    it('gracefully handles updating non-existent development id without corrupting state', () => {
      const beforeState = usePortfolioStore.getState().developments;
      expect(() => {
        usePortfolioStore.getState().updateDevelopment('dev-non-existent-999', {
          title: 'Ghost Update',
        });
      }).not.toThrow();

      const afterState = usePortfolioStore.getState().developments;
      expect(afterState.length).toBe(beforeState.length);
      expect(afterState.find((d) => d.id === 'dev-non-existent-999')).toBeUndefined();
    });

    it('deletes development from store and cascades cleanup of associated statutory tasks', () => {
      // Setup: Add a development with an active statutory approval task
      const targetDate = '2027-09-30';
      const devWithTasks: DevelopmentProject = {
        id: 'dev-to-delete',
        title: 'Deletable Development',
        address: '100 Test St',
        city: 'Pretoria',
        developmentType: 'Subdivision & Cluster',
        isVatRegisteredDeveloper: true,
        currentPhase: 'Feasibility',
        preApprovalMonths: 6,
        constructionMonths: 6,
        sellDownMonths: 3,
        landPurchasePriceZAR: 1_000_000,
        acquisitionCostsZAR: 50_000,
        sec118ArrearsZAR: 0,
        softCosts: {
          townPlannerZAR: 10000,
          architectZAR: 10000,
          structuralCivilEngineerZAR: 10000,
          quantitySurveyorZAR: 10000,
          nhbrcEnrolmentFeeZAR: 10000,
          councilBulkContributionsZAR: 10000,
          planScrutinyAndSubdivisionFeesZAR: 10000,
          marketingAndShowUnitZAR: 10000,
        },
        totalBuildableAreaSqm: 200,
        budgetedHardCostPerSqmZAR: 9000,
        contingencyPercent: 5,
        boqItems: [],
        monthlyPreApprovalHoldingBurnZAR: 5000,
        monthlyConstructionHoldingBurnZAR: 8000,
        developmentFacilityLimitZAR: 1500000,
        developmentFacilityDrawnZAR: 0,
        developmentFacilityRepaidZAR: 0,
        preSalesHurdlePercent: 50,
        approvals: {
          splumaRezoningSubdivision: {
            status: 'Submitted',
            targetApprovalDate: targetDate,
            referenceNo: 'SPLUMA-DEL-1',
          },
          sgDiagramApproval: { status: 'Not Started' },
          municipalBuildingPlans: { status: 'Not Started' },
          nhbrcEnrolment: { status: 'Not Started' },
          sectionalTitleRegister: { status: 'Not Started' },
          occupancyCertificate: { status: 'Not Started' },
        },
        units: [],
      };

      // Add dummy unrelated task to ensure unrelated tasks are preserved
      usePortfolioStore.setState({
        tasks: [
          {
            id: 'task-unrelated-1',
            title: 'Unrelated Task',
            dueDate: '2027-10-01',
            priority: 'Medium',
            status: 'Pending',
            createdAt: '2027-01-01',
            linkedEntity: {
              type: 'rental',
              id: 'rental-unrelated-1',
              name: 'Unrelated Rental',
            },
          },
        ],
      });

      usePortfolioStore.getState().addDevelopment(devWithTasks);

      // Verify task was created
      let tasks = usePortfolioStore.getState().tasks;
      expect(tasks.some((t) => t.id === 'task-dev-approval-dev-to-delete-splumaRezoningSubdivision')).toBe(true);

      // Now delete the development
      usePortfolioStore.getState().deleteDevelopment('dev-to-delete');

      // Verify development removed
      const devs = usePortfolioStore.getState().developments;
      expect(devs.find((d) => d.id === 'dev-to-delete')).toBeUndefined();

      // Verify statutory task removed, but unrelated task kept
      tasks = usePortfolioStore.getState().tasks;
      expect(tasks.some((t) => t.id === 'task-dev-approval-dev-to-delete-splumaRezoningSubdivision')).toBe(false);
      expect(tasks.some((t) => t.id === 'task-unrelated-1')).toBe(true);
    });

    it('gracefully handles deleting non-existent development id', () => {
      const beforeDevs = usePortfolioStore.getState().developments;
      expect(() => {
        usePortfolioStore.getState().deleteDevelopment('dev-non-existent-404');
      }).not.toThrow();
      expect(usePortfolioStore.getState().developments.length).toBe(beforeDevs.length);
    });
  });

  // =========================================================================
  // 2. STATUTORY TASK SYNC & 14-DAY CALCULATION
  // =========================================================================
  describe('2. Statutory Task Sync: 14-Day Warning, In-Place Updates & Removal', () => {
    it('creates tasks due exactly 14 days earlier for each gate with a target date', () => {
      // Target: 2027-06-30 -> 14 days earlier is 2027-06-16
      const approvals: PreConstructionApprovals = {
        splumaRezoningSubdivision: {
          status: 'Submitted',
          targetApprovalDate: '2027-06-30',
          referenceNo: 'COJ/SPLUMA/2027/101',
        },
        sgDiagramApproval: {
          status: 'Submitted',
          targetApprovalDate: '2027-07-20',
          referenceNo: 'SG/2027/55',
        },
        municipalBuildingPlans: {
          status: 'Submitted',
          targetApprovalDate: '2027-08-14',
          referenceNo: 'COJ/BP/2027/99',
        },
        nhbrcEnrolment: {
          status: 'Submitted',
          targetApprovalDate: '2027-09-15',
          referenceNo: 'NHBRC/2027/12',
        },
        sectionalTitleRegister: {
          status: 'Submitted',
          targetApprovalDate: '2027-10-31',
          referenceNo: 'STR/2027/01',
        },
        occupancyCertificate: {
          status: 'Submitted',
          targetApprovalDate: '2027-11-28',
          referenceNo: 'OCC/2027/44',
        },
      };

      const tasks = syncDevelopmentApprovalTasks([], 'dev-sync-test', 'Parkview Manor', approvals);

      expect(tasks.length).toBe(6);

      // Verify SPLUMA: 2027-06-30 minus 14 days = 2027-06-16
      const splumaTask = tasks.find((t) => t.id === 'task-dev-approval-dev-sync-test-splumaRezoningSubdivision');
      expect(splumaTask).toBeDefined();
      expect(splumaTask?.dueDate).toBe('2027-06-16');
      expect(splumaTask?.priority).toBe('Urgent');
      expect(splumaTask?.status).toBe('Pending');
      expect(splumaTask?.title).toContain('SPLUMA Rezoning & Subdivision');
      expect(splumaTask?.linkedEntity).toEqual({
        type: 'development',
        id: 'dev-sync-test',
        name: 'Parkview Manor',
      });

      // Verify SG: 2027-07-20 minus 14 days = 2027-07-06
      const sgTask = tasks.find((t) => t.id === 'task-dev-approval-dev-sync-test-sgDiagramApproval');
      expect(sgTask?.dueDate).toBe('2027-07-06');

      // Verify Plans: 2027-08-14 minus 14 days = 2027-07-31
      const plansTask = tasks.find((t) => t.id === 'task-dev-approval-dev-sync-test-municipalBuildingPlans');
      expect(plansTask?.dueDate).toBe('2027-07-31');

      // Verify NHBRC: 2027-09-15 minus 14 days = 2027-09-01
      const nhbrcTask = tasks.find((t) => t.id === 'task-dev-approval-dev-sync-test-nhbrcEnrolment');
      expect(nhbrcTask?.dueDate).toBe('2027-09-01');

      // Verify STR: 2027-10-31 minus 14 days = 2027-10-17
      const strTask = tasks.find((t) => t.id === 'task-dev-approval-dev-sync-test-sectionalTitleRegister');
      expect(strTask?.dueDate).toBe('2027-10-17');

      // Verify Occupancy: 2027-11-28 minus 14 days = 2027-11-14
      const occTask = tasks.find((t) => t.id === 'task-dev-approval-dev-sync-test-occupancyCertificate');
      expect(occTask?.dueDate).toBe('2027-11-14');
    });

    it('updates statutory tasks in-place when targetApprovalDate changes via updateDevelopment', () => {
      // 1. Setup development with target date
      const dev: DevelopmentProject = {
        ...INITIAL_DEVELOPMENTS[0],
        id: 'dev-inplace-test',
        title: 'Inplace Sync Project',
        approvals: {
          splumaRezoningSubdivision: {
            status: 'Submitted',
            targetApprovalDate: '2027-07-15', // Due 2027-07-01
            referenceNo: 'REF-001',
          },
          sgDiagramApproval: { status: 'Not Started' },
          municipalBuildingPlans: { status: 'Not Started' },
          nhbrcEnrolment: { status: 'Not Started' },
          sectionalTitleRegister: { status: 'Not Started' },
          occupancyCertificate: { status: 'Not Started' },
        },
      };

      usePortfolioStore.getState().addDevelopment(dev);

      let task = usePortfolioStore.getState().tasks.find(
        (t) => t.id === 'task-dev-approval-dev-inplace-test-splumaRezoningSubdivision'
      );
      expect(task).toBeDefined();
      expect(task?.dueDate).toBe('2027-07-01');

      // 2. Update target approval date to 2027-08-20 (new due date: 2027-08-06)
      usePortfolioStore.getState().updateDevelopment('dev-inplace-test', {
        approvals: {
          ...dev.approvals,
          splumaRezoningSubdivision: {
            status: 'Submitted',
            targetApprovalDate: '2027-08-20',
            referenceNo: 'REF-001-EXTENDED',
          },
        },
      });

      const updatedTasks = usePortfolioStore.getState().tasks.filter(
        (t) => t.id === 'task-dev-approval-dev-inplace-test-splumaRezoningSubdivision'
      );
      // Still exactly 1 task (no duplicate)
      expect(updatedTasks.length).toBe(1);
      expect(updatedTasks[0].dueDate).toBe('2027-08-06');
      expect(updatedTasks[0].description).toContain('2027-08-20');
      expect(updatedTasks[0].description).toContain('REF-001-EXTENDED');
    });

    it('removes statutory task when targetApprovalDate is cleared', () => {
      const dev: DevelopmentProject = {
        ...INITIAL_DEVELOPMENTS[0],
        id: 'dev-clear-date-test',
        approvals: {
          splumaRezoningSubdivision: {
            status: 'Submitted',
            targetApprovalDate: '2027-07-15',
          },
          sgDiagramApproval: { status: 'Not Started' },
          municipalBuildingPlans: { status: 'Not Started' },
          nhbrcEnrolment: { status: 'Not Started' },
          sectionalTitleRegister: { status: 'Not Started' },
          occupancyCertificate: { status: 'Not Started' },
        },
      };

      usePortfolioStore.getState().addDevelopment(dev);
      expect(
        usePortfolioStore.getState().tasks.some(
          (t) => t.id === 'task-dev-approval-dev-clear-date-test-splumaRezoningSubdivision'
        )
      ).toBe(true);

      // Clear the targetApprovalDate
      usePortfolioStore.getState().updateDevelopment('dev-clear-date-test', {
        approvals: {
          ...dev.approvals,
          splumaRezoningSubdivision: {
            status: 'Submitted',
            targetApprovalDate: undefined,
          },
        },
      });

      expect(
        usePortfolioStore.getState().tasks.some(
          (t) => t.id === 'task-dev-approval-dev-clear-date-test-splumaRezoningSubdivision'
        )
      ).toBe(false);
    });

    it('removes pending task when statutory gate status changes to Approved or N/A', () => {
      const dev: DevelopmentProject = {
        ...INITIAL_DEVELOPMENTS[0],
        id: 'dev-gate-status-test',
        approvals: {
          splumaRezoningSubdivision: {
            status: 'Submitted',
            targetApprovalDate: '2027-07-15',
          },
          sgDiagramApproval: {
            status: 'Submitted',
            targetApprovalDate: '2027-08-15',
          },
          municipalBuildingPlans: { status: 'Not Started' },
          nhbrcEnrolment: { status: 'Not Started' },
          sectionalTitleRegister: { status: 'Not Started' },
          occupancyCertificate: { status: 'Not Started' },
        },
      };

      usePortfolioStore.getState().addDevelopment(dev);
      expect(
        usePortfolioStore.getState().tasks.filter(
          (t) => t.linkedEntity?.id === 'dev-gate-status-test'
        ).length
      ).toBe(2);

      // Set spluma to 'Approved' and sgDiagram to 'N/A'
      usePortfolioStore.getState().updateDevelopment('dev-gate-status-test', {
        approvals: {
          ...dev.approvals,
          splumaRezoningSubdivision: {
            status: 'Approved',
            targetApprovalDate: '2027-07-15',
          },
          sgDiagramApproval: {
            status: 'N/A',
            targetApprovalDate: '2027-08-15',
          },
        },
      });

      // Both pending tasks should now be removed
      const remainingTasks = usePortfolioStore.getState().tasks.filter(
        (t) => t.linkedEntity?.id === 'dev-gate-status-test'
      );
      expect(remainingTasks.length).toBe(0);
    });
  });

  // =========================================================================
  // 3. DUPLICATE PREVENTION & DETERMINISTIC IDEMPOTENCY
  // =========================================================================
  describe('3. Duplicate Prevention & Deterministic Idempotency', () => {
    it('calling addDevelopment and repeated updateDevelopment produces deterministic tasks without duplication', () => {
      const dev: DevelopmentProject = {
        ...INITIAL_DEVELOPMENTS[0],
        id: 'dev-idempotent-test',
        title: 'Idempotent Towers',
        approvals: {
          splumaRezoningSubdivision: {
            status: 'Submitted',
            targetApprovalDate: '2027-05-15',
          },
          sgDiagramApproval: {
            status: 'Submitted',
            targetApprovalDate: '2027-06-15',
          },
          municipalBuildingPlans: {
            status: 'Submitted',
            targetApprovalDate: '2027-07-15',
          },
          nhbrcEnrolment: { status: 'Not Started' },
          sectionalTitleRegister: { status: 'Not Started' },
          occupancyCertificate: { status: 'Not Started' },
        },
      };

      usePortfolioStore.getState().addDevelopment(dev);

      // Verify initially 3 tasks created
      let tasks = usePortfolioStore.getState().tasks.filter(
        (t) => t.linkedEntity?.id === 'dev-idempotent-test'
      );
      expect(tasks.length).toBe(3);

      // Call updateDevelopment 5 times with unrelated updates
      for (let i = 1; i <= 5; i++) {
        usePortfolioStore.getState().updateDevelopment('dev-idempotent-test', {
          title: `Idempotent Towers (Revision ${i})`,
          contingencyPercent: 7.5 + i * 0.1,
        });
      }

      tasks = usePortfolioStore.getState().tasks.filter(
        (t) => t.linkedEntity?.id === 'dev-idempotent-test'
      );
      // Still exactly 3 tasks! Zero duplication!
      expect(tasks.length).toBe(3);

      const splumaTaskCount = tasks.filter(
        (t) => t.id === 'task-dev-approval-dev-idempotent-test-splumaRezoningSubdivision'
      ).length;
      expect(splumaTaskCount).toBe(1);

      // Direct unit test of syncDevelopmentApprovalTasks idempotency
      let directTasks: TaskItem[] = [];
      for (let i = 0; i < 10; i++) {
        directTasks = syncDevelopmentApprovalTasks(
          directTasks,
          'dev-direct-idempotent',
          'Direct Test',
          dev.approvals
        );
      }
      expect(directTasks.length).toBe(3);
    });
  });

  // =========================================================================
  // 4. DEMO RESETS & DATA CLEARING INTEGRITY
  // =========================================================================
  describe('4. Demo Resets: resetToDemoData() and clearAllData()', () => {
    it('verify INITIAL_FUNDING contains linked development facilities (fund-dev-ferndale and fund-tuhf-kempton)', () => {
      expect(INITIAL_FUNDING.some((f) => f.id === 'fund-dev-ferndale' && f.linkedDealId === 'dev-1')).toBe(true);
      expect(INITIAL_FUNDING.some((f) => f.id === 'fund-tuhf-kempton' && f.linkedDealId === 'dev-2')).toBe(true);
    });

    it('CRITICAL CHECK: resetToDemoData() must populate INITIAL_DEVELOPMENTS and linked INITIAL_FUNDING', () => {
      // Setup dirty state: empty developments and funding
      usePortfolioStore.setState({
        developments: [],
        funding: [],
      });

      expect(usePortfolioStore.getState().developments.length).toBe(0);

      // Invoke resetToDemoData
      usePortfolioStore.getState().resetToDemoData();

      const stateAfterReset = usePortfolioStore.getState();

      // Check linked funding
      expect(stateAfterReset.funding.some((f) => f.id === 'fund-dev-ferndale')).toBe(true);
      expect(stateAfterReset.funding.some((f) => f.id === 'fund-tuhf-kempton')).toBe(true);

      // Check developments: MUST be populated with INITIAL_DEVELOPMENTS!
      expect(stateAfterReset.developments).toBeDefined();
      expect(Array.isArray(stateAfterReset.developments)).toBe(true);
      expect(stateAfterReset.developments.length).toBe(INITIAL_DEVELOPMENTS.length);
      expect(stateAfterReset.developments.some((d) => d.id === 'dev-1')).toBe(true);
      expect(stateAfterReset.developments.some((d) => d.id === 'dev-2')).toBe(true);
    });

    it('CRITICAL CHECK: clearAllData() must clear developments to empty array', () => {
      // Setup populated state
      usePortfolioStore.setState({
        developments: JSON.parse(JSON.stringify(INITIAL_DEVELOPMENTS)),
      });
      expect(usePortfolioStore.getState().developments.length).toBeGreaterThan(0);

      // Invoke clearAllData
      usePortfolioStore.getState().clearAllData();

      const stateAfterClear = usePortfolioStore.getState();
      expect(stateAfterClear.developments).toBeDefined();
      expect(Array.isArray(stateAfterClear.developments)).toBe(true);
      expect(stateAfterClear.developments.length).toBe(0);
    });
  });

  // =========================================================================
  // 5. CROSS-MODULE BRIDGES & WATERFALL INTEGRITY
  // =========================================================================
  describe('5. Cross-Module Bridges (Waterfall Debt Paydown, Graduation & Deal Promotion)', () => {
    it('sellDevelopmentUnit strips VAT for VAT-registered developer, retires debt first, settles linked funding, and routes surplus to liquidCapitalReserve', () => {
      // In dev-1: drawn = 4,200,000, repaid = 2,750,000 -> outstanding = 1,450,000
      // Unit list price: R 1,950,000 (VAT inclusive)
      // Net proceeds for VAT developer: 1,950,000 / 1.15 = 1,695,652.17 -> rounded 1,695,652
      // Debt payment = min(1,695,652, 1,450,000) = 1,450,000 -> full loan retired!
      // Surplus cash = 1,695,652 - 1,450,000 = 245,652
      const initialLiquid = usePortfolioStore.getState().liquidCapitalReserve;

      usePortfolioStore.getState().sellDevelopmentUnit('dev-1', 'dev1-u1', 'Test Buyer', 1_950_000);

      const state = usePortfolioStore.getState();
      const dev1 = state.developments.find((d) => d.id === 'dev-1');
      expect(dev1?.developmentFacilityRepaidZAR).toBe(4_200_000);

      const unit = dev1?.units.find((u) => u.id === 'dev1-u1');
      expect(unit?.status).toBe('Sold & Transferred');
      expect(unit?.buyerName).toBe('Test Buyer');

      // Check linked funding is Settled
      const funding = state.funding.find((f) => f.id === 'fund-dev-ferndale');
      expect(funding?.status).toBe('Settled');
      expect(funding?.totalRepaidZAR).toBe(4_200_000);

      // Check surplus credited
      expect(state.liquidCapitalReserve).toBe(initialLiquid + 245_652);
    });

    it('graduateRetainedUnitsToRental creates valid multi-unit RentalProperty and sets Section 13sex flag when >= 5 units', () => {
      // dev-2 has 10 units all marked 'Retained for Rental'
      const graduatedRental = usePortfolioStore.getState().graduateRetainedUnitsToRental('dev-2');

      expect(graduatedRental).toBeDefined();
      expect(graduatedRental.id).toContain('rental-dev-dev-2');
      expect(graduatedRental.numberOfUnits).toBe(10);
      expect(graduatedRental.section13SexEligible).toBe(true);
      expect(graduatedRental.section13sexAnnualShieldZAR).toBeGreaterThan(0);
      expect(graduatedRental.leases.length).toBe(10);
      expect(graduatedRental.leases.every((l) => l.roomType?.includes('Bed'))).toBe(true);

      // Verify dev-2 units now stamped with graduatedRentalId
      const dev2 = usePortfolioStore.getState().developments.find((d) => d.id === 'dev-2');
      expect(dev2?.units.every((u) => u.graduatedRentalId === graduatedRental.id)).toBe(true);
    });
  });
});
