import { useState, useCallback } from 'react';
import {
  RentalProperty,
  TenantPaymentRecord,
  PaymentAllocation,
} from '@/types';
import {
  calculatePropertyArrears,
  getUnpaidLedgerMonths,
  allocateOldestFirst,
  getMonthKey,
} from '@/lib/calculations/arrears';

export interface UsePaymentModalReturn {
  isOpen: boolean;
  property: RentalProperty | null;
  editingPayment: TenantPaymentRecord | null;
  initialLeaseId?: string;
  initialMonth?: string;
  initialAmount?: number;
  initialAllocations?: PaymentAllocation[];
  openLogPayment: (
    property: RentalProperty,
    targetMonth?: string,
    suggestedAmount?: number,
    leaseId?: string,
    isArrears?: boolean
  ) => void;
  openEditPayment: (property: RentalProperty, payment: TenantPaymentRecord) => void;
  closePaymentModal: () => void;
}

export function usePaymentModal(): UsePaymentModalReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [property, setProperty] = useState<RentalProperty | null>(null);
  const [editingPayment, setEditingPayment] = useState<TenantPaymentRecord | null>(null);
  const [initialLeaseId, setInitialLeaseId] = useState<string | undefined>(undefined);
  const [initialMonth, setInitialMonth] = useState<string | undefined>(undefined);
  const [initialAmount, setInitialAmount] = useState<number | undefined>(undefined);
  const [initialAllocations, setInitialAllocations] = useState<PaymentAllocation[] | undefined>(undefined);

  const openLogPayment = useCallback(
    (
      targetProperty: RentalProperty,
      targetMonth?: string,
      suggestedAmount?: number,
      leaseId?: string,
      isArrears?: boolean
    ) => {
      const month = targetMonth || getMonthKey();
      const effectiveLeaseId =
        leaseId ||
        (targetProperty.leases && targetProperty.leases.length === 1 ? targetProperty.leases[0].id : '');

      const targetLease = targetProperty.leases?.find((l) => l.id === effectiveLeaseId);

      let amount = 0;
      if (suggestedAmount !== undefined && suggestedAmount > 0) {
        amount = suggestedAmount;
      } else if (isArrears) {
        const arrears = calculatePropertyArrears(
          targetProperty,
          undefined,
          effectiveLeaseId ? { leaseId: effectiveLeaseId } : undefined
        );
        amount = Math.max(0, arrears.totalArrearsZAR);
      } else if (targetLease) {
        amount = targetLease.monthlyRentZAR || 0;
      } else {
        amount = targetProperty.monthlyGrossRentZAR || 0;
      }

      let allocs: PaymentAllocation[] = [];
      if (isArrears) {
        const unpaid = getUnpaidLedgerMonths(
          targetProperty,
          effectiveLeaseId ? { leaseId: effectiveLeaseId } : undefined
        );
        allocs = allocateOldestFirst(unpaid, amount);
      } else if (targetMonth) {
        allocs = [{ periodMonth: targetMonth, amountZAR: amount }];
      } else {
        allocs = [{ periodMonth: month, amountZAR: amount }];
      }

      setProperty(targetProperty);
      setEditingPayment(null);
      setInitialLeaseId(effectiveLeaseId);
      setInitialMonth(month);
      setInitialAmount(amount);
      setInitialAllocations(allocs);
      setIsOpen(true);
    },
    []
  );

  const openEditPayment = useCallback((targetProperty: RentalProperty, payment: TenantPaymentRecord) => {
    const periodMonth = payment.periodMonth || getMonthKey(payment.paymentDate);
    const allocs =
      payment.allocations && payment.allocations.length > 0
        ? payment.allocations
        : [{ periodMonth, amountZAR: payment.amountReceivedZAR }];

    setProperty(targetProperty);
    setEditingPayment(payment);
    setInitialLeaseId(payment.leaseId || '');
    setInitialMonth(periodMonth);
    setInitialAmount(payment.amountReceivedZAR);
    setInitialAllocations(allocs);
    setIsOpen(true);
  }, []);

  const closePaymentModal = useCallback(() => {
    setIsOpen(false);
    setProperty(null);
    setEditingPayment(null);
    setInitialLeaseId(undefined);
    setInitialMonth(undefined);
    setInitialAmount(undefined);
    setInitialAllocations(undefined);
  }, []);

  return {
    isOpen,
    property,
    editingPayment,
    initialLeaseId,
    initialMonth,
    initialAmount,
    initialAllocations,
    openLogPayment,
    openEditPayment,
    closePaymentModal,
  };
}
