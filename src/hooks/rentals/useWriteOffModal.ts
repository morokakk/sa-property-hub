import { useState, useCallback } from 'react';
import { RentalProperty, PaymentAllocation } from '@/types';
import {
  calculatePropertyArrears,
  getUnpaidLedgerMonths,
  allocateOldestFirst,
} from '@/lib/calculations/arrears';

export interface UseWriteOffModalReturn {
  isOpen: boolean;
  property: RentalProperty | null;
  initialLeaseId?: string;
  initialAmount?: number;
  initialAllocations?: PaymentAllocation[];
  openWriteOff: (property: RentalProperty, suggestedAmount?: number, leaseId?: string) => void;
  closeWriteOffModal: () => void;
}

export function useWriteOffModal(): UseWriteOffModalReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [property, setProperty] = useState<RentalProperty | null>(null);
  const [initialLeaseId, setInitialLeaseId] = useState<string | undefined>(undefined);
  const [initialAmount, setInitialAmount] = useState<number | undefined>(undefined);
  const [initialAllocations, setInitialAllocations] = useState<PaymentAllocation[] | undefined>(undefined);

  const openWriteOff = useCallback(
    (targetProperty: RentalProperty, suggestedAmount?: number, leaseId?: string) => {
      const effectiveLeaseId =
        leaseId ||
        (targetProperty.leases && targetProperty.leases.length === 1 ? targetProperty.leases[0].id : '');

      const arrears = calculatePropertyArrears(
        targetProperty,
        undefined,
        effectiveLeaseId ? { leaseId: effectiveLeaseId } : undefined
      );
      const maxBalance = Math.max(0, arrears.totalArrearsZAR);
      const amount =
        suggestedAmount !== undefined && suggestedAmount > 0
          ? Math.min(suggestedAmount, maxBalance)
          : maxBalance;

      const unpaid = getUnpaidLedgerMonths(
        targetProperty,
        effectiveLeaseId ? { leaseId: effectiveLeaseId } : undefined
      );
      const allocs = allocateOldestFirst(unpaid, amount);

      setProperty(targetProperty);
      setInitialLeaseId(effectiveLeaseId);
      setInitialAmount(amount);
      setInitialAllocations(allocs);
      setIsOpen(true);
    },
    []
  );

  const closeWriteOffModal = useCallback(() => {
    setIsOpen(false);
    setProperty(null);
    setInitialLeaseId(undefined);
    setInitialAmount(undefined);
    setInitialAllocations(undefined);
  }, []);

  return {
    isOpen,
    property,
    initialLeaseId,
    initialAmount,
    initialAllocations,
    openWriteOff,
    closeWriteOffModal,
  };
}
