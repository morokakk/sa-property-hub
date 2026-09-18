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
} from '@/types';
import {
  INITIAL_RENTALS,
  INITIAL_FLIPS,
  INITIAL_FUNDING,
  INITIAL_SUPPLIERS,
  INITIAL_TASKS,
  INITIAL_OPPORTUNITIES,
  INITIAL_INVESTOR_PROFILE,
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

  // Computed selector
  getSummary: () => PortfolioSummary;

  // Investor Profile Action
  updateInvestorProfile: (profile: Partial<InvestorProfile>) => void;

  // Rental Actions
  addRental: (rental: RentalProperty) => void;
  updateRental: (id: string, updates: Partial<RentalProperty>) => void;
  deleteRental: (id: string) => void;
  addMaintenanceLog: (rentalId: string, log: Omit<RentalProperty['maintenanceHistory'][0], 'id'>) => void;
  markRentalAsSold: (rentalId: string, actualSalePrice: number, netCashProceeds: number, soldDate: string, exitNotes?: string) => void;
  reopenRental: (rentalId: string) => void;

  // Flip Actions
  addFlip: (flip: FlipProject) => void;
  updateFlip: (id: string, updates: Partial<FlipProject>) => void;
  deleteFlip: (id: string) => void;
  addBOQItem: (flipId: string, item: Omit<BOQItem, 'id'>) => void;
  updateBOQItem: (flipId: string, boqId: string, updates: Partial<BOQItem>) => void;
  deleteBOQItem: (flipId: string, boqId: string) => void;
  markFlipAsCompleted: (flipId: string, actualSalePrice: number, netCashProceeds: number, soldDate: string, exitNotes?: string) => void;
  reopenFlip: (flipId: string) => void;

  // Funding Actions
  addFunding: (source: FundingSource) => void;
  updateFunding: (id: string, updates: Partial<FundingSource>) => void;
  deleteFunding: (id: string) => void;

  // Opportunity Actions
  addOpportunity: (opp: OpportunityDeal) => void;
  updateOpportunity: (id: string, updates: Partial<OpportunityDeal>) => void;
  deleteOpportunity: (id: string) => void;
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

      getSummary: (): PortfolioSummary => {
        return computePortfolioSummary(get());
      },

      // Investor Profile
      updateInvestorProfile: (updates) =>
        set((state) => ({
          investorProfile: { ...state.investorProfile, ...updates },
        })),

      // Rentals
      addRental: (rental) =>
        set((state) => ({
          rentals: [rental, ...state.rentals],
          tasks: rental.agmDate
            ? syncAgmReminderTask(state.tasks, 'rental', rental.id, rental.title, rental.agmDate)
            : state.tasks,
        })),
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

      // Flips
      addFlip: (flip) =>
        set((state) => ({
          flips: [flip, ...state.flips],
          tasks: flip.agmDate
            ? syncAgmReminderTask(state.tasks, 'flip', flip.id, flip.title, flip.agmDate)
            : state.tasks,
        })),
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
          return {
            flips: state.flips.map((f) =>
              f.id === flipId
                ? {
                    ...f,
                    status: 'Active',
                    actualSalePriceZAR: undefined,
                    netCashProceedsZAR: undefined,
                    soldDate: undefined,
                    exitNotes: undefined,
                  }
                : f
            ),
            liquidCapitalReserve: deducted,
          };
        }),

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
          targetExitPriceZAR: opp.targetExitPrice || opp.purchasePrice * 1.35,
          targetCompletionDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
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

        const bondAmount = (opp.purchasePrice * opp.loanToValuePercent) / 100;
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
          monthlyLeviesZAR: opp.monthlyLevies,
          monthlyRatesTaxesZAR: opp.monthlyRatesTaxes,
          monthlyAgentFeeZAR: Math.round(opp.monthlyRentalEstimate * (opp.managementFeePercent / 100)),
          monthlyMaintenanceReserveZAR: 500,
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
        }),
      clearAllData: () =>
        set({
          rentals: [],
          flips: [],
          funding: [],
          opportunities: [],
          suppliers: [],
          tasks: [],
          liquidCapitalReserve: 0,
        }),
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
    const expenses =
      (r.monthlyLeviesZAR || 0) +
      (r.monthlyRatesTaxesZAR || 0) +
      agentFee +
      (r.monthlyMaintenanceReserveZAR || 0) +
      (r.monthlyBondPaymentZAR || 0);
    return sum + (gross - expenses);
  }, 0);

  // Projected profit on active pipeline flips
  const totalProjectedFlipProfits = activeFlips.reduce((sum, f) => {
    const totalBoqActual = (f.boq || []).reduce(
      (bSum, b) => bSum + (b.actualCostZAR || b.baselineTotalZAR || 0),
      0
    );
    const totalCost =
      (f.purchasePriceZAR || 0) +
      (f.acquisitionCostsZAR || 0) +
      totalBoqActual;
    const profit = (f.targetExitPriceZAR || 0) - totalCost;
    return sum + profit;
  }, 0);

  // Realized profit on completed/sold flips
  const totalRealizedFlipProfits = completedFlips.reduce((sum, f) => {
    const totalBoqActual = (f.boq || []).reduce(
      (bSum, b) => bSum + (b.actualCostZAR || b.baselineTotalZAR || 0),
      0
    );
    const totalCost =
      (f.purchasePriceZAR || 0) +
      (f.acquisitionCostsZAR || 0) +
      totalBoqActual;
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
