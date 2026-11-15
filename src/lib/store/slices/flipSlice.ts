import { StateCreator } from 'zustand';
import {
  FlipProject,
  BOQItem,
  FlipToRentalConversionParams,
  Lease,
  RentalProperty,
} from '@/types';
import { RootStoreState, FlipSlice } from '../types';
import { INITIAL_FLIPS } from '../initialData';
import { syncAgmReminderTask, syncLeaseExpiryTasks } from '../utils/taskSync';
import { calculateFlipFinancials } from '@/lib/calculations/flips';
import { calculateAgencyCommission, reconcilePropertyStatus } from '@/lib/calculations/rentals';
import { calculateBondPrincipalFromRepayment } from '@/lib/calculations/propertyMetrics';

function buildGraduatedLeases(opts: {
  startUnitIndex: number;
  unitsCount: number;
  isMultiUnit: boolean;
  initialRent: number;
  leaseStartDate: string;
  leaseEndDate: string;
  hasInitialTenant: boolean;
  tenantName?: string;
  tenantPhone?: string;
  tenantEmail?: string;
  depositHeldZAR?: number;
  timestamp: number;
}): Lease[] {
  if (!opts.isMultiUnit) {
    return [
      {
        id: `lease-${opts.timestamp}`,
        unitName: 'Main Unit',
        tenantName: opts.tenantName || 'Tenant Pending Placement',
        tenantPhone: opts.tenantPhone || '+27 —',
        tenantEmail: opts.tenantEmail || 'pending@tenant.co.za',
        leaseStartDate: opts.leaseStartDate,
        leaseEndDate: opts.leaseEndDate,
        monthlyRentZAR: opts.initialRent,
        depositHeldZAR: opts.depositHeldZAR ?? opts.initialRent * 2,
        annualEscalationPercent: 7.0,
        status: opts.hasInitialTenant ? ('Occupied' as const) : ('Vacant' as const),
      },
    ];
  }

  const baseUnitRent = Math.floor(opts.initialRent / opts.unitsCount);
  const remainder = opts.initialRent - baseUnitRent * opts.unitsCount;

  return Array.from({ length: opts.unitsCount }, (_, idx) => {
    const unitNumber = opts.startUnitIndex + idx + 1;
    const unitRent = idx === 0 ? baseUnitRent + remainder : baseUnitRent;
    const isFirstOccupied = idx === 0 && opts.hasInitialTenant;
    return {
      id: `lease-${opts.timestamp}-${unitNumber}`,
      unitName: `Unit ${unitNumber}`,
      tenantName: isFirstOccupied ? opts.tenantName! : 'Tenant Pending Placement',
      tenantPhone: isFirstOccupied ? opts.tenantPhone || '+27 —' : '+27 —',
      tenantEmail: isFirstOccupied
        ? opts.tenantEmail || 'pending@tenant.co.za'
        : 'pending@tenant.co.za',
      leaseStartDate: opts.leaseStartDate,
      leaseEndDate: opts.leaseEndDate,
      monthlyRentZAR: unitRent,
      depositHeldZAR:
        idx === 0 && opts.depositHeldZAR !== undefined
          ? opts.depositHeldZAR
          : unitRent * 2,
      annualEscalationPercent: 7.0,
      status: isFirstOccupied ? ('Occupied' as const) : ('Vacant' as const),
      utilityType: 'prepaid_submeter' as const,
    };
  });
}

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
      const targetRentalId = flip.convertedToRentalId || flip.linkedRentalPropertyId;
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
                graduatedUnitsCount: undefined,
                linkedRentalPropertyId: undefined,
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

    const totalPlannedUnits = Math.max(
      1,
      Math.round(flip.numberOfUnits ?? params.numberOfUnits ?? 1)
    );
    const alreadyGraduated = Math.max(0, Math.round(flip.graduatedUnitsCount ?? 0));
    const remainingUnits = Math.max(1, totalPlannedUnits - alreadyGraduated);
    const requestedUnits =
      params.unitsToGraduateNow !== undefined
        ? params.unitsToGraduateNow
        : flip.graduatedUnitsCount
        ? remainingUnits
        : params.numberOfUnits ?? remainingUnits;
    const unitsGraduating = Math.min(
      remainingUnits,
      Math.max(1, Math.round(requestedUnits))
    );
    const isFinalPhase = alreadyGraduated + unitsGraduating >= totalPlannedUnits;
    const newTotalGraduated = alreadyGraduated + unitsGraduating;

    const existingRental = flip.linkedRentalPropertyId
      ? get().rentals.find((r) => r.id === flip.linkedRentalPropertyId)
      : undefined;

    const nowTs = Date.now();
    const todayStr = new Date().toISOString().split('T')[0];
    const leaseStartDate = params.leaseStartDate || todayStr;
    const leaseEndDate =
      params.leaseEndDate ||
      new Date(nowTs + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const hasInitialTenant = Boolean(
      params.tenantName && params.tenantName !== 'Tenant Pending Placement'
    );
    const initialRent = params.initialGrossRentZAR;
    const isMultiUnit = totalPlannedUnits > 1 || unitsGraduating > 1;

    let targetRental: RentalProperty;
    let nextRentals: RentalProperty[];

    if (!existingRental) {
      // Case A: First Graduation — scaffold a new RentalProperty
      const newRentalId = `rental-brrrr-${nowTs}`;
      const isHouse = flip.propertyType === 'Freehold House';
      const commPercent = params.agencyCommissionPercent ?? 8.0;
      const isAgency = params.managementType !== 'Self-Managed';
      const agentFee = isAgency
        ? calculateAgencyCommission(initialRent, commPercent, true, params.agencyName).monthlyAgentFeeZAR
        : 0;
      const marketVal = params.marketValuationZAR || flip.targetExitPriceZAR || totalCostBasis;
      const loanTermYears = params.loanTermYears ?? 20;
      const bondRate = params.bondInterestRatePercent ?? 11.75;

      const leases = buildGraduatedLeases({
        startUnitIndex: 0,
        unitsCount: unitsGraduating,
        isMultiUnit,
        initialRent,
        leaseStartDate,
        leaseEndDate,
        hasInitialTenant,
        tenantName: params.tenantName,
        tenantPhone: params.tenantPhone,
        tenantEmail: params.tenantEmail,
        depositHeldZAR: params.depositHeldZAR,
        timestamp: nowTs,
      });

      const isMultiLetOrBuildToRent = isMultiUnit || flip.projectStrategy === 'build_to_rent';
      const isSec13Sex = unitsGraduating >= 5;

      targetRental = {
        id: newRentalId,
        title: flip.title.replace(/\s*\(Flip\)$/i, '') + ' (Rental)',
        address: flip.address,
        city: flip.city,
        province: flip.province,
        source: flip.source,
        numberOfUnits: unitsGraduating,
        floorAreaSqm: flip.floorAreaSqm,
        propertyType: flip.propertyType || 'Freehold House',
        agmDate: flip.agmDate,
        marketValueZAR: marketVal,
        purchasePriceZAR: totalCostBasis,
        totalCapitalDeployedZAR: totalCostBasis,
        purchaseDate: flip.purchaseDate || todayStr,
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
        status: reconcilePropertyStatus(leases),
        section13SexEligible: isSec13Sex ? true : undefined,
        section13sexAnnualShieldZAR: isSec13Sex
          ? Math.round(totalCostBasis * 0.55 * 0.05 * 0.27)
          : undefined,
        cocChecklist: flip.cocChecklist ? { ...flip.cocChecklist } : undefined,
        driveVault: flip.driveVault ? { ...flip.driveVault } : undefined,
        zoningProfile: flip.zoningProfile ? structuredClone(flip.zoningProfile) : undefined,
        convertedFromFlipId: flip.id,
        isBrrrrProperty: true,
        totalEquityExtractedZAR: 0,
        refinanceHistory: [],
      };

      nextRentals = [targetRental, ...get().rentals];
    } else {
      // Case B: Subsequent Graduation — merge newly completed units into existing RentalProperty
      const appendedLeases = buildGraduatedLeases({
        startUnitIndex: alreadyGraduated,
        unitsCount: unitsGraduating,
        isMultiUnit: true,
        initialRent,
        leaseStartDate,
        leaseEndDate,
        hasInitialTenant,
        tenantName: params.tenantName,
        tenantPhone: params.tenantPhone,
        tenantEmail: params.tenantEmail,
        depositHeldZAR: params.depositHeldZAR,
        timestamp: nowTs,
      });

      const mergedLeases = [...(existingRental.leases || []), ...appendedLeases];
      const updatedGrossRent = mergedLeases.reduce(
        (sum, l) => sum + (l.monthlyRentZAR || 0),
        0
      );
      const effectiveMgmtType = params.managementType || existingRental.managementType || 'Agency';
      const effectiveCommPercent =
        params.agencyCommissionPercent ?? existingRental.agencyCommissionPercent ?? 8.0;
      const effectiveAgencyName = params.agencyName || existingRental.agencyName;
      const updatedAgentFee =
        effectiveMgmtType !== 'Self-Managed'
          ? calculateAgencyCommission(
              updatedGrossRent,
              effectiveCommPercent,
              existingRental.agencyVatApplicable !== false,
              effectiveAgencyName
            ).monthlyAgentFeeZAR
          : 0;

      const isSec13Sex = newTotalGraduated >= 5 || Boolean(existingRental.section13SexEligible);
      const sec13Shield = isSec13Sex
        ? existingRental.section13sexAnnualShieldZAR ||
          Math.round(totalCostBasis * 0.55 * 0.05 * 0.27)
        : existingRental.section13sexAnnualShieldZAR;

      targetRental = {
        ...existingRental,
        numberOfUnits: newTotalGraduated,
        leases: mergedLeases,
        utilityType: existingRental.utilityType || 'prepaid_submeter',
        monthlyGrossRentZAR: updatedGrossRent,
        monthlyAgentFeeZAR: updatedAgentFee,
        marketValueZAR:
          params.marketValuationZAR || flip.targetExitPriceZAR || existingRental.marketValueZAR,
        purchasePriceZAR: totalCostBasis,
        totalCapitalDeployedZAR: totalCostBasis,
        status: reconcilePropertyStatus(mergedLeases),
        section13SexEligible: isSec13Sex ? true : existingRental.section13SexEligible,
        section13sexAnnualShieldZAR: sec13Shield,
        cocChecklist: flip.cocChecklist ? { ...flip.cocChecklist } : existingRental.cocChecklist,
        driveVault: flip.driveVault ? { ...flip.driveVault } : existingRental.driveVault,
        zoningProfile: flip.zoningProfile
          ? structuredClone(flip.zoningProfile)
          : existingRental.zoningProfile,
      };

      nextRentals = get().rentals.map((r) =>
        r.id === existingRental.id ? targetRental : r
      );
    }

    const updatedFlips = get().flips.map((f) => {
      if (f.id !== flip.id) return f;
      if (!isFinalPhase) {
        return {
          ...f,
          graduatedUnitsCount: newTotalGraduated,
          linkedRentalPropertyId: targetRental.id,
        };
      }
      return {
        ...f,
        status: 'Completed' as const,
        currentPhase: 'Sold / Awaiting Transfer' as const,
        exitStrategy: 'BRRRR' as const,
        exitNotes:
          params.notes ||
          (existingRental
            ? 'Converted to Rental (Phased BRRRR Lifecycle Completed)'
            : 'Converted to Rental (BRRRR Lifecycle)'),
        convertedToRentalId: targetRental.id,
        linkedRentalPropertyId: targetRental.id,
        graduatedUnitsCount: newTotalGraduated,
        actualSalePriceZAR: undefined,
        netCashProceedsZAR: 0,
        soldDate: todayStr,
      };
    });

    const updatedFunding = isFinalPhase
      ? get().funding.map((fnd) => {
          if (fnd.linkedDealId === flip.id || (flip.linkedFundingIds || []).includes(fnd.id)) {
            return {
              ...fnd,
              linkedDealId: targetRental.id,
              linkedDealName: targetRental.title,
            };
          }
          return fnd;
        })
      : get().funding;

    let updatedTasks = get().tasks;
    if (targetRental.agmDate) {
      updatedTasks = syncAgmReminderTask(
        updatedTasks,
        'rental',
        targetRental.id,
        targetRental.title,
        targetRental.agmDate
      );
    }
    updatedTasks = syncLeaseExpiryTasks(
      updatedTasks,
      targetRental.id,
      targetRental.title,
      targetRental.leases
    );

    set({
      rentals: nextRentals,
      flips: updatedFlips,
      funding: updatedFunding,
      tasks: updatedTasks,
    });

    return targetRental;
  },
});
