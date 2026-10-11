'use client';

import React, { useState, useEffect } from 'react';
import { RentalProperty, Lease, TenantDepartureReason } from '@/types';
import { formatZAR, formatDate } from '@/lib/formatters';
import {
  X,
  AlertTriangle,
  Calendar,
  UserCheck,
  UserX,
  Archive,
  ArrowRight,
  CheckCircle2,
  Clock,
  Building2,
} from 'lucide-react';

export interface TenantNoticeModalProps {
  isOpen: boolean;
  property: RentalProperty | null;
  initialLeaseId?: string | null;
  onClose: () => void;
  onMarkNotice: (
    propertyId: string,
    leaseId: string,
    notice: {
      noticeGivenDate: string;
      vacationDate: string;
      noticeReason: string;
      noticeNotes?: string;
    }
  ) => void;
  onCancelNotice: (propertyId: string, leaseId: string) => void;
  onFinalizeMoveOut: (
    propertyId: string,
    leaseId: string,
    params: {
      vacationDate: string;
      departureReason: string;
      forwardingNotes?: string;
      action: 'vacant' | 'replacement';
      replacementLease?: Partial<Lease>;
    }
  ) => void;
}

const DEPARTURE_REASONS: TenantDepartureReason[] = [
  'Relocating / work transfer',
  'Lease expired / non-renewal',
  'Purchased own home',
  'Rent affordability / downsizing',
  'Upsizing / larger property',
  'Eviction / breach of lease',
  'Notice by landlord',
  'Other',
];

