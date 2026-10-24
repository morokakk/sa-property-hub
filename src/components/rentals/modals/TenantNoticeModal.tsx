'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  RentalProperty,
  Lease,
  TenantDepartureReason,
  LeaseInspectionRecord,
  InspectionCondition,
  InspectionCategory,
  InspectionItem,
} from '@/types';
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
  ClipboardCheck,
  Share2,
  Copy,
  Check,
  Camera,
  ShieldAlert,
} from 'lucide-react';
import {
  calculateInspectionDepositSummary,
  ensureInspectionItems,
  normalizeWhatsAppPhone,
} from '@/lib/calculations/inspections';
import { formatInspectionForWhatsApp } from '@/lib/whatsappFormatter';

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
      inspectionRecord?: LeaseInspectionRecord;
      depositRefundedZAR?: number;
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

  // Exit inspection & deposit settlement states
  const [exitRecord, setExitRecord] = useState<LeaseInspectionRecord | null>(null);
  const [isDepositOverridden, setIsDepositOverridden] = useState<boolean>(false);
  const [customDepositRefund, setCustomDepositRefund] = useState<string>('');
  const [exitCopyFeedback, setExitCopyFeedback] = useState<boolean>(false);

  const leases = property?.leases || [];
  const currentLease = leases.find((l) => l.id === selectedLeaseId) || leases[0];

  const initializeExitRecord = (lease?: Lease, vacDate?: string) => {
    const fallbackDate = vacDate || new Date().toISOString().split('T')[0];
    if (lease?.inspectionRecord) {
      const items = ensureInspectionItems(lease.inspectionRecord.items).map((item) => ({
        ...item,
        exitCondition: item.exitCondition || item.ingoingCondition || 'Good',
        repairDeductionZAR: item.repairDeductionZAR ?? 0,
      }));
      setExitRecord({
        ...lease.inspectionRecord,
        exitDate: lease.inspectionRecord.exitDate || fallbackDate,
        exitTenantAgreed: lease.inspectionRecord.exitTenantAgreed || false,
        items,
      });
    } else {
      const items = ensureInspectionItems([]).map((item) => ({
        ...item,
        exitCondition: 'Good' as InspectionCondition,
        repairDeductionZAR: 0,
      }));
      setExitRecord({
        exitDate: fallbackDate,
        exitTenantAgreed: false,
        items,
      });
    }
    setIsDepositOverridden(false);
    setCustomDepositRefund('');
  };

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
        initializeExitRecord(targetLease, targetLease.vacationDate || todayStr);
      } else {
        setActiveView('notice');
        setNoticeGivenDate(todayStr);
        setVacationDate(nextMonthEnd);
        setNoticeReason(DEPARTURE_REASONS[0]);
        setNoticeNotes('');

        setFinalVacationDate(todayStr);
        setFinalReason(DEPARTURE_REASONS[0]);
        initializeExitRecord(targetLease, todayStr);
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
      const vacDate = target.vacationDate || new Date().toISOString().split('T')[0];
      setFinalVacationDate(vacDate);
      setFinalReason(target.noticeReason || DEPARTURE_REASONS[0]);
      initializeExitRecord(target, vacDate);
    } else {
      setActiveView('notice');
      initializeExitRecord(target, new Date().toISOString().split('T')[0]);
    }
  };

  const inspectionSummary = calculateInspectionDepositSummary(
    currentLease.depositHeldZAR,
    exitRecord || undefined
  );

  const effectiveDepositRefunded = isDepositOverridden
    ? Number(customDepositRefund || 0)
    : inspectionSummary.netDepositRefundableZAR;

  const handleUpdateExitItem = (
    category: InspectionCategory,
    updates: Partial<InspectionItem>
  ) => {
    if (!exitRecord) return;
    const items = ensureInspectionItems(exitRecord.items).map((item) => {
      if (item.category !== category) return item;
      const updated = { ...item, ...updates };
      // If condition reset to Good or N/A and deduction wasn't explicitly changed, reset deduction
      if (
        (updates.exitCondition === 'Good' || updates.exitCondition === 'N/A') &&
        updates.repairDeductionZAR === undefined
      ) {
        updated.repairDeductionZAR = 0;
      }
      return updated;
    });
    setExitRecord({ ...exitRecord, items });
  };

  const handleSendExitWhatsApp = () => {
    if (!exitRecord) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const portalUrl = currentLease.statementToken
      ? `${origin}/statement/${currentLease.statementToken}?tab=inspection`
      : undefined;

    const messageText = formatInspectionForWhatsApp({
      propertyTitle: property.title,
      unitName: currentLease.unitName,
      tenantName: currentLease.tenantName,
      mode: 'exit',
      depositHeldZAR: currentLease.depositHeldZAR,
      record: exitRecord,
      portalUrl,
    });

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(messageText);
      setExitCopyFeedback(true);
      setTimeout(() => setExitCopyFeedback(false), 3000);
    }

    const normalizedPhone = normalizeWhatsAppPhone(currentLease.tenantPhone);
    const waUrl = normalizedPhone
      ? `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(messageText)}`
      : `https://wa.me/?text=${encodeURIComponent(messageText)}`;

    if (typeof window !== 'undefined') {
      window.open(waUrl, '_blank', 'noopener,noreferrer');
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

    const finalizedInspectionRecord: LeaseInspectionRecord | undefined = exitRecord
      ? {
          ...exitRecord,
          exitDate: finalVacationDate,
        }
      : currentLease.inspectionRecord;

    onFinalizeMoveOut(property.id, currentLease.id, {
      vacationDate: finalVacationDate,
      departureReason: finalReason,
      forwardingNotes: forwardingNotes.trim() || undefined,
      action: transitionAction,
      replacementLease,
      inspectionRecord: finalizedInspectionRecord,
      depositRefundedZAR: Math.max(0, effectiveDepositRefunded),
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
                  Forwarding Address & Move-Out Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Forwarding address: 14 Maple Street. Key remotes returned."
                  value={forwardingNotes}
                  onChange={(e) => setForwardingNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900 focus:border-slate-900 bg-white"
                />
              </div>

              {/* 8-Point Exit Inspection & Deposit Settlement Engine (RHA Sec 5) */}
              {exitRecord && (
                <div className="p-3.5 rounded-xl border border-indigo-200 bg-slate-50/70 space-y-3.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-indigo-100 text-indigo-700">
                        <ClipboardCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">
                          Joint Exit Inspection & Deposit Settlement
                        </h4>
                        <p className="text-[10px] text-slate-500">
                          SA Rental Housing Act Section 5 joint inspection & deduction ledger
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="text-slate-500">Exit Date:</span>
                      <input
                        type="date"
                        value={exitRecord.exitDate || finalVacationDate}
                        onChange={(e) => setExitRecord({ ...exitRecord, exitDate: e.target.value })}
                        className="px-2 py-0.5 text-[11px] border border-slate-300 rounded bg-white"
                      />
                    </div>
                  </div>

                  {/* RHA Section 5 Compliance Warning / Success Banner */}
                  {!inspectionSummary.isRhaCompliantForDeductions ? (
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-[11px]">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        <span>RHA Section 5 Notice: Ingoing Inspection Not Agreed</span>
                      </div>
                      <p className="text-[10px] text-amber-800 leading-relaxed">
                        Under Section 5(3)(e)-(k) of the SA Rental Housing Act (Act 50 of 1999), landlords who fail to conduct a joint ingoing inspection are deemed to have acknowledged the property was received in good condition, and tenant damage deductions may be disputed at the Rental Housing Tribunal.
                      </p>
                    </div>
                  ) : (
                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] flex items-center justify-between flex-wrap gap-2">
                      <span className="font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>
                          RHA Compliant • Agreed Ingoing on {formatDate(exitRecord.ingoingTenantAgreedDate || exitRecord.ingoingDate || '')}
                        </span>
                      </span>
                      {exitRecord.ingoingPhotoVaultUrl && (
                        <a
                          href={exitRecord.ingoingPhotoVaultUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-bold text-indigo-700 hover:underline"
                        >
                          View Ingoing Vault ↗
                        </a>
                      )}
                    </div>
                  )}

                  {/* Side-by-Side 8 Categories Audit */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 px-0.5">
                      <span>Condition Audit & Deductions</span>
                      <span className="text-[10px] font-normal text-slate-500">
                        {inspectionSummary.degradedItemsCount > 0
                          ? `${inspectionSummary.degradedItemsCount} degraded item(s)`
                          : 'All items in good standing'}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {ensureInspectionItems(exitRecord.items).map((item) => {
                        const exitCond = item.exitCondition || 'Good';
                        const isDegraded =
                          (item.ingoingCondition === 'Good' && exitCond === 'Fair') ||
                          exitCond === 'Defective' ||
                          (item.repairDeductionZAR !== undefined && item.repairDeductionZAR > 0) ||
                          Boolean(item.exitNotes && item.exitNotes.trim());

                        return (
                          <div
                            key={item.category}
                            className={`p-2.5 rounded-lg border transition-colors shadow-2xs space-y-1.5 ${
                              isDegraded
                                ? 'bg-amber-50/40 border-amber-300'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div>
                                <span className="font-bold text-slate-800 text-[11px]">
                                  {item.category}
                                </span>
                                <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                  <span>Ingoing:</span>
                                  <span className="font-semibold text-slate-700">[{item.ingoingCondition}]</span>
                                  {item.ingoingNotes && (
                                    <span className="italic truncate max-w-[180px]">({item.ingoingNotes})</span>
                                  )}
                                </div>
                              </div>

                              {/* Exit Condition Pills */}
                              <div className="flex items-center gap-1">
                                {(['Good', 'Fair', 'Defective', 'N/A'] as InspectionCondition[]).map((cond) => {
                                  const isSelected = exitCond === cond;
                                  let pillClass = 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200';
                                  if (isSelected) {
                                    if (cond === 'Good') pillClass = 'bg-emerald-600 text-white font-bold border-emerald-600 shadow-2xs';
                                    else if (cond === 'Fair') pillClass = 'bg-amber-500 text-white font-bold border-amber-500 shadow-2xs';
                                    else if (cond === 'Defective') pillClass = 'bg-rose-600 text-white font-bold border-rose-600 shadow-2xs';
                                    else pillClass = 'bg-slate-700 text-white font-bold border-slate-700 shadow-2xs';
                                  }

                                  return (
                                    <button
                                      key={cond}
                                      type="button"
                                      onClick={() => handleUpdateExitItem(item.category, { exitCondition: cond })}
                                      className={`px-2 py-0.5 rounded text-[10px] border transition-all cursor-pointer ${pillClass}`}
                                    >
                                      {cond}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Inline Repair Deduction & Exit Notes if degraded/defective */}
                            {isDegraded && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-200/80">
                                <div>
                                  <label className="block text-[10px] font-semibold text-rose-800 mb-0.5">
                                    Repair Deduction (ZAR)
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="10"
                                    placeholder="R 0"
                                    value={item.repairDeductionZAR ?? ''}
                                    onChange={(e) =>
                                      handleUpdateExitItem(item.category, {
                                        repairDeductionZAR: Math.max(0, Number(e.target.value)),
                                      })
                                    }
                                    className="w-full px-2 py-1 text-xs border border-rose-300 rounded bg-white text-rose-900 font-bold focus:outline-hidden focus:ring-1 focus:ring-rose-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                                    Exit Damage Note / Contractor Quote
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g. Deep gouge in tile; replace 3 tiles"
                                    value={item.exitNotes || ''}
                                    onChange={(e) =>
                                      handleUpdateExitItem(item.category, { exitNotes: e.target.value })
                                    }
                                    className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Exit Photographic Evidence Vault */}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                      <Camera className="w-3 h-3 text-slate-400" />
                      <span>Exit Photo Evidence Vault URL</span>
                    </label>
                    <input
                      type="url"
                      placeholder="e.g. Google Drive / iCloud / Dropbox link for exit photos"
                      value={exitRecord.exitPhotoVaultUrl || ''}
                      onChange={(e) => setExitRecord({ ...exitRecord, exitPhotoVaultUrl: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Automated Live Settlement Math Bar */}
                  <div className="p-3 bg-white rounded-lg border border-indigo-200 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span>Deposit Settlement Calculation</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (isDepositOverridden) {
                            setIsDepositOverridden(false);
                            setCustomDepositRefund('');
                          } else {
                            setIsDepositOverridden(true);
                            setCustomDepositRefund(String(inspectionSummary.netDepositRefundableZAR));
                          }
                        }}
                        className="text-[10px] font-semibold text-indigo-700 hover:underline cursor-pointer"
                      >
                        {isDepositOverridden ? 'Reset to Auto-Calc' : 'Manual Override'}
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 rounded bg-slate-50 border border-slate-200">
                        <span className="text-[10px] text-slate-500 block">Deposit Held</span>
                        <strong className="text-slate-900">{formatZAR(currentLease.depositHeldZAR)}</strong>
                      </div>
                      <div className="p-2 rounded bg-rose-50 border border-rose-200">
                        <span className="text-[10px] text-rose-700 block">Repair Deductions</span>
                        <strong className="text-rose-900">
                          - {formatZAR(inspectionSummary.totalRepairDeductionsZAR)}
                        </strong>
                      </div>
                      <div className="p-2 rounded bg-emerald-50 border border-emerald-200">
                        <span className="text-[10px] text-emerald-700 block">Net Refundable</span>
                        <strong className="text-emerald-950 font-black">
                          {formatZAR(effectiveDepositRefunded)}
                        </strong>
                      </div>
                    </div>

                    {isDepositOverridden && (
                      <div className="p-2 bg-indigo-50/50 rounded border border-indigo-200 flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-indigo-950">
                          Custom Deposit Refund Amount (ZAR):
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={customDepositRefund}
                          onChange={(e) => setCustomDepositRefund(e.target.value)}
                          className="w-32 px-2 py-1 text-xs border border-indigo-300 rounded font-bold text-indigo-900 bg-white"
                        />
                      </div>
                    )}

                    {inspectionSummary.excessDamageShortfallZAR > 0 && (
                      <div className="p-2 rounded bg-rose-100/70 border border-rose-300 text-[11px] text-rose-900 font-semibold">
                        ⚠️ Excess Damage Shortfall: Repairs exceed deposit held by{' '}
                        <strong>{formatZAR(inspectionSummary.excessDamageShortfallZAR)}</strong>. The tenant owes this balance.
                      </div>
                    )}
                  </div>

                  {/* WhatsApp Exit Settlement Sharing & Sign-Off */}
                  <div className="p-3 bg-indigo-50/70 rounded-lg border border-indigo-200 space-y-2.5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-[11px] font-bold text-indigo-950 flex items-center gap-1.5">
                        <Share2 className="w-3.5 h-3.5 text-indigo-700" />
                        <span>Exit Settlement WhatsApp Sign-Off</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleSendExitWhatsApp}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-2xs transition-colors cursor-pointer"
                      >
                        {exitCopyFeedback ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{exitCopyFeedback ? 'Copied & Opening WhatsApp...' : 'Send Exit Report via WhatsApp'}</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-indigo-100">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={Boolean(exitRecord.exitTenantAgreed)}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            setExitRecord({
                              ...exitRecord,
                              exitTenantAgreed: isChecked,
                              exitTenantAgreedDate: isChecked
                                ? new Date().toISOString().split('T')[0]
                                : undefined,
                            });
                          }}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                        />
                        <span className="text-xs font-semibold text-slate-800">
                          Tenant Agreed to Exit Deductions via WhatsApp
                        </span>
                      </label>

                      {exitRecord.exitTenantAgreed && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                          <span className="text-slate-500">Agreed Date:</span>
                          <input
                            type="date"
                            value={exitRecord.exitTenantAgreedDate || new Date().toISOString().split('T')[0]}
                            onChange={(e) =>
                              setExitRecord({ ...exitRecord, exitTenantAgreedDate: e.target.value })
                            }
                            className="px-2 py-0.5 text-[11px] border border-slate-300 rounded bg-white"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

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
