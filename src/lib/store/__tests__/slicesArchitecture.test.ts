import { describe, it, expect, beforeEach } from 'vitest';
import {
  usePortfolioStore,
  computePortfolioSummary,
  usePortfolioSummary,
  computeEquityAlerts,
  syncLeaseExpiryTasks,
  syncAgmReminderTask,
  sanitizeCompletedGuideSteps,
  type RootStoreState,
  type PortfolioState,
} from '../usePortfolioStore';
import * as storeBarrel from '../index';
import {
  FlipProject,
  RentalProperty,
  OpportunityDeal,
  FundingSource,
  TaskItem,
} from '@/types';

describe('Refactoring Phase 3: Zustand Slice Pattern Migration Architectural Tests', () => {
  beforeEach(() => {
    usePortfolioStore.getState().resetToDemoData();
    usePortfolioStore.getState().resetGuideProgress();
  });

  describe('1. Slice State Initialization & Assembly', () => {
    it('initializes all 10 domains with expected baseline state properties', () => {
      const state = usePortfolioStore.getState();

      // 1. RentalSlice
      expect(Array.isArray(state.rentals)).toBe(true);
      expect(state.rentals.length).toBeGreaterThan(0);

      // 2. FlipSlice
      expect(Array.isArray(state.flips)).toBe(true);
      expect(state.flips.length).toBeGreaterThan(0);

      // 3. OpportunitySlice
      expect(Array.isArray(state.opportunities)).toBe(true);
      expect(state.opportunities.length).toBeGreaterThan(0);

      // 4. FundingSlice
      expect(Array.isArray(state.funding)).toBe(true);
      expect(state.funding.length).toBeGreaterThan(0);

      // 5. UtilitiesSlice (operates on rental state)
      expect(typeof state.addUtilityStatement).toBe('function');
      expect(typeof state.addMeterReading).toBe('function');

      // 6. TenantAccountingSlice (operates on rental state)
      expect(typeof state.recordTenantPayment).toBe('function');
      expect(typeof state.recordArrearsWriteOff).toBe('function');

      // 7. TaskSlice
      expect(Array.isArray(state.tasks)).toBe(true);
      expect(state.tasks.length).toBeGreaterThan(0);

      // 8. DirectorySlice
      expect(Array.isArray(state.suppliers)).toBe(true);
      expect(state.suppliers.length).toBeGreaterThan(0);
      expect(Array.isArray(state.municipalDirectory)).toBe(true);
      expect(state.municipalDirectory.length).toBeGreaterThan(0);

      // 9. SettingsSlice
      expect(typeof state.liquidCapitalReserve).toBe('number');
      expect(state.liquidCapitalReserve).toBe(650_000);
      expect(state.investorProfile).toBeDefined();
      expect(state.analyzerDraft).toBeDefined();
      expect(state.aiSettings).toBeDefined();
      expect(state.rentalForecastView).toBe('wealth-only');
      expect(state.completedGuideSteps).toEqual([]);

      // 10. SystemSlice
      expect(typeof state.getSummary).toBe('function');
      expect(typeof state.hydrateFromCloudState).toBe('function');
      expect(typeof state.resetToDemoData).toBe('function');
      expect(typeof state.clearAllData).toBe('function');
      expect(typeof state.importPortfolioJSON).toBe('function');
    });

    it('verifies all 49 distinct store action signatures are mounted on the root facade', () => {
      const store = usePortfolioStore.getState();

      // RentalSlice (9 actions)
      expect(store.addRental).toBeTypeOf('function');
      expect(store.bulkAddRentals).toBeTypeOf('function');
      expect(store.reconcileImportedRentals).toBeTypeOf('function');
      expect(store.updateRental).toBeTypeOf('function');
      expect(store.deleteRental).toBeTypeOf('function');
      expect(store.addMaintenanceLog).toBeTypeOf('function');
      expect(store.markRentalAsSold).toBeTypeOf('function');
      expect(store.reopenRental).toBeTypeOf('function');
      expect(store.refinanceRental).toBeTypeOf('function');

      // FlipSlice (10 actions)
      expect(store.addFlip).toBeTypeOf('function');
      expect(store.bulkAddFlips).toBeTypeOf('function');
      expect(store.updateFlip).toBeTypeOf('function');
      expect(store.deleteFlip).toBeTypeOf('function');
      expect(store.addBOQItem).toBeTypeOf('function');
      expect(store.updateBOQItem).toBeTypeOf('function');
      expect(store.deleteBOQItem).toBeTypeOf('function');
      expect(store.markFlipAsCompleted).toBeTypeOf('function');
      expect(store.reopenFlip).toBeTypeOf('function');
      expect(store.convertFlipToRental).toBeTypeOf('function');

      // OpportunitySlice (10 actions)
      expect(store.addOpportunity).toBeTypeOf('function');
      expect(store.bulkAddOpportunities).toBeTypeOf('function');
      expect(store.updateOpportunity).toBeTypeOf('function');
      expect(store.deleteOpportunity).toBeTypeOf('function');
      expect(store.duplicateOpportunity).toBeTypeOf('function');
      expect(store.passOpportunity).toBeTypeOf('function');
      expect(store.reactivateOpportunity).toBeTypeOf('function');
      expect(store.advanceOpportunityStage).toBeTypeOf('function');
      expect(store.promoteOpportunityToFlip).toBeTypeOf('function');
      expect(store.promoteOpportunityToRental).toBeTypeOf('function');

      // FundingSlice (4 actions)
      expect(store.addFunding).toBeTypeOf('function');
      expect(store.updateFunding).toBeTypeOf('function');
      expect(store.deleteFunding).toBeTypeOf('function');
      expect(store.syncFundingWithDealDelay).toBeTypeOf('function');

      // UtilitiesSlice (9 actions)
      expect(store.addUtilityStatement).toBeTypeOf('function');
      expect(store.deleteUtilityStatement).toBeTypeOf('function');
      expect(store.setStatementTenantBillingMethod).toBeTypeOf('function');
      expect(store.addMeterReading).toBeTypeOf('function');
      expect(store.deleteMeterReading).toBeTypeOf('function');
      expect(store.updateMeterReadingDispute).toBeTypeOf('function');
      expect(store.addPropertyMeter).toBeTypeOf('function');
      expect(store.updatePropertyMeter).toBeTypeOf('function');
      expect(store.deletePropertyMeter).toBeTypeOf('function');

      // TenantAccountingSlice (8 actions)
      expect(store.recordTenantPayment).toBeTypeOf('function');
      expect(store.updateTenantPayment).toBeTypeOf('function');
      expect(store.deleteTenantPayment).toBeTypeOf('function');
      expect(store.recordArrearsWriteOff).toBeTypeOf('function');
      expect(store.deleteArrearsWriteOff).toBeTypeOf('function');
      expect(store.updateArrearsOpeningBalance).toBeTypeOf('function');
      expect(store.addTransaction).toBeTypeOf('function');
      expect(store.deleteTransaction).toBeTypeOf('function');

      // TaskSlice (4 actions)
      expect(store.addTask).toBeTypeOf('function');
      expect(store.toggleTaskStatus).toBeTypeOf('function');
      expect(store.updateTask).toBeTypeOf('function');
      expect(store.deleteTask).toBeTypeOf('function');

      // DirectorySlice (6 actions)
      expect(store.addSupplier).toBeTypeOf('function');
      expect(store.deleteSupplier).toBeTypeOf('function');
      expect(store.addMunicipalContact).toBeTypeOf('function');
      expect(store.updateMunicipalContact).toBeTypeOf('function');
      expect(store.deleteMunicipalContact).toBeTypeOf('function');
      expect(store.resetMunicipalDirectory).toBeTypeOf('function');

      // SettingsSlice (7 actions)
      expect(store.updateLiquidReserve).toBeTypeOf('function');
      expect(store.updateInvestorProfile).toBeTypeOf('function');
      expect(store.updateAiSettings).toBeTypeOf('function');
      expect(store.updateAnalyzerDraft).toBeTypeOf('function');
      expect(store.setRentalForecastView).toBeTypeOf('function');
      expect(store.toggleGuideStep).toBeTypeOf('function');
      expect(store.resetGuideProgress).toBeTypeOf('function');

      // SystemSlice (5 actions)
      expect(store.getSummary).toBeTypeOf('function');
      expect(store.hydrateFromCloudState).toBeTypeOf('function');
      expect(store.resetToDemoData).toBeTypeOf('function');
      expect(store.clearAllData).toBeTypeOf('function');
      expect(store.importPortfolioJSON).toBeTypeOf('function');
    });
  });

  describe('2. Cross-Slice Interactions & Synchronizations', () => {
    it('executes full BRRRR refinance lifecycle modifying rentals, tasks, and liquid capital reserve', () => {
      const initialReserve = usePortfolioStore.getState().liquidCapitalReserve;
      const targetRental = usePortfolioStore.getState().rentals[0];

      usePortfolioStore.getState().refinanceRental({
        rentalId: targetRental.id,
        newBankValuationZAR: 2_500_000,
        newMonthlyBondPaymentZAR: 18_000,
        newBondBalanceZAR: 1_750_000,
        cashEquityPulledOutZAR: 350_000,
        notes: 'Equity harvest for next flip acquisition',
      });

      const updatedState = usePortfolioStore.getState();
      const updatedRental = updatedState.rentals.find((r) => r.id === targetRental.id);

      // Verify rental slice updated
      expect(updatedRental?.marketValueZAR).toBe(2_500_000);
      expect(updatedRental?.outstandingBondBalanceZAR).toBe(1_750_000);
      expect(updatedRental?.monthlyBondPaymentZAR).toBe(18_000);
      expect(updatedRental?.totalEquityExtractedZAR).toBe(350_000);
      expect(updatedRental?.refinanceHistory).toHaveLength(1);

      // Verify settings slice updated liquid capital reserve
      expect(updatedState.liquidCapitalReserve).toBe(initialReserve + 350_000);
    });

    it('executes markRentalAsSold and reopenRental with liquid reserve credit and debit', () => {
      const initialReserve = usePortfolioStore.getState().liquidCapitalReserve;
      const rental = usePortfolioStore.getState().rentals[0];

      // Mark as sold
      usePortfolioStore.getState().markRentalAsSold(rental.id, 1_800_000, 500_000, '2026-10-09', 'Exit to private buyer');
      let state = usePortfolioStore.getState();
      let updatedRental = state.rentals.find((r) => r.id === rental.id);

      expect(updatedRental?.status).toBe('Sold');
      expect(updatedRental?.actualSalePriceZAR).toBe(1_800_000);
      expect(updatedRental?.netCashProceedsZAR).toBe(500_000);
      expect(state.liquidCapitalReserve).toBe(initialReserve + 500_000);

      // Reopen rental
      usePortfolioStore.getState().reopenRental(rental.id);
      state = usePortfolioStore.getState();
      updatedRental = state.rentals.find((r) => r.id === rental.id);

      expect(updatedRental?.status).toBe('Occupied');
      expect(updatedRental?.actualSalePriceZAR).toBeUndefined();
      expect(updatedRental?.netCashProceedsZAR).toBeUndefined();
      expect(state.liquidCapitalReserve).toBe(initialReserve);
    });

    it('executes deal promotion from OpportunitySlice to FlipSlice and RentalSlice', () => {
      const opp = usePortfolioStore.getState().opportunities[0];
      const oppId = opp.id;

      // Promote to Flip
      usePortfolioStore.getState().promoteOpportunityToFlip(oppId);
      let state = usePortfolioStore.getState();
      let updatedOpp = state.opportunities.find((o) => o.id === oppId);

      expect(updatedOpp?.status).toBe('Promoted to Flip');
      const createdFlip = state.flips.find((f) => f.title.includes(opp.title));
      expect(createdFlip).toBeDefined();
      expect(createdFlip?.purchasePriceZAR).toBe(opp.purchasePrice);

      // Tasks slice should receive conveyancing task
      const conveyancingTask = state.tasks.find((t) => t.linkedEntity?.id === createdFlip?.id);
      expect(conveyancingTask).toBeDefined();
      expect(conveyancingTask?.priority).toBe('Urgent');

      // Promote another opportunity to Rental
      const secondOpp = state.opportunities[1];
      usePortfolioStore.getState().promoteOpportunityToRental(secondOpp.id);
      state = usePortfolioStore.getState();
      const updatedSecondOpp = state.opportunities.find((o) => o.id === secondOpp.id);

      expect(updatedSecondOpp?.status).toBe('Promoted to Rental');
      const createdRental = state.rentals.find((r) => r.title === secondOpp.title);
      expect(createdRental).toBeDefined();
      expect(createdRental?.marketValueZAR).toBe(secondOpp.purchasePrice);
    });
  });

  describe('3. Backward-Compatible Re-Exports Parity', () => {
    it('verifies all expected functions and selectors are exported from usePortfolioStore.ts', () => {
      expect(computePortfolioSummary).toBeTypeOf('function');
      expect(usePortfolioSummary).toBeTypeOf('function');
      expect(computeEquityAlerts).toBeTypeOf('function');
      expect(syncLeaseExpiryTasks).toBeTypeOf('function');
      expect(syncAgmReminderTask).toBeTypeOf('function');
      expect(sanitizeCompletedGuideSteps).toBeTypeOf('function');
    });

    it('verifies index.ts barrel exposes both store facade and task sync utilities', () => {
      expect(storeBarrel.usePortfolioStore).toBeDefined();
      expect(storeBarrel.syncLeaseExpiryTasks).toBeDefined();
      expect(storeBarrel.syncAgmReminderTask).toBeDefined();
      expect(storeBarrel.computePortfolioSummary).toBeDefined();
    });
  });

  describe('4. Acyclic Leaf taskSync Utility Invariants', () => {
    it('creates lease expiry reminder and handles cancellation on expired dates', () => {
      const futureLeaseEndDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const leases = [
        {
          id: 'test-lease-99',
          tenantName: 'John Doe',
          unitName: 'Unit 1',
          monthlyRentZAR: 10000,
          depositHeldZAR: 20000,
          annualEscalationPercent: 7,
          status: 'Occupied' as const,
          leaseStartDate: '2025-01-01',
          leaseEndDate: futureLeaseEndDate,
        },
      ];

      const tasks = syncLeaseExpiryTasks([], 'rental-test-id', 'Test Property', leases);
      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe('task-lease-expiry-test-lease-99');
      expect(tasks[0].status).toBe('Pending');

      // Now with expired lease
      const expiredLeases = [
        {
          ...leases[0],
          leaseEndDate: '2024-01-01',
        },
      ];
      const cleanedTasks = syncLeaseExpiryTasks(tasks, 'rental-test-id', 'Test Property', expiredLeases);
      expect(cleanedTasks).toHaveLength(0);
    });

    it('creates body corporate AGM reminder and removes when date cleared', () => {
      const tasks = syncAgmReminderTask([], 'flip', 'flip-test-1', 'Sandton Manor', '2026-11-15');
      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe('task-agm-flip-test-1');
      expect(tasks[0].title).toContain('Attend Body Corporate AGM');

      // Clear AGM date
      const clearedTasks = syncAgmReminderTask(tasks, 'flip', 'flip-test-1', 'Sandton Manor', undefined);
      expect(clearedTasks).toHaveLength(0);
    });
  });
});
