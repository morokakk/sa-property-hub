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
} from '@/types';
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
} from './initialData';

interface PortfolioState {
  rentals: RentalProperty[];
  flips: FlipProject[];
  funding: FundingSource[];
  opportunities: OpportunityDeal[];
  suppliers: LocalSupplier[];
  tasks: TaskItem[];
  liquidCapitalReserve: number;
  investorProfile: InvestorProfile;
  analyzerDraft: AnalyzerDraft;
  aiSettings: AiSettings;
  rentalForecastView: 'wealth-only' | 'cashflow-only';

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

  // Opportunity Actions
  addOpportunity: (opp: OpportunityDeal) => void;
  bulkAddOpportunities: (opps: OpportunityDeal[]) => { addedCount: number; duplicateCount: number };
  updateOpportunity: (id: string, updates: Partial<OpportunityDeal>) => void;
  deleteOpportunity: (id: string) => void;
  passOpportunity: (id: string, reason: PassReason, notes?: string) => void;
  reactivateOpportunity: (id: string) => void;
  advanceOpportunityStage: (id: string) => void;
  promoteOpportunityToFlip: (oppId: string) => void;
  promoteOpportunityToRental: (oppId: string) => void;

  // Task Actions
  addTask: (task: Omit<TaskItem, 'id' | 'createdAt'>) => void;
  toggleTaskStatus: (taskId: string) => void;
  updateTask: (taskId: string, updates: Partial<TaskItem>) => void;
  deleteTask: (taskId: string) => void;

  // Supplier Actions
  addSupplier: (supplier: LocalSupplier) => void;
  deleteSupplier: (id: string) => void;

  // Liquid Reserve Action
  updateLiquidReserve: (amount: number) => void;