export function TenantNoticeModal({
  isOpen,
  property,
  initialLeaseId,
  onClose,
  onMarkNotice,
  onCancelNotice,
  onFinalizeMoveOut,
}: TenantNoticeModalProps) {
  const [selectedLeaseId, setSelectedLeaseId] = useState<string>('');
  const [activeView, setActiveView] = useState<'notice' | 'finalize'>('notice');

  // Notice form states
  const [noticeGivenDate, setNoticeGivenDate] = useState<string>('');
  const [vacationDate, setVacationDate] = useState<string>('');
  const [noticeReason, setNoticeReason] = useState<string>(DEPARTURE_REASONS[0]);
  const [noticeNotes, setNoticeNotes] = useState<string>('');

  // Finalize move-out states
  const [finalVacationDate, setFinalVacationDate] = useState<string>('');
  const [finalReason, setFinalReason] = useState<string>(DEPARTURE_REASONS[0]);
  const [forwardingNotes, setForwardingNotes] = useState<string>('');
  const [transitionAction, setTransitionAction] = useState<'vacant' | 'replacement'>('vacant');

  // Replacement tenant form states
  const [newTenantName, setNewTenantName] = useState<string>('');
  const [newTenantPhone, setNewTenantPhone] = useState<string>('');
  const [newTenantEmail, setNewTenantEmail] = useState<string>('');
  const [newLeaseStartDate, setNewLeaseStartDate] = useState<string>('');
  const [newLeaseEndDate, setNewLeaseEndDate] = useState<string>('');
  const [newMonthlyRent, setNewMonthlyRent] = useState<number>(0);
  const [newDepositHeld, setNewDepositHeld] = useState<number>(0);

  const leases = property?.leases || [];
  const currentLease = leases.find((l) => l.id === selectedLeaseId) || leases[0];

  useEffect(() => {
    if (isOpen && property) {
      const targetId = initialLeaseId || property.leases?.[0]?.id || '';
      setSelectedLeaseId(targetId);

      const targetLease = property.leases?.find((l) => l.id === targetId) || property.leases?.[0];
      const todayStr = new Date().toISOString().split('T')[0];

      // Default vacation date: end of following month
      const now = new Date();
      const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0)
        .toISOString()
        .split('T')[0];

      if (targetLease?.status === 'Notice Given') {
        setActiveView('finalize');
        setNoticeGivenDate(targetLease.noticeGivenDate || todayStr);
        setVacationDate(targetLease.vacationDate || nextMonthEnd);
        setNoticeReason(targetLease.noticeReason || DEPARTURE_REASONS[0]);
        setNoticeNotes(targetLease.noticeNotes || '');

        setFinalVacationDate(targetLease.vacationDate || todayStr);
        setFinalReason(targetLease.noticeReason || DEPARTURE_REASONS[0]);
      } else {
        setActiveView('notice');
        setNoticeGivenDate(todayStr);
        setVacationDate(nextMonthEnd);
        setNoticeReason(DEPARTURE_REASONS[0]);
        setNoticeNotes('');

        setFinalVacationDate(todayStr);
        setFinalReason(DEPARTURE_REASONS[0]);
      }

      setForwardingNotes('');
      setTransitionAction('vacant');

      if (targetLease) {
        setNewMonthlyRent(targetLease.monthlyRentZAR);
        setNewDepositHeld(targetLease.depositHeldZAR);
        setNewLeaseStartDate(nextMonthEnd);
        const oneYearLater = new Date(new Date(nextMonthEnd).getTime() + 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];
        setNewLeaseEndDate(oneYearLater);
      }
    }
  }, [isOpen, property, initialLeaseId]);

  if (!isOpen || !property || !currentLease) return null;

  const handleLeaseChange = (leaseId: string) => {
    setSelectedLeaseId(leaseId);
    const target = leases.find((l) => l.id === leaseId);
    if (target?.status === 'Notice Given') {
      setActiveView('finalize');
      setFinalVacationDate(target.vacationDate || new Date().toISOString().split('T')[0]);
      setFinalReason(target.noticeReason || DEPARTURE_REASONS[0]);
    } else {
      setActiveView('notice');
    }
  };

  const handleSubmitNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeGivenDate || !vacationDate) return;
    onMarkNotice(property.id, currentLease.id, {
      noticeGivenDate,
      vacationDate,
      noticeReason,
      noticeNotes: noticeNotes.trim() || undefined,
    });
    onClose();
  };

  const handleRetractNotice = () => {
    if (confirm(`Cancel notice and return ${currentLease.tenantName} to Occupied status?`)) {
      onCancelNotice(property.id, currentLease.id);
      onClose();
    }
  };

  const handleFinalizeMoveOut = (e: React.FormEvent) => {
    e.preventDefault();
    if (!finalVacationDate) return;

    let replacementLease: Partial<Lease> | undefined = undefined;
    if (transitionAction === 'replacement') {
      replacementLease = {
        tenantName: newTenantName.trim() || 'New Tenant',
        tenantPhone: newTenantPhone.trim() || undefined,
        tenantEmail: newTenantEmail.trim() || undefined,
        leaseStartDate: newLeaseStartDate || finalVacationDate,
        leaseEndDate: newLeaseEndDate,
        monthlyRentZAR: newMonthlyRent,
        depositHeldZAR: newDepositHeld,
      };
    }

    onFinalizeMoveOut(property.id, currentLease.id, {
      vacationDate: finalVacationDate,
      departureReason: finalReason,
      forwardingNotes: forwardingNotes.trim() || undefined,
      action: transitionAction,
      replacementLease,
    });
    onClose();
  };

  const isNoticeGiven = currentLease.status === 'Notice Given';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 my-8">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isNoticeGiven ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Tenant Notice & Move-Out Management</h3>
              <p className="text-[11px] text-slate-500">
                {property.title} • {currentLease.unitName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Multi-unit unit switcher */}
        {leases.length > 1 && (
          <div className="px-5 py-2.5 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-600">Select Unit:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {leases.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => handleLeaseChange(l.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                    l.id === currentLease.id
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                  }`}
                >
                  {l.unitName}: {l.tenantName} ({l.status})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Existing notice alert banner */}
        {isNoticeGiven && (
          <div className="bg-amber-50 border-b border-amber-200 px-5 py-3 flex items-start justify-between gap-3 text-xs">
            <div className="flex items-start gap-2 text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[12px]">Notice Period Active</p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Tenant <strong>{currentLease.tenantName}</strong> gave notice on {formatDate(currentLease.noticeGivenDate || '')}. Target move-out is <strong>{formatDate(currentLease.vacationDate || '')}</strong> ({currentLease.noticeReason}).
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRetractNotice}
              className="text-[11px] font-bold text-amber-800 hover:text-amber-950 underline shrink-0 cursor-pointer"
            >
              Cancel Notice
            </button>
          </div>
        )}

        {/* Mode switcher tabs */}
        <div className="flex border-b border-slate-100 px-5 pt-3 gap-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveView('notice')}
            className={`pb-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeView === 'notice'
                ? 'border-slate-900 text-slate-900 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>1. Notice Details</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('finalize')}
            className={`pb-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeView === 'finalize'
                ? 'border-emerald-600 text-emerald-800 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>2. Finalize Move-Out & Archive</span>
          </button>
        </div>

        {/* Main Content */}
        <div className="p-5">
          {activeView === 'notice' ? (
            <form onSubmit={handleSubmitNotice} className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs flex items-center justify-between">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Current Tenant</span>
                  <strong className="text-slate-900 text-sm">{currentLease.tenantName}</strong>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {formatZAR(currentLease.monthlyRentZAR)}/m • Deposit Held: {formatZAR(currentLease.depositHeldZAR)}
                  </div>
                </div>
                <div className="text-right text-[11px] text-slate-500">
                  <span>Current Expiry:</span>
                  <div className="font-semibold text-slate-700">{formatDate(currentLease.leaseEndDate)}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Notice Given Date
                  </label>
                  <input
                    type="date"
                    required
                    value={noticeGivenDate}
                    onChange={(e) => setNoticeGivenDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900 focus:border-slate-900 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Target Vacation Date
                  </label>
                  <input
                    type="date"
                    required
                    value={vacationDate}
                    onChange={(e) => setVacationDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900 focus:border-slate-900 bg-white font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Non-Renewal / Departure Reason (Rental Housing Act)
                </label>
                <select
                  value={noticeReason}
                  onChange={(e) => setNoticeReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900 focus:border-slate-900 bg-white"
                >
                  {DEPARTURE_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Forwarding Notes / Remarks (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Tenant purchased property in Midrand, requested exit inspection for 28th."
                  value={noticeNotes}
                  onChange={(e) => setNoticeNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900 focus:border-slate-900 bg-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    Mark Notice Given
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleFinalizeMoveOut} className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[10px] uppercase font-semibold">Departing Tenant</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                    To be Archived
                  </span>
                </div>
                <strong className="text-slate-900 text-sm">{currentLease.tenantName}</strong>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Unit: <strong>{currentLease.unitName}</strong> • Held Deposit: {formatZAR(currentLease.depositHeldZAR)}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Actual Move-Out / Vacation Date
                  </label>
                  <input
                    type="date"
                    required
                    value={finalVacationDate}
                    onChange={(e) => setFinalVacationDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900 focus:border-slate-900 bg-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Final Departure Reason
                  </label>
                  <select
                    value={finalReason}
                    onChange={(e) => setFinalReason(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900 focus:border-slate-900 bg-white"
                  >
                    {DEPARTURE_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Forwarding Address & Inspection Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Deposit full refund approved following exit inspection; forwarding address noted."
                  value={forwardingNotes}
                  onChange={(e) => setForwardingNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900 focus:border-slate-900 bg-white"
                />
              </div>

              {/* Unit Transition Options */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-[11px] font-bold text-slate-900 mb-2">
                  What happens to this unit now?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label
                    className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                      transitionAction === 'vacant'
                        ? 'border-slate-900 bg-slate-50/80 shadow-2xs'
                        : 'border-slate-200 hover:bg-slate-50/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="transitionAction"
                      value="vacant"
                      checked={transitionAction === 'vacant'}
                      onChange={() => setTransitionAction('vacant')}
                      className="mt-0.5 text-slate-900"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                        <UserX className="w-3.5 h-3.5 text-slate-600" />
                        <span>Mark Unit as Vacant</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Keep unit empty for cleaning, maintenance, or remarketing.
                      </p>
                    </div>
                  </label>

                  <label
                    className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                      transitionAction === 'replacement'
                        ? 'border-emerald-600 bg-emerald-50/50 shadow-2xs'
                        : 'border-slate-200 hover:bg-slate-50/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="transitionAction"
                      value="replacement"
                      checked={transitionAction === 'replacement'}
                      onChange={() => setTransitionAction('replacement')}
                      className="mt-0.5 text-emerald-600"
                    />
                    <div>
                      <div className="text-xs font-bold text-emerald-950 flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Add Replacement Tenant</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Seamless handover: immediately enter the new tenant details.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Replacement Tenant Details Form */}
              {transitionAction === 'replacement' && (
                <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-3 animate-in fade-in">
                  <span className="text-[11px] font-bold text-emerald-900 block">
                    New Incoming Tenant Details
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Full Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Sipho Ndlovu"
                        value={newTenantName}
                        onChange={(e) => setNewTenantName(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Phone Number</label>
                      <input
                        type="text"
                        placeholder="+27 82 123 4567"
                        value={newTenantPhone}
                        onChange={(e) => setNewTenantPhone(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Email Address</label>
                      <input
                        type="email"
                        placeholder="sipho@example.co.za"
                        value={newTenantEmail}
                        onChange={(e) => setNewTenantEmail(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Start Date</label>
                      <input
                        type="date"
                        required
                        value={newLeaseStartDate}
                        onChange={(e) => setNewLeaseStartDate(e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">End Date</label>
                      <input
                        type="date"
                        required
                        value={newLeaseEndDate}
                        onChange={(e) => setNewLeaseEndDate(e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Monthly Rent (ZAR)</label>
                      <input
                        type="number"
                        min="0"
                        value={newMonthlyRent}
                        onChange={(e) => setNewMonthlyRent(Number(e.target.value))}
                        className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Deposit Held (ZAR)</label>
                      <input
                        type="number"
                        min="0"
                        value={newDepositHeld}
                        onChange={(e) => setNewDepositHeld(Number(e.target.value))}
                        className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Archive className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Finalize & Archive Lease</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default TenantNoticeModal;
