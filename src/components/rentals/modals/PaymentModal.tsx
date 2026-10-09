'use client';

import React, { useState, useEffect } from 'react';
import {
  RentalProperty,
  TenantPaymentRecord,
  PaymentAllocation,
  PaymentMethod,
} from '@/types';
import { formatZAR } from '@/lib/formatters';
import { CreditCard } from 'lucide-react';
import {
  getUnpaidLedgerMonths,
  allocateOldestFirst,
  getNextMonthKey,
  formatMonthLabel,
} from '@/lib/calculations/arrears';

export interface PaymentModalProps {
  isOpen: boolean;
  property: RentalProperty | null;
  editingPayment: TenantPaymentRecord | null;
  initialLeaseId?: string;
  initialMonth?: string;
  initialAmount?: number;
  initialAllocations?: PaymentAllocation[];
  onClose: () => void;
  onSave: (payload: Omit<TenantPaymentRecord, 'id'>, editingId?: string) => void;
  // Controlled props for Phase 4A backward compatibility
  paymentLeaseId?: string;
  setPaymentLeaseId?: (v: string) => void;
  paymentPeriodMonth?: string;
  setPaymentPeriodMonth?: (v: string) => void;
  paymentDate?: string;
  setPaymentDate?: (v: string) => void;
  paymentAmount?: number;
  setPaymentAmount?: (v: number) => void;
  paymentMethod?: PaymentMethod;
  setPaymentMethod?: (v: PaymentMethod) => void;
  paymentReference?: string;
  setPaymentReference?: (v: string) => void;
  paymentNotes?: string;
  setPaymentNotes?: (v: string) => void;
  paymentAllocations?: PaymentAllocation[];
  setPaymentAllocations?: React.Dispatch<React.SetStateAction<PaymentAllocation[]>>;
  showAllocationsEditor?: boolean;
  setShowAllocationsEditor?: (v: boolean) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  property,
  editingPayment,
  initialLeaseId,
  initialMonth,
  initialAmount,
  initialAllocations,
  onClose,
  onSave,
  paymentLeaseId: propLeaseId,
  setPaymentLeaseId: propSetLeaseId,
  paymentPeriodMonth: propPeriodMonth,
  setPaymentPeriodMonth: propSetPeriodMonth,
  paymentDate: propDate,
  setPaymentDate: propSetDate,
  paymentAmount: propAmount,
  setPaymentAmount: propSetAmount,
  paymentMethod: propMethod,
  setPaymentMethod: propSetMethod,
  paymentReference: propReference,
  setPaymentReference: propSetReference,
  paymentNotes: propNotes,
  setPaymentNotes: propSetNotes,
  paymentAllocations: propAllocations,
  setPaymentAllocations: propSetAllocations,
  showAllocationsEditor: propShowAllocationsEditor,
  setShowAllocationsEditor: propSetShowAllocationsEditor,
}) => {
  const [localLeaseId, setLocalLeaseId] = useState<string>('');
  const [localPeriodMonth, setLocalPeriodMonth] = useState<string>('');
  const [localDate, setLocalDate] = useState<string>('');
  const [localAmount, setLocalAmount] = useState<number>(0);
  const [localMethod, setLocalMethod] = useState<PaymentMethod>('EFT');
  const [localReference, setLocalReference] = useState<string>('');
  const [localNotes, setLocalNotes] = useState<string>('');
  const [localAllocations, setLocalAllocations] = useState<PaymentAllocation[]>([]);
  const [localShowAllocationsEditor, setLocalShowAllocationsEditor] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && property && propLeaseId === undefined) {
      if (editingPayment) {
        setLocalLeaseId(editingPayment.leaseId || '');
        setLocalPeriodMonth(editingPayment.periodMonth);
        setLocalDate(editingPayment.paymentDate);
        setLocalAmount(editingPayment.amountReceivedZAR);
        setLocalMethod(editingPayment.paymentMethod);
        setLocalReference(editingPayment.reference || '');
        setLocalNotes(editingPayment.notes || '');
        setLocalAllocations(editingPayment.allocations || [{ periodMonth: editingPayment.periodMonth, amountZAR: editingPayment.amountReceivedZAR }]);
        setLocalShowAllocationsEditor(Boolean(editingPayment.allocations && editingPayment.allocations.length > 1));
      } else {
        const leaseId = initialLeaseId || (property.leases && property.leases.length === 1 ? property.leases[0].id : '');
        const month = initialMonth || new Date().toISOString().slice(0, 7);
        const amount = initialAmount || (property.leases?.find(l => l.id === leaseId)?.monthlyRentZAR || property.monthlyGrossRentZAR || 0);
        setLocalLeaseId(leaseId);
        setLocalPeriodMonth(month);
        setLocalDate(new Date().toISOString().split('T')[0]);
        setLocalAmount(amount);
        setLocalMethod('EFT');
        setLocalReference('');
        setLocalNotes('');
        setLocalAllocations(initialAllocations || [{ periodMonth: month, amountZAR: amount }]);
        setLocalShowAllocationsEditor(Boolean(initialAllocations && initialAllocations.length > 1));
      }
    }
  }, [isOpen, property, editingPayment, initialLeaseId, initialMonth, initialAmount, initialAllocations, propLeaseId]);

  if (!isOpen || !property) return null;

  const leaseId = propLeaseId !== undefined ? propLeaseId : localLeaseId;
  const periodMonth = propPeriodMonth !== undefined ? propPeriodMonth : localPeriodMonth;
  const paymentDate = propDate !== undefined ? propDate : localDate;
  const amount = propAmount !== undefined ? propAmount : localAmount;
  const paymentMethod = propMethod !== undefined ? propMethod : localMethod;
  const paymentReference = propReference !== undefined ? propReference : localReference;
  const paymentNotes = propNotes !== undefined ? propNotes : localNotes;
  const paymentAllocations = propAllocations !== undefined ? propAllocations : localAllocations;
  const showAllocationsEditor = propShowAllocationsEditor !== undefined ? propShowAllocationsEditor : localShowAllocationsEditor;

  const targetLease = property.leases?.find((l) => l.id === leaseId);

  const handleLeaseIdChange = (newLeaseId: string) => {
    if (propSetLeaseId) {
      propSetLeaseId(newLeaseId);
    } else {
      setLocalLeaseId(newLeaseId);
    }
    if (!editingPayment) {
      const l = property.leases?.find((x) => x.id === newLeaseId);
      const newAmt = l ? l.monthlyRentZAR : (property.monthlyGrossRentZAR || 0);
      if (propSetAmount) propSetAmount(newAmt);
      else setLocalAmount(newAmt);
    }
  };

  const handlePeriodMonthChange = (v: string) => {
    if (propSetPeriodMonth) propSetPeriodMonth(v);
    else setLocalPeriodMonth(v);
  };

  const handleDateChange = (v: string) => {
    if (propSetDate) propSetDate(v);
    else setLocalDate(v);
  };

  const handleAmountChange = (v: number) => {
    if (propSetAmount) propSetAmount(v);
    else setLocalAmount(v);

    if (paymentAllocations.length <= 1) {
      const updatedAllocs = [{ periodMonth, amountZAR: v }];
      if (propSetAllocations) propSetAllocations(updatedAllocs);
      else setLocalAllocations(updatedAllocs);
    }
  };

  const handleMethodChange = (v: PaymentMethod) => {
    if (propSetMethod) propSetMethod(v);
    else setLocalMethod(v);
  };

  const handleReferenceChange = (v: string) => {
    if (propSetReference) propSetReference(v);
    else setLocalReference(v);
  };

  const handleNotesChange = (v: string) => {
    if (propSetNotes) propSetNotes(v);
    else setLocalNotes(v);
  };

  const setAllocations = (allocs: PaymentAllocation[] | ((prev: PaymentAllocation[]) => PaymentAllocation[])) => {
    if (propSetAllocations) {
      if (typeof allocs === 'function') {
        propSetAllocations(allocs(paymentAllocations));
      } else {
        propSetAllocations(allocs);
      }
    } else {
      setLocalAllocations(allocs);
    }
  };

  const setShowAllocationsEditor = (v: boolean) => {
    if (propSetShowAllocationsEditor) propSetShowAllocationsEditor(v);
    else setLocalShowAllocationsEditor(v);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;

    if (paymentMethod === 'Deposit Applied') {
      if (!targetLease) {
        alert('Please select a specific tenant / lease to apply the held deposit from.');
        return;
      }
      const existingDepositRefund = editingPayment && editingPayment.paymentMethod === 'Deposit Applied'
        ? editingPayment.amountReceivedZAR
        : 0;
      const availableDeposit = (targetLease.depositHeldZAR || 0) + existingDepositRefund;
      if (amount > availableDeposit) {
        alert(
          `Cannot apply ${formatZAR(amount)}: only ${formatZAR(availableDeposit)} deposit is held in trust for ${targetLease.tenantName}.`
        );
        return;
      }
    }

    const validAllocations = paymentAllocations.filter((a) => a.periodMonth && a.amountZAR > 0);
    const finalAllocations = validAllocations.length > 0
      ? validAllocations
      : [{ periodMonth, amountZAR: Number(amount) }];

    const paymentPayload: Omit<TenantPaymentRecord, 'id'> = {
      propertyId: property.id,
      paymentDate,
      amountReceivedZAR: Number(amount),
      periodMonth,
      paymentMethod,
      leaseId: leaseId || undefined,
      reference: paymentReference.trim() || undefined,
      notes: paymentNotes.trim() || undefined,
      allocations: finalAllocations,
      createdAt: editingPayment?.createdAt || new Date().toISOString(),
    };

    onSave(paymentPayload, editingPayment?.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <CreditCard className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {editingPayment ? 'Edit Payment Record' : 'Log Tenant Payment'}
              </h3>
              <p className="text-xs text-slate-500">{property.title}</p>
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
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Billing Period (Month)
            </label>
            <input
              type="month"
              required
              value={periodMonth}
              onChange={(e) => handlePeriodMonthChange(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">
              Month towards which this payment will be allocated in the ledger.
            </p>
          </div>

          {property.leases && property.leases.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tenant / Unit Allocation
              </label>
              <select
                value={leaseId}
                onChange={(e) => handleLeaseIdChange(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                {property.leases.length > 1 && (
                  <option value="">-- All Units / Unallocated Property Account --</option>
                )}
                {property.leases.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.unitName ? `${l.unitName} - ` : ''}{l.tenantName} ({formatZAR(l.monthlyRentZAR)}/mo)
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Links this payment directly to the specific lease ledger and tenant statement.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Date
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Amount Received (ZAR)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-sm font-bold text-slate-400">R</span>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  value={amount || ''}
                  onChange={(e) => handleAmountChange(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3 py-2 text-sm font-mono font-bold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => handleMethodChange(e.target.value as PaymentMethod)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="EFT">EFT (Electronic Funds Transfer)</option>
              <option value="Cash Deposit">Cash Deposit (Bank ATM / Branch)</option>
              <option value="Debit Order">Debit Order</option>
              <option value="Instant EFT / Card">Instant EFT / Card (PayFast / Ozow)</option>
              <option value="Deposit Applied">Deposit Applied (Deduct from Held Deposit)</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {paymentMethod === 'Deposit Applied' && (
            <div
              className={`p-3 rounded-xl text-xs border ${
                targetLease && (targetLease.depositHeldZAR || 0) >= amount
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div className="font-semibold flex items-center justify-between">
                <span>Held Security Deposit in Trust:</span>
                <span className="font-mono text-sm font-bold">
                  {targetLease ? formatZAR(targetLease.depositHeldZAR || 0) : 'R 0'}
                </span>
              </div>
              <p className="text-[11px] mt-1 leading-relaxed opacity-90">
                Applying this deposit directly settles rent/utility arrears and permanently deducts the amount from the tenant's held security deposit balance.
                {!targetLease && (
                  <span className="block text-rose-600 font-bold mt-1">
                    ⚠️ Please select a specific tenant / lease above to apply the deposit from.
                  </span>
                )}
                {targetLease && (targetLease.depositHeldZAR || 0) < amount && (
                  <span className="block text-rose-600 font-bold mt-1">
                    ⚠️ Requested payment amount ({formatZAR(amount)}) exceeds available held deposit ({formatZAR(targetLease.depositHeldZAR || 0)}).
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Multi-Month Allocation Breakdown */}
          <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/70 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>Ledger Month Allocation</span>
                  {paymentAllocations.length > 1 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                      {paymentAllocations.length} months
                    </span>
                  )}
                </label>
                <p className="text-[10px] text-slate-500">
                  Allocate lump sum across specific billing months
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const unpaid = getUnpaidLedgerMonths(property, leaseId ? { leaseId } : undefined);
                    const allocs = allocateOldestFirst(unpaid, amount);
                    setAllocations(allocs);
                    setShowAllocationsEditor(true);
                  }}
                  className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 rounded cursor-pointer transition-colors"
                >
                  Auto-allocate (Oldest First)
                </button>
                <button
                  type="button"
                  onClick={() => setShowAllocationsEditor(!showAllocationsEditor)}
                  className="text-xs text-slate-500 hover:text-slate-700 underline cursor-pointer"
                >
                  {showAllocationsEditor ? 'Hide Details' : 'Customize'}
                </button>
              </div>
            </div>

            {showAllocationsEditor && (
              <div className="space-y-2 pt-2 border-t border-slate-200">
                {paymentAllocations.map((alloc, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="month"
                      value={alloc.periodMonth}
                      onChange={(e) => {
                        const updated = [...paymentAllocations];
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
                          const updated = [...paymentAllocations];
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
                        const updated = paymentAllocations.filter((_, i) => i !== idx);
                        setAllocations(updated.length > 0 ? updated : [{ periodMonth, amountZAR: amount }]);
                      }}
                      className="text-slate-400 hover:text-rose-600 text-sm px-1 cursor-pointer"
                      title="Remove month allocation"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const lastMonth = paymentAllocations[paymentAllocations.length - 1]?.periodMonth || periodMonth;
                      setAllocations([...paymentAllocations, { periodMonth: getNextMonthKey(lastMonth), amountZAR: 0 }]);
                    }}
                    className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    + Add Month Row
                  </button>
                  {(() => {
                    const allocatedSum = paymentAllocations.reduce((s, a) => s + (a.amountZAR || 0), 0);
                    const diff = Math.round((amount - allocatedSum) * 100) / 100;
                    return (
                      <span className={`text-[11px] font-mono ${diff === 0 ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}`}>
                        Allocated: {formatZAR(allocatedSum)}
                        {diff !== 0 && ` (${diff > 0 ? `+${formatZAR(diff)} unallocated` : `${formatZAR(Math.abs(diff))} over`})`}
                      </span>
                    );
                  })()}
                </div>
              </div>
            )}

            {!showAllocationsEditor && paymentAllocations.length > 0 && (
              <div className="text-[11px] text-slate-600 font-mono bg-white px-2.5 py-1.5 rounded border border-slate-200">
                {paymentAllocations.map((a) => `${formatMonthLabel(a.periodMonth)}: ${formatZAR(a.amountZAR)} ✓`).join(', ')}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Bank Reference / Proof
            </label>
            <input
              type="text"
              value={paymentReference}
              onChange={(e) => handleReferenceChange(e.target.value)}
              placeholder="e.g. FNB-REF-98432 or April Rent"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Internal Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={paymentNotes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Any notes about this payment..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
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
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              {editingPayment ? 'Save Changes' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentModal;
