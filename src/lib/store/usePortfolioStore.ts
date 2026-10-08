import { useMemo } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import {
  RentalProperty,
  FlipProject,
  OpportunityDeal,
  FundingSource,
  LocalSupplier,
  TaskItem,
  TaskStatus,
  Lease,
  PortfolioSummary,
  BOQItem,
  InvestorProfile,
  AnalyzerDraft,
  AiSettings,
  ExtractedRentalUnit,
  FlipToRentalConversionParams,
  RentalRefinanceParams,
  PassReason,
  UtilityStatement,
  MeterReading,
  EquityExtractionAlert,
  TenantPaymentRecord,
  ArrearsWriteOff,
  PropertyMeter,
  MunicipalContact,
  Transaction,
} from '@/types';
import {
  calculateMonthlyBondRepayment,
  calculateBondPrincipalFromRepayment,
} from '@/lib/calculations/propertyMetrics';
import {
  calculatePropertyArrears,
  reconcileOpeningBalanceForTargetArrears,
  migrateNegativeArrearsToRental,
  parseDateParts,
} from '@/lib/calculations/arrears';
import { handleTaskCompletionRecurrence } from '@/lib/calculations/recurrence';
import {
  INITIAL_RENTALS,
  INITIAL_FLIPS,
  INITIAL_FUNDING,
  INITIAL_SUPPLIERS,
  INITIAL_TASKS,
  INITIAL_OPPORTUNITIES,
  INITIAL_INVESTOR_PROFILE,
  INITIAL_ANALYZER_DRAFT,
  EMPTY_ANALYZER_DRAFT,
  DEFAULT_AI_SETTINGS,
  INITIAL_MUNICIPAL_DIRECTORY,
} from './initialData';
import type { PortfolioStateSnapshot } from '@/lib/db/mergePortfolioState';

interface PortfolioState {
  rentals: RentalProperty[];
  flips: FlipProject[];
  funding: FundingSource[];
  opportunities: OpportunityDeal[];
  suppliers: LocalSupplier[];
  tasks: TaskItem[];
  municipalDirectory: MunicipalContact[];
  liquidCapitalReserve: number;
  investorProfile: InvestorProfile;
  analyzerDraft: AnalyzerDraft;
  aiSettings: AiSettings;
  rentalForecastView: 'wealth-only' | 'cashflow-only';

  // Get Started guide: manually ticked step IDs (local-only, never synced to the cloud)
  completedGuideSteps: string[];
  toggleGuideStep: (stepId: string) => void;
  resetGuideProgress: () => void;

  // Computed selector
  getSummary: () => PortfolioSummary;

  // Rental Forecast View Action
  setRentalForecastView: (mode: 'wealth-only' | 'cashflow-only') => void;

  // AI Settings Action
  updateAiSettings: (settings: Partial<AiSettings>) => void;

  // Investor Profile Action
  updateInvestorProfile: (profile: Partial<InvestorProfile>) => void;

  // Analyzer Draft Action
  updateAnalyzerDraft: (patch: Partial<AnalyzerDraft>) => void;

  // Rental Actions
  addRental: (rental: RentalProperty) => void;
  bulkAddRentals: (rentals: RentalProperty[]) => { addedCount: number; duplicateCount: number };
  reconcileImportedRentals: (units: ExtractedRentalUnit[]) => { updatedCount: number; newCount: number; addedCount: number; varianceCount: number };
  updateRental: (id: string, updates: Partial<RentalProperty>) => void;
  deleteRental: (id: string) => void;
  addMaintenanceLog: (rentalId: string, log: Omit<RentalProperty['maintenanceHistory'][0], 'id'>) => void;
  markRentalAsSold: (rentalId: string, actualSalePrice: number, netCashProceeds: number, soldDate: string, exitNotes?: string) => void;
  reopenRental: (rentalId: string) => void;
  refinanceRental: (params: RentalRefinanceParams) => void;
  addUtilityStatement: (propertyId: string, statement: UtilityStatement) => void;
  deleteUtilityStatement: (propertyId: string, statementId: string) => void;
  addMeterReading: (propertyId: string, reading: Omit<MeterReading, 'id' | 'createdAt'>) => void;
  deleteMeterReading: (propertyId: string, readingId: string) => void;
  updateMeterReadingDispute: (
    propertyId: string,
    readingId: string,
    disputeData: Partial<MeterReading>
  ) => void;
  setStatementTenantBillingMethod: (
    propertyId: string,
    statementId: string,
    method: 'municipal_statement' | 'independent_actuals'
  ) => void;
  recordTenantPayment: (
    propertyId: string,
    payment: Omit<TenantPaymentRecord, 'id' | 'createdAt' | 'propertyId'> & {
      id?: string;
      propertyId?: string;
    }
  ) => void;
  updateTenantPayment: (
    propertyId: string,
    paymentId: string,
    updates: Partial<TenantPaymentRecord>
  ) => void;
  deleteTenantPayment: (propertyId: string, paymentId: string) => void;
  recordArrearsWriteOff: (
    propertyId: string,
    writeOff: Omit<ArrearsWriteOff, 'id' | 'createdAt'> & {
      id?: string;
    }
  ) => void;
  deleteArrearsWriteOff: (propertyId: string, writeOffId: string) => void;
  updateArrearsOpeningBalance: (propertyId: string, openingBalance: number, leaseId?: string) => void;
  // Property Meter Registry Actions
  addPropertyMeter: (propertyId: string, meter: Omit<PropertyMeter, 'id' | 'createdAt'>) => void;
  updatePropertyMeter: (propertyId: string, meterId: string, updates: Partial<PropertyMeter>) => void;
  deletePropertyMeter: (propertyId: string, meterId: string) => void;

  // Flip Actions
  addFlip: (flip: FlipProject) => void;
  bulkAddFlips: (flips: FlipProject[]) => { addedCount: number; duplicateCount: number };
  updateFlip: (id: string, updates: Partial<FlipProject>) => void;
  deleteFlip: (id: string) => void;
  addBOQItem: (flipId: string, item: Omit<BOQItem, 'id'>) => void;
  updateBOQItem: (flipId: string, boqId: string, updates: Partial<BOQItem>) => void;
  deleteBOQItem: (flipId: string, boqId: string) => void;
  markFlipAsCompleted: (flipId: string, actualSalePrice: number, netCashProceeds: number, soldDate: string, exitNotes?: string) => void;
  reopenFlip: (flipId: string) => void;
  convertFlipToRental: (params: FlipToRentalConversionParams) => RentalProperty;

  // Funding Actions
  addFunding: (source: FundingSource) => void;
  updateFunding: (id: string, updates: Partial<FundingSource>) => void;
  deleteFunding: (id: string) => void;
  syncFundingWithDealDelay: (fundingId: string, delayDays: number, reason: string) => void;

  // Opportunity Actions
  addOpportunity: (opp: OpportunityDeal) => void;
  bulkAddOpportunities: (opps: OpportunityDeal[]) => { addedCount: number; duplicateCount: number };
  updateOpportunity: (id: string, updates: Partial<OpportunityDeal>) => void;
  deleteOpportunity: (id: string) => void;
  duplicateOpportunity: (oppId: string) => void;
  passOpportunity: (id: string, reason: PassReason, notes?: string) => void;
  reactivateOpportunity: (id: string) => void;
  advanceOpportunityStage: (id: string) => void;
  promoteOpportunityToFlip: (oppId: string) => void;
  promoteOpportunityToRental: (oppId: string) => void;

