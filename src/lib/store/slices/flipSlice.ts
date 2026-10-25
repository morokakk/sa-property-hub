import { StateCreator } from 'zustand';
import {
  FlipProject,
  BOQItem,
  FlipToRentalConversionParams,
  RentalProperty,
} from '@/types';
import { RootStoreState, FlipSlice } from '../types';
import { INITIAL_FLIPS } from '../initialData';
import { syncAgmReminderTask, syncLeaseExpiryTasks } from '../utils/taskSync';
import { calculateFlipFinancials } from '@/lib/calculations/flips';
import { calculateAgencyCommission } from '@/lib/calculations/rentals';
import { calculateBondPrincipalFromRepayment } from '@/lib/calculations/propertyMetrics';

export const createFlipSlice: StateCreator<
  RootStoreState,
  [['zustand/persist', unknown]],
  [],
  FlipSlice
> = (set, get) => ({
  flips: INITIAL_FLIPS,

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

    const flipFin = calculateFlipFinancials(flip);
    const totalCostBasis =
      (flip.purchasePriceZAR || 0) +
      (flip.acquisitionCostsZAR || 0) +
      flipFin.totalBOQActualZAR +
      flipFin.totalHoldingCostZAR;

    const newRentalId = `rental-brrrr-${Date.now()}`;
    const isHouse = flip.propertyType === 'Freehold House';
    const initialRent = params.initialGrossRentZAR;
    const commPercent = params.agencyCommissionPercent ?? 8.0;
    const isAgency = params.managementType !== 'Self-Managed';
    const agentFee = isAgency
      ? calculateAgencyCommission(initialRent, commPercent, true, params.agencyName).monthlyAgentFeeZAR
      : 0;
    const marketVal = params.marketValuationZAR || flip.targetExitPriceZAR || totalCostBasis;
    const unitCount = Math.max(1, Math.round(params.numberOfUnits ?? flip.numberOfUnits ?? 1));
    const loanTermYears = params.loanTermYears ?? 20;
    const bondRate = params.bondInterestRatePercent ?? 11.75;
    const leaseStartDate = params.leaseStartDate || new Date().toISOString().split('T')[0];
    const leaseEndDate =
      params.leaseEndDate ||
      new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const hasInitialTenant = Boolean(
      params.tenantName && params.tenantName !== 'Tenant Pending Placement'
    );

    const leases =
      unitCount > 1
        ? Array.from({ length: unitCount }, (_, idx) => {
            const baseUnitRent = Math.floor(initialRent / unitCount);
            const remainder = initialRent - baseUnitRent * unitCount;
            const unitRent = idx === 0 ? baseUnitRent + remainder : baseUnitRent;
            const isFirstOccupied = idx === 0 && hasInitialTenant;
            return {
              id: `lease-${Date.now()}-${idx + 1}`,
              unitName: `Unit ${idx + 1}`,
              tenantName: isFirstOccupied ? params.tenantName! : 'Tenant Pending Placement',
              tenantPhone: isFirstOccupied ? (params.tenantPhone || '+27 —') : '+27 —',
              tenantEmail: isFirstOccupied ? (params.tenantEmail || 'pending@tenant.co.za') : 'pending@tenant.co.za',
              leaseStartDate,
              leaseEndDate,
              monthlyRentZAR: unitRent,
              depositHeldZAR: idx === 0 && params.depositHeldZAR !== undefined ? params.depositHeldZAR : unitRent * 2,
              annualEscalationPercent: 7.0,
              status: isFirstOccupied ? ('Occupied' as const) : ('Vacant' as const),
            };
          })
        : [
            {
              id: `lease-${Date.now()}`,
              unitName: 'Main Unit',
              tenantName: params.tenantName || 'Tenant Pending Placement',
              tenantPhone: params.tenantPhone || '+27 —',
              tenantEmail: params.tenantEmail || 'pending@tenant.co.za',
              leaseStartDate,
              leaseEndDate,
              monthlyRentZAR: initialRent,
              depositHeldZAR: params.depositHeldZAR ?? initialRent * 2,
              annualEscalationPercent: 7.0,
              status: hasInitialTenant ? ('Occupied' as const) : ('Vacant' as const),
            },
          ];

    const isMultiLetOrBuildToRent = unitCount > 1 || flip.projectStrategy === 'build_to_rent';

    const newRental: RentalProperty = {
      id: newRentalId,
      title: flip.title.replace(/\s*\(Flip\)$/i, '') + ' (Rental)',
      address: flip.address,
      city: flip.city,
      province: flip.province,
      source: flip.source,
      numberOfUnits: unitCount,
      floorAreaSqm: flip.floorAreaSqm,
      propertyType: flip.propertyType || 'Freehold House',
      agmDate: flip.agmDate,
      marketValueZAR: marketVal,
      purchasePriceZAR: totalCostBasis,
      purchaseDate: flip.purchaseDate || new Date().toISOString().split('T')[0],
      outstandingBondBalanceZAR: flip.monthlyBondPaymentZAR
        ? calculateBondPrincipalFromRepayment(flip.monthlyBondPaymentZAR, bondRate, loanTermYears)
        : 0,
      bondInterestRatePercent: bondRate,
      loanTermYears,
      monthlyBondPaymentZAR: flip.monthlyBondPaymentZAR || 0,
      bondPaymentEffectiveDate: flip.bondPaymentEffectiveDate,
      leases,
      utilityType: isMultiLetOrBuildToRent ? 'prepaid_submeter' : undefined,
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
      status: hasInitialTenant
        ? unitCount > 1
          ? 'Partially Vacant'
          : 'Occupied'
        : 'Vacant',
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
});
