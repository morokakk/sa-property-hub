import { StateCreator } from 'zustand';
import {
  TenantPaymentRecord,
  ArrearsWriteOff,
  Transaction,
  RentalProperty,
} from '@/types';
import { RootStoreState, TenantAccountingSlice } from '../types';
import { calculatePropertyArrears } from '@/lib/calculations/arrears';

export const createTenantAccountingSlice: StateCreator<
  RootStoreState,
  [['zustand/persist', unknown]],
  [],
  TenantAccountingSlice
> = (set) => ({
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

  addTransaction: (propertyId, transaction) =>
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
    })),

  deleteTransaction: (propertyId, transactionId) =>
    set((state) => ({
      rentals: state.rentals.map((r) => {
        if (r.id !== propertyId) return r;
        return {
          ...r,
          transactions: (r.transactions || []).filter((tx) => tx.id !== transactionId),
        };
      }),
    })),
});
