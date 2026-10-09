'use client';

import React, { useState, useEffect } from 'react';
import {
  RentalProperty,
  ArrearsWriteOff,
  ArrearsWriteOffReason,
  PaymentAllocation,
} from '@/types';
import { formatZAR } from '@/lib/formatters';
import { Archive, AlertCircle } from 'lucide-react';
import {
  calculatePropertyArrears,
  getUnpaidLedgerMonths,
  allocateOldestFirst,
  getMonthKey,
  getNextMonthKey,
} from '@/lib/calculations/arrears';

export interface WriteOffModalProps {
  isOpen: boolean;
  property: RentalProperty | null;
  initialLeaseId?: string;
  initialAmount?: number;
  initialAllocations?: PaymentAllocation[];
  onClose: () => void;
  onSave: (payload: Omit<ArrearsWriteOff, 'id'>) => void;
  // Controlled props for Phase 4A backward compatibility
  writeOffLeaseId?: string;
  setWriteOffLeaseId?: (v: string) => void;
  writeOffDate?: string;
  setWriteOffDate?: (v: string) => void;
  writeOffAmount?: number;
  setWriteOffAmount?: (v: number) => void;
  writeOffReason?: ArrearsWriteOffReason;
  setWriteOffReason?: (v: ArrearsWriteOffReason) => void;
  writeOffNotes?: string;
  setWriteOffNotes?: (v: string) => void;
  writeOffAllocations?: PaymentAllocation[];
  setWriteOffAllocations?: React.Dispatch<React.SetStateAction<PaymentAllocation[]>>;
}

