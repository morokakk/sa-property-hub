import { StateCreator } from 'zustand';
import {
  OpportunityDeal,
  PassReason,
  FlipProject,
  RentalProperty,
  TaskItem,
} from '@/types';
import { RootStoreState, OpportunitySlice } from '../types';
import { INITIAL_OPPORTUNITIES } from '../initialData';
import { syncAgmReminderTask } from '../utils/taskSync';
import { calculateMonthlyBondRepayment } from '@/lib/calculations/propertyMetrics';

export const createOpportunitySlice: StateCreator<
  RootStoreState,
  [['zustand/persist', unknown]],
  [],
  OpportunitySlice
> = (set, get) => ({
  opportunities: INITIAL_OPPORTUNITIES,

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
      monthlyHoldingCostZAR:
        (opp.monthlyLevies || 0) +
        (opp.monthlyRatesTaxes || 0) +
        (opp.monthlyCashFlow < 0 ? Math.abs(opp.monthlyCashFlow) : 0),
      targetExitPriceZAR: opp.targetExitPrice || opp.purchasePrice * 1.35,
      exitCommissionPercent: opp.exitCommissionPercent ?? 5.75,
      targetCompletionDate: new Date(
        Date.now() + (opp.holdingPeriodMonths || 6) * 30 * 24 * 60 * 60 * 1000
      )
        .toISOString()
        .split('T')[0],
      currentPhase: 'Acquisition & Conveyancing',
      linkedFundingIds: [],
      fundingRequiredZAR:
        opp.fundingRequiredZAR ||
        Math.round(
          (opp.purchasePrice +
            (opp.costs.totalAcquisitionCost - opp.purchasePrice) +
            (opp.estimatedRehabCost || 250_000)) *
            0.7
        ),
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
    const bondAmount =
      opp.depositZAR !== undefined
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
      leases: [
        {
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
        },
      ],
      monthlyGrossRentZAR: opp.monthlyRentalEstimate,
      monthlyLeviesZAR: opp.propertyType === 'Freehold House' ? 0 : opp.monthlyLevies,
      annualBuildingInsuranceZAR:
        opp.propertyType === 'Freehold House' ? (opp.annualInsurance ?? 7_200) : 0,
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
      monthlyPrepaidVendingFeeZAR: opp.monthlyPrepaidVendingFeeZAR,
      monthlyCommunalServicesZAR: opp.monthlyCommunalServicesZAR,
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
});