  // System State Actions
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

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => ({
      rentals: INITIAL_RENTALS,
      flips: INITIAL_FLIPS,
      funding: INITIAL_FUNDING,
      opportunities: INITIAL_OPPORTUNITIES,
      suppliers: INITIAL_SUPPLIERS,
      tasks: INITIAL_TASKS,
      liquidCapitalReserve: 650_000, // ZAR 650k operational cash reserve
      investorProfile: INITIAL_INVESTOR_PROFILE,
      analyzerDraft: INITIAL_ANALYZER_DRAFT,
      aiSettings: DEFAULT_AI_SETTINGS,
      rentalForecastView: 'wealth-only',

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
        set((state) => ({
          rentals: [rental, ...state.rentals],
          tasks: rental.agmDate
            ? syncAgmReminderTask(state.tasks, 'rental', rental.id, rental.title, rental.agmDate)
            : state.tasks,
        })),
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
              tenantName: unit.tenantName || existing.tenantName,
              leaseEndDate: unit.leaseExpiryDate || unit.leaseEndDate || existing.leaseEndDate,
              depositHeldZAR: unit.depositHeldZAR ?? existing.depositHeldZAR,
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
              depositHeldZAR: unit.depositHeldZAR ?? unit.grossRentZAR * 2,
              annualEscalationPercent: 7.0,
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

        set((state) => ({
          rentals: [...newlyCreatedRentals, ...updatedRentals],
        }));

        return { updatedCount, newCount, addedCount: newCount, varianceCount };
      },
      updateRental: (id, updates) =>
        set((state) => {
          const updatedRentals = state.rentals.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          );
          const target = updatedRentals.find((r) => r.id === id);
          const agmDate = updates.agmDate !== undefined ? updates.agmDate : target?.agmDate;
          const tasks = target
            ? syncAgmReminderTask(state.tasks, 'rental', id, target.title, agmDate)
            : state.tasks;
          return {
            rentals: updatedRentals,
            tasks,
          };
        }),
      deleteRental: (id) =>
        set((state) => ({
          rentals: state.rentals.filter((r) => r.id !== id),
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
            };
          }),
        })),
      deleteUtilityStatement: (propertyId, statementId) =>
        set((state) => ({
          rentals: state.rentals.map((r) => {
            if (r.id !== propertyId) return r;
            return {
              ...r,
              utilityStatements: (r.utilityStatements || []).filter(
                (s) => s.id !== statementId
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

      // Flips
      addFlip: (flip) =>
        set((state) => ({
          flips: [flip, ...state.flips],
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

        set((state) => ({
          flips: [...newFlips, ...state.flips],
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
          outstandingBondBalanceZAR: flip.monthlyBondPaymentZAR ? Math.round(flip.monthlyBondPaymentZAR / 0.0108) : 0,
          bondInterestRatePercent: 11.75,
          monthlyBondPaymentZAR: flip.monthlyBondPaymentZAR || 0,
          bondPaymentEffectiveDate: flip.bondPaymentEffectiveDate,
          tenantName: params.tenantName || 'Tenant Pending Placement',
          tenantPhone: params.tenantPhone || '+27 —',
          tenantEmail: params.tenantEmail || 'pending@tenant.co.za',
          leaseStartDate: params.leaseStartDate || new Date().toISOString().split('T')[0],
          leaseEndDate:
            params.leaseEndDate ||
            new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          depositHeldZAR: params.depositHeldZAR ?? initialRent * 2,
          annualEscalationPercent: 7.0,
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
          monthlyBondPaymentZAR: opp.costs ? Math.round((bondAmount * 0.0108)) : 0,
          tenantName: 'Tenant Pending Placement',
          tenantPhone: '+27 —',
          tenantEmail: 'pending@tenant.co.za',
          leaseStartDate: new Date().toISOString().split('T')[0],
          leaseEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
          depositHeldZAR: opp.monthlyRentalEstimate * 2,
          annualEscalationPercent: 7.0,
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

      // Tasks
      addTask: (task) =>
        set((state) => ({
          tasks: [
            {
              ...task,
              id: `task-${Date.now()}`,
              createdAt: new Date().toISOString(),
            },
            ...state.tasks,
          ],
        })),
      toggleTaskStatus: (taskId) =>
        set((state) => ({
          tasks: state.tasks.map((t) => {
            if (t.id !== taskId) return t;
            const nextStatus = t.status === 'Completed' ? 'Pending' : 'Completed';
            return { ...t, status: nextStatus };
          }),
        })),
      updateTask: (taskId, updates) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId ? { ...t, ...updates } : t
          ),
        })),
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

      // Liquid Reserve
      updateLiquidReserve: (amount) => set({ liquidCapitalReserve: amount }),

      // Reset & Import/Export
      resetToDemoData: () =>
        set({
          rentals: INITIAL_RENTALS,
          flips: INITIAL_FLIPS,
          funding: INITIAL_FUNDING,
          opportunities: INITIAL_OPPORTUNITIES,
          suppliers: INITIAL_SUPPLIERS,
          tasks: INITIAL_TASKS,
          liquidCapitalReserve: 650_000,
          investorProfile: INITIAL_INVESTOR_PROFILE,
          analyzerDraft: INITIAL_ANALYZER_DRAFT,
          rentalForecastView: 'wealth-only',
        }),
      clearAllData: () =>
        set((state) => ({
          rentals: [],
          flips: [],
          funding: [],
          opportunities: [],
          tasks: [],
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
          return {
            ...rental,
            utilityStatements:
              rental.utilityStatements && rental.utilityStatements.length > 0
                ? rental.utilityStatements
                : defaultStatements,
          };
        });

        return {
          ...currentState,
          ...pState,
          rentals: migratedRentals,
          opportunities: migratedOpportunities,
          aiSettings: {
            ...DEFAULT_AI_SETTINGS,
            ...(pState.aiSettings || {}),
            model: migratedModel,
          },
        };
      },
    }
  )
);

export function computePortfolioSummary(state: {
  rentals: RentalProperty[];
  flips: FlipProject[];
  funding: FundingSource[];
  liquidCapitalReserve: number;
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

  // Unallocated private funding facilities for next acquisitions
  const unallocatedFundingReserve = (state.funding || [])
    .filter(
      (f) =>
        (f.status === 'Active' || f.status === 'Accruing') &&
        (!f.linkedDealId || f.linkedDealName === 'General Portfolio Liquidity')
    )
    .reduce((sum, f) => sum + Math.max(0, (f.capitalAmountZAR || 0) - (f.totalRepaidZAR || 0)), 0);

  const totalAvailablePurchasingPower = liquidCapitalReserve + unallocatedFundingReserve;

  const totalPrivateFundingLiability = (state.funding || [])
    .filter((f) => f.status === 'Active' || f.status === 'Accruing')
    .reduce((sum, f) => sum + Math.max(0, (f.capitalAmountZAR || 0) - (f.totalRepaidZAR || 0)), 0);

  const totalFundingLiabilities = totalPrivateFundingLiability + totalBondLiabilities;
  const netEquity = totalGrossAssetValue - totalFundingLiabilities;

  // Monthly rental cash flow only counts active tenancies (not sold properties)
  const monthlyNetRentalCashflow = activeRentals.reduce((sum, r) => {
    const gross = r.monthlyGrossRentZAR || 0;
    let agentFee = 0;
    if (r.managementType === 'Agency') {
      if (typeof r.agencyCommissionPercent === 'number' && r.agencyCommissionPercent > 0) {
        const base = gross * (r.agencyCommissionPercent / 100);
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
      (r.monthlyBondPaymentZAR || 0);
    const arrears = r.unpaidUtilityArrearsZAR || 0;
    return sum + (gross - expenses - arrears);
  }, 0);

  // Projected profit on active pipeline flips
  const totalProjectedFlipProfits = activeFlips.reduce((sum, f) => {
    const totalBoqActual = (f.boq || []).reduce(
      (bSum, b) => bSum + (b.actualCostZAR || b.baselineTotalZAR || 0),
      0
    );
    const totalHoldingCost = (f.estimatedDurationMonths || 0) * (f.monthlyHoldingCostZAR || 0);
    const totalCost =
      (f.purchasePriceZAR || 0) +
      (f.acquisitionCostsZAR || 0) +
      totalBoqActual +
      totalHoldingCost;
    const profit = (f.targetExitPriceZAR || 0) - totalCost;
    return sum + profit;
  }, 0);

  // Realized profit on completed/sold flips (excludes BRRRR converted rentals)
  const totalRealizedFlipProfits = completedFlips.reduce((sum, f) => {
    if (f.exitStrategy === 'BRRRR') return sum;
    const totalBoqActual = (f.boq || []).reduce(
      (bSum, b) => bSum + (b.actualCostZAR || b.baselineTotalZAR || 0),
      0
    );
    const totalHoldingCost = (f.estimatedDurationMonths || 0) * (f.monthlyHoldingCostZAR || 0);
    const totalCost =
      (f.purchasePriceZAR || 0) +
      (f.acquisitionCostsZAR || 0) +
      totalBoqActual +
      totalHoldingCost;
    const exitPrice = f.actualSalePriceZAR ?? f.targetExitPriceZAR ?? 0;
    return sum + (exitPrice - totalCost);
  }, 0);

  return {
    totalGrossAssetValue,
    totalRentalValue,
    totalFlipValue,
    liquidCapitalReserve,
    unallocatedFundingReserve,
    totalAvailablePurchasingPower,
    totalFundingLiabilities,
    totalPrivateFundingLiability,
    totalBondLiabilities,
    netEquity,
    monthlyNetRentalCashflow,
    totalProjectedFlipProfits,
    totalRealizedFlipProfits,
    activeRentalsCount: activeRentals.length,
    soldRentalsCount: soldRentals.length,
    activeFlipsCount: activeFlips.length,
    completedFlipsCount: completedFlips.length,
    pendingOpportunitiesCount: (state.opportunities || []).length,
  };
}

export function usePortfolioSummary(): PortfolioSummary {
  return usePortfolioStore(
    useShallow((state) => computePortfolioSummary(state))
  );
}
