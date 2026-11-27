'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  Lease,
  RentalApplicant,
  RentalApplicantSource,
  RentalApplicantStatus,
  RentalProperty,
  TenantVettingScorecard,
} from '@/types';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';
import { formatDate, formatZAR } from '@/lib/formatters';
import { normalizeWhatsAppPhone } from '@/lib/calculations/inspections';
import {
  formatApplicantApprovalForWhatsApp,
  formatApplicantDeclineForWhatsApp,
  formatApplicantDocsRequestForWhatsApp,
} from '@/lib/whatsappFormatter';
import { TenantVettingDrawer } from './TenantVettingDrawer';
import type { NoticeReplacementPrefill } from '@/hooks/rentals/useRentalModalState';
import {
  AlertTriangle,
  ArrowRightLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Phone,
  Plus,
  Scale,
  Trash2,
  UserCheck,
  Users,
  X,
  XCircle,
} from 'lucide-react';

export interface BudgetMatchResult {
  tier: 'match' | 'close' | 'below';
  label: string;
}

/**
 * Compares an applicant's stated monthly budget against a target unit's rent.
 */
export function evaluateBudgetMatch(
  budgetZAR: number,
  targetRentZAR: number
): BudgetMatchResult {
  const safeBudget = Math.max(0, Number(budgetZAR) || 0);
  const safeRent = Math.max(0, Number(targetRentZAR) || 0);
  if (safeRent <= 0 || safeBudget >= safeRent) {
    return { tier: 'match', label: 'Matches Rent' };
  }
  if (safeBudget >= safeRent * 0.9) {
    return { tier: 'close', label: 'Within 10%' };
  }
  return { tier: 'below', label: 'Below Rent' };
}

/**
 * Counts Vacant or Notice Given leases whose rent fits within the applicant's budget.
 */
export function countOpenUnitsWithinBudget(
  budgetZAR: number,
  leases: Lease[] = []
): number {
  const safeBudget = Math.max(0, Number(budgetZAR) || 0);
  return (leases || []).filter(
    (l) =>
      (l.status === 'Vacant' || l.status === 'Notice Given') &&
      safeBudget >= (l.monthlyRentZAR || 0)
  ).length;
}

const APPLICANT_STAGES: RentalApplicantStatus[] = [
  'Viewing',
  'Applied',
  'Vetted',
  'Declined',
];

const STAGE_BADGE_CLASSES: Record<RentalApplicantStatus, string> = {
  Viewing: 'bg-slate-100 text-slate-700 border-slate-200',
  Applied: 'bg-blue-50 text-blue-700 border-blue-200',
  Vetted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Declined: 'bg-rose-50 text-rose-700 border-rose-200',
};

const SOURCE_OPTIONS: RentalApplicantSource[] = [
  'Walk-In',
  'WhatsApp',
  'Property24',
  'Facebook',
  'Referral',
];

