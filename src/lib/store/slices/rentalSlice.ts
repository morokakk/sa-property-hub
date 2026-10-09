import { StateCreator } from 'zustand';
import {
  RentalProperty,
  ExtractedRentalUnit,
  RentalRefinanceParams,
} from '@/types';
import { RootStoreState, RentalSlice } from '../types';
import { INITIAL_RENTALS } from '../initialData';
import { syncAgmReminderTask, syncLeaseExpiryTasks } from '../utils/taskSync';
import { calculatePropertyArrears } from '@/lib/calculations/arrears';

export const createRentalSlice: StateCreator<
  RootStoreState,
  [['zustand/persist', unknown]],
  [],
  RentalSlice
> = (set, get) => ({
  rentals: INITIAL_RENTALS,

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

  reconcileImportedRentals: (units: ExtractedRentalUnit[]) => {
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
});