  // Transaction Actions (SARS ITR12 Property Actuals)
  addTransaction: (propertyId: string, transaction: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (propertyId: string, transactionId: string) => void;

  // Task Actions
  addTask: (task: Omit<TaskItem, 'id' | 'createdAt'>) => void;
  toggleTaskStatus: (taskId: string) => void;
  updateTask: (taskId: string, updates: Partial<TaskItem>) => void;
  deleteTask: (taskId: string) => void;

  // Supplier Actions
  addSupplier: (supplier: LocalSupplier) => void;
  deleteSupplier: (id: string) => void;

  // Municipal Directory Actions
  addMunicipalContact: (contact: Omit<MunicipalContact, 'id'>) => void;
  updateMunicipalContact: (id: string, updates: Partial<MunicipalContact>) => void;
  deleteMunicipalContact: (id: string) => void;
  resetMunicipalDirectory: () => void;

  // Liquid Reserve Action
  updateLiquidReserve: (amount: number) => void;

  // System State & Cloud Hydration Actions
  hydrateFromCloudState: (snapshot: PortfolioStateSnapshot) => void;
  resetToDemoData: () => void;
  clearAllData: () => void;
  importPortfolioJSON: (jsonString: string) => boolean;
}

function syncAgmReminderTask(
  tasks: TaskItem[],
  entityType: 'rental' | 'flip' | 'opportunity',
  entityId: string,
  entityTitle: string,
  agmDate?: string
): TaskItem[] {
  const existingIdx = tasks.findIndex(
    (t) => t.id === `task-agm-${entityId}` || (t.linkedEntity?.id === entityId && t.title.startsWith('Attend Body Corporate AGM'))
  );

  if (!agmDate) {
    if (existingIdx >= 0) {
      return tasks.filter((_, idx) => idx !== existingIdx);
    }
    return tasks;
  }

  const agmTime = new Date(agmDate).getTime();
  const reminderDate = isNaN(agmTime) ? agmDate : new Date(agmTime - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const agmTask: TaskItem = {
    id: `task-agm-${entityId}`,
    title: `Attend Body Corporate AGM & Review Budget: ${entityTitle}`,
    description: `Scheduled Body Corporate AGM on ${agmDate}. Review financials, trustee election, and proposed levy increases.`,
    dueDate: reminderDate,
    priority: 'High',
    status: 'Pending',
    linkedEntity: {
      type: entityType,
      id: entityId,
      name: entityTitle,
    },
    createdAt: new Date().toISOString().split('T')[0],
  };

  if (existingIdx >= 0) {
    const nextTasks = [...tasks];
    nextTasks[existingIdx] = { ...nextTasks[existingIdx], ...agmTask };
    return nextTasks;
  }

  return [agmTask, ...tasks];
}

export function syncLeaseExpiryTasks(
  tasks: TaskItem[],
  propertyId: string,
  propertyTitle: string,
  leases?: Lease[]
): TaskItem[] {
  let nextTasks = [...tasks];
  const today = new Date().toISOString().split('T')[0];

  const currentLeaseIds = new Set((leases || []).map((l) => l?.id).filter(Boolean));

  // Clean up any pending expiry tasks for this property that are no longer in active leases
  nextTasks = nextTasks.filter((t) => {
    if (t.id.startsWith('task-lease-expiry-') && t.linkedEntity?.id === propertyId && t.status === 'Pending') {
      const leaseIdFromTask = t.id.replace('task-lease-expiry-', '');
      if (!currentLeaseIds.has(leaseIdFromTask)) {
        return false;
      }
    }
    return true;
  });

  if (!leases || leases.length === 0) {
    return nextTasks;
  }

  for (const lease of leases) {
    if (!lease || !lease.id) continue;
    const taskId = `task-lease-expiry-${lease.id}`;
    const existingIdx = nextTasks.findIndex(
      (t) =>
        t.id === taskId ||
        (t.linkedEntity?.id === lease.id && t.title.startsWith('Lease Expiry:')) ||
        (t.linkedEntity?.id === propertyId && t.id === taskId)
    );

    const leaseEndParts = parseDateParts(lease.leaseEndDate);

    // If lease has no end date or is already expired (< today)
    if (!leaseEndParts || leaseEndParts.isoDate < today) {
      if (existingIdx >= 0 && nextTasks[existingIdx].status === 'Pending') {
        nextTasks.splice(existingIdx, 1);
      }
      continue;
    }

    // Reminder date 60 days prior to leaseEndDate
    const reminderDate = new Date(leaseEndParts.timestamp - 60 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    const dueDate = reminderDate > today ? reminderDate : today;

    const tenantName = lease.tenantName || 'Tenant';
    const unitPart = lease.unitName || 'Unit';
    const title = `Lease Expiry: ${tenantName} at ${propertyTitle} - ${unitPart}`;
    const description = `Lease expires on ${lease.leaseEndDate}. Initiate renewal discussions or begin marketing for a new tenant.`;

    if (existingIdx >= 0) {
      const existing = nextTasks[existingIdx];
      // If leaseEndDate changed, re-open task to Pending; otherwise preserve existing status (e.g., Completed)
      const dateChanged = existing.description ? !existing.description.includes(lease.leaseEndDate) : true;
      nextTasks[existingIdx] = {
        ...existing,
        id: taskId,
        title,
        description,
        dueDate,
        priority: 'High',
        status: dateChanged ? 'Pending' : existing.status,
        linkedEntity: {
          type: 'rental',
          id: propertyId,
          name: propertyTitle,
        },
      };
    } else {
      const newTask: TaskItem = {
        id: taskId,
        title,
        description,
        dueDate,
        priority: 'High',
        status: 'Pending',
        linkedEntity: {
          type: 'rental',
          id: propertyId,
          name: propertyTitle,
        },
        createdAt: today,
      };
      nextTasks = [newTask, ...nextTasks];
    }
  }

  return nextTasks;
}

/**
 * Normalises persisted Get Started checklist data: keeps only non-empty strings, de-duplicated.
 * Anything else (undefined, null, objects, legacy shapes) collapses to an empty list.
 */
export function sanitizeCompletedGuideSteps(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item === 'string' && item.trim().length > 0) seen.add(item);
  }
  return Array.from(seen);
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => ({
      rentals: INITIAL_RENTALS,
      flips: INITIAL_FLIPS,
      funding: INITIAL_FUNDING,
      opportunities: INITIAL_OPPORTUNITIES,
      suppliers: INITIAL_SUPPLIERS,
      tasks: INITIAL_TASKS,
      municipalDirectory: INITIAL_MUNICIPAL_DIRECTORY,
      liquidCapitalReserve: 650_000, // ZAR 650k operational cash reserve
      investorProfile: INITIAL_INVESTOR_PROFILE,
      analyzerDraft: INITIAL_ANALYZER_DRAFT,
      aiSettings: DEFAULT_AI_SETTINGS,
      rentalForecastView: 'wealth-only',
      completedGuideSteps: [],

      toggleGuideStep: (stepId) => {
        if (typeof stepId !== 'string' || stepId.trim().length === 0) return;
        set((state) => ({
          completedGuideSteps: state.completedGuideSteps.includes(stepId)
            ? state.completedGuideSteps.filter((id) => id !== stepId)
            : [...state.completedGuideSteps, stepId],
        }));
      },
      resetGuideProgress: () => set({ completedGuideSteps: [] }),

      getSummary: (): PortfolioSummary => {
        return computePortfolioSummary(get());
      },

      setRentalForecastView: (mode) => set({ rentalForecastView: mode }),

      // AI Settings
      updateAiSettings: (updates) =>
        set((state) => ({
          aiSettings: { ...state.aiSettings, ...updates },
        })),

      // Investor Profile
      updateInvestorProfile: (updates) =>
        set((state) => ({
          investorProfile: { ...state.investorProfile, ...updates },
        })),

      // Analyzer Draft
      updateAnalyzerDraft: (patch) =>
        set((state) => ({
          analyzerDraft: { ...state.analyzerDraft, ...patch },
        })),

      // Rentals
      addRental: (rental) =>
        set((state) => {
          let updatedTasks = rental.agmDate
            ? syncAgmReminderTask(state.tasks, 'rental', rental.id, rental.title, rental.agmDate)
            : state.tasks;
          updatedTasks = syncLeaseExpiryTasks(
            updatedTasks,
            rental.id,
            rental.title,
            rental.leases
          );
          return {
            rentals: [rental, ...state.rentals],
            tasks: updatedTasks,
          };
        }),
      bulkAddRentals: (newRentals) => {
        let duplicateCount = 0;
        const currentRentals = get().rentals;
        const currentTasks = get().tasks;
        let updatedTasks = [...currentTasks];

        newRentals.forEach((r) => {
          const isDup = currentRentals.some(
            (cr) =>
              cr.title.trim().toLowerCase() === r.title.trim().toLowerCase() ||
              (r.address && cr.address.trim().toLowerCase() === r.address.trim().toLowerCase())
          );
          if (isDup) duplicateCount++;

          if (r.agmDate) {
            updatedTasks = syncAgmReminderTask(updatedTasks, 'rental', r.id, r.title, r.agmDate);
          }
          updatedTasks = syncLeaseExpiryTasks(updatedTasks, r.id, r.title, r.leases);
        });

        set((state) => ({
          rentals: [...newRentals, ...state.rentals],
          tasks: updatedTasks,
        }));

        return { addedCount: newRentals.length, duplicateCount };
      },
      reconcileImportedRentals: (units) => {
        const currentRentals = get().rentals;
        let updatedCount = 0;
        let newCount = 0;
        let varianceCount = 0;

        const normalizeKey = (s?: string) =>
          s ? s.toLowerCase().replace(/[^a-z0-9]/g, '') : '';

        const updatedRentals = [...currentRentals];
        const newlyCreatedRentals: RentalProperty[] = [];

        units.forEach((unit, idx) => {
          const unitKey = normalizeKey(unit.propertyName);
          const unitAddrKey = normalizeKey(unit.address);

          const matchIndex = updatedRentals.findIndex((r) => {
            const titleKey = normalizeKey(r.title);
            const addrKey = normalizeKey(r.address);
            if (!unitKey) return false;
            return (
              titleKey === unitKey ||
              (unitAddrKey && addrKey === unitAddrKey) ||
              titleKey.includes(unitKey) ||
              unitKey.includes(titleKey)
            );
          });

          const calcNoi =
            unit.grossRentZAR -
            ((unit.leviesZAR || 0) +
              (unit.municipalRatesZAR || 0) +
              (unit.agencyCommissionZAR || 0));
          if (Math.abs(calcNoi - (unit.netOperatingIncomeZAR || 0)) > 1.0) {
            varianceCount++;
          }

          // Compute VAT & commission metrics accurately to avoid double-taxation
          const isVatInclusive = unit.isCommissionInclusiveOfVat !== false;
          const commTotal = unit.agencyCommissionZAR ?? 0;
          const vatAmount =
            unit.agencyCommissionVatZAR !== undefined
              ? unit.agencyCommissionVatZAR
              : isVatInclusive && commTotal > 0
              ? (commTotal * 0.15) / 1.15
              : 0;
          const commExVat = isVatInclusive ? Math.max(0, commTotal - vatAmount) : commTotal;
          const baseCommissionPercent =
            unit.grossRentZAR > 0 && commTotal > 0
              ? Number(((commExVat / unit.grossRentZAR) * 100).toFixed(2))
              : 8.0;

          if (matchIndex >= 0) {
            const existing = updatedRentals[matchIndex];
            updatedRentals[matchIndex] = {
              ...existing,
              monthlyGrossRentZAR: unit.grossRentZAR,
              monthlyLeviesZAR:
                existing.propertyType === 'Freehold House' ? 0 : (unit.leviesZAR ?? existing.monthlyLeviesZAR),
              monthlyRatesTaxesZAR: unit.municipalRatesZAR ?? existing.monthlyRatesTaxesZAR,
              monthlyAgentFeeZAR:
                unit.agencyCommissionZAR !== undefined
                  ? Math.round(unit.agencyCommissionZAR)
                  : existing.monthlyAgentFeeZAR,
              agencyCommissionPercent:
                unit.agencyCommissionZAR !== undefined
                  ? baseCommissionPercent
                  : existing.agencyCommissionPercent,
              agencyVatApplicable:
                unit.agencyCommissionZAR !== undefined
                  ? isVatInclusive || vatAmount > 0
                  : existing.agencyVatApplicable,
              marketValueZAR:
                unit.estimatedMarketValueZAR && unit.estimatedMarketValueZAR > 0
                  ? Math.round(unit.estimatedMarketValueZAR)
                  : existing.marketValueZAR,
              purchasePriceZAR:
                unit.purchasePriceZAR && unit.purchasePriceZAR > 0
                  ? Math.round(unit.purchasePriceZAR)
                  : existing.purchasePriceZAR,
              monthlyBondPaymentZAR:
                unit.monthlyBondPaymentZAR !== undefined && unit.monthlyBondPaymentZAR > 0
                  ? Math.round(unit.monthlyBondPaymentZAR)
                  : existing.monthlyBondPaymentZAR,
              bondPaymentEffectiveDate:
                unit.bondPaymentEffectiveDate || existing.bondPaymentEffectiveDate,
              leases: existing.leases?.length ? existing.leases.map((l, i) => i === 0 ? {
                ...l,
                tenantName: unit.tenantName || l.tenantName,
                leaseEndDate: unit.leaseExpiryDate || unit.leaseEndDate || l.leaseEndDate,
                depositHeldZAR: unit.depositHeldZAR ?? l.depositHeldZAR,
                monthlyRentZAR: unit.grossRentZAR || l.monthlyRentZAR,
              } : l) : [{
                id: `lease-${Date.now()}`,
                unitName: 'Main Unit',
                tenantName: unit.tenantName || 'Tenant Unassigned',
                leaseStartDate: new Date().toISOString().split('T')[0],
                leaseEndDate: unit.leaseExpiryDate || unit.leaseEndDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                monthlyRentZAR: unit.grossRentZAR,
                depositHeldZAR: unit.depositHeldZAR ?? unit.grossRentZAR * 2,
                annualEscalationPercent: 7.0,
                status: 'Occupied'
              }],
            };
            updatedCount++;
          } else {
            const isHouse =
              unit.propertyName.toLowerCase().includes('house') ||
              unit.propertyName.toLowerCase().includes('freehold');
            const marketValue =
              unit.estimatedMarketValueZAR && unit.estimatedMarketValueZAR > 0
                ? Math.round(unit.estimatedMarketValueZAR)
                : Math.round(unit.grossRentZAR * 120);
            const purchasePrice =
              unit.purchasePriceZAR && unit.purchasePriceZAR > 0
                ? Math.round(unit.purchasePriceZAR)
                : Math.round(unit.grossRentZAR * 110);
            const bondPayment =
              unit.monthlyBondPaymentZAR && unit.monthlyBondPaymentZAR > 0
                ? Math.round(unit.monthlyBondPaymentZAR)
                : 0;

            const newProperty: RentalProperty = {
              id: `rental-ai-${Date.now()}-${idx}`,
              title: unit.propertyName,
              address: unit.address || unit.propertyAddress || `${unit.propertyName}, South Africa`,
              city: 'Johannesburg',
              propertyType: isHouse ? 'Freehold House' : 'Sectional Title Apartment',
              marketValueZAR: marketValue,
              purchasePriceZAR: purchasePrice,
              purchaseDate: new Date().toISOString().split('T')[0],
              outstandingBondBalanceZAR: 0,
              bondInterestRatePercent: 11.75,
              monthlyBondPaymentZAR: bondPayment,
              bondPaymentEffectiveDate: unit.bondPaymentEffectiveDate,
              leases: [{
                id: `lease-${Date.now()}-${idx}`,
                unitName: 'Main Unit',
                tenantName: unit.tenantName || 'Tenant Unassigned',
                tenantPhone: '+27 —',
                tenantEmail: 'pending@tenant.co.za',
                leaseStartDate: new Date().toISOString().split('T')[0],
                leaseEndDate:
                  unit.leaseExpiryDate ||
                  unit.leaseEndDate ||
                  new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split('T')[0],
                monthlyRentZAR: unit.grossRentZAR,
                depositHeldZAR: unit.depositHeldZAR ?? unit.grossRentZAR * 2,
                annualEscalationPercent: 7.0,
                status: 'Occupied',
              }],
              managementType: 'Agency',
              agencyName: unit.managingAgent || 'iGrow Rentals / WeconnectU',
              agencyCommissionPercent: baseCommissionPercent,
              agencyVatApplicable: isVatInclusive || vatAmount > 0,
              monthlyGrossRentZAR: unit.grossRentZAR,
              monthlyLeviesZAR: isHouse ? 0 : (unit.leviesZAR ?? 0),
              monthlyRatesTaxesZAR: unit.municipalRatesZAR ?? 0,
              monthlyAgentFeeZAR: Math.round(commTotal),
              monthlyMaintenanceReserveZAR: 500,
              unpaidUtilityArrearsZAR: 0,
              maintenanceHistory: [],
              status: 'Occupied',
            };
            newlyCreatedRentals.push(newProperty);
            newCount++;
          }
        });

        set((state) => {
          let tasks = state.tasks;
          [...newlyCreatedRentals, ...updatedRentals].forEach((r) => {
            tasks = syncLeaseExpiryTasks(tasks, r.id, r.title, r.leases);
          });
          return {
            rentals: [...newlyCreatedRentals, ...updatedRentals],
            tasks,
          };
        });

        return { updatedCount, newCount, addedCount: newCount, varianceCount };
      },
      updateRental: (id, updates) =>
        set((state) => {
          const updatedRentals = state.rentals.map((r) => {
            if (r.id !== id) return r;
            const reconciledUpdates = { ...updates };
            if (updates.arrearsOpeningBalanceZAR !== undefined) {
              reconciledUpdates.arrearsOpeningBalanceZAR = Math.max(0, updates.arrearsOpeningBalanceZAR);
            }
            if (
              updates.arrearsOpeningBalanceZAR !== undefined ||
              updates.arrearsWriteOffs !== undefined ||
              updates.paymentRecords !== undefined ||
              updates.leases !== undefined ||
              updates.monthlyGrossRentZAR !== undefined
            ) {
              const tempRental = { ...r, ...reconciledUpdates };
              const updatedLeases = (tempRental.leases || []).map((l) => {
                const leaseArrears = calculatePropertyArrears(tempRental, undefined, { leaseId: l.id });
                return {
                  ...l,
                  unpaidUtilityArrearsZAR: Math.max(0, leaseArrears.totalArrearsZAR),
                };
              });
              const arrearsResult = calculatePropertyArrears({ ...tempRental, leases: updatedLeases });
              reconciledUpdates.leases = updatedLeases;
              if (updates.unpaidUtilityArrearsZAR === undefined) {
                reconciledUpdates.unpaidUtilityArrearsZAR = Math.max(0, arrearsResult.totalArrearsZAR);
              }
            }
            return { ...r, ...reconciledUpdates };
          });
          const target = updatedRentals.find((r) => r.id === id);
          const agmDate = updates.agmDate !== undefined ? updates.agmDate : target?.agmDate;
          let tasks = target
            ? syncAgmReminderTask(state.tasks, 'rental', id, target.title, agmDate)
            : state.tasks;
          if (target) {
            tasks = syncLeaseExpiryTasks(tasks, id, target.title, target.leases);
          }
          return {
            rentals: updatedRentals,
            tasks,
          };
        }),
      deleteRental: (id) =>
        set((state) => ({
          rentals: state.rentals.filter((r) => r.id !== id),
          tasks: state.tasks.filter(
            (t) =>
              !(
                t.linkedEntity?.id === id &&
                (t.id.startsWith('task-lease-expiry-') || t.id.startsWith('task-agm-'))
              )
          ),
        })),
      addMaintenanceLog: (rentalId, log) =>
        set((state) => ({
          rentals: state.rentals.map((r) => {
            if (r.id !== rentalId) return r;
            const newLog = { ...log, id: `maint-${Date.now()}` };
            return {
              ...r,
              maintenanceHistory: [newLog, ...(r.maintenanceHistory || [])],
            };
          }),
        })),
      markRentalAsSold: (rentalId, actualSalePrice, netCashProceeds, soldDate, exitNotes) =>
        set((state) => {
          const rental = state.rentals.find((r) => r.id === rentalId);
          if (!rental) return state;
          return {
            rentals: state.rentals.map((r) =>
              r.id === rentalId
                ? {
                    ...r,
                    status: 'Sold',
                    actualSalePriceZAR: actualSalePrice,
                    netCashProceedsZAR: netCashProceeds,
                    soldDate,
                    exitNotes,
                  }
                : r
            ),
            liquidCapitalReserve: state.liquidCapitalReserve + (netCashProceeds || 0),
          };
        }),
      reopenRental: (rentalId) =>
        set((state) => {
          const rental = state.rentals.find((r) => r.id === rentalId);
          if (!rental) return state;
          const deducted = Math.max(0, state.liquidCapitalReserve - (rental.netCashProceedsZAR || 0));
          return {
            rentals: state.rentals.map((r) =>
              r.id === rentalId
                ? {
                    ...r,
                    status: 'Occupied',
                    actualSalePriceZAR: undefined,
                    netCashProceedsZAR: undefined,
                    soldDate: undefined,
                    exitNotes: undefined,
                  }
                : r
            ),
            liquidCapitalReserve: deducted,
          };
        }),
      refinanceRental: (params) =>
        set((state) => {
          const rental = state.rentals.find((r) => r.id === params.rentalId);
          if (!rental) return state;

          const now = new Date();
          const dateStr = params.refinanceDate || now.toISOString().split('T')[0];
          const effectiveMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

          const record = {
            id: `refinance-${Date.now()}`,
            refinanceDate: dateStr,
            newBankValuationZAR: params.newBankValuationZAR,
            newMonthlyBondPaymentZAR: params.newMonthlyBondPaymentZAR,
            cashEquityPulledOutZAR: params.cashEquityPulledOutZAR,
            newBondBalanceZAR: params.newBondBalanceZAR,
            notes: params.notes,
          };

          const updatedRentals = state.rentals.map((r) => {
            if (r.id !== params.rentalId) return r;
            return {
              ...r,
              marketValueZAR: params.newBankValuationZAR,
              monthlyBondPaymentZAR: params.newMonthlyBondPaymentZAR,
              outstandingBondBalanceZAR: params.newBondBalanceZAR,
              bondPaymentEffectiveDate: effectiveMonth,
              bondRevisionNote: `BRRRR Refinance: R ${params.cashEquityPulledOutZAR.toLocaleString('en-ZA')} equity pulled out`,
              totalEquityExtractedZAR: (r.totalEquityExtractedZAR || 0) + params.cashEquityPulledOutZAR,
              refinanceHistory: [record, ...(r.refinanceHistory || [])],
            };
          });

          return {
            rentals: updatedRentals,
            liquidCapitalReserve: state.liquidCapitalReserve + params.cashEquityPulledOutZAR,
          };
        }),
      addUtilityStatement: (propertyId, statement) =>
        set((state) => ({
          rentals: state.rentals.map((r) => {
            if (r.id !== propertyId) return r;
            const existingStatements = r.utilityStatements || [];
            const filtered = existingStatements.filter(
              (s) => s.id !== statement.id && s.statementDate !== statement.statementDate
            );
            const combined = [...filtered, statement].sort((a, b) =>
              a.statementDate.localeCompare(b.statementDate)
            );

            // Auto-extract meter readings if present on incoming statement
            let updatedMeterReadings = [...(r.meterReadings || [])];
            if (statement.extractedMeterReadings && statement.extractedMeterReadings.length > 0) {
              statement.extractedMeterReadings.forEach((extracted, idx) => {
                const alreadyExists = updatedMeterReadings.some(
                  (mr) =>
                    mr.date === extracted.date &&
                    mr.utilityType === extracted.utilityType &&
                    mr.readingValue === extracted.readingValue
                );
                if (!alreadyExists) {
                  const newReading: MeterReading = {
                    ...extracted,
                    id: `meter-pdf-${Date.now()}-${idx}`,
                    createdAt: new Date().toISOString(),
                  };
                  updatedMeterReadings.push(newReading);
                }
              });
              updatedMeterReadings.sort((a, b) => b.date.localeCompare(a.date));
            }

            return {
              ...r,
              utilityStatements: combined,
              meterReadings: updatedMeterReadings,
              unpaidUtilityArrearsZAR: Math.max(
                0,
                calculatePropertyArrears({
                  ...r,
                  utilityStatements: combined,
                  meterReadings: updatedMeterReadings,
                }).totalArrearsZAR
              ),
            };
          }),
        })),
      deleteUtilityStatement: (propertyId, statementId) =>
        set((state) => ({
          rentals: state.rentals.map((r) => {
            if (r.id !== propertyId) return r;
            const remaining = (r.utilityStatements || []).filter(
              (s) => s.id !== statementId
            );
            return {
              ...r,
              utilityStatements: remaining,
              unpaidUtilityArrearsZAR: Math.max(
                0,
                calculatePropertyArrears({
                  ...r,
                  utilityStatements: remaining,
                }).totalArrearsZAR
              ),
            };
          }),
        })),
      addMeterReading: (propertyId, reading) =>
        set((state) => ({
          rentals: state.rentals.map((r) => {
            if (r.id !== propertyId) return r;
            const newReading: MeterReading = {
              ...reading,
              id: `meter-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              createdAt: new Date().toISOString(),
            };
            const updated = [newReading, ...(r.meterReadings || [])].sort((a, b) =>
              b.date.localeCompare(a.date)
            );
            return {
              ...r,
              meterReadings: updated,
            };
          }),
        })),
      deleteMeterReading: (propertyId, readingId) =>
        set((state) => ({
          rentals: state.rentals.map((r) => {
            if (r.id !== propertyId) return r;
            return {
              ...r,
              meterReadings: (r.meterReadings || []).filter((m) => m.id !== readingId),
            };
          }),
        })),
      updateMeterReadingDispute: (propertyId, readingId, disputeData) =>
        set((state) => ({
          rentals: state.rentals.map((r) => {
            if (r.id !== propertyId) return r;
            return {
              ...r,
              meterReadings: (r.meterReadings || []).map((m) => {
                if (m.id !== readingId) return m;
                return {
                  ...m,
                  ...disputeData,
                };
              }),
            };
          }),
        })),
      addPropertyMeter: (propertyId, meter) =>
        set((state) => ({
          rentals: state.rentals.map((r) => {
            if (r.id !== propertyId) return r;
            const newMeter: PropertyMeter = {
              ...meter,
              id: `reg-m-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              createdAt: new Date().toISOString(),
            };
            return {
              ...r,
              meterRegistry: [...(r.meterRegistry || []), newMeter],
            };
          }),
        })),
      updatePropertyMeter: (propertyId, meterId, updates) =>
        set((state) => ({
          rentals: state.rentals.map((r) => {
            if (r.id !== propertyId) return r;
            return {
              ...r,
              meterRegistry: (r.meterRegistry || []).map((m) =>
                m.id === meterId ? { ...m, ...updates } : m
              ),
            };
          }),
        })),
      deletePropertyMeter: (propertyId, meterId) =>
        set((state) => ({
          rentals: state.rentals.map((r) => {
            if (r.id !== propertyId) return r;
            return {
              ...r,
              meterRegistry: (r.meterRegistry || []).filter((m) => m.id !== meterId),
            };
          }),
        })),
      setStatementTenantBillingMethod: (propertyId, statementId, method) =>
        set((state) => ({
          rentals: state.rentals.map((r) => {
            if (r.id !== propertyId) return r;
            return {
              ...r,
              utilityStatements: (r.utilityStatements || []).map((s) => {
                if (s.id !== statementId) return s;
                return {
                  ...s,
                  tenantBillingMethod: method,
                };
              }),
            };
          }),
        })),
      recordTenantPayment: (propertyId, payment) =>
        set((state) => ({
          rentals: state.rentals.map((r) => {
            if (r.id !== propertyId) return r;
            const newPayment: TenantPaymentRecord = {
              ...payment,
              id: payment.id || `pay-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              propertyId,
              createdAt: new Date().toISOString(),
            };
            const updatedPayments = [newPayment, ...(r.paymentRecords || [])].sort((a, b) =>
              b.paymentDate.localeCompare(a.paymentDate)
            );

            // Handle 'Deposit Applied': reduces the selected lease's depositHeldZAR
            let updatedLeases = r.leases || [];
            if (newPayment.paymentMethod === 'Deposit Applied') {
              const targetLeaseId =
                newPayment.leaseId || (updatedLeases.length === 1 ? updatedLeases[0].id : undefined);
              if (targetLeaseId) {
                updatedLeases = updatedLeases.map((l) =>
                  l.id === targetLeaseId
                    ? {
                        ...l,
                        depositHeldZAR: Math.max(0, (l.depositHeldZAR || 0) - newPayment.amountReceivedZAR),
                      }
                    : l
                );
              }
            }

            const tempRental: RentalProperty = {
              ...r,
              paymentRecords: updatedPayments,
              leases: updatedLeases,
            };
            const finalizedLeases = (tempRental.leases || []).map((l) => {
              const leaseArrears = calculatePropertyArrears(tempRental, undefined, { leaseId: l.id });
              return {
                ...l,
                unpaidUtilityArrearsZAR: Math.max(0, leaseArrears.totalArrearsZAR),
              };
            });
            const arrearsResult = calculatePropertyArrears({ ...tempRental, leases: finalizedLeases });
            return {
              ...tempRental,
              leases: finalizedLeases,
              unpaidUtilityArrearsZAR: Math.max(0, arrearsResult.totalArrearsZAR),
            };
          }),
        })),
      updateTenantPayment: (propertyId, paymentId, updates) =>
        set((state) => ({
          rentals: state.rentals.map((r) => {
            if (r.id !== propertyId) return r;
            const oldPayment = (r.paymentRecords || []).find((p) => p.id === paymentId);
            let updatedLeases = r.leases || [];

            // Adjust depositHeldZAR if editing a Deposit Applied payment
            if (oldPayment) {
              const oldMethod = oldPayment.paymentMethod;
              const newMethod = updates.paymentMethod !== undefined ? updates.paymentMethod : oldMethod;
              const oldAmount = oldPayment.amountReceivedZAR;
              const newAmount = updates.amountReceivedZAR !== undefined ? updates.amountReceivedZAR : oldAmount;
              const oldLeaseId = oldPayment.leaseId || (updatedLeases.length === 1 ? updatedLeases[0].id : undefined);
              const newLeaseId =
                (updates.leaseId !== undefined ? updates.leaseId : oldPayment.leaseId) ||
                (updatedLeases.length === 1 ? updatedLeases[0].id : undefined);

              if (oldMethod === 'Deposit Applied' && newMethod !== 'Deposit Applied') {
                if (oldLeaseId) {
                  updatedLeases = updatedLeases.map((l) =>
                    l.id === oldLeaseId ? { ...l, depositHeldZAR: (l.depositHeldZAR || 0) + oldAmount } : l
                  );
                }
              } else if (oldMethod !== 'Deposit Applied' && newMethod === 'Deposit Applied') {
                if (newLeaseId) {
                  updatedLeases = updatedLeases.map((l) =>
                    l.id === newLeaseId
                      ? { ...l, depositHeldZAR: Math.max(0, (l.depositHeldZAR || 0) - newAmount) }
                      : l
                  );
                }
              } else if (oldMethod === 'Deposit Applied' && newMethod === 'Deposit Applied') {
                if (oldLeaseId === newLeaseId) {
                  const diff = newAmount - oldAmount;
                  if (oldLeaseId) {
                    updatedLeases = updatedLeases.map((l) =>
                      l.id === oldLeaseId
                        ? { ...l, depositHeldZAR: Math.max(0, (l.depositHeldZAR || 0) - diff) }
                        : l
                    );
                  }
                } else {
                  if (oldLeaseId) {
                    updatedLeases = updatedLeases.map((l) =>
                      l.id === oldLeaseId ? { ...l, depositHeldZAR: (l.depositHeldZAR || 0) + oldAmount } : l
                    );
                  }
                  if (newLeaseId) {
                    updatedLeases = updatedLeases.map((l) =>
                      l.id === newLeaseId
                        ? { ...l, depositHeldZAR: Math.max(0, (l.depositHeldZAR || 0) - newAmount) }
                        : l
                    );
                  }
                }
              }
            }

            const updatedPayments = (r.paymentRecords || []).map((p) =>
              p.id === paymentId ? { ...p, ...updates } : p
            ).sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));

            const tempRental: RentalProperty = {
              ...r,
              paymentRecords: updatedPayments,
              leases: updatedLeases,
            };
            const finalizedLeases = (tempRental.leases || []).map((l) => {
              const leaseArrears = calculatePropertyArrears(tempRental, undefined, { leaseId: l.id });
              return {
                ...l,
                unpaidUtilityArrearsZAR: Math.max(0, leaseArrears.totalArrearsZAR),
              };
            });
            const arrearsResult = calculatePropertyArrears({ ...tempRental, leases: finalizedLeases });
            return {
              ...tempRental,
              leases: finalizedLeases,
              unpaidUtilityArrearsZAR: Math.max(0, arrearsResult.totalArrearsZAR),
            };
          }),
        })),
      deleteTenantPayment: (propertyId, paymentId) =>
        set((state) => ({
          rentals: state.rentals.map((r) => {
            if (r.id !== propertyId) return r;
            const deletedPayment = (r.paymentRecords || []).find((p) => p.id === paymentId);
            let updatedLeases = r.leases || [];

            // Restores deposit if deleted payment was 'Deposit Applied'
            if (deletedPayment && deletedPayment.paymentMethod === 'Deposit Applied') {
              const targetLeaseId =
                deletedPayment.leaseId || (updatedLeases.length === 1 ? updatedLeases[0].id : undefined);
              if (targetLeaseId) {
                updatedLeases = updatedLeases.map((l) =>
                  l.id === targetLeaseId
                    ? { ...l, depositHeldZAR: (l.depositHeldZAR || 0) + deletedPayment.amountReceivedZAR }
                    : l
                );
              }
            }

            const updatedPayments = (r.paymentRecords || []).filter((p) => p.id !== paymentId);
            const tempRental: RentalProperty = {
              ...r,
              paymentRecords: updatedPayments,
              leases: updatedLeases,
            };
            const finalizedLeases = (tempRental.leases || []).map((l) => {
              const leaseArrears = calculatePropertyArrears(tempRental, undefined, { leaseId: l.id });
              return {
                ...l,
                unpaidUtilityArrearsZAR: Math.max(0, leaseArrears.totalArrearsZAR),
              };
            });
            const arrearsResult = calculatePropertyArrears({ ...tempRental, leases: finalizedLeases });
            return {
              ...tempRental,
              leases: finalizedLeases,
              unpaidUtilityArrearsZAR: Math.max(0, arrearsResult.totalArrearsZAR),
            };
          }),
        })),
      recordArrearsWriteOff: (propertyId, writeOff) =>
        set((state) => ({
          rentals: state.rentals.map((r) => {
            if (r.id !== propertyId) return r;
            const newWriteOff: ArrearsWriteOff = {
              ...writeOff,
              id: writeOff.id || `woff-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              createdAt: new Date().toISOString(),
            };
            const updatedWriteOffs = [newWriteOff, ...(r.arrearsWriteOffs || [])].sort((a, b) =>
              b.date.localeCompare(a.date)
            );
            const tempRental: RentalProperty = {
              ...r,
              arrearsWriteOffs: updatedWriteOffs,
            };
            const updatedLeases = (tempRental.leases || []).map((l) => {
              const leaseArrears = calculatePropertyArrears(tempRental, undefined, { leaseId: l.id });
              return {
                ...l,
                unpaidUtilityArrearsZAR: Math.max(0, leaseArrears.totalArrearsZAR),
              };
            });
            const arrearsResult = calculatePropertyArrears({ ...tempRental, leases: updatedLeases });
            return {
              ...tempRental,
              leases: updatedLeases,
              unpaidUtilityArrearsZAR: Math.max(0, arrearsResult.totalArrearsZAR),
            };
          }),
        })),
      deleteArrearsWriteOff: (propertyId, writeOffId) =>
        set((state) => ({
          rentals: state.rentals.map((r) => {
            if (r.id !== propertyId) return r;
            const updatedWriteOffs = (r.arrearsWriteOffs || []).filter((w) => w.id !== writeOffId);
            const tempRental: RentalProperty = {
              ...r,
              arrearsWriteOffs: updatedWriteOffs,
            };
            const updatedLeases = (tempRental.leases || []).map((l) => {
              const leaseArrears = calculatePropertyArrears(tempRental, undefined, { leaseId: l.id });
              return {
                ...l,
                unpaidUtilityArrearsZAR: Math.max(0, leaseArrears.totalArrearsZAR),
              };
            });
            const arrearsResult = calculatePropertyArrears({ ...tempRental, leases: updatedLeases });
            return {
              ...tempRental,
              leases: updatedLeases,
              unpaidUtilityArrearsZAR: Math.max(0, arrearsResult.totalArrearsZAR),
            };
          }),
        })),
      updateArrearsOpeningBalance: (propertyId, openingBalance, leaseId) =>
        set((state) => ({
          rentals: state.rentals.map((r) => {
            if (r.id !== propertyId) return r;
            const sanitizedBalance = Math.max(0, openingBalance);
            let updatedLeases = r.leases || [];
            let propOpening = sanitizedBalance;

            if (leaseId) {
              updatedLeases = updatedLeases.map((l) =>
                l.id === leaseId ? { ...l, arrearsOpeningBalanceZAR: sanitizedBalance } : l
              );
              propOpening = updatedLeases.reduce((s, l) => s + (l.arrearsOpeningBalanceZAR || 0), 0);
            } else if (updatedLeases.length === 1) {
              updatedLeases = [{ ...updatedLeases[0], arrearsOpeningBalanceZAR: sanitizedBalance }];
            }

            const tempRental: RentalProperty = {
              ...r,
              arrearsOpeningBalanceZAR: propOpening,
              leases: updatedLeases,
            };

            const finalizedLeases = updatedLeases.map((l) => {
              const leaseArrears = calculatePropertyArrears(tempRental, undefined, { leaseId: l.id });
              return {
                ...l,
                unpaidUtilityArrearsZAR: Math.max(0, leaseArrears.totalArrearsZAR),
              };
            });

            const arrearsResult = calculatePropertyArrears({ ...tempRental, leases: finalizedLeases });
            return {
              ...tempRental,
              leases: finalizedLeases,
              unpaidUtilityArrearsZAR: Math.max(0, arrearsResult.totalArrearsZAR),
            };
          }),
        })),

      // Flips
      addFlip: (flip) =>
        set((state) => ({
          flips: [
            {
              ...flip,
              exitCommissionPercent: flip.exitCommissionPercent ?? 5.75,
            },
            ...state.flips,
          ],
          tasks: flip.agmDate
            ? syncAgmReminderTask(state.tasks, 'flip', flip.id, flip.title, flip.agmDate)
            : state.tasks,
        })),
      bulkAddFlips: (newFlips) => {
        let duplicateCount = 0;
        const currentFlips = get().flips;
        const currentTasks = get().tasks;
        let updatedTasks = [...currentTasks];

        newFlips.forEach((f) => {
          const isDup = currentFlips.some(
            (cf) =>
              cf.title.trim().toLowerCase() === f.title.trim().toLowerCase() ||
              (f.address && cf.address.trim().toLowerCase() === f.address.trim().toLowerCase())
          );
          if (isDup) duplicateCount++;

          if (f.agmDate) {
            updatedTasks = syncAgmReminderTask(updatedTasks, 'flip', f.id, f.title, f.agmDate);
          }
        });

        const standardizedFlips = newFlips.map((f) => ({
          ...f,
          exitCommissionPercent: f.exitCommissionPercent ?? 5.75,
        }));

        set((state) => ({
          flips: [...standardizedFlips, ...state.flips],
          tasks: updatedTasks,
        }));

        return { addedCount: newFlips.length, duplicateCount };
      },
      updateFlip: (id, updates) =>
        set((state) => {
          const updatedFlips = state.flips.map((f) =>
            f.id === id ? { ...f, ...updates } : f
          );
          const target = updatedFlips.find((f) => f.id === id);
          const agmDate = updates.agmDate !== undefined ? updates.agmDate : target?.agmDate;
          const tasks = target
            ? syncAgmReminderTask(state.tasks, 'flip', id, target.title, agmDate)
            : state.tasks;
          return {
            flips: updatedFlips,
            tasks,
          };
        }),
      deleteFlip: (id) =>
        set((state) => ({
          flips: state.flips.filter((f) => f.id !== id),
        })),
      addBOQItem: (flipId, item) =>
        set((state) => ({
          flips: state.flips.map((f) => {
            if (f.id !== flipId) return f;
            const newItem: BOQItem = {
              ...item,
              id: `boq-${Date.now()}`,
              varianceZAR: (item.actualCostZAR || 0) - (item.baselineTotalZAR || 0),
            };
            return {
              ...f,
              boq: [...(f.boq || []), newItem],
            };
          }),
        })),
      updateBOQItem: (flipId, boqId, updates) =>
        set((state) => ({
          flips: state.flips.map((f) => {
            if (f.id !== flipId) return f;
            return {
              ...f,
              boq: (f.boq || []).map((item) => {
                if (item.id !== boqId) return item;
                const updated = { ...item, ...updates };
                updated.varianceZAR =
                  (updated.actualCostZAR || 0) - (updated.baselineTotalZAR || 0);
                return updated;
              }),
            };
          }),
        })),
      deleteBOQItem: (flipId, boqId) =>
        set((state) => ({
          flips: state.flips.map((f) => {
            if (f.id !== flipId) return f;
            return {
              ...f,
              boq: (f.boq || []).filter((item) => item.id !== boqId),
            };
          }),
        })),
      markFlipAsCompleted: (flipId, actualSalePrice, netCashProceeds, soldDate, exitNotes) =>
        set((state) => {
          const flip = state.flips.find((f) => f.id === flipId);
          if (!flip) return state;
          return {
            flips: state.flips.map((f) =>
              f.id === flipId
                ? {
                    ...f,
                    status: 'Completed',
                    currentPhase: 'Sold / Awaiting Transfer',
                    actualSalePriceZAR: actualSalePrice,
                    netCashProceedsZAR: netCashProceeds,
                    soldDate,
                    exitNotes,
                  }
                : f
            ),
            liquidCapitalReserve: state.liquidCapitalReserve + (netCashProceeds || 0),
          };
        }),
      reopenFlip: (flipId) =>
        set((state) => {
          const flip = state.flips.find((f) => f.id === flipId);
          if (!flip) return state;
          const deducted = Math.max(0, state.liquidCapitalReserve - (flip.netCashProceedsZAR || 0));
          const targetRentalId = flip.convertedToRentalId;
          const nextRentals = targetRentalId
            ? state.rentals.filter((r) => r.id !== targetRentalId)
            : state.rentals;

          return {
            rentals: nextRentals,
            flips: state.flips.map((f) =>
              f.id === flipId
                ? {
                    ...f,
                    status: 'Active',
                    actualSalePriceZAR: undefined,
                    netCashProceedsZAR: undefined,
                    soldDate: undefined,
                    exitNotes: undefined,
                    exitStrategy: undefined,
                    convertedToRentalId: undefined,
                  }
                : f
            ),
            liquidCapitalReserve: deducted,
          };
        }),
      convertFlipToRental: (params) => {
        const flip = get().flips.find((f) => f.id === params.flipId);
        if (!flip) throw new Error(`Flip with id ${params.flipId} not found`);

        const totalBoqActual = (flip.boq || []).reduce(
          (s, item) => s + (item.actualCostZAR || item.baselineTotalZAR || 0),
          0
        );
        const holdingMonths = flip.estimatedDurationMonths ?? 6;
        const monthlyHolding = flip.monthlyHoldingCostZAR ?? 0;
        const totalHoldingCost = holdingMonths * monthlyHolding;
        const totalCostBasis =
          (flip.purchasePriceZAR || 0) +
          (flip.acquisitionCostsZAR || 0) +
          totalBoqActual +
          totalHoldingCost;

        const newRentalId = `rental-brrrr-${Date.now()}`;
        const isHouse = flip.propertyType === 'Freehold House';
        const initialRent = params.initialGrossRentZAR;
        const commPercent = params.agencyCommissionPercent ?? 8.0;
        const isAgency = params.managementType !== 'Self-Managed';
        const agentFee = isAgency ? Math.round(initialRent * (commPercent / 100) * 1.15) : 0;
        const marketVal = params.marketValuationZAR || flip.targetExitPriceZAR || totalCostBasis;

        const newRental: RentalProperty = {
          id: newRentalId,
          title: flip.title.replace(/\s*\(Flip\)$/i, '') + ' (Rental)',
          address: flip.address,
          city: flip.city,
          propertyType: flip.propertyType || 'Freehold House',
          agmDate: flip.agmDate,
          marketValueZAR: marketVal,
          purchasePriceZAR: totalCostBasis,
          purchaseDate: flip.purchaseDate || new Date().toISOString().split('T')[0],
          outstandingBondBalanceZAR: flip.monthlyBondPaymentZAR
            ? calculateBondPrincipalFromRepayment(flip.monthlyBondPaymentZAR, 11.75, 20)
            : 0,
          bondInterestRatePercent: 11.75,
          monthlyBondPaymentZAR: flip.monthlyBondPaymentZAR || 0,
          bondPaymentEffectiveDate: flip.bondPaymentEffectiveDate,
          leases: [{
            id: `lease-${Date.now()}`,
            unitName: 'Main Unit',
            tenantName: params.tenantName || 'Tenant Pending Placement',
            tenantPhone: params.tenantPhone || '+27 —',
            tenantEmail: params.tenantEmail || 'pending@tenant.co.za',
            leaseStartDate: params.leaseStartDate || new Date().toISOString().split('T')[0],
            leaseEndDate:
              params.leaseEndDate ||
              new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            monthlyRentZAR: initialRent,
            depositHeldZAR: params.depositHeldZAR ?? initialRent * 2,
            annualEscalationPercent: 7.0,
            status: params.tenantName && params.tenantName !== 'Tenant Pending Placement' ? 'Occupied' : 'Vacant',
          }],
          managementType: params.managementType || 'Agency',
          agencyName: params.agencyName || 'Pam Golding Rentals',
          agencyCommissionPercent: commPercent,
          agencyVatApplicable: true,
          monthlyGrossRentZAR: initialRent,
          monthlyLeviesZAR: isHouse ? 0 : (flip.monthlyLeviesZAR || 0),
          monthlyRatesTaxesZAR: flip.monthlyRatesTaxesZAR || 0,
          monthlyAgentFeeZAR: agentFee,
          monthlyMaintenanceReserveZAR: 500,
          maintenanceHistory: [],
          status: params.tenantName && params.tenantName !== 'Tenant Pending Placement' ? 'Occupied' : 'Vacant',
          cocChecklist: flip.cocChecklist ? { ...flip.cocChecklist } : undefined,
          driveVault: flip.driveVault ? { ...flip.driveVault } : undefined,
          convertedFromFlipId: flip.id,
          isBrrrrProperty: true,
          totalEquityExtractedZAR: 0,
          refinanceHistory: [],
        };

        const updatedFlips = get().flips.map((f) =>
          f.id === flip.id
            ? {
                ...f,
                status: 'Completed' as const,
                currentPhase: 'Sold / Awaiting Transfer' as const,
                exitStrategy: 'BRRRR' as const,
                exitNotes: params.notes || 'Converted to Rental (BRRRR Lifecycle)',
                convertedToRentalId: newRentalId,
                actualSalePriceZAR: undefined,
                netCashProceedsZAR: 0,
                soldDate: new Date().toISOString().split('T')[0],
              }
            : f
        );

        const updatedFunding = get().funding.map((fnd) => {
          if (fnd.linkedDealId === flip.id || (flip.linkedFundingIds || []).includes(fnd.id)) {
            return {
              ...fnd,
              linkedDealId: newRental.id,
              linkedDealName: newRental.title,
            };
          }
          return fnd;
        });

        let updatedTasks = get().tasks;
        if (newRental.agmDate) {
          updatedTasks = syncAgmReminderTask(
            updatedTasks,
            'rental',
            newRental.id,
            newRental.title,
            newRental.agmDate
          );
        }
        updatedTasks = syncLeaseExpiryTasks(
          updatedTasks,
          newRental.id,
          newRental.title,
          newRental.leases
        );

        set({
          rentals: [newRental, ...get().rentals],
          flips: updatedFlips,
          funding: updatedFunding,
          tasks: updatedTasks,
        });

        return newRental;
      },

      // Funding
      addFunding: (source) =>
        set((state) => ({ funding: [source, ...state.funding] })),
      updateFunding: (id, updates) =>
        set((state) => ({
          funding: state.funding.map((f) =>
            f.id === id ? { ...f, ...updates } : f
          ),
        })),
      deleteFunding: (id) =>
        set((state) => ({
          funding: state.funding.filter((f) => f.id !== id),
        })),
      syncFundingWithDealDelay: (fundingId, delayDays, reason) =>
        set((state) => ({
          funding: state.funding.map((f) => {
            if (f.id !== fundingId) return f;
            const originalMaturity = f.originalMaturityDate || f.maturityDate;
            const currentDelay = f.delayExtensionDays || 0;
            const newTotalDelay = currentDelay + delayDays;

            const baseDate = new Date(originalMaturity);
            baseDate.setDate(baseDate.getDate() + newTotalDelay);
            const newMaturityStr = baseDate.toISOString().split('T')[0];

            const newNotes = f.delayNotes
              ? `${f.delayNotes}; +${delayDays}d: ${reason}`
              : `+${delayDays}d: ${reason}`;

            return {
              ...f,
              originalMaturityDate: originalMaturity,
              maturityDate: newMaturityStr,
              delayExtensionDays: newTotalDelay,
              delayNotes: newNotes,
            };
          }),
        })),

      // Opportunities
      addOpportunity: (opp) =>
        set((state) => ({
          opportunities: [opp, ...state.opportunities],
          tasks: opp.agmDate
            ? syncAgmReminderTask(state.tasks, 'opportunity', opp.id, opp.title, opp.agmDate)
            : state.tasks,
        })),
      bulkAddOpportunities: (newOpps) => {
        let duplicateCount = 0;
        const currentOpps = get().opportunities;
        const currentTasks = get().tasks;
        let updatedTasks = [...currentTasks];

        newOpps.forEach((o) => {
          const isDup = currentOpps.some(
            (co) =>
              co.title.trim().toLowerCase() === o.title.trim().toLowerCase() ||
              (o.address && co.address.trim().toLowerCase() === o.address.trim().toLowerCase())
          );
          if (isDup) duplicateCount++;

          if (o.agmDate) {
            updatedTasks = syncAgmReminderTask(updatedTasks, 'opportunity', o.id, o.title, o.agmDate);
          }
        });

        set((state) => ({
          opportunities: [...newOpps, ...state.opportunities],
          tasks: updatedTasks,
        }));

        return { addedCount: newOpps.length, duplicateCount };
      },
      updateOpportunity: (id, updates) =>
        set((state) => {
          const updatedOpps = state.opportunities.map((o) =>
            o.id === id ? { ...o, ...updates } : o
          );
          const target = updatedOpps.find((o) => o.id === id);
          const agmDate = updates.agmDate !== undefined ? updates.agmDate : target?.agmDate;
          const tasks = target
            ? syncAgmReminderTask(state.tasks, 'opportunity', id, target.title, agmDate)
            : state.tasks;
          return {
            opportunities: updatedOpps,
            tasks,
          };
        }),
      deleteOpportunity: (id) =>
        set((state) => ({
          opportunities: state.opportunities.filter((o) => o.id !== id),
        })),
      passOpportunity: (id, reason, notes) =>
        set((state) => ({
          opportunities: state.opportunities.map((opp) =>
            opp.id === id
              ? {
                  ...opp,
                  status: 'Passed' as const,
                  passReason: reason,
                  passNotes: notes || undefined,
                  passedAt: new Date().toISOString().split('T')[0],
                }
              : opp
          ),
        })),
      reactivateOpportunity: (id) =>
        set((state) => ({
          opportunities: state.opportunities.map((opp) =>
            opp.id === id
              ? {
                  ...opp,
                  status: 'Screening' as const,
                  passReason: undefined,
                  passNotes: undefined,
                  passedAt: undefined,
                }
              : opp
          ),
        })),
      advanceOpportunityStage: (id) =>
        set((state) => ({
          opportunities: state.opportunities.map((opp) => {
            if (opp.id !== id) return opp;
            const nextStage =
              opp.status === 'Screening'
                ? ('Offer Submitted' as const)
                : opp.status === 'Offer Submitted'
                ? ('Due Diligence' as const)
                : null;
            return nextStage ? { ...opp, status: nextStage } : opp;
          }),
        })),
      promoteOpportunityToFlip: (oppId) => {
        const opp = get().opportunities.find((o) => o.id === oppId);
        if (!opp) return;

        const newFlip: FlipProject = {
          id: `flip-${Date.now()}`,
          title: `${opp.title} (Flip)`,
          address: opp.address,
          city: opp.city,
          propertyType: opp.propertyType || 'Freehold House',
          agmDate: opp.agmDate,
          purchaseDate: new Date().toISOString().split('T')[0],
          purchasePriceZAR: opp.purchasePrice,
          acquisitionCostsZAR: opp.costs.totalAcquisitionCost - opp.purchasePrice,
          baselineRenovationBudgetZAR: opp.estimatedRehabCost || 250_000,
          estimatedDurationMonths: opp.holdingPeriodMonths || 6,
          monthlyHoldingCostZAR: (opp.monthlyLevies || 0) + (opp.monthlyRatesTaxes || 0) + (opp.monthlyCashFlow < 0 ? Math.abs(opp.monthlyCashFlow) : 0),
          targetExitPriceZAR: opp.targetExitPrice || opp.purchasePrice * 1.35,
          exitCommissionPercent: opp.exitCommissionPercent ?? 5.75,
          targetCompletionDate: new Date(Date.now() + (opp.holdingPeriodMonths || 6) * 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
          currentPhase: 'Acquisition & Conveyancing',
          linkedFundingIds: [],
          fundingRequiredZAR: opp.fundingRequiredZAR || Math.round((opp.purchasePrice + (opp.costs.totalAcquisitionCost - opp.purchasePrice) + (opp.estimatedRehabCost || 250_000)) * 0.7),
          capitalRaisedZAR: opp.capitalRaisedZAR || 0,
          primaryFunderName: opp.primaryFunderName,
          primaryFunderContact: opp.primaryFunderContact,
          primaryFunderType: opp.primaryFunderType,
          coFundersNotes: opp.coFundersNotes,
          promisedReturnType: opp.promisedReturnType || 'Fixed Interest',
          promisedReturnRatePercent: opp.promisedReturnRatePercent || 14.0,
          promisedPayoutSchedule: opp.promisedPayoutSchedule || 'Monthly Interest',
          securityOffered: opp.securityOffered || '2nd Mortgage Bond registered over title deed',
          status: 'Active',
          notes: `Promoted from Opportunity Analyzer. Source: ${opp.source}`,
          driveVault: opp.driveVault ? { ...opp.driveVault } : undefined,
          boq: [
            {
              id: `boq-${Date.now()}-1`,
              category: 'Demolition & Prep',
              itemDescription: 'Initial stripout & site prep',
              unit: 'lump sum',
              quantity: 1,
              baselineUnitCostZAR: 30_000,
              baselineTotalZAR: 30_000,
              actualCostZAR: 0,
              varianceZAR: -30_000,
              supplierOrContractor: 'Pending tender',
              status: 'Not Started',
            },
            {
              id: `boq-${Date.now()}-2`,
              category: 'Kitchen & Cabinetry',
              itemDescription: 'Kitchen overhaul',
              unit: 'lump sum',
              quantity: 1,
              baselineUnitCostZAR: 90_000,
              baselineTotalZAR: 90_000,
              actualCostZAR: 0,
              varianceZAR: -90_000,
              supplierOrContractor: 'Builders Warehouse Sandton',
              status: 'Not Started',
            },
          ],
        };

        const conveyancingTask: TaskItem = {
          id: `task-${Date.now()}`,
          title: `Instruct conveyancing attorney for ${opp.title}`,
          description: `Conveyancing fee estimated at R ${opp.costs.conveyancingFee.toLocaleString('en-ZA')}`,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
          priority: 'Urgent',
          status: 'Pending',
          linkedEntity: {
            type: 'flip',
            id: newFlip.id,
            name: newFlip.title,
          },
          createdAt: new Date().toISOString(),
        };

        set((state) => {
          let updatedTasks = [conveyancingTask, ...state.tasks];
          if (newFlip.agmDate) {
            updatedTasks = syncAgmReminderTask(
              updatedTasks,
              'flip',
              newFlip.id,
              newFlip.title,
              newFlip.agmDate
            );
          }
          return {
            flips: [newFlip, ...state.flips],
            opportunities: state.opportunities.map((o) =>
              o.id === oppId ? { ...o, status: 'Promoted to Flip' } : o
            ),
            tasks: updatedTasks,
          };
        });
      },
      promoteOpportunityToRental: (oppId) => {
        const opp = get().opportunities.find((o) => o.id === oppId);
        if (!opp) return;

        const effectiveLTV = opp.bondLTV ?? opp.loanToValuePercent;
        const bondAmount = opp.depositZAR !== undefined
          ? Math.max(0, opp.purchasePrice - opp.depositZAR)
          : (opp.purchasePrice * effectiveLTV) / 100;
        const newRental: RentalProperty = {
          id: `rental-${Date.now()}`,
          title: opp.title,
          address: opp.address,
          city: opp.city,
          propertyType: opp.propertyType || 'Sectional Title Apartment',
          agmDate: opp.agmDate,
          marketValueZAR: opp.purchasePrice,
          purchasePriceZAR: opp.purchasePrice,
          purchaseDate: new Date().toISOString().split('T')[0],
          outstandingBondBalanceZAR: bondAmount,
          bondInterestRatePercent: opp.interestRatePercent || 11.75,
          monthlyBondPaymentZAR: opp.costs
            ? calculateMonthlyBondRepayment(
                bondAmount,
                opp.interestRatePercent || 11.75,
                opp.loanTermYears || 20
              )
            : 0,
          leases: [{
            id: `lease-${Date.now()}`,
            unitName: 'Main Unit',
            tenantName: 'Tenant Pending Placement',
            tenantPhone: '+27 —',
            tenantEmail: 'pending@tenant.co.za',
            leaseStartDate: new Date().toISOString().split('T')[0],
            leaseEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0],
            monthlyRentZAR: opp.monthlyRentalEstimate,
            depositHeldZAR: opp.monthlyRentalEstimate * 2,
            annualEscalationPercent: 7.0,
            status: 'Vacant',
          }],
          monthlyGrossRentZAR: opp.monthlyRentalEstimate,
          monthlyLeviesZAR: opp.propertyType === 'Freehold House' ? 0 : opp.monthlyLevies,
          annualBuildingInsuranceZAR: opp.propertyType === 'Freehold House' ? (opp.annualInsurance ?? 7_200) : 0,
          monthlyRatesTaxesZAR: opp.monthlyRatesTaxes,
          managementType: 'Agency',
          agencyCommissionPercent: opp.managementFeePercent ?? 8,
          agencyVatApplicable: opp.agencyVatApplicable !== false,
          monthlyAgentFeeZAR: Math.round(
            opp.monthlyRentalEstimate *
            ((opp.managementFeePercent ?? 8) / 100) *
            (opp.agencyVatApplicable !== false ? 1.15 : 1.0)
          ),
          monthlyMaintenanceReserveZAR: 500,
          driveVault: opp.driveVault ? { ...opp.driveVault } : undefined,
          maintenanceHistory: [],
          status: 'Vacant',
        };

        set((state) => {
          let updatedTasks = state.tasks;
          if (newRental.agmDate) {
            updatedTasks = syncAgmReminderTask(
              updatedTasks,
              'rental',
              newRental.id,
              newRental.title,
              newRental.agmDate
            );
          }
          return {
            rentals: [newRental, ...state.rentals],
            opportunities: state.opportunities.map((o) =>
              o.id === oppId ? { ...o, status: 'Promoted to Rental' } : o
            ),
            tasks: updatedTasks,
          };
        });
      },
      duplicateOpportunity: (oppId) => {
        set((state) => {
          const original = state.opportunities.find((o) => o.id === oppId);
          if (!original) return state;
          const cloned = structuredClone(original);
          cloned.id = `opp-scenario-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          cloned.title = `${cloned.title} (Scenario)`;
          cloned.createdAt = new Date().toISOString();
          if ((cloned as any).boqItems && Array.isArray((cloned as any).boqItems)) {
            (cloned as any).boqItems = (cloned as any).boqItems.map((item: any) => ({
              ...item,
              id: `boq-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            }));
          }
          if (cloned.ancillaryIncomes && Array.isArray(cloned.ancillaryIncomes)) {
            cloned.ancillaryIncomes = cloned.ancillaryIncomes.map((item) => ({
              ...item,
              id: `anc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            }));
          }
          return {
            opportunities: [cloned, ...state.opportunities],
          };
        });
      },
      addTransaction: (propertyId, transaction) => {
        set((state) => ({
          rentals: state.rentals.map((r) => {
            if (r.id !== propertyId) return r;
            const newTx: Transaction = {
              ...transaction,
              id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            };
            return {
              ...r,
              transactions: [newTx, ...(r.transactions || [])],
            };
          }),
        }));
      },
      deleteTransaction: (propertyId, transactionId) => {
        set((state) => ({
          rentals: state.rentals.map((r) => {
            if (r.id !== propertyId) return r;
            return {
              ...r,
              transactions: (r.transactions || []).filter((tx) => tx.id !== transactionId),
            };
          }),
        }));
      },

      // Tasks
      addTask: (task) =>
        set((state) => {
          const taskId = `task-${Date.now()}`;
          const isRecurring = task.recurrence && task.recurrence !== 'None';
          const recurrenceGroupId = task.recurrenceGroupId || (isRecurring ? `series-${taskId}` : undefined);
          return {
            tasks: [
              {
                ...task,
                id: taskId,
                recurrenceGroupId,
                createdAt: new Date().toISOString(),
              },
              ...state.tasks,
            ],
          };
        }),
      toggleTaskStatus: (taskId) =>
        set((state) => {
          const targetTask = state.tasks.find((t) => t.id === taskId);
          if (!targetTask) return state;

          const willBeCompleted = targetTask.status !== 'Completed';
          let spawnedTask: TaskItem | null = null;

          if (willBeCompleted) {
            spawnedTask = handleTaskCompletionRecurrence(targetTask, state.tasks);
          }

          const updatedTasks = state.tasks.map((t) => {
            if (t.id !== taskId) return t;
            const nextStatus: TaskStatus = willBeCompleted ? 'Completed' : 'Pending';
            return {
              ...t,
              status: nextStatus,
              recurrenceGroupId:
                t.recurrenceGroupId ||
                (t.recurrence && t.recurrence !== 'None' ? `series-${t.id}` : undefined),
            };
          });

          return {
            tasks: spawnedTask ? [spawnedTask, ...updatedTasks] : updatedTasks,
          };
        }),
      updateTask: (taskId, updates) =>
        set((state) => {
          const targetTask = state.tasks.find((t) => t.id === taskId);
          if (!targetTask) return state;

          const willBeCompleted =
            updates.status === 'Completed' && targetTask.status !== 'Completed';
          let spawnedTask: TaskItem | null = null;

          if (willBeCompleted) {
            const merged = { ...targetTask, ...updates };
            spawnedTask = handleTaskCompletionRecurrence(merged, state.tasks);
          }

          const updatedTasks = state.tasks.map((t) => {
            if (t.id !== taskId) return t;
            const updated = { ...t, ...updates };
            if (
              updated.recurrence &&
              updated.recurrence !== 'None' &&
              !updated.recurrenceGroupId
            ) {
              updated.recurrenceGroupId = `series-${t.id}`;
            }
            return updated;
          });

          return {
            tasks: spawnedTask ? [spawnedTask, ...updatedTasks] : updatedTasks,
          };
        }),
      deleteTask: (taskId) =>
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== taskId),
        })),

      // Suppliers
      addSupplier: (supplier) =>
        set((state) => ({ suppliers: [supplier, ...state.suppliers] })),
      deleteSupplier: (id) =>
        set((state) => ({
          suppliers: state.suppliers.filter((s) => s.id !== id),
        })),

      // Municipal Directory Actions
      addMunicipalContact: (contact) =>
        set((state) => ({
          municipalDirectory: [
            ...state.municipalDirectory,
            {
              ...contact,
              id: `muni-custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              isCustom: true,
            },
          ],
        })),
      updateMunicipalContact: (id, updates) =>
        set((state) => ({
          municipalDirectory: state.municipalDirectory.map((m) =>
            m.id === id ? { ...m, ...updates } : m
          ),
        })),
      deleteMunicipalContact: (id) =>
        set((state) => ({
          municipalDirectory: state.municipalDirectory.filter((m) => m.id !== id),
        })),
      resetMunicipalDirectory: () =>
        set({
          municipalDirectory: INITIAL_MUNICIPAL_DIRECTORY,
        }),

      // Liquid Reserve
      updateLiquidReserve: (amount) => set({ liquidCapitalReserve: amount }),

      // Reset & Cloud Hydration & Import/Export
      hydrateFromCloudState: (snapshot) =>
        set((state) => ({
          rentals: snapshot.rentals ?? state.rentals,
          flips: snapshot.flips ?? state.flips,
          funding: snapshot.funding ?? state.funding,
          opportunities: snapshot.opportunities ?? state.opportunities,
          suppliers: snapshot.suppliers ?? state.suppliers,
          tasks: snapshot.tasks ?? state.tasks,
          municipalDirectory: (snapshot as any).municipalDirectory ?? state.municipalDirectory,
          investorProfile: snapshot.investorProfile ?? state.investorProfile,
          liquidCapitalReserve:
            snapshot.liquidCapitalReserve !== undefined
              ? snapshot.liquidCapitalReserve
              : state.liquidCapitalReserve,
          rentalForecastView: snapshot.rentalForecastView ?? state.rentalForecastView,
          aiSettings: snapshot.aiSettings ?? state.aiSettings,
          analyzerDraft: snapshot.analyzerDraft ?? state.analyzerDraft,
        })),
      resetToDemoData: () => {
        if (typeof window !== 'undefined' && window.localStorage) {
          try {
            window.localStorage.removeItem('cloud_sync_completed');
            window.localStorage.removeItem('cloud_sync_timestamp');
          } catch (e) {
            console.error('Failed to clear cloud sync localStorage keys', e);
          }
        }
        set({
          rentals: INITIAL_RENTALS,
          flips: INITIAL_FLIPS,
          funding: INITIAL_FUNDING,
          opportunities: INITIAL_OPPORTUNITIES,
          suppliers: INITIAL_SUPPLIERS,
          tasks: INITIAL_TASKS,
          municipalDirectory: INITIAL_MUNICIPAL_DIRECTORY,
          liquidCapitalReserve: 650_000,
          investorProfile: INITIAL_INVESTOR_PROFILE,
          analyzerDraft: INITIAL_ANALYZER_DRAFT,
          aiSettings: DEFAULT_AI_SETTINGS,
          rentalForecastView: 'wealth-only',
        });
      },
      clearAllData: () =>
        set((state) => ({
          rentals: [],
          flips: [],
          funding: [],
          opportunities: [],
          tasks: [],
          municipalDirectory: INITIAL_MUNICIPAL_DIRECTORY,
          liquidCapitalReserve: 0,
          analyzerDraft: EMPTY_ANALYZER_DRAFT,
          // Preserve South African trade suppliers directory for immediate BOQ contractor selection
          suppliers: state.suppliers.length > 0 ? state.suppliers : INITIAL_SUPPLIERS,
        })),
      importPortfolioJSON: (jsonString) => {
        try {
          const parsed = JSON.parse(jsonString);
          if (parsed && typeof parsed === 'object') {
            set({
              rentals: parsed.rentals || [],
              flips: parsed.flips || [],
              funding: parsed.funding || [],
              opportunities: parsed.opportunities || [],
              suppliers: parsed.suppliers || [],
              tasks: parsed.tasks || [],
              municipalDirectory: parsed.municipalDirectory || INITIAL_MUNICIPAL_DIRECTORY,
              liquidCapitalReserve: parsed.liquidCapitalReserve || 0,
              investorProfile: parsed.investorProfile || INITIAL_INVESTOR_PROFILE,
            });
            return true;
          }
          return false;
        } catch (e) {
          console.error('Failed to parse portfolio JSON', e);
          return false;
        }
      },
    }),
    {
      name: 'sa_property_portfolio_hub_v1',
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState: unknown, currentState: PortfolioState): PortfolioState => {
        const pState = (persistedState && typeof persistedState === 'object' ? persistedState : {}) as Partial<PortfolioState>;
        const rawModel = pState.aiSettings?.model;
        const isRetired =
          !rawModel ||
          rawModel.startsWith('claude-3-') ||
          rawModel.includes('2024') ||
          rawModel.includes('2025');
        const migratedModel = isRetired ? 'claude-sonnet-5' : rawModel;

        const rawOpps = pState.opportunities || currentState.opportunities;
        const migratedOpportunities = (rawOpps || []).map((opp: any) => ({
          ...opp,
          status:
            opp.status === 'Analyzing'
              ? 'Screening'
              : opp.status === 'Under Due Diligence'
              ? 'Due Diligence'
              : opp.status,
          vacancyRatePercent: opp.vacancyRatePercent ?? 6,
          managementFeePercent: opp.managementFeePercent ?? 8,
        }));

        const rawRentals = pState.rentals || currentState.rentals;
        const migratedRentals = (rawRentals || []).map((rental: any) => {
          const defaultStatements =
            currentState.rentals.find((r) => r.id === rental.id)?.utilityStatements || [];
          const defaultMeterReadings =
            currentState.rentals.find((r) => r.id === rental.id)?.meterReadings || [];

          let monthlyAgentFeeZAR = rental.monthlyAgentFeeZAR;
          let agencyVatApplicable = rental.agencyVatApplicable;
          let agencyCommissionPercent = rental.agencyCommissionPercent;

          // Auto-heal legacy iGrow import with artificial R635 estimate to actual R851 invoiced deduction
          if (
            (rental.agencyName === 'iGrow Rentals' || String(rental.title || '').toLowerCase().includes('clearwater')) &&
            (monthlyAgentFeeZAR === 635 || monthlyAgentFeeZAR === 634.8 || Math.round(monthlyAgentFeeZAR || 0) === 635)
          ) {
            monthlyAgentFeeZAR = 851;
            agencyVatApplicable = false;
            agencyCommissionPercent =
              rental.monthlyGrossRentZAR > 0
                ? Number(((850.54 / rental.monthlyGrossRentZAR) * 100).toFixed(1))
                : 12.3;
          }

          // Auto-heal legacy 2025 statements or statements with missing/zero utility values
          const hasLegacy2025Statements = (rental.utilityStatements || []).some(
            (s: any) =>
              s.statementDate?.startsWith('2025') ||
              s.billingPeriod?.includes('2025') ||
              (s.electricityZAR === 0 && s.waterZAR === 0)
          );

          const needsStatementMigration =
            !rental.utilityStatements ||
            rental.utilityStatements.length === 0 ||
            hasLegacy2025Statements;

          const healedStatements = needsStatementMigration
            ? defaultStatements
            : rental.utilityStatements.map((stmt: any) => {
                const defaultMatch = defaultStatements.find((ds) => ds.id === stmt.id);
                return {
                  ...stmt,
                  extractedMeterReadings:
                    stmt.extractedMeterReadings && stmt.extractedMeterReadings.length > 0
                      ? stmt.extractedMeterReadings
                      : defaultMatch?.extractedMeterReadings || [],
                };
              });

          const needsReadingsMigration =
            !rental.meterReadings ||
            rental.meterReadings.length === 0 ||
            hasLegacy2025Statements;

          const healedMeterReadings = needsReadingsMigration
            ? defaultMeterReadings
            : [
                ...defaultMeterReadings,
                ...(rental.meterReadings || []).filter(
                  (mr: any) => !defaultMeterReadings.some((dmr) => dmr.id === mr.id)
                ),
              ];

          let leases = rental.leases;
          if (!leases || !Array.isArray(leases) || leases.length === 0) {
            leases = [{
              id: rental.id ? `lease-${rental.id}-${Date.now()}` : `lease-${Date.now()}`,
              unitName: 'Main Unit',
              tenantName: rental.tenantName || 'Tenant Unassigned',
              tenantPhone: rental.tenantPhone,
              tenantEmail: rental.tenantEmail,
              leaseStartDate: rental.leaseStartDate || new Date().toISOString().split('T')[0],
              leaseEndDate: rental.leaseEndDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              monthlyRentZAR: rental.monthlyGrossRentZAR || 0,
              depositHeldZAR: rental.depositHeldZAR || 0,
              annualEscalationPercent: rental.annualEscalationPercent || 7.0,
              status: rental.status === 'Occupied' ? 'Occupied' : 'Vacant'
            }];
          }

          const defaultMeterRegistry =
            currentState.rentals.find((r) => r.id === rental.id)?.meterRegistry || [];
          const healedMeterRegistry =
            rental.meterRegistry && rental.meterRegistry.length > 0
              ? rental.meterRegistry
              : defaultMeterRegistry;

          const migrated = {
            ...rental,
            monthlyAgentFeeZAR,
            agencyVatApplicable,
            agencyCommissionPercent,
            utilityStatements: healedStatements,
            meterReadings: healedMeterReadings,
            meterRegistry: healedMeterRegistry,
            leases
          };
          delete migrated.tenantName;
          delete migrated.tenantPhone;
          delete migrated.tenantEmail;
          delete migrated.leaseStartDate;
          delete migrated.leaseEndDate;
          delete migrated.depositHeldZAR;
          delete migrated.annualEscalationPercent;

          return migrated;
        });

        const finalRentals = migratedRentals.map((r: RentalProperty) => migrateNegativeArrearsToRental(r));

        return {
          ...currentState,
          ...pState,
          rentals: finalRentals,
          opportunities: migratedOpportunities,
          municipalDirectory:
            pState.municipalDirectory && pState.municipalDirectory.length > 0
              ? pState.municipalDirectory
              : currentState.municipalDirectory,
          aiSettings: {
            ...DEFAULT_AI_SETTINGS,
            ...(pState.aiSettings || {}),
            model: migratedModel,
          },
          completedGuideSteps: sanitizeCompletedGuideSteps(pState.completedGuideSteps),
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state && Array.isArray(state.rentals)) {
          const hasNegative = state.rentals.some(
            (r) =>
              (typeof r.arrearsOpeningBalanceZAR === 'number' && r.arrearsOpeningBalanceZAR < 0) ||
              (r.leases || []).some(
                (l) => typeof l.arrearsOpeningBalanceZAR === 'number' && l.arrearsOpeningBalanceZAR < 0
              )
          );
          if (hasNegative) {
            usePortfolioStore.setState({
              rentals: state.rentals.map((r) => migrateNegativeArrearsToRental(r)),
            });
          }
        }
      },
    }
  )
);