function addOneYear(isoDate: string): string {
  const base = isoDate ? new Date(isoDate) : new Date();
  if (Number.isNaN(base.getTime())) {
    return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  }
  return new Date(base.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
}

function getDefaultTargetUnit(
  leases: Lease[],
  initialUnitFilter?: string | null
): string {
  if (initialUnitFilter) {
    if (
      initialUnitFilter === 'Any / Waitlist' ||
      leases.some((l) => l.unitName === initialUnitFilter)
    ) {
      return initialUnitFilter;
    }
  }
  const openLeases = leases.filter(
    (l) => l.status === 'Vacant' || l.status === 'Notice Given'
  );
  if (openLeases.length === 1) {
    return openLeases[0].unitName || 'Main Unit';
  }
  if (leases.length > 1) {
    return 'Any / Waitlist';
  }
  return leases[0]?.unitName || 'Main Unit';
}

function resolveUnitMonthlyRent(
  property: RentalProperty,
  unitName: string
): number {
  const leases = property.leases || [];
  if (unitName && unitName !== 'Any / Waitlist') {
    const matched = leases.find((l) => l.unitName === unitName);
    if (matched) return matched.monthlyRentZAR || 0;
  }
  const openLeases = leases.filter(
    (l) => l.status === 'Vacant' || l.status === 'Notice Given'
  );
  const pool = openLeases.length > 0 ? openLeases : leases;
  if (pool.length > 0) {
    return Math.min(...pool.map((l) => l.monthlyRentZAR || 0));
  }
  return property.monthlyGrossRentZAR || 0;
}

export interface RentalApplicantsModalProps {
  isOpen: boolean;
  property: RentalProperty | null;
  initialUnitFilter?: string | null;
  onClose: () => void;
  onShowToast?: (message: string) => void;
  onHandOffToNoticeModal: (
    property: RentalProperty,
    leaseId: string,
    prefill: NoticeReplacementPrefill
  ) => void;
}

export function RentalApplicantsModal({
  isOpen,
  property,
  initialUnitFilter,
  onClose,
  onShowToast,
  onHandOffToNoticeModal,
}: RentalApplicantsModalProps) {
  const uid = useId();
  const headingId = `${uid}-heading`;
  const optionalPanelId = `${uid}-optional-panel`;
  const dialogRef = useRef<HTMLDialogElement>(null);

  const liveProperty = usePortfolioStore((s) =>
    property ? s.rentals.find((r) => r.id === property.id) : undefined
  );
  const addRentalApplicant = usePortfolioStore((s) => s.addRentalApplicant);
  const updateRentalApplicant = usePortfolioStore((s) => s.updateRentalApplicant);
  const deleteRentalApplicant = usePortfolioStore((s) => s.deleteRentalApplicant);
  const onboardApplicantToVacantUnit = usePortfolioStore(
    (s) => s.onboardApplicantToVacantUnit
  );

  const activeProperty = liveProperty || property;
  const leases = useMemo(() => activeProperty?.leases || [], [activeProperty]);
  const applicants = useMemo(
    () => activeProperty?.applicants || [],
    [activeProperty]
  );
  const openLeases = useMemo(
    () =>
      leases.filter((l) => l.status === 'Vacant' || l.status === 'Notice Given'),
    [leases]
  );

  // Quick-capture form state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [monthlyBudgetInput, setMonthlyBudgetInput] = useState('');
  const [targetUnitName, setTargetUnitName] = useState('Main Unit');
  const [showOptional, setShowOptional] = useState(false);
  const [statedNetIncomeInput, setStatedNetIncomeInput] = useState('');
  const [desiredMoveInDate, setDesiredMoveInDate] = useState('');
  const [source, setSource] = useState<RentalApplicantSource>('Walk-In');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // List filters & per-card inline states
  const [stageFilter, setStageFilter] = useState<'All' | RentalApplicantStatus>('All');
  const [unitFilter, setUnitFilter] = useState<string | null>(null);
  const [vettingApplicantId, setVettingApplicantId] = useState<string | null>(null);
  const [copiedApplicantId, setCopiedApplicantId] = useState<string | null>(null);

  // Inline "Place Tenant" confirmation state (for Vacant units)
  const [placingApplicantId, setPlacingApplicantId] = useState<string | null>(null);
  const [placingLeaseId, setPlacingLeaseId] = useState<string>('');
  const [placingStartDate, setPlacingStartDate] = useState<string>('');
  const [placingEndDate, setPlacingEndDate] = useState<string>('');
  const [placingRent, setPlacingRent] = useState<number>(0);
  const [placingDeposit, setPlacingDeposit] = useState<number>(0);
  const [declineCompeting, setDeclineCompeting] = useState<boolean>(true);

  useEffect(() => {
    if (!isOpen || !activeProperty) return;
    setTargetUnitName(getDefaultTargetUnit(activeProperty.leases || [], initialUnitFilter));
    setUnitFilter(initialUnitFilter || null);
    setStageFilter('All');
    setVettingApplicantId(null);
    setPlacingApplicantId(null);
    setFormError(null);
  }, [isOpen, activeProperty?.id, initialUnitFilter]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el || !isOpen) return;

    if (typeof el.showModal === 'function' && !el.open) {
      try {
        el.showModal();
      } catch {
        // Ignore if already open or unsupported in SSR/JSDOM
      }
    }

    if (
      typeof HTMLDialogElement !== 'undefined' &&
      !('closedBy' in HTMLDialogElement.prototype)
    ) {
      const isOutside = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        return (
          e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom
        );
      };
      let pressedOutside = false;
      const onPointerDown = (e: PointerEvent) => {
        pressedOutside = isOutside(e);
      };
      const onPointerUp = (e: PointerEvent) => {
        if (pressedOutside && isOutside(e)) {
          el.close();
        }
      };
      el.addEventListener('pointerdown', onPointerDown);
      el.addEventListener('pointerup', onPointerUp);
      return () => {
        el.removeEventListener('pointerdown', onPointerDown);
        el.removeEventListener('pointerup', onPointerUp);
      };
    }
  }, [isOpen]);

  const unitScopedApplicants = useMemo(() => {
    if (!unitFilter) return applicants;
    return applicants.filter(
      (a) => a.unitName === unitFilter || a.unitName === 'Any / Waitlist'
    );
  }, [applicants, unitFilter]);

  const stageCounts = useMemo(() => {
    const counts: Record<'All' | RentalApplicantStatus, number> = {
      All: unitScopedApplicants.length,
      Viewing: 0,
      Applied: 0,
      Vetted: 0,
      Declined: 0,
    };
    for (const a of unitScopedApplicants) {
      counts[a.status] = (counts[a.status] || 0) + 1;
    }
    return counts;
  }, [unitScopedApplicants]);

  const filteredApplicants = useMemo(() => {
    if (stageFilter === 'All') return unitScopedApplicants;
    return unitScopedApplicants.filter((a) => a.status === stageFilter);
  }, [unitScopedApplicants, stageFilter]);

  if (!isOpen || !activeProperty) return null;

  const parsedBudget = Number(monthlyBudgetInput);
  const hasBudgetInput = monthlyBudgetInput.trim() !== '' && Number.isFinite(parsedBudget);
  const targetRentForCapture = resolveUnitMonthlyRent(activeProperty, targetUnitName);
  const captureMatch =
    hasBudgetInput && targetUnitName !== 'Any / Waitlist'
      ? evaluateBudgetMatch(parsedBudget, targetRentForCapture)
      : null;
  const openUnitsFitCount =
    hasBudgetInput && targetUnitName === 'Any / Waitlist'
      ? countOpenUnitsWithinBudget(parsedBudget, leases)
      : 0;

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();
    const budget = Number(monthlyBudgetInput);

    if (!trimmedName || !trimmedPhone || !Number.isFinite(budget) || budget <= 0) {
      setFormError('Enter full name, WhatsApp number, and a valid monthly budget.');
      return;
    }

    const parsedIncome = Number(statedNetIncomeInput);
    addRentalApplicant(activeProperty.id, {
      unitName: targetUnitName || 'Main Unit',
      fullName: trimmedName,
      phone: trimmedPhone,
      monthlyBudgetZAR: Math.round(budget),
      status: 'Viewing',
      source,
      desiredMoveInDate: desiredMoveInDate || undefined,
      statedNetIncomeZAR:
        statedNetIncomeInput.trim() && Number.isFinite(parsedIncome) && parsedIncome > 0
          ? Math.round(parsedIncome)
          : undefined,
      notes: notes.trim() || undefined,
    });

    setFullName('');
    setPhone('');
    setMonthlyBudgetInput('');
    setStatedNetIncomeInput('');
    setDesiredMoveInDate('');
    setNotes('');
    setFormError(null);
    onShowToast?.(`Added ${trimmedName} to shortlist`);
  };

  const handleOpenWhatsApp = (applicant: RentalApplicant) => {
    const unitRent = resolveUnitMonthlyRent(activeProperty, applicant.unitName);
    const depositZAR = applicant.recommendedDepositZAR ?? unitRent;

    let msg = '';
    if (applicant.status === 'Vetted') {
      msg = formatApplicantApprovalForWhatsApp({
        applicantName: applicant.fullName,
        propertyTitle: activeProperty.title,
        unitName: applicant.unitName,
        monthlyRentZAR: unitRent,
        depositZAR,
        moveInDate: applicant.desiredMoveInDate,
      });
    } else if (applicant.status === 'Declined') {
      msg = formatApplicantDeclineForWhatsApp({
        applicantName: applicant.fullName,
        propertyTitle: activeProperty.title,
        unitName: applicant.unitName,
      });
    } else {
      msg = formatApplicantDocsRequestForWhatsApp({
        applicantName: applicant.fullName,
        propertyTitle: activeProperty.title,
        unitName: applicant.unitName,
        monthlyRentZAR: unitRent,
      });
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(msg).catch(() => {});
      setCopiedApplicantId(applicant.id);
      setTimeout(() => setCopiedApplicantId(null), 2500);
    }

    const normalizedPhone = normalizeWhatsAppPhone(applicant.phone);
    const waUrl = normalizedPhone
      ? `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    if (typeof window !== 'undefined') {
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const startPlaceTenant = (applicant: RentalApplicant, targetLease: Lease) => {
    const todayIso = new Date().toISOString().split('T')[0];
    const startDefault = applicant.desiredMoveInDate || todayIso;
    setPlacingApplicantId(applicant.id);
    setPlacingLeaseId(targetLease.id);
    setPlacingStartDate(startDefault);
    setPlacingEndDate(addOneYear(startDefault));
    setPlacingRent(targetLease.monthlyRentZAR || 0);
    setPlacingDeposit(
      applicant.recommendedDepositZAR ?? (targetLease.monthlyRentZAR || 0)
    );
    setDeclineCompeting(true);
  };

  const handleConfirmVacantPlacement = (
    e: React.FormEvent,
    applicant: RentalApplicant
  ) => {
    e.preventDefault();
    if (!placingLeaseId || !placingStartDate || !placingEndDate) return;

    onboardApplicantToVacantUnit(activeProperty.id, placingLeaseId, applicant.id, {
      monthlyRentZAR: Math.max(0, Number(placingRent) || 0),
      depositHeldZAR: Math.max(0, Number(placingDeposit) || 0),
      leaseStartDate: placingStartDate,
      leaseEndDate: placingEndDate,
      declineCompetingForUnit: declineCompeting,
    });
    setPlacingApplicantId(null);
    onShowToast?.(`${applicant.fullName} placed as tenant`);
  };

  const renderMatchBadge = (match: BudgetMatchResult) => {
    if (match.tier === 'match') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 shrink-0" />
          <span>{match.label}</span>
        </span>
      );
    }
    if (match.tier === 'close') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
          <AlertTriangle className="w-3 h-3 shrink-0" />
          <span>{match.label}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
        <XCircle className="w-3 h-3 shrink-0" />
        <span>{match.label}</span>
      </span>
    );
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={headingId}
      onClose={onClose}
      {...({ closedby: 'any' } as any)}
      className="open:flex m-auto max-w-3xl w-[calc(100%-1.5rem)] max-h-[90vh] flex-col rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-slate-900/60 backdrop:backdrop-blur-xs overflow-hidden text-slate-900"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 id={headingId} className="font-bold text-sm text-slate-900 truncate">
              Open-Day Applicants & Waitlist ({applicants.length})
            </h2>
            <p className="text-[11px] text-slate-500 truncate">
              {activeProperty.title} • {activeProperty.status}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close applicants modal"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* 5-Second Open-Day Quick Capture */}
        <form
          onSubmit={handleQuickAdd}
          className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-3"
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-indigo-600" />
              <span>Open-Day Quick Capture</span>
            </span>
            {hasBudgetInput && (
              <div>
                {targetUnitName === 'Any / Waitlist' ? (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      openUnitsFitCount > 0
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {openUnitsFitCount > 0 ? (
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                    )}
                    <span>Fits {openUnitsFitCount} open unit(s)</span>
                  </span>
                ) : (
                  captureMatch && renderMatchBadge(captureMatch)
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div>
              <label
                htmlFor={`${uid}-name`}
                className="block text-[11px] font-semibold text-slate-700 mb-1"
              >
                Full Name *
              </label>
              <input
                id={`${uid}-name`}
                name="fullName"
                type="text"
                required
                autoFocus
                autoComplete="name"
                placeholder="e.g. Thabo Mokoena"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (formError) setFormError(null);
                }}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label
                htmlFor={`${uid}-phone`}
                className="block text-[11px] font-semibold text-slate-700 mb-1"
              >
                WhatsApp Number *
              </label>
              <input
                id={`${uid}-phone`}
                name="phone"
                type="tel"
                inputMode="tel"
                required
                autoComplete="tel"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                placeholder="082 123 4567"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (formError) setFormError(null);
                }}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label
                htmlFor={`${uid}-budget`}
                className="block text-[11px] font-semibold text-slate-700 mb-1"
              >
                Monthly Budget (ZAR) *
              </label>
              <input
                id={`${uid}-budget`}
                name="monthlyBudgetZAR"
                type="number"
                inputMode="numeric"
                min={0}
                required
                placeholder={
                  targetRentForCapture > 0 ? String(targetRentForCapture) : '9500'
                }
                value={monthlyBudgetInput}
                onChange={(e) => {
                  setMonthlyBudgetInput(e.target.value);
                  if (formError) setFormError(null);
                }}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-semibold focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
              />
            </div>

            <div>
              <label
                htmlFor={`${uid}-unit`}
                className="block text-[11px] font-semibold text-slate-700 mb-1"
              >
                Target Unit
              </label>
              <select
                id={`${uid}-unit`}
                name="unitName"
                value={targetUnitName}
                onChange={(e) => setTargetUnitName(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
              >
                {leases.length > 1 && (
                  <option value="Any / Waitlist">Any / Waitlist</option>
                )}
                {leases.length === 0 ? (
                  <option value="Main Unit">Main Unit</option>
                ) : (
                  leases.map((l) => (
                    <option key={l.id} value={l.unitName || 'Main Unit'}>
                      {l.unitName || 'Main Unit'} ({l.status} •{' '}
                      {formatZAR(l.monthlyRentZAR)}/m)
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2">
            <button
              type="button"
              aria-expanded={showOptional}
              aria-controls={optionalPanelId}
              onClick={() => setShowOptional((prev) => !prev)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 cursor-pointer"
            >
              {showOptional ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
              <span>{showOptional ? 'Hide Optional Details' : 'Optional Details'}</span>
            </button>

            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Lead</span>
            </button>
          </div>

          {formError && (
            <p role="alert" className="text-[11px] font-semibold text-rose-700">
              {formError}
            </p>
          )}

          {showOptional && (
            <div
              id={optionalPanelId}
              className="pt-2.5 border-t border-indigo-200/70 grid grid-cols-1 sm:grid-cols-3 gap-2.5"
            >
              <div>
                <label
                  htmlFor={`${uid}-income`}
                  className="block text-[11px] font-semibold text-slate-700 mb-1"
                >
                  Stated Net Income (ZAR)
                </label>
                <input
                  id={`${uid}-income`}
                  name="statedNetIncomeZAR"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder="e.g. 32000"
                  value={statedNetIncomeInput}
                  onChange={(e) => setStatedNetIncomeInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div>
                <label
                  htmlFor={`${uid}-movein`}
                  className="block text-[11px] font-semibold text-slate-700 mb-1"
                >
                  Desired Move-In Date
                </label>
                <input
                  id={`${uid}-movein`}
                  name="desiredMoveInDate"
                  type="date"
                  value={desiredMoveInDate}
                  onChange={(e) => setDesiredMoveInDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div>
                <label
                  htmlFor={`${uid}-source`}
                  className="block text-[11px] font-semibold text-slate-700 mb-1"
                >
                  Lead Source
                </label>
                <select
                  id={`${uid}-source`}
                  name="source"
                  value={source}
                  onChange={(e) =>
                    setSource(e.target.value as RentalApplicantSource)
                  }
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  {SOURCE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <label
                  htmlFor={`${uid}-notes`}
                  className="block text-[11px] font-semibold text-slate-700 mb-1"
                >
                  Quick Notes
                </label>
                <textarea
                  id={`${uid}-notes`}
                  name="notes"
                  rows={2}
                  placeholder="e.g. Viewed Saturday open day, works in Sandton, has 1 small pet."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                />
              </div>
            </div>
          )}
        </form>

        {/* Stage Filter Pills & Unit Filter Chip */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="Filter applicants by stage">
            {(['All', ...APPLICANT_STAGES] as const).map((stage) => {
              const isSelected = stageFilter === stage;
              return (
                <button
                  key={stage}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setStageFilter(stage)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {stage} ({stageCounts[stage]})
                </button>
              );
            })}
          </div>

          {unitFilter && (
            <button
              type="button"
              onClick={() => setUnitFilter(null)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 cursor-pointer"
            >
              <span>Unit: {unitFilter}</span>
              <X className="w-3 h-3" />
              <span>Show all units</span>
            </button>
          )}
        </div>

        {/* Applicants Shortlist */}
        {filteredApplicants.length === 0 ? (
          <div className="p-8 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
            No applicants logged{stageFilter !== 'All' ? ` in "${stageFilter}" stage` : ''}. Use the form above during viewings to log leads.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredApplicants.map((applicant) => {
              const targetRent = resolveUnitMonthlyRent(
                activeProperty,
                applicant.unitName
              );
              const match =
                applicant.unitName === 'Any / Waitlist'
                  ? null
                  : evaluateBudgetMatch(applicant.monthlyBudgetZAR, targetRent);
              const waitlistOpenCount =
                applicant.unitName === 'Any / Waitlist'
                  ? countOpenUnitsWithinBudget(applicant.monthlyBudgetZAR, leases)
                  : 0;

              const directOpenLease =
                applicant.unitName === 'Any / Waitlist'
                  ? undefined
                  : openLeases.find((l) => l.unitName === applicant.unitName);

              const candidateOpenLeases =
                applicant.unitName === 'Any / Waitlist'
                  ? openLeases
                  : directOpenLease
                  ? [directOpenLease]
                  : [];

              const selectedPlacementLease =
                placingApplicantId === applicant.id
                  ? candidateOpenLeases.find((l) => l.id === placingLeaseId) ||
                    candidateOpenLeases[0]
                  : candidateOpenLeases.find((l) => l.status === 'Vacant') ||
                    candidateOpenLeases[0];

              const isVettingOpen = vettingApplicantId === applicant.id;
              const isPlacingOpen = placingApplicantId === applicant.id;

              const whatsappActionLabel =
                applicant.status === 'Vetted'
                  ? 'Send Approval'
                  : applicant.status === 'Declined'
                  ? 'Polite Decline'
                  : 'Request Docs';

              const vettingInitialScorecard =
                applicant.vettingScorecard ??
                (applicant.statedNetIncomeZAR
                  ? ({
                      verifiedNetMonthlyIncomeZAR: applicant.statedNetIncomeZAR,
                    } as TenantVettingScorecard)
                  : undefined);

              return (
                <div
                  key={applicant.id}
                  data-sensitive="true"
                  className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2.5"
                >
                  {/* Card Top Row */}
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <strong className="text-sm text-slate-900">
                          {applicant.fullName}
                        </strong>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            STAGE_BADGE_CLASSES[applicant.status]
                          }`}
                        >
                          {applicant.status}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {applicant.unitName}
                        </span>
                        {applicant.source && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {applicant.source}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 flex-wrap text-[11px] text-slate-600">
                        <a
                          href={`tel:${applicant.phone.replace(/\s+/g, '')}`}
                          className="inline-flex items-center gap-1 text-slate-700 hover:text-indigo-700 font-medium"
                        >
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{applicant.phone}</span>
                        </a>
                        <span>
                          Budget:{' '}
                          <strong className="text-slate-900">
                            {formatZAR(applicant.monthlyBudgetZAR)}/m
                          </strong>
                        </span>
                        {match ? (
                          renderMatchBadge(match)
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-600">
                            Fits {waitlistOpenCount} open unit(s)
                          </span>
                        )}
                        {applicant.statedNetIncomeZAR && (
                          <span>
                            Stated Net:{' '}
                            <strong className="text-slate-800">
                              {formatZAR(applicant.statedNetIncomeZAR)}/m
                            </strong>
                          </span>
                        )}
                        {applicant.desiredMoveInDate && (
                          <span>Move-In: {formatDate(applicant.desiredMoveInDate)}</span>
                        )}
                      </div>

                      {applicant.notes && (
                        <p className="text-[11px] text-slate-500 italic bg-slate-50 px-2 py-1 rounded border border-slate-100">
                          {applicant.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {applicant.vettingScorecard &&
                        !applicant.vettingScorecard.isPendingInputs && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200">
                            {applicant.vettingScorecard.riskGrade} •{' '}
                            {applicant.vettingScorecard.compositeScore}/100
                          </span>
                        )}
                      <button
                        type="button"
                        onClick={() =>
                          deleteRentalApplicant(activeProperty.id, applicant.id)
                        }
                        aria-label={`Remove applicant ${applicant.fullName}`}
                        title="Delete applicant"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Stage Switcher + Action Strip */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                    {/* 1-Tap Stage Transitions */}
                    <div className="flex items-center gap-1 flex-wrap">
                      {APPLICANT_STAGES.map((stage) => {
                        const isCurrent = applicant.status === stage;
                        return (
                          <button
                            key={stage}
                            type="button"
                            onClick={() =>
                              updateRentalApplicant(activeProperty.id, applicant.id, {
                                status: stage,
                              })
                            }
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors cursor-pointer ${
                              isCurrent
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {stage}
                          </button>
                        );
                      })}
                    </div>

                    {/* Contextual Actions */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleOpenWhatsApp(applicant)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer"
                      >
                        {copiedApplicantId === applicant.id ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <MessageCircle className="w-3 h-3" />
                        )}
                        <span>
                          {copiedApplicantId === applicant.id
                            ? 'Copied & Opening...'
                            : whatsappActionLabel}
                        </span>
                      </button>

                      <button
                        type="button"
                        aria-expanded={isVettingOpen}
                        onClick={() =>
                          setVettingApplicantId(isVettingOpen ? null : applicant.id)
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 transition-colors cursor-pointer"
                      >
                        <Scale className="w-3 h-3" />
                        <span>Vet Applicant</span>
                      </button>

                      {applicant.status !== 'Declined' &&
                        selectedPlacementLease &&
                        (selectedPlacementLease.status === 'Vacant' ? (
                          <button
                            type="button"
                            aria-expanded={isPlacingOpen}
                            onClick={() =>
                              isPlacingOpen
                                ? setPlacingApplicantId(null)
                                : startPlaceTenant(applicant, selectedPlacementLease)
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors cursor-pointer"
                          >
                            <UserCheck className="w-3 h-3" />
                            <span>Place Tenant</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              onHandOffToNoticeModal(
                                activeProperty,
                                selectedPlacementLease.id,
                                {
                                  applicantId: applicant.id,
                                  tenantName: applicant.fullName,
                                  tenantPhone: applicant.phone,
                                  vettingScorecard: applicant.vettingScorecard,
                                  recommendedDepositZAR:
                                    applicant.recommendedDepositZAR,
                                }
                              )
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-2xs transition-colors cursor-pointer"
                          >
                            <ArrowRightLeft className="w-3 h-3" />
                            <span>Assign as Replacement</span>
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* Inline Vetting Accordion */}
                  {isVettingOpen && (
                    <div className="pt-2">
                      <TenantVettingDrawer
                        scorecard={vettingInitialScorecard}
                        monthlyRentZAR={targetRent}
                        defaultExpanded={true}
                        onUpdateScorecard={(scorecard) => {
                          const shouldAdvance =
                            scorecard.popiaConsentRecorded &&
                            !scorecard.isPendingInputs &&
                            (applicant.status === 'Viewing' ||
                              applicant.status === 'Applied');
                          updateRentalApplicant(activeProperty.id, applicant.id, {
                            vettingScorecard: scorecard,
                            ...(shouldAdvance ? { status: 'Vetted' } : {}),
                          });
                        }}
                        onApplyDeposit={(depositZAR) => {
                          updateRentalApplicant(activeProperty.id, applicant.id, {
                            recommendedDepositZAR: depositZAR,
                          });
                          onShowToast?.(
                            `Saved recommended deposit (${formatZAR(depositZAR)})`
                          );
                        }}
                      />
                    </div>
                  )}

                  {/* Inline Vacant Unit Placement Confirmation */}
                  {isPlacingOpen && selectedPlacementLease && (
                    <form
                      onSubmit={(e) => handleConfirmVacantPlacement(e, applicant)}
                      className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2.5"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-[11px] font-bold text-emerald-950">
                          Confirm Placement into {selectedPlacementLease.unitName}
                        </span>
                        {candidateOpenLeases.length > 1 && (
                          <select
                            aria-label="Select open unit for placement"
                            value={selectedPlacementLease.id}
                            onChange={(e) => {
                              const next = candidateOpenLeases.find(
                                (l) => l.id === e.target.value
                              );
                              if (!next) return;
                              if (next.status === 'Notice Given') {
                                setPlacingApplicantId(null);
                                onHandOffToNoticeModal(activeProperty, next.id, {
                                  applicantId: applicant.id,
                                  tenantName: applicant.fullName,
                                  tenantPhone: applicant.phone,
                                  vettingScorecard: applicant.vettingScorecard,
                                  recommendedDepositZAR:
                                    applicant.recommendedDepositZAR,
                                });
                              } else {
                                setPlacingLeaseId(next.id);
                                setPlacingRent(next.monthlyRentZAR || 0);
                                setPlacingDeposit(
                                  applicant.recommendedDepositZAR ??
                                    (next.monthlyRentZAR || 0)
                                );
                              }
                            }}
                            className="px-2 py-1 text-[11px] border border-emerald-300 rounded-md bg-white"
                          >
                            {candidateOpenLeases.map((l) => (
                              <option key={l.id} value={l.id}>
                                {l.unitName} ({l.status} •{' '}
                                {formatZAR(l.monthlyRentZAR)}/m)
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div>
                          <label
                            htmlFor={`${uid}-place-start-${applicant.id}`}
                            className="block text-[10px] font-semibold text-slate-600 mb-0.5"
                          >
                            Start Date
                          </label>
                          <input
                            id={`${uid}-place-start-${applicant.id}`}
                            type="date"
                            required
                            value={placingStartDate}
                            onChange={(e) => setPlacingStartDate(e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor={`${uid}-place-end-${applicant.id}`}
                            className="block text-[10px] font-semibold text-slate-600 mb-0.5"
                          >
                            End Date
                          </label>
                          <input
                            id={`${uid}-place-end-${applicant.id}`}
                            type="date"
                            required
                            value={placingEndDate}
                            onChange={(e) => setPlacingEndDate(e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor={`${uid}-place-rent-${applicant.id}`}
                            className="block text-[10px] font-semibold text-slate-600 mb-0.5"
                          >
                            Monthly Rent (ZAR)
                          </label>
                          <input
                            id={`${uid}-place-rent-${applicant.id}`}
                            type="number"
                            min={0}
                            required
                            value={placingRent}
                            onChange={(e) =>
                              setPlacingRent(Math.max(0, Number(e.target.value) || 0))
                            }
                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white font-bold"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor={`${uid}-place-dep-${applicant.id}`}
                            className="block text-[10px] font-semibold text-slate-600 mb-0.5"
                          >
                            Deposit (ZAR)
                          </label>
                          <input
                            id={`${uid}-place-dep-${applicant.id}`}
                            type="number"
                            min={0}
                            required
                            value={placingDeposit}
                            onChange={(e) =>
                              setPlacingDeposit(Math.max(0, Number(e.target.value) || 0))
                            }
                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                        <label className="flex items-center gap-2 text-[11px] font-semibold text-emerald-950 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={declineCompeting}
                            onChange={(e) => setDeclineCompeting(e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-emerald-400 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>Auto-decline competing applicants for this unit</span>
                        </label>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPlacingApplicantId(null)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-2xs cursor-pointer"
                          >
                            Confirm Placement
                          </button>
                        </div>
                      </div>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </dialog>
  );
}

export default RentalApplicantsModal;