export const WriteOffModal: React.FC<WriteOffModalProps> = ({
  isOpen,
  property,
  initialLeaseId,
  initialAmount,
  initialAllocations,
  onClose,
  onSave,
  writeOffLeaseId: propLeaseId,
  setWriteOffLeaseId: propSetLeaseId,
  writeOffDate: propDate,
  setWriteOffDate: propSetDate,
  writeOffAmount: propAmount,
  setWriteOffAmount: propSetAmount,
  writeOffReason: propReason,
  setWriteOffReason: propSetReason,
  writeOffNotes: propNotes,
  setWriteOffNotes: propSetNotes,
  writeOffAllocations: propAllocations,
  setWriteOffAllocations: propSetAllocations,
}) => {
  const [localLeaseId, setLocalLeaseId] = useState<string>('');
  const [localDate, setLocalDate] = useState<string>('');
  const [localAmount, setLocalAmount] = useState<number>(0);
  const [localReason, setLocalReason] = useState<ArrearsWriteOffReason>('Tenant absconded');
  const [localNotes, setLocalNotes] = useState<string>('');
  const [localAllocations, setLocalAllocations] = useState<PaymentAllocation[]>([]);

  useEffect(() => {
    if (isOpen && property && propLeaseId === undefined) {
      const leaseId = initialLeaseId || (property.leases && property.leases.length === 1 ? property.leases[0].id : '');
      const leaseArrears = calculatePropertyArrears(property, undefined, leaseId ? { leaseId } : undefined);
      const defaultAmt = initialAmount !== undefined ? initialAmount : Math.max(0, leaseArrears.totalArrearsZAR);
      const today = new Date().toISOString().split('T')[0];

      setLocalLeaseId(leaseId);
      setLocalDate(today);
      setLocalAmount(defaultAmt);
      setLocalReason('Tenant absconded');
      setLocalNotes('');

      if (initialAllocations && initialAllocations.length > 0) {
        setLocalAllocations(initialAllocations);
      } else {
        const unpaid = getUnpaidLedgerMonths(property, leaseId ? { leaseId } : undefined);
        setLocalAllocations(allocateOldestFirst(unpaid, defaultAmt));
      }
    }
  }, [isOpen, property, initialLeaseId, initialAmount, initialAllocations, propLeaseId]);

  if (!isOpen || !property) return null;

  const leaseId = propLeaseId !== undefined ? propLeaseId : localLeaseId;
  const writeOffDate = propDate !== undefined ? propDate : localDate;
  const amount = propAmount !== undefined ? propAmount : localAmount;
  const reason = propReason !== undefined ? propReason : localReason;
  const notes = propNotes !== undefined ? propNotes : localNotes;
  const allocations = propAllocations !== undefined ? propAllocations : localAllocations;

  const targetLease = property.leases?.find((l) => l.id === leaseId);
  const leaseArrears = calculatePropertyArrears(property, undefined, leaseId ? { leaseId } : undefined);
  const maxEligible = Math.max(0, leaseArrears.totalArrearsZAR);

  const handleLeaseIdChange = (newLeaseId: string) => {
    if (propSetLeaseId) {
      propSetLeaseId(newLeaseId);
    } else {
      setLocalLeaseId(newLeaseId);
    }

    const newLeaseArrears = calculatePropertyArrears(property, undefined, newLeaseId ? { leaseId: newLeaseId } : undefined);
    const maxForLease = Math.max(0, newLeaseArrears.totalArrearsZAR);
    const newAmount = Math.min(amount || maxForLease, maxForLease);

    if (propSetAmount) propSetAmount(newAmount);
    else setLocalAmount(newAmount);

    const unpaid = getUnpaidLedgerMonths(property, newLeaseId ? { leaseId: newLeaseId } : undefined);
    const allocs = allocateOldestFirst(unpaid, newAmount);

    if (propSetAllocations) propSetAllocations(allocs);
    else setLocalAllocations(allocs);
  };

  const handleDateChange = (val: string) => {
    if (propSetDate) propSetDate(val);
    else setLocalDate(val);
  };

  const handleAmountChange = (val: number) => {
    if (propSetAmount) propSetAmount(val);
    else setLocalAmount(val);

    const unpaid = getUnpaidLedgerMonths(property, leaseId ? { leaseId } : undefined);
    const allocs = allocateOldestFirst(unpaid, val);

    if (propSetAllocations) propSetAllocations(allocs);
    else setLocalAllocations(allocs);
  };

  const handleReasonChange = (val: ArrearsWriteOffReason) => {
    if (propSetReason) propSetReason(val);
    else setLocalReason(val);
  };

  const handleNotesChange = (val: string) => {
    if (propSetNotes) propSetNotes(val);
    else setLocalNotes(val);
  };

  const setAllocations = (newAllocs: PaymentAllocation[] | ((prev: PaymentAllocation[]) => PaymentAllocation[])) => {
    if (propSetAllocations) {
      if (typeof newAllocs === 'function') {
        propSetAllocations(newAllocs(allocations));
      } else {
        propSetAllocations(newAllocs);
      }
    } else {
      setLocalAllocations(newAllocs);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;

    const validAllocations = allocations.filter((a) => a.periodMonth && a.amountZAR > 0);
    const finalAllocations = validAllocations.length > 0
      ? validAllocations
      : [{ periodMonth: getMonthKey(writeOffDate), amountZAR: Number(amount) }];

    const payload: Omit<ArrearsWriteOff, 'id'> = {
      date: writeOffDate,
      amountZAR: Number(amount),
      reason,
      notes: notes.trim() || undefined,
      leaseId: leaseId || undefined,
      allocations: finalAllocations,
      createdAt: new Date().toISOString(),
    };

    onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-rose-50/70 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-rose-100 text-rose-800">
              <Archive className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Write Off Tenant Arrears
              </h3>
              <p className="text-xs text-slate-500">
                {property.title} {targetLease ? `• ${targetLease.tenantName}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>SARS Bad Debt & Audit Trail Notice</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-800">
              Writing off arrears relieves the tenant debt in the operational ledger and enables bad debt deduction under Section 11(i) of the Income Tax Act. Internal reasons and audit notes are strictly confidential and will <strong>never</strong> appear on tenant-facing statements or WhatsApp messages.
            </p>
          </div>

          {property.leases && property.leases.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tenant / Unit {property.leases.length > 1 && <span className="text-rose-600 font-bold">*</span>}
              </label>
              <select
                required={property.leases.length > 1}
                value={leaseId}
                onChange={(e) => handleLeaseIdChange(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
              >
                {property.leases.length > 1 && (
                  <option value="" disabled>-- Select Lease (Required) --</option>
                )}
                {property.leases.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.unitName ? `${l.unitName} - ` : ''}{l.tenantName} ({formatZAR(l.monthlyRentZAR)}/mo)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Write-Off Date
              </label>
              <input
                type="date"
                required
                value={writeOffDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Amount to Write Off (ZAR)
                </label>
                {maxEligible > 0 && (
                  <span className="text-[10px] text-slate-500">
                    Max: <strong className="text-slate-700 font-mono">{formatZAR(maxEligible)}</strong>
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2 text-sm font-bold text-slate-400">R</span>
                <input
                  type="number"
                  min="0.01"
                  max={maxEligible > 0 ? maxEligible : undefined}
                  step="any"
                  required
                  value={amount || ''}
                  onChange={(e) => handleAmountChange(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3 py-2 text-sm font-mono font-bold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Audit Reason (Tax / SARS Justification)
            </label>
            <select
              value={reason}
              onChange={(e) => handleReasonChange(e.target.value as ArrearsWriteOffReason)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
            >
              <option value="Tenant absconded">Tenant absconded</option>
              <option value="Settlement / discount agreed">Settlement / discount agreed</option>
              <option value="Uncollectable / bad debt">Uncollectable / bad debt</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Month Allocation Breakdown for Write-Off */}
          <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/60 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-800">
                  Target Billing Months to Clear
                </label>
                <p className="text-[10px] text-slate-500">
                  Select which historical months&apos; debt will be reduced
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const unpaid = getUnpaidLedgerMonths(property, leaseId ? { leaseId } : undefined);
                  setAllocations(allocateOldestFirst(unpaid, amount));
                }}
                className="text-[11px] font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-1 rounded cursor-pointer transition-colors"
              >
                Auto-allocate (Oldest First)
              </button>
            </div>

            <div className="space-y-1.5 pt-1">
              {allocations.map((alloc, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="month"
                    value={alloc.periodMonth}
                    onChange={(e) => {
                      const updated = [...allocations];
                      updated[idx] = { ...updated[idx], periodMonth: e.target.value };
                      setAllocations(updated);
                    }}
                    className="px-2 py-1 text-xs rounded border border-slate-300 bg-white"
                  />
                  <div className="relative flex-1">
                    <span className="absolute left-2 top-1 text-xs font-bold text-slate-400">R</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={alloc.amountZAR || ''}
                      onChange={(e) => {
                        const updated = [...allocations];
                        updated[idx] = { ...updated[idx], amountZAR: parseFloat(e.target.value) || 0 };
                        setAllocations(updated);
                      }}
                      className="w-full pl-6 pr-2 py-1 text-xs font-mono font-bold rounded border border-slate-300 bg-white"
                      placeholder="0.00"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = allocations.filter((_, i) => i !== idx);
                      setAllocations(updated);
                    }}
                    className="text-slate-400 hover:text-rose-600 text-sm px-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => {
                  const lastMonth = allocations[allocations.length - 1]?.periodMonth || getMonthKey(writeOffDate);
                  setAllocations([...allocations, { periodMonth: getNextMonthKey(lastMonth), amountZAR: 0 }]);
                }}
                className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                + Add Month Row
              </button>
              {(() => {
                const totalAlloc = allocations.reduce((s, a) => s + (a.amountZAR || 0), 0);
                const diff = Math.round((amount - totalAlloc) * 100) / 100;
                return (
                  <span className={`text-[11px] font-mono ${diff === 0 ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}`}>
                    Total Allocated: {formatZAR(totalAlloc)}
                    {diff !== 0 && ` (${diff > 0 ? `+${formatZAR(diff)} unallocated` : `${formatZAR(Math.abs(diff))} over`})`}
                  </span>
                );
              })()}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Internal Audit Notes (Confidential)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Record debt recovery attempts, case numbers, attorney correspondence, or settlement terms..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              Confirm Arrears Write-Off
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WriteOffModal;