function computeEquityAlerts(rentals: RentalProperty[]): EquityExtractionAlert[] {
  const now = new Date();
  return rentals
    .filter(r => r.status !== 'Sold' && r.isBrrrrProperty)
    .map(r => {
      const ltv = (r.outstandingBondBalanceZAR || 0) / (r.marketValueZAR || 1);
      const purchaseDate = new Date(r.purchaseDate);
      const months = (now.getFullYear() - purchaseDate.getFullYear()) * 12 + (now.getMonth() - purchaseDate.getMonth());
      const extractable = Math.max(0, (r.marketValueZAR * 0.80) - (r.outstandingBondBalanceZAR || 0));
      return {
        propertyId: r.id,
        propertyTitle: r.title,
        currentLTV: ltv,
        extractableEquityZAR: extractable,
        monthsStabilized: months,
        isRipe: ltv < 0.70 && months >= 6,
      };
    })
    .filter(a => a.isRipe);
}

export function computePortfolioSummary(state: {
  rentals: RentalProperty[];
  flips: FlipProject[];
  funding: FundingSource[];
  liquidCapitalReserve: number;
  investorProfile?: InvestorProfile;
  opportunities?: OpportunityDeal[];
}): PortfolioSummary {
  const activeRentals = (state.rentals || []).filter((r) => r.status !== 'Sold');
  const soldRentals = (state.rentals || []).filter((r) => r.status === 'Sold');
  const activeFlips = (state.flips || []).filter((f) => f.status === 'Active' || f.status === 'Delayed');
  const completedFlips = (state.flips || []).filter((f) => f.status === 'Completed');

  const totalRentalValue = activeRentals.reduce(
    (sum, r) => sum + (r.marketValueZAR || 0),
    0
  );
  const totalBondLiabilities = activeRentals.reduce(
    (sum, r) => sum + (r.outstandingBondBalanceZAR || 0),
    0
  );
  const totalFlipValue = activeFlips.reduce(
    (sum, f) => sum + (f.targetExitPriceZAR || 0),
    0
  );
  const liquidCapitalReserve = state.liquidCapitalReserve || 0;
  const totalGrossAssetValue = totalRentalValue + totalFlipValue + liquidCapitalReserve;

  // Unallocated private funding facilities for next acquisitions (Standby facilities + undrawn tranches of unallocated lines)
  const unallocatedFundingReserve = (state.funding || [])
    .filter(
      (f) =>
        (f.status === 'Active' || f.status === 'Accruing' || f.status === 'Standby') &&
        (!f.linkedDealId || f.linkedDealName === 'General Portfolio Liquidity')
    )
    .reduce((sum, f) => {
      if (f.status === 'Standby') {
        // Full facility is available undrawn
        return sum + Math.max(0, (f.capitalAmountZAR || 0) - (f.totalRepaidZAR || 0));
      }
      if (f.tranches && f.tranches.length > 0) {
        // Only undrawn tranches are available
        return sum + f.tranches.filter((t) => !t.isDisbursed).reduce((s, t) => s + t.amountZAR, 0);
      }
      // If active with no tranches, it is already drawn into cash
      return sum;
    }, 0);

  // totalAvailablePurchasingPower computed after freeUnallocatedCash below

  // Private funding liability calculated strictly from drawn capital minus repayments (undrawn tranches, standby lines, and settled facilities carry R 0 debt)
  const totalPrivateFundingLiability = (state.funding || [])
    .filter((f) => f.status !== 'Settled')
    .reduce((sum, f) => {
      let drawn = 0;
      if (f.status === 'Standby') {
        drawn = 0;
      } else if (f.tranches && f.tranches.length > 0) {
        drawn = f.tranches.filter((t) => t.isDisbursed).reduce((s, t) => s + t.amountZAR, 0);
      } else if (f.status === 'Active' || f.status === 'Accruing' || f.status === 'Matured') {
        drawn = f.capitalAmountZAR || 0;
      }
      return sum + Math.max(0, drawn - (f.totalRepaidZAR || 0));
    }, 0);

  const totalFundingLiabilities = totalPrivateFundingLiability + totalBondLiabilities;
  const netEquity = totalGrossAssetValue - totalFundingLiabilities;

  // Monthly rental cash flow and property-by-property SARS provisional tax reserve
  let annualRentalTaxReserve = 0;
  const monthlyNetRentalCashflow = activeRentals.reduce((sum, r) => {
    const gross = r.leases?.filter(l => l.status !== 'Vacant').reduce((s, l) => s + (l.monthlyRentZAR || 0), 0) || r.monthlyGrossRentZAR || 0;
    const ancillaryTotal = (r.ancillaryIncomes || []).reduce((sum, a) => sum + a.monthlyRentZAR, 0);
    const totalGross = gross + ancillaryTotal;
    let agentFee = 0;
    if (r.managementType === 'Agency') {
      if (typeof r.agencyCommissionPercent === 'number' && r.agencyCommissionPercent > 0) {
        const base = totalGross * (r.agencyCommissionPercent / 100);
        const vat = r.agencyVatApplicable !== false ? 1.15 : 1.0;
        agentFee = Math.round(base * vat);
      } else {
        agentFee = r.monthlyAgentFeeZAR || 0;
      }
    }
    const isFreehold = r.propertyType === 'Freehold House';
    const insuranceMonthly = isFreehold ? Math.round((r.annualBuildingInsuranceZAR || 0) / 12) : 0;
    const levies = isFreehold ? 0 : (r.monthlyLeviesZAR || 0);
    const expenses =
      levies +
      insuranceMonthly +
      (r.monthlyRatesTaxesZAR || 0) +
      agentFee +
      (r.monthlyMaintenanceReserveZAR || 0) +
      (r.monthlyBondPaymentZAR || 0) +
      (r.monthlyPrepaidVendingFeeZAR || 0);
    const propNetMonthly = totalGross - expenses;

    // Property-by-property SARS tax reserve aggregation (bad debt write-offs are tax-deductible losses)
    // SARS Section 11(a) / ITR12 alignment:
    // Deductible expenses = Rates + Levies + Agent Fees + Maintenance Reserve + Bond Interest (capital repayments strictly excluded)
    const annualGrossRent = totalGross * 12;
    const annualBondInterest = (r.outstandingBondBalanceZAR && r.bondInterestRatePercent)
      ? Math.round(r.outstandingBondBalanceZAR * (r.bondInterestRatePercent / 100))
      : 0;
    const annualRates = (r.monthlyRatesTaxesZAR || 0) * 12;
    const annualLevies = levies * 12;
    const annualAgentFee = agentFee * 12;
    const annualMaintenance = (r.monthlyMaintenanceReserveZAR || 0) * 12;
    const annualInsurance = insuranceMonthly * 12;
    const annualPrepaidVending = (r.monthlyPrepaidVendingFeeZAR || 0) * 12;
    const propBadDebt = (r.arrearsWriteOffs || []).reduce((sum, w) => sum + (w.amountZAR || 0), 0);

    const deductibleExpenses =
      annualRates +
      annualLevies +
      annualAgentFee +
      annualMaintenance +
      annualInsurance +
      annualPrepaidVending +
      propBadDebt +
      annualBondInterest;

    const propSec13Shield = r.section13sexAnnualShieldZAR || 0;
    const propTaxableIncome = Math.max(0, annualGrossRent - deductibleExpenses - propSec13Shield);

    let propTaxRate = 0.31;
    if (r.taxEntityTypeOverride === 'Individual (45%)') {
      propTaxRate = 0.45;
    } else if (r.taxEntityTypeOverride === 'Company (27%)') {
      propTaxRate = 0.27;
    } else if (r.taxEntityTypeOverride === 'Pre-Tax') {
      propTaxRate = 0;
    } else if (state.investorProfile?.defaultTaxEntityType === 'Company (27%)') {
      propTaxRate = 0.27;
    } else if (state.investorProfile?.defaultTaxEntityType === 'Individual (45%)') {
      propTaxRate = 0.45;
    } else if (state.investorProfile?.defaultTaxEntityType === 'Pre-Tax') {
      propTaxRate = 0;
    } else {
      propTaxRate = (state.investorProfile?.marginalTaxRatePercent ?? 31.0) / 100;
    }

    const propAnnualTax = Math.round(propTaxableIncome * propTaxRate);
    annualRentalTaxReserve += propAnnualTax;

    return sum + propNetMonthly;
  }, 0);

  // 1. Ring-Fenced Project Working Capital:
  // Sum of active retention pools, committed pending contractor milestone draws, and advance council deposits
  const ringFencedWorkingCapital = activeFlips.reduce((sum, f) => {
    const advanceCouncil = f.municipalClearance?.advanceCouncilDepositZAR || 0;
    const isRetentionReleased = f.drawSchedule?.retentionReleased === true;

    let retentionPool = 0;
    let pendingMilestoneDraws = 0;

    (f.boq || []).forEach((b) => {
      const itemCost = b.actualCostZAR || b.baselineTotalZAR || 0;
      const retentionPct = b.retentionPercent || 0;
      const retentionAmount = Math.round(itemCost * (retentionPct / 100));

      if (!isRetentionReleased && retentionAmount > 0) {
        if (b.status === 'Completed' || b.status === 'In Progress') {
          retentionPool += retentionAmount;
        }
      }

      if (b.status === 'In Progress') {
        // Committed contractor draw payable upon milestone sign-off (excluding retention portion)
        pendingMilestoneDraws += (itemCost - retentionAmount);
      }
    });

    return sum + advanceCouncil + retentionPool + pendingMilestoneDraws;
  }, 0);

  // 2. Free Unallocated Cash:
  const freeUnallocatedCash = Math.max(0, liquidCapitalReserve - ringFencedWorkingCapital);

  // Deployable War Chest: Total cash reserve + pre-approved standby lines (ready for immediate deal acquisition)
  const deployableWarChest = liquidCapitalReserve + unallocatedFundingReserve;

  // Deployable purchasing power = free cash (after ring-fencing) + unallocated funding facilities
  const totalAvailablePurchasingPower = freeUnallocatedCash + unallocatedFundingReserve;

  // 3. Projected Flip Profits & SARS Provisional Tax Reserve:
  let totalGrossProjectedFlipProfits = 0;
  let totalSarsFlipTaxReserve = 0;

  activeFlips.forEach((f) => {
    const boqSum = (f.boq || []).reduce(
      (bSum, b) => bSum + (b.actualCostZAR || b.baselineTotalZAR || 0),
      0
    );
    const renovationCost = boqSum > 0 ? boqSum : (f.baselineRenovationBudgetZAR || 0);
    const totalHoldingCost = (f.estimatedDurationMonths || 0) * (f.monthlyHoldingCostZAR || 0);
    const sec118Cost =
      (f.municipalClearance?.sec118ArrearsZAR || 0) +
      (f.municipalClearance?.advanceCouncilDepositZAR || 0);
    const exitCommRate = typeof f.exitCommissionPercent === 'number' ? f.exitCommissionPercent : 5.75;
    const exitCommission = Math.round((f.targetExitPriceZAR || 0) * (exitCommRate / 100));
    const totalCost =
      (f.purchasePriceZAR || 0) +
      (f.acquisitionCostsZAR || 0) +
      renovationCost +
      totalHoldingCost +
      sec118Cost +
      exitCommission;
    const grossProfit = (f.targetExitPriceZAR || 0) - totalCost;
    totalGrossProjectedFlipProfits += grossProfit;

    if (grossProfit > 0) {
      // 27% corporate tax on company flips or 45% on individual flips
      const taxRate =
        f.taxEntityType === 'Individual (45%)'
          ? 0.45
          : f.taxEntityType === 'Pre-Tax'
          ? 0
          : 0.27; // Default 27% Corporate Income Tax
      totalSarsFlipTaxReserve += Math.round(grossProfit * taxRate);
    }
  });

  const totalSarsRentalTaxReserve = annualRentalTaxReserve;
  const totalSarsProvisionalTaxReserve = totalSarsFlipTaxReserve + totalSarsRentalTaxReserve;

  const totalNetProjectedFlipProfits = totalGrossProjectedFlipProfits - totalSarsFlipTaxReserve;
  const totalProjectedFlipProfits = totalGrossProjectedFlipProfits;

  // Realized profit on completed/sold flips (excludes BRRRR converted rentals)
  const totalRealizedFlipProfits = completedFlips.reduce((sum, f) => {
    if (f.exitStrategy === 'BRRRR') return sum;
    const boqSum = (f.boq || []).reduce(
      (bSum, b) => bSum + (b.actualCostZAR || b.baselineTotalZAR || 0),
      0
    );
    const renovationCost = boqSum > 0 ? boqSum : (f.baselineRenovationBudgetZAR || 0);
    const totalHoldingCost = (f.estimatedDurationMonths || 0) * (f.monthlyHoldingCostZAR || 0);
    const sec118Cost =
      (f.municipalClearance?.sec118ArrearsZAR || 0) +
      (f.municipalClearance?.advanceCouncilDepositZAR || 0);
    const exitPrice = f.actualSalePriceZAR ?? f.targetExitPriceZAR ?? 0;
    const exitCommRate = typeof f.exitCommissionPercent === 'number' ? f.exitCommissionPercent : 5.75;
    const exitCommission = Math.round(exitPrice * (exitCommRate / 100));
    const totalCost =
      (f.purchasePriceZAR || 0) +
      (f.acquisitionCostsZAR || 0) +
      renovationCost +
      totalHoldingCost +
      sec118Cost +
      exitCommission;
    return sum + (exitPrice - totalCost);
  }, 0);

  const equityAlerts = computeEquityAlerts(activeRentals);

  return {
    totalGrossAssetValue,
    totalRentalValue,
    totalFlipValue,
    liquidCapitalReserve,
    ringFencedWorkingCapital,
    freeUnallocatedCash,
    unallocatedFundingReserve,
    deployableWarChest,
    totalAvailablePurchasingPower,
    totalFundingLiabilities,
    totalPrivateFundingLiability,
    totalBondLiabilities,
    netEquity,
    monthlyNetRentalCashflow,
    totalProjectedFlipProfits,
    totalGrossProjectedFlipProfits,
    totalSarsFlipTaxReserve,
    totalSarsRentalTaxReserve,
    totalSarsProvisionalTaxReserve,
    totalNetProjectedFlipProfits,
    totalRealizedFlipProfits,
    activeRentalsCount: activeRentals.length,
    soldRentalsCount: soldRentals.length,
    activeFlipsCount: activeFlips.length,
    completedFlipsCount: completedFlips.length,
    pendingOpportunitiesCount: (state.opportunities || []).length,
    annualRentalTaxReserve,
    monthlyRentalTaxReserve: Math.round(annualRentalTaxReserve / 12),
    equityAlerts,
  };
}

export function usePortfolioSummary(): PortfolioSummary {
  // Extract all scalar (primitive) fields via useShallow — stable comparison
  const scalars = usePortfolioStore(
    useShallow((state) => {
      const summary = computePortfolioSummary(state);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { equityAlerts, ...rest } = summary;
      return rest;
    })
  );

  // Compute equityAlerts with JSON-based referential stability
  const alertsJson = usePortfolioStore(
    (state) => {
      const activeRentals = (state.rentals || []).filter((r) => r.status !== 'Sold');
      return JSON.stringify(computeEquityAlerts(activeRentals));
    }
  );
  const equityAlerts: EquityExtractionAlert[] = useMemo(() => JSON.parse(alertsJson), [alertsJson]);

  return useMemo(() => ({ ...scalars, equityAlerts }), [scalars, equityAlerts]);
}
