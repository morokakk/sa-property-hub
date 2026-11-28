'use client';

import React, { useState, useEffect, useMemo } from 'react';
import TopHeader from '@/components/navigation/TopHeader';
import AddFundingModal from '@/components/funding/AddFundingModal';
import BottomSheetHandle from '@/components/common/BottomSheetHandle';
import { useBottomSheetDragToDismiss } from '@/hooks/useBottomSheetDragToDismiss';
import { usePortfolioStore, usePortfolioSummary } from '@/lib/store/usePortfolioStore';
import { formatZAR, formatPercent, formatDate } from '@/lib/formatters';
import { FlipProject, FundingSource, FundingTranche, FundingType, ReturnTermType } from '@/types';
import {
  buildFourPhaseBoqTranches,
  getTrancheBoqSignOffStatus,
} from '@/lib/calculations/flips';
import {
  Coins,
  Plus,
  Users,
  Calendar,
  Percent,
  CreditCard,
  ShieldCheck,
  Building2,
  CheckCircle,
  CheckCircle2,
  Clock,
  Wallet,
  Trash2,
  FileSpreadsheet,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Layers,
  ArrowRight,
  X,
  Search,
  LayoutGrid,
  List,
} from 'lucide-react';
import { exportFundingCSV } from '@/lib/export/csvExport';
import { formatPaymentStatement } from '@/lib/whatsappFormatter';

type FundingStatusFilter = 'All' | 'Active' | 'Standby' | 'Settled';

const PAYMENT_TYPE_OPTIONS: string[] = [
  'Monthly Coupon / Interest',
  'Principal Repayment',
  'Partial Return',
  'Full Settlement',
  'Profit Share Distribution',
];

function getFundingDrawnAndUndrawn(f: FundingSource) {
  if (f.status === 'Standby') {
    return { drawn: 0, undrawn: f.capitalAmountZAR, drawnCount: 0, totalTranches: 0, hasTranches: false };
  }
  if (f.tranches && f.tranches.length > 0) {
    const drawn = f.tranches.filter((t) => t.isDisbursed).reduce((s, t) => s + t.amountZAR, 0);
    const undrawn = f.tranches.filter((t) => !t.isDisbursed).reduce((s, t) => s + t.amountZAR, 0);
    const drawnCount = f.tranches.filter((t) => t.isDisbursed).length;
    return { drawn, undrawn, drawnCount, totalTranches: f.tranches.length, hasTranches: true };
  }
  return { drawn: f.capitalAmountZAR, undrawn: 0, drawnCount: 0, totalTranches: 0, hasTranches: false };
}

export default function FundingTrackerPage() {
  const funding = usePortfolioStore((state) => state.funding);
  const addFunding = usePortfolioStore((state) => state.addFunding);
  const updateFunding = usePortfolioStore((state) => state.updateFunding);
  const deleteFunding = usePortfolioStore((state) => state.deleteFunding);
  const syncFundingWithDealDelay = usePortfolioStore((state) => state.syncFundingWithDealDelay);
  const summary = usePortfolioSummary();
  const flips = usePortfolioStore((state) => state.flips);
  const developments = usePortfolioStore((state) => state.developments);
  const updateDevelopment = usePortfolioStore((state) => state.updateDevelopment);
  const rentals = usePortfolioStore((state) => state.rentals);

  // New Capital Source Form State
  const [showAddModal, setShowAddModal] = useState(false);

  // Deal Delay Sync Modal State
  const [syncModalSource, setSyncModalSource] = useState<FundingSource | null>(null);
  const [selectedDelayDays, setSelectedDelayDays] = useState<number>(30);
  const [delayReason, setDelayReason] = useState<string>('Contractor Snagging & Conveyancing Lodgement');

  // Tranche expansion state in ledger table
  const [expandedTranchesId, setExpandedTranchesId] = useState<string | null>(null);

  // Filter, search & view density state (local, non-persisted)
  const [statusFilter, setStatusFilter] = useState<FundingStatusFilter>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'ledger' | 'cards'>('ledger');

  // Repayment Quick Action Modal State
  const [repaymentModalSource, setRepaymentModalSource] = useState<FundingSource | null>(null);
  const [repaymentAmount, setRepaymentAmount] = useState<number>(0);
  const [paymentType, setPaymentType] = useState<string>('Monthly Coupon / Interest');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [copyReceiptOnSave, setCopyReceiptOnSave] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const syncSheetDrag = useBottomSheetDragToDismiss({
    onClose: () => setSyncModalSource(null),
  });
  const repaymentSheetDrag = useBottomSheetDragToDismiss({
    onClose: () => setRepaymentModalSource(null),
  });

  // Auto-dismiss toast after 3.5 seconds
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Close modals on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (syncModalSource) setSyncModalSource(null);
        if (repaymentModalSource) setRepaymentModalSource(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [syncModalSource, repaymentModalSource]);

  const handleToggleTrancheDisburse = (sourceId: string, trancheId: string) => {
    const source = funding.find((f) => f.id === sourceId);
    if (!source || !source.tranches) return;

    const updatedTranches = source.tranches.map((t) => {
      if (t.id !== trancheId) return t;
      const nextStatus = !t.isDisbursed;
      return {
        ...t,
        isDisbursed: nextStatus,
        disbursedDate: nextStatus ? new Date().toISOString().split('T')[0] : undefined,
      };
    });

    updateFunding(sourceId, { tranches: updatedTranches });
    const linkedDev = developments.find(
      (d) => d.id === source.linkedDealId || d.linkedFundingSourceId === sourceId
    );
    if (linkedDev) {
      const nextDrawn = updatedTranches
        .filter((t) => t.isDisbursed)
        .reduce((s, t) => s + t.amountZAR, 0);
      updateDevelopment(linkedDev.id, { developmentFacilityDrawnZAR: nextDrawn });
    }
    setToastMessage('Tranche disbursement status updated');
  };

  const handleMatchFacilityToBoq = (sourceId: string, flip: FlipProject) => {
    const source = funding.find((f) => f.id === sourceId);
    if (!source) return;
    const matchedTranches = buildFourPhaseBoqTranches({
      totalAmountZAR: source.capitalAmountZAR,
      flip,
      existingTranches: source.tranches,
    });
    const matchedTotal = matchedTranches.reduce((s, t) => s + t.amountZAR, 0);
    updateFunding(sourceId, {
      tranches: matchedTranches,
      ...(matchedTotal > 0 ? { capitalAmountZAR: matchedTotal } : {}),
    });
    setExpandedTranchesId(sourceId);
    setToastMessage(`Matched 4-phase BOQ (20/30/30/20) for ${flip.title}`);
  };

  const handleProcessRepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repaymentModalSource || repaymentAmount <= 0) return;
    const trimmedReference = paymentReference.trim();

    if (paymentType === 'Principal Repayment' || paymentType === 'Partial Return' || paymentType === 'Full Settlement') {
      const currentRepaid = repaymentModalSource.totalRepaidZAR || 0;
      const newTotalRepaid = currentRepaid + repaymentAmount;
      const { drawn } = getFundingDrawnAndUndrawn(repaymentModalSource);
      const targetSettlement = (repaymentModalSource.tranches && repaymentModalSource.tranches.length > 0) ? drawn : repaymentModalSource.capitalAmountZAR;
      const isSettled = newTotalRepaid >= targetSettlement;

      updateFunding(repaymentModalSource.id, {
        totalRepaidZAR: newTotalRepaid,
        status: isSettled ? 'Settled' : repaymentModalSource.status,
        ...(trimmedReference ? { lastPaymentReference: trimmedReference } : {}),
      });
      const linkedDev = developments.find(
        (d) =>
          d.id === repaymentModalSource.linkedDealId ||
          d.linkedFundingSourceId === repaymentModalSource.id
      );
      if (linkedDev) {
        updateDevelopment(linkedDev.id, {
          developmentFacilityRepaidZAR: newTotalRepaid,
        });
      }
    } else {
      // Monthly Coupon / Interest or Profit Share Distribution
      const currentInterest = repaymentModalSource.totalInterestPaidZAR || 0;
      updateFunding(repaymentModalSource.id, {
        totalInterestPaidZAR: currentInterest + repaymentAmount,
        ...(trimmedReference ? { lastPaymentReference: trimmedReference } : {}),
      });
    }

    if (copyReceiptOnSave) {
      const returnTermsText = `${repaymentModalSource.returnRatePercent}% ${
        repaymentModalSource.returnTermsType === 'Equity Profit Split'
          ? 'Net Profit Split'
          : repaymentModalSource.returnTermsType === 'Fixed Interest'
          ? 'p.a. Fixed Interest'
          : repaymentModalSource.returnTermsType === 'Monthly Coupon'
          ? 'p.a. Monthly Coupon'
          : repaymentModalSource.returnTermsType === 'Bullet Repayment'
          ? 'p.a. Bullet Repayment'
          : repaymentModalSource.returnTermsType
      }`;

      const receiptText = formatPaymentStatement({
        funderName: repaymentModalSource.lenderName,
        funderEntity: repaymentModalSource.entityOrContact,
        linkedAsset: repaymentModalSource.linkedDealName || 'General Portfolio Liquidity',
        paymentType,
        returnTerms: returnTermsText,
        amount: repaymentAmount,
        date: paymentDate,
        paymentReference: trimmedReference || undefined,
      });

      try {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(receiptText);
        }
      } catch {
        // Silently handle headless/sandboxed browser environments
      }

      setToastMessage('Payment Logged & WhatsApp Receipt Copied!');
    } else {
      setToastMessage('Payment Logged Successfully');
    }

    setRepaymentModalSource(null);
    setRepaymentAmount(0);
    setPaymentReference('');
  };

  const totalFacilityCapacity = funding.reduce((sum, f) => sum + f.capitalAmountZAR, 0);
  const totalCapitalDrawn = funding.reduce((sum, f) => {
    const { drawn } = getFundingDrawnAndUndrawn(f);
    return sum + drawn;
  }, 0);
  const totalUndrawnFacilities = Math.max(0, totalFacilityCapacity - totalCapitalDrawn);
  const totalRepayments = funding.reduce((sum, f) => sum + (f.totalRepaidZAR || 0) + (f.totalInterestPaidZAR || 0), 0);
  const totalOutstanding = summary.totalPrivateFundingLiability;
  const totalMonthlyInterestExpense = funding
    .filter((f) => f.status === 'Active' && (f.returnTermsType === 'Fixed Interest' || f.returnTermsType === 'Monthly Coupon'))
    .reduce((sum, f) => {
      const { drawn } = getFundingDrawnAndUndrawn(f);
      const activeBalance = Math.max(0, drawn - (f.totalRepaidZAR || 0));
      return sum + Math.round((activeBalance * (f.returnRatePercent / 100)) / 12);
    }, 0);

  const activeLenderSurname = repaymentModalSource?.lenderName
    ? repaymentModalSource.lenderName
        .trim()
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .split(/\s+/)
        .filter(Boolean)
        .pop()
        ?.toUpperCase() || 'LENDER'
    : 'LENDER';
  const suggestedPaymentReference = `EFT-${activeLenderSurname}-${(paymentDate || '').replace(/-/g, '')}`;

  const statusCounts = useMemo(
    () => ({
      All: funding.length,
      Active: funding.filter((f) => f.status === 'Active').length,
      Standby: funding.filter((f) => f.status === 'Standby').length,
      Settled: funding.filter((f) => f.status === 'Settled').length,
    }),
    [funding]
  );

  const enrichedFilteredFunding = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return funding
      .filter((item) => (statusFilter === 'All' ? true : item.status === statusFilter))
      .filter((item) => {
        if (!query) return true;
        return [
          item.lenderName,
          item.entityOrContact,
          item.fundingType,
          item.linkedDealName,
          item.notes,
          item.lastPaymentReference,
        ]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(query));
      })
      .map((item) => {
        const { drawn, undrawn, drawnCount, totalTranches, hasTranches } = getFundingDrawnAndUndrawn(item);
        const activeDrawnBalance = Math.max(0, drawn - (item.totalRepaidZAR || 0));
        const monthlyInterest =
          item.returnTermsType === 'Fixed Interest' || item.returnTermsType === 'Monthly Coupon'
            ? Math.round((activeDrawnBalance * (item.returnRatePercent / 100)) / 12)
            : 0;
        const delayCarryingCost =
          item.delayExtensionDays && item.delayExtensionDays > 0 && item.returnTermsType !== 'Equity Profit Split'
            ? Math.round(((activeDrawnBalance * (item.returnRatePercent / 100)) / 365) * item.delayExtensionDays)
            : 0;

        const linkedDev = developments.find(
          (d) => d.id === item.linkedDealId || d.linkedFundingSourceId === item.id
        );
        const linkedFlip = flips.find((f) => f.id === item.linkedDealId);
        const linkedDeal =
          linkedDev ||
          linkedFlip ||
          rentals.find((r) => r.id === item.linkedDealId);
        const isLinkedFlipDelayed =
          linkedDeal &&
          ('municipalClearance' in linkedDeal
            ? linkedDeal.status === 'Delayed' ||
              linkedDeal.municipalClearance?.rccStatus === 'Disputed' ||
              Boolean(linkedDeal.municipalClearance?.disputeNotes)
            : false);
        const blockedDevApproval = linkedDev
          ? Object.entries(linkedDev.approvals || {}).find(
              ([, app]) => app?.status === 'Blocked / Queried'
            )
          : undefined;
        const isLinkedDealBlocked = Boolean(isLinkedFlipDelayed || blockedDevApproval);

        return {
          item,
          drawn,
          undrawn,
          drawnCount,
          totalTranches,
          hasTranches,
          activeDrawnBalance,
          monthlyInterest,
          delayCarryingCost,
          linkedDev,
          linkedFlip,
          linkedDeal,
          blockedDevApproval,
          isLinkedDealBlocked,
        };
      });
  }, [funding, statusFilter, searchQuery, developments, flips, rentals]);

  const repaymentMetrics = useMemo(() => {
    if (!repaymentModalSource) return null;
    const { drawn } = getFundingDrawnAndUndrawn(repaymentModalSource);
    const targetPrincipal =
      repaymentModalSource.tranches && repaymentModalSource.tranches.length > 0
        ? drawn
        : repaymentModalSource.capitalAmountZAR;
    const remainingPrincipal = Math.max(0, targetPrincipal - (repaymentModalSource.totalRepaidZAR || 0));
    const oneMonthInterest =
      repaymentModalSource.returnTermsType === 'Fixed Interest' ||
      repaymentModalSource.returnTermsType === 'Monthly Coupon'
        ? Math.round((remainingPrincipal * (repaymentModalSource.returnRatePercent / 100)) / 12)
        : 0;
    const halfBalance = Math.round(remainingPrincipal * 0.5);
    return { remainingPrincipal, oneMonthInterest, halfBalance };
  }, [repaymentModalSource]);

  const openLogPaymentModal = (item: FundingSource) => {
    setRepaymentModalSource(item);
    setRepaymentAmount(0);
    setPaymentReference('');
    setPaymentType(
      item.returnTermsType === 'Equity Profit Split'
        ? 'Profit Share Distribution'
        : item.paymentSchedule === 'At Exit (Maturity)'
        ? 'Principal Repayment'
        : 'Monthly Coupon / Interest'
    );
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setCopyReceiptOnSave(true);
  };

  const openSyncDelayModal = (entry: (typeof enrichedFilteredFunding)[number]) => {
    const { item, linkedDev, linkedDeal, blockedDevApproval } = entry;
    setSyncModalSource(item);
    setSelectedDelayDays(30);
    setDelayReason(
      blockedDevApproval
        ? `SPLUMA / Council approval query on ${linkedDev?.title}`
        : linkedDev
        ? `Development construction & municipal clearance queue: ${linkedDev.title}`
        : linkedDeal && 'municipalClearance' in linkedDeal && linkedDeal.municipalClearance?.rccStatus === 'Disputed'
        ? `Section 118 municipal rates dispute: ${linkedDeal.title}`
        : 'Contractor snagging & conveyancing queue'
    );
  };

  const renderStatusBadge = (status: FundingSource['status']) => {
    const badgeClasses =
      status === 'Active'
        ? 'bg-emerald-100 text-emerald-800'
        : status === 'Standby'
        ? 'bg-amber-100 text-amber-900 border border-amber-300'
        : status === 'Settled'
        ? 'bg-slate-200 text-slate-700'
        : 'bg-amber-100 text-amber-800';
    return (
      <span
        title={status === 'Standby' ? 'Standby Facility (Undrawn War Chest)' : status}
        className={`inline-block px-1.5 sm:px-2.5 py-0.5 rounded-full text-[9.5px] sm:text-[10px] font-bold leading-tight text-center sm:whitespace-nowrap ${badgeClasses}`}
      >
        {status === 'Standby' ? 'Standby (Undrawn)' : status}
      </span>
    );
  };

  const renderFacilityActions = (
    entry: (typeof enrichedFilteredFunding)[number],
    layout: 'ledger' | 'cards'
  ) => {
    const { item, hasTranches, linkedFlip } = entry;
    const isExpanded = expandedTranchesId === item.id;
    return (
      <div
        className={`flex flex-wrap items-center gap-1 ${
          layout === 'ledger' ? 'justify-end' : 'justify-start'
        }`}
      >
        {item.status === 'Standby' ? (
          <button
            type="button"
            onClick={() => {
              updateFunding(item.id, { status: 'Active' });
              setToastMessage(`Facility "${item.lenderName}" activated`);
            }}
            className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded text-[10px] sm:text-[11px] font-semibold cursor-pointer whitespace-nowrap"
            title="Activate and draw standby credit line"
          >
            Activate
          </button>
        ) : (
          <button
            type="button"
            onClick={() => openLogPaymentModal(item)}
            className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[10px] sm:text-[11px] font-semibold cursor-pointer whitespace-nowrap"
          >
            Log Payment
          </button>
        )}
        {hasTranches && layout === 'ledger' && (
          <button
            type="button"
            onClick={() => setExpandedTranchesId(isExpanded ? null : item.id)}
            aria-expanded={isExpanded}
            className="px-1.5 py-0.5 sm:py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-[10px] sm:text-[11px] font-semibold inline-flex items-center gap-0.5 cursor-pointer whitespace-nowrap"
            title={isExpanded ? 'Hide Tranches' : 'View Tranches'}
          >
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            <span>Tranches</span>
          </button>
        )}
        {item.linkedDealId && (
          <button
            type="button"
            onClick={() => openSyncDelayModal(entry)}
            className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-[10px] sm:text-[11px] font-semibold cursor-pointer inline-flex items-center gap-1 whitespace-nowrap"
            title="Sync maturity date with deal delay"
          >
            <Clock className="w-3 h-3 shrink-0" />
            <span>Sync Delay</span>
          </button>
        )}
        {!hasTranches && linkedFlip && item.status !== 'Standby' && (
          <button
            type="button"
            onClick={() => handleMatchFacilityToBoq(item.id, linkedFlip)}
            className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded cursor-pointer sm:whitespace-nowrap"
            title={`Split facility into 4 BOQ tranches (20/30/30/20) for ${linkedFlip.title}`}
          >
            Match 4-Phase BOQ
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            if (confirm(`Delete funding source "${item.lenderName}"?`)) {
              deleteFunding(item.id);
            }
          }}
          className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer shrink-0"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

  const renderTranchesDrawer = (entry: (typeof enrichedFilteredFunding)[number]) => {
    const { item, drawn, linkedFlip } = entry;
    if (!item.tranches || item.tranches.length === 0) return null;

    return (
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2 flex-wrap">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span className="font-bold text-slate-900 text-xs">
              Milestone Tranches: {item.lenderName}
            </span>
            {linkedFlip && (
              <button
                type="button"
                onClick={() => handleMatchFacilityToBoq(item.id, linkedFlip)}
                className="text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded transition-colors cursor-pointer"
                title={`Align tranches to ${linkedFlip.title}'s 4-phase BOQ (20/30/30/20)`}
              >
                Match 4-Phase BOQ (20/30/30/20)
              </button>
            )}
          </div>
          <span className="text-[11px] text-slate-500">
            Interest accrues only on disbursed tranches ({formatZAR(drawn)} of {formatZAR(item.capitalAmountZAR)})
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {item.tranches.map((tr) => {
            const showBoqStatus = Boolean(linkedFlip) || tr.verifiedPhysicalProgress !== undefined;
            const boqStatus = showBoqStatus ? getTrancheBoqSignOffStatus(tr, linkedFlip) : null;

            return (
              <div
                key={tr.id}
                className={`p-3 rounded-lg border text-xs flex flex-col justify-between ${
                  tr.isDisbursed
                    ? 'bg-emerald-50/40 border-emerald-200 text-emerald-950'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-bold text-slate-900 truncate">{tr.name}</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded border shrink-0 ${
                        tr.isDisbursed
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-slate-200 text-slate-700 border-slate-300'
                      }`}
                    >
                      {tr.isDisbursed ? 'Disbursed' : 'Undrawn'}
                    </span>
                  </div>
                  <div className="text-base font-extrabold text-slate-900 tabular-nums mt-1">
                    {formatZAR(tr.amountZAR)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Milestone Phase: <strong className="text-slate-800">{tr.linkedMilestonePhase || 'Deposit'}</strong>
                  </div>
                  {boqStatus && (
                    <div className="mt-1.5">
                      <span
                        className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                          boqStatus.statusKey === 'signed_disbursed'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : boqStatus.statusKey === 'signed_ready'
                            ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                            : boqStatus.statusKey === 'early_disbursed'
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-slate-100 text-slate-600 border-slate-300'
                        }`}
                      >
                        {boqStatus.label}
                      </span>
                    </div>
                  )}
                  {tr.disbursedDate && (
                    <div className="text-[10px] text-slate-400 mt-1">
                      Disbursed: {formatDate(tr.disbursedDate)}
                    </div>
                  )}
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    {tr.isDisbursed ? 'Accruing interest' : 'No interest burn'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggleTrancheDisburse(item.id, tr.id)}
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded transition-colors cursor-pointer ${
                      tr.isDisbursed
                        ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                    }`}
                  >
                    {tr.isDisbursed ? 'Mark Undrawn' : 'Disburse Tranche'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col">
      <TopHeader
        title="Funding & Capital Tracker"
        subtitle="Centralized ledger managing private debt, syndicate equity splits, and loan repayments"
        actionButton={
          <div className="flex items-center gap-2 shrink-0">
            {funding.length > 0 && (
              <button
                onClick={() => exportFundingCSV(funding)}
                title="Download funding ledger as CSV"
                className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold px-3 py-2 rounded-lg shadow-2xs transition-colors cursor-pointer shrink-0 whitespace-nowrap"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export CSV</span>
              </button>
            )}
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-sm transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Add Capital Source</span>
            </button>
          </div>
        }
      />

      <main className="flex-1 p-4 sm:p-6 space-y-6 max-w-7xl w-full mx-auto">
        {/* Purchasing Power & Seed Capital Banner */}
        <div id="funding-reserve" className="scroll-mt-20 bg-slate-900 rounded-xl p-5 text-white border border-slate-800 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 shrink-0">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    Deployable War Chest
                  </span>
                  <span className="text-xs text-slate-400">Cash + Pre-Approved Facility Capacity</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mt-1 tracking-tight tabular-nums flex items-baseline gap-2">
                  {formatZAR(summary.deployableWarChest)}
                  <span className="text-xs font-medium text-emerald-400 font-sans">Gross War Chest</span>
                </h3>
                <div
                  className="text-xs text-slate-300 mt-2 bg-slate-950/80 px-2.5 py-1.5 rounded-lg border border-slate-800 w-fit flex flex-wrap items-center gap-1.5"
                  title={`Free Cash: ${formatZAR(summary.freeUnallocatedCash)} (${formatZAR(summary.liquidCapitalReserve)} Bank − ${formatZAR(summary.ringFencedWorkingCapital)} Ring-Fenced) + Standby Facilities: ${formatZAR(summary.unallocatedFundingReserve)} = Net Deployable Purchasing Power: ${formatZAR(summary.totalAvailablePurchasingPower)}`}
                >
                  <span className="text-slate-300">Free Cash:</span>
                  <strong className="font-semibold text-white tabular-nums">{formatZAR(summary.freeUnallocatedCash)}</strong>
                  <span className="text-slate-400 font-bold px-0.5">+</span>
                  <span className="text-slate-300">Standby Facilities:</span>
                  <strong className="font-semibold text-white tabular-nums">{formatZAR(summary.unallocatedFundingReserve)}</strong>
                  <span className="text-slate-400 font-bold px-0.5">=</span>
                  <span className="text-slate-300">Net Deployable:</span>
                  <strong className="font-semibold text-emerald-300 tabular-nums">{formatZAR(summary.totalAvailablePurchasingPower)}</strong>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 border-t lg:border-t-0 lg:border-l border-slate-800 pt-3 lg:pt-0 lg:pl-6">
              <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/60 flex flex-col justify-between">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-semibold">Liquid Cash Reserve</span>
                  <span className="text-base font-bold text-white tabular-nums tracking-tight block mt-0.5">
                    {formatZAR(summary.liquidCapitalReserve)}
                  </span>
                </div>
                <span
                  className="text-[10px] text-slate-400 block mt-1 leading-tight"
                  title={`${formatZAR(summary.ringFencedWorkingCapital)} is committed to active contractor draws and council deposits, leaving ${formatZAR(summary.freeUnallocatedCash)} unallocated cash from the ${formatZAR(summary.liquidCapitalReserve)} bank balance.`}
                >
                  {summary.freeUnallocatedCash === 0 ? 'R 0 free unallocated' : 'Includes exit proceeds'}
                </span>
              </div>

              <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/60 flex flex-col justify-between">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-semibold">Ring-Fenced Capital</span>
                  <span className="text-base font-bold text-amber-300 tabular-nums tracking-tight block mt-0.5">
                    {formatZAR(summary.ringFencedWorkingCapital)}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">Committed to active flips</span>
              </div>

              <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/60 flex flex-col justify-between">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-semibold">Unallocated Facilities</span>
                  <span className="text-base font-bold text-white tabular-nums tracking-tight block mt-0.5">
                    {formatZAR(summary.unallocatedFundingReserve)}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">General liquidity lines</span>
              </div>

              <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/60 flex flex-col justify-between">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-semibold">Realized Flip Gains</span>
                  <span className="text-base font-bold text-emerald-400 tabular-nums tracking-tight block mt-0.5">
                    {formatZAR(summary.totalRealizedFlipProfits)}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">From {summary.completedFlipsCount} exits</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top KPI Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Drawn Capital vs Capacity</span>
            <div className="text-xl font-bold text-slate-900 tabular-nums tracking-tight mt-1">{formatZAR(totalCapitalDrawn)}</div>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
              Of {formatZAR(totalFacilityCapacity)} facility capacity ({formatZAR(totalUndrawnFacilities)} undrawn)
            </p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Monthly Interest Expense</span>
            <div className="text-xl font-bold text-rose-600 tabular-nums tracking-tight mt-1">
              <span>{formatZAR(totalMonthlyInterestExpense)}</span>
              <span className="ml-0.5 text-xs font-normal text-slate-400">/mo</span>
            </div>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Accrues strictly on drawn tranches</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Outstanding Liability</span>
            <div className="text-xl font-bold text-slate-900 tabular-nums tracking-tight mt-1">{formatZAR(totalOutstanding)}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Excludes bonds &amp; own-cash builds</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Returns Repaid</span>
            <div className="text-xl font-bold text-emerald-600 tabular-nums tracking-tight mt-1">{formatZAR(totalRepayments)}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Interest &amp; capital returned</p>
          </div>
        </div>

        {/* Funding Sources Table & Cards */}
        <div id="funding-ledger" className="scroll-mt-20 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 sm:p-5 border-b border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Capital Ledger & Terms</h3>
                <p className="text-xs text-slate-500">
                  Track returns, phased tranches, deal delay sync, and maturity dates.
                </p>
              </div>

              <div
                className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 self-start sm:self-auto shrink-0"
                role="group"
                aria-label="Funding View Mode"
              >
                <button
                  type="button"
                  onClick={() => setViewMode('ledger')}
                  aria-pressed={viewMode === 'ledger'}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    viewMode === 'ledger'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Ledger</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  aria-pressed={viewMode === 'cards'}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    viewMode === 'cards'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Cards</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by Facility Status">
                {(['All', 'Active', 'Standby', 'Settled'] as const).map((status) => {
                  const isActive = statusFilter === status;
                  const count = statusCounts[status];
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setStatusFilter(status)}
                      aria-pressed={isActive}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
                        isActive
                          ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {status} ({count})
                    </button>
                  );
                })}
              </div>

              <div className="relative w-full md:w-80">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search lender, entity, facility type, or linked deal..."
                  aria-label="Search funding sources"
                  className="w-full pl-8 pr-8 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear funding search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {viewMode === 'ledger' ? (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed sm:table-auto text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
                    <th className="w-[42%] sm:w-auto py-3 pl-2.5 pr-1 sm:pl-5 sm:pr-3">Lender / Linked Deal</th>
                    <th className="w-[22%] sm:w-auto py-3 px-1 sm:px-3">Status</th>
                    <th className="hidden sm:table-cell py-3 px-3">Return / Burn</th>
                    <th className="hidden md:table-cell py-3 px-3">Maturity</th>
                    <th className="w-[36%] sm:w-auto py-3 pl-1 pr-2.5 sm:pl-3 sm:pr-5 text-right">Remaining Bal + Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {funding.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 bg-slate-50/50">
                        <p className="text-xs font-semibold text-slate-700">No funding sources registered yet</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Click &quot;Add Capital Source&quot; above to register private lenders, JV syndicate partners, or bank facilities.</p>
                      </td>
                    </tr>
                  ) : enrichedFilteredFunding.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500 bg-slate-50/50 space-y-2">
                        <p className="text-xs font-semibold text-slate-700">No funding sources match your current filter.</p>
                        <button
                          type="button"
                          onClick={() => {
                            setStatusFilter('All');
                            setSearchQuery('');
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer"
                        >
                          Reset Filters
                        </button>
                      </td>
                    </tr>
                  ) : (
                    enrichedFilteredFunding.map((entry) => {
                      const {
                        item,
                        drawn,
                        undrawn,
                        drawnCount,
                        totalTranches,
                        hasTranches,
                        activeDrawnBalance,
                        monthlyInterest,
                        delayCarryingCost,
                        linkedDev,
                        isLinkedDealBlocked,
                        blockedDevApproval,
                      } = entry;
                      const isExpanded = expandedTranchesId === item.id;

                      return (
                        <React.Fragment key={item.id}>
                          <tr className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 pl-2.5 pr-1 sm:py-3 sm:pl-5 sm:pr-3 align-top min-w-0">
                              <div className="font-bold text-slate-900 leading-tight break-words">{item.lenderName}</div>
                              {(item.entityOrContact || item.emailPhone) && (
                                <div className="text-[10px] sm:text-[11px] text-slate-400 truncate mt-0.5">
                                  {item.entityOrContact || item.emailPhone}
                                </div>
                              )}
                              <div className="flex flex-wrap items-center gap-1 mt-1 max-w-full">
                                <span className="px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold bg-slate-100 text-slate-700 truncate max-w-full sm:max-w-none">
                                  {item.linkedDealName || 'General'}
                                </span>
                                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-50 text-slate-600 border border-slate-200">
                                  {item.fundingType}
                                </span>
                                <span className="sm:hidden text-[10px] font-bold text-emerald-700 tabular-nums">
                                  {item.returnRatePercent}% {item.returnTermsType === 'Equity Profit Split' ? 'split' : 'p.a.'}
                                </span>
                              </div>
                              {item.fundingType === 'Phased Own-Cash (Brick-by-Brick)' && (
                                <span className="inline-block mt-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded max-w-full truncate">
                                  SELF-FUNDED (R 0 EXTERNAL DEBT)
                                </span>
                              )}
                              {hasTranches && (
                                <div className="mt-1 space-y-1">
                                  <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded">
                                    <Layers className="w-2.5 h-2.5 shrink-0" />
                                    <span>{drawnCount}/{totalTranches} Tranches</span>
                                  </span>
                                  <div className="hidden sm:block w-36 bg-slate-200 rounded-full h-1.5">
                                    <div
                                      className="bg-emerald-500 h-1.5 rounded-full transition-all"
                                      style={{ width: `${Math.round((drawn / (drawn + undrawn || 1)) * 100)}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                              {linkedDev && (
                                <div className="mt-1">
                                  <span className="inline-flex items-center gap-1 text-[9px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded max-w-full truncate">
                                    {linkedDev.currentPhase} ({linkedDev.units?.length || 0}u)
                                  </span>
                                </div>
                              )}
                              {isLinkedDealBlocked && (
                                <div className="mt-1">
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded">
                                    <AlertTriangle className="w-2.5 h-2.5 shrink-0" />{' '}
                                    {blockedDevApproval ? 'Approval Blocked' : 'Deal Blocked'}
                                  </span>
                                </div>
                              )}
                            </td>

                            <td className="py-2.5 px-1 sm:py-3 sm:px-3 align-top sm:whitespace-nowrap">
                              {renderStatusBadge(item.status)}
                            </td>

                            <td className="hidden sm:table-cell py-3 px-3 align-top">
                              <div className="font-semibold text-slate-800">{item.returnTermsType}</div>
                              <div className="text-[11px] text-emerald-700 font-bold tabular-nums">
                                {item.returnRatePercent}% {item.returnTermsType === 'Equity Profit Split' ? 'profit split' : 'p.a.'}
                              </div>
                              {(item.returnTermsType === 'Fixed Interest' || item.returnTermsType === 'Monthly Coupon') && (
                                <div className="text-[10px] text-slate-500 font-normal mt-0.5 tabular-nums">
                                  {item.status === 'Standby'
                                    ? 'R 0/mo (Undrawn Standby)'
                                    : `${formatZAR(monthlyInterest)}/mo on drawn`}
                                </div>
                              )}
                            </td>

                            <td className="hidden md:table-cell py-3 px-3 align-top text-slate-600">
                              <div>{item.paymentSchedule}</div>
                              <div className="text-[10px] text-slate-400">Due {formatDate(item.maturityDate)}</div>
                              {item.delayExtensionDays && item.delayExtensionDays > 0 ? (
                                <div className="mt-1">
                                  <span
                                    className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded"
                                    title={item.delayNotes}
                                  >
                                    <Clock className="w-2.5 h-2.5" /> +{item.delayExtensionDays}d Extended
                                  </span>
                                  {delayCarryingCost > 0 && (
                                    <div className="text-[9px] text-rose-700 font-semibold mt-0.5 tabular-nums">
                                      +{formatZAR(delayCarryingCost)} delay interest
                                    </div>
                                  )}
                                </div>
                              ) : null}
                            </td>

                            <td className="py-2.5 pl-1 pr-2.5 sm:py-3 sm:pl-3 sm:pr-5 align-top text-right">
                              <div className="font-extrabold text-slate-900 text-[11px] sm:text-sm tabular-nums whitespace-nowrap">
                                {item.status === 'Standby' ? 'R 0 (Undrawn)' : formatZAR(activeDrawnBalance)}
                              </div>
                              <div className="text-[9.5px] sm:text-[10px] text-slate-400 tabular-nums">
                                Repaid: {formatZAR(item.totalRepaidZAR)}
                                <span className="hidden sm:inline">
                                  {item.totalInterestPaidZAR ? ` • Int: ${formatZAR(item.totalInterestPaidZAR)}` : ''}
                                </span>
                              </div>
                              {item.lastPaymentReference && (
                                <div
                                  className="text-[10px] text-slate-500 font-mono truncate max-w-full sm:max-w-[160px] ml-auto mt-0.5"
                                  title={`Last Payment Reference: ${item.lastPaymentReference}`}
                                >
                                  Ref: {item.lastPaymentReference}
                                </div>
                              )}
                              <div className="mt-1.5">{renderFacilityActions(entry, 'ledger')}</div>
                            </td>
                          </tr>

                          {isExpanded && item.tranches && item.tranches.length > 0 && (
                            <tr className="bg-slate-50/90 border-b border-slate-200">
                              <td colSpan={5} className="p-3 sm:p-4">
                                {renderTranchesDrawer(entry)}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 sm:p-5">
              {funding.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-xs font-semibold text-slate-700">No funding sources registered yet</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Click &quot;Add Capital Source&quot; above to register private lenders, JV syndicate partners, or bank facilities.
                  </p>
                </div>
              ) : enrichedFilteredFunding.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 space-y-2">
                  <p className="text-xs font-semibold text-slate-700">No funding sources match your current filter.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter('All');
                      setSearchQuery('');
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {enrichedFilteredFunding.map((entry) => {
                    const {
                      item,
                      drawn,
                      undrawn,
                      drawnCount,
                      totalTranches,
                      hasTranches,
                      activeDrawnBalance,
                      monthlyInterest,
                      delayCarryingCost,
                      linkedDev,
                      isLinkedDealBlocked,
                      blockedDevApproval,
                    } = entry;
                    const isExpanded = expandedTranchesId === item.id;

                    return (
                      <div
                        key={item.id}
                        className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs flex flex-col justify-between gap-3"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold text-slate-900 leading-snug truncate">
                                {item.lenderName}
                              </h4>
                              {(item.entityOrContact || item.emailPhone) && (
                                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                  {item.entityOrContact || item.emailPhone}
                                </p>
                              )}
                            </div>
                            {renderStatusBadge(item.status)}
                          </div>

                          <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-3 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
                                {item.status === 'Standby' ? 'Standby Capacity' : 'Remaining Balance'}
                              </span>
                              <div className="text-lg font-extrabold text-slate-900 tabular-nums leading-tight mt-0.5">
                                {item.status === 'Standby'
                                  ? formatZAR(item.capitalAmountZAR)
                                  : formatZAR(activeDrawnBalance)}
                              </div>
                              <div className="text-[11px] text-slate-500 tabular-nums mt-0.5">
                                Facility {formatZAR(item.capitalAmountZAR)} • Repaid {formatZAR(item.totalRepaidZAR)}
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
                                Return / Burn
                              </span>
                              <div className="text-lg font-extrabold text-emerald-700 tabular-nums leading-tight mt-0.5">
                                {item.returnRatePercent}%
                              </div>
                              <div
                                className={`text-[11px] font-semibold tabular-nums mt-0.5 ${
                                  item.status !== 'Standby' && monthlyInterest > 0
                                    ? 'text-rose-600'
                                    : 'text-slate-500'
                                }`}
                              >
                                {item.returnTermsType === 'Fixed Interest' || item.returnTermsType === 'Monthly Coupon'
                                  ? item.status === 'Standby'
                                    ? 'R 0/mo (Undrawn)'
                                    : `${formatZAR(monthlyInterest)}/mo`
                                  : item.returnTermsType}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                              {item.fundingType}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                              {item.linkedDealName || 'General'}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-600">
                              {item.paymentSchedule} • Due {formatDate(item.maturityDate)}
                            </span>
                            {item.fundingType === 'Phased Own-Cash (Brick-by-Brick)' && (
                              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                SELF-FUNDED
                              </span>
                            )}
                            {linkedDev && (
                              <span className="text-[9px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded">
                                {linkedDev.currentPhase} ({linkedDev.units?.length || 0} Units)
                              </span>
                            )}
                            {isLinkedDealBlocked && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                {blockedDevApproval ? 'Approval Blocked / Queried' : 'Deal Blocked / Disputed'}
                              </span>
                            )}
                            {item.delayExtensionDays && item.delayExtensionDays > 0 ? (
                              <span
                                className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded"
                                title={item.delayNotes}
                              >
                                <Clock className="w-2.5 h-2.5" /> +{item.delayExtensionDays}d Extended
                                {delayCarryingCost > 0 ? ` (+${formatZAR(delayCarryingCost)})` : ''}
                              </span>
                            ) : null}
                            {item.lastPaymentReference && (
                              <span className="font-mono text-slate-500">Ref: {item.lastPaymentReference}</span>
                            )}
                          </div>

                          {hasTranches && (
                            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1.5">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-semibold text-indigo-700 inline-flex items-center gap-1">
                                  <Layers className="w-3 h-3" />
                                  {drawnCount}/{totalTranches} Tranches Drawn ({formatZAR(drawn)})
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setExpandedTranchesId(isExpanded ? null : item.id)}
                                  aria-expanded={isExpanded}
                                  className="text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-0.5 cursor-pointer"
                                >
                                  {isExpanded ? 'Hide Tranches ▲' : 'View Tranches ▼'}
                                </button>
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-1.5">
                                <div
                                  className="bg-emerald-500 h-1.5 rounded-full transition-all"
                                  style={{ width: `${Math.round((drawn / (drawn + undrawn || 1)) * 100)}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {isExpanded && item.tranches && item.tranches.length > 0 && renderTranchesDrawer(entry)}
                        </div>

                        <div className="pt-2.5 border-t border-slate-100">
                          {renderFacilityActions(entry, 'cards')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Add Funding Source Modal */}
      <AddFundingModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => setToastMessage('Capital source registered successfully')}
      />

      {/* Sync Deal Delay Action Modal */}
      {syncModalSource && (
        <div
          onClick={() => setSyncModalSource(null)}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={syncSheetDrag.sheetStyle}
            className="bg-white rounded-t-3xl sm:rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-xl border border-slate-200 max-h-[92vh] sm:max-h-none overflow-y-auto cursor-default"
          >
            <BottomSheetHandle className="-mt-2.5 mb-1.5" {...syncSheetDrag.dragHandleProps} />
            <div
              {...syncSheetDrag.dragHandleProps}
              className="flex items-center justify-between pb-3 border-b border-slate-100 touch-none sm:touch-auto select-none sm:select-auto"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Sync Funding With Deal Delay</h3>
              </div>
              <button
                type="button"
                onClick={() => setSyncModalSource(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-base cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="my-3 p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Lender / Facility:</span>
                <span className="font-bold text-slate-900">{syncModalSource.lenderName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Linked Project:</span>
                <span className="font-semibold text-indigo-700">{syncModalSource.linkedDealName || 'General Portfolio'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Original Maturity:</span>
                <span className="font-medium text-slate-700">
                  {formatDate(syncModalSource.originalMaturityDate || syncModalSource.maturityDate)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Current Maturity:</span>
                <span className="font-bold text-slate-900">{formatDate(syncModalSource.maturityDate)}</span>
              </div>
              {syncModalSource.delayExtensionDays && syncModalSource.delayExtensionDays > 0 ? (
                <div className="flex justify-between text-amber-800 bg-amber-50 px-2 py-0.5 rounded font-medium">
                  <span>Prior Delay Recorded:</span>
                  <span>+{syncModalSource.delayExtensionDays} Days ({syncModalSource.delayNotes})</span>
                </div>
              ) : null}
            </div>

            {/* Quick Delay Presets */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Select Delay Scenario</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { days: 30, label: '+30 Days (1 Month)', reason: 'Contractor finish snagging & initial conveyancing lodgement' },
                    { days: 60, label: '+60 Days (2 Months)', reason: 'Deeds Office queries & examination queue' },
                    { days: 90, label: '+90 Days (3 Months)', reason: 'City of Johannesburg (CoJ) Section 118 billing query / dispute' },
                    { days: 120, label: '+120 Days (4 Months)', reason: 'Severe municipal Section 118 deadlock & escalation' },
                  ].map((preset) => (
                    <button
                      key={preset.days}
                      type="button"
                      onClick={() => {
                        setSelectedDelayDays(preset.days);
                        setDelayReason(preset.reason);
                      }}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                        selectedDelayDays === preset.days
                          ? 'border-indigo-600 bg-indigo-50/80 text-indigo-900 font-semibold shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                      }`}
                    >
                      <div className="font-bold text-xs">{preset.label}</div>
                      <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{preset.reason}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Delay Extension Days</label>
                  <input
                    type="number"
                    min="1"
                    value={selectedDelayDays}
                    onChange={(e) => setSelectedDelayDays(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Linked Deal Delay Source</label>
                  <input
                    type="text"
                    disabled
                    value={syncModalSource.linkedDealName || 'Active Deal'}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Audit Notes / Delay Reason</label>
                <input
                  type="text"
                  value={delayReason}
                  onChange={(e) => setDelayReason(e.target.value)}
                  placeholder="e.g. CoJ Section 118 valuation dispute"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              {/* Financial Impact Live Preview */}
              {(() => {
                const { drawn } = getFundingDrawnAndUndrawn(syncModalSource);
                const activeBalance = Math.max(0, drawn - (syncModalSource.totalRepaidZAR || 0));
                const delayInterest = Math.round(
                  (activeBalance * (syncModalSource.returnRatePercent / 100) / 365) * selectedDelayDays
                );
                const originalDate = new Date(syncModalSource.originalMaturityDate || syncModalSource.maturityDate);
                const priorDelay = syncModalSource.delayExtensionDays || 0;
                const newTotalDelay = priorDelay + selectedDelayDays;
                const newDate = new Date(originalDate);
                newDate.setDate(newDate.getDate() + newTotalDelay);
                const newDateStr = newDate.toISOString().split('T')[0];

                return (
                  <div className="p-3 bg-amber-50/80 border border-amber-200/90 rounded-xl space-y-1.5">
                    <div className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      Financial Impact on Syndicate Loan
                    </div>
                    <div className="text-[11px] text-amber-900 flex justify-between">
                      <span>New Extended Maturity:</span>
                      <strong className="text-slate-900">{formatDate(newDateStr)}</strong>
                    </div>
                    {syncModalSource.returnTermsType !== 'Equity Profit Split' && (
                      <div className="text-[11px] text-amber-900 flex justify-between">
                        <span>Additional Delay Carrying Interest:</span>
                        <strong className="text-rose-700 font-extrabold">+{formatZAR(delayInterest)}</strong>
                      </div>
                    )}
                    <div className="text-[10px] text-amber-800/80 pt-0.5">
                      Accruing at {syncModalSource.returnRatePercent}% p.a. on {formatZAR(activeBalance)} active drawn capital.
                    </div>
                  </div>
                );
              })()}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSyncModalSource(null)}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    syncFundingWithDealDelay(syncModalSource.id, selectedDelayDays, delayReason);
                    setToastMessage(`Funding maturity extended +${selectedDelayDays} days for ${syncModalSource.lenderName}`);
                    setSyncModalSource(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer shadow-xs transition-colors"
                >
                  Confirm Maturity Extension
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Log Repayment Modal (Mobile Bottom Sheet / Desktop Centered Dialog) */}
      {repaymentModalSource && (
        <div
          onClick={() => setRepaymentModalSource(null)}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={repaymentSheetDrag.sheetStyle}
            className="bg-white rounded-t-3xl sm:rounded-xl max-w-md w-full p-5 sm:p-6 shadow-xl border border-slate-200 max-h-[92vh] sm:max-h-none overflow-y-auto cursor-default"
          >
            <BottomSheetHandle className="-mt-2.5 mb-1.5" {...repaymentSheetDrag.dragHandleProps} />
            <div {...repaymentSheetDrag.dragHandleProps} className="touch-none sm:touch-auto select-none sm:select-auto">
              <h3 className="text-base font-bold text-slate-900 mb-2">Log Payment to Lender</h3>
              <p className="text-xs text-slate-500 mb-4">
                Record coupon payment or principal settlement for <strong>{repaymentModalSource.lenderName}</strong>.
              </p>
            </div>

            <form onSubmit={handleProcessRepayment} noValidate className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Payment Amount (ZAR) *</label>
                {repaymentMetrics && (
                  <div
                    className="flex flex-wrap gap-1.5 mb-2"
                    role="group"
                    aria-label="Quick-Fill Payment Amounts"
                  >
                    {[
                      {
                        label: '1m Interest',
                        amount: repaymentMetrics.oneMonthInterest,
                        targetType: 'Monthly Coupon / Interest',
                      },
                      {
                        label: '50% Bal',
                        amount: repaymentMetrics.halfBalance,
                        targetType: 'Principal Repayment',
                      },
                      {
                        label: 'Full Settlement',
                        amount: repaymentMetrics.remainingPrincipal,
                        targetType: 'Full Settlement',
                      },
                    ].map((preset) => {
                      const isDisabled = preset.amount <= 0;
                      const isSelected = !isDisabled && repaymentAmount === preset.amount;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          disabled={isDisabled}
                          aria-pressed={isSelected}
                          onClick={() => {
                            setRepaymentAmount(preset.amount);
                            setPaymentType(preset.targetType);
                          }}
                          className={`px-2.5 py-1 rounded-md border text-[11px] font-semibold inline-flex items-center gap-1 tabular-nums whitespace-nowrap ${
                            isDisabled
                              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                              : isSelected
                              ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800 shadow-2xs cursor-pointer'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 cursor-pointer'
                          }`}
                        >
                          <span>{preset.label}</span>
                          {preset.amount > 0 && (
                            <span className="text-[10px] opacity-80">({formatZAR(preset.amount)})</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">R</span>
                  <input
                    type="number"
                    name="repaymentAmountZAR"
                    autoComplete="off"
                    min="0"
                    step="any"
                    required
                    value={repaymentAmount || ''}
                    onChange={(e) => setRepaymentAmount(Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900 tabular-nums"
                    placeholder="Amount paid"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Payment Type</label>
                  <div
                    className="flex flex-wrap gap-1.5"
                    role="group"
                    aria-label="Payment Type"
                  >
                    {PAYMENT_TYPE_OPTIONS.map((typeOption) => {
                      const isSelected = paymentType === typeOption;
                      return (
                        <button
                          key={typeOption}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => setPaymentType(typeOption)}
                          className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold whitespace-nowrap cursor-pointer ${
                            isSelected
                              ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800 shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {typeOption}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Date</label>
                  <input
                    type="date"
                    name="paymentDate"
                    autoComplete="off"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">
                    Payment Reference / EFT Note <span className="font-normal text-slate-400">(Optional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setPaymentReference(suggestedPaymentReference)}
                    className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                  >
                    Auto-fill suggestion
                  </button>
                </div>
                <input
                  type="text"
                  name="paymentReference"
                  autoComplete="off"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder={`e.g. ${suggestedPaymentReference}`}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs text-slate-900 placeholder:text-slate-400 placeholder:font-sans"
                />
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span>Current Principal Repaid:</span>
                  <strong className="text-slate-800 tabular-nums">{formatZAR(repaymentModalSource.totalRepaidZAR || 0)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Interest / Coupons Serviced:</span>
                  <strong className="text-amber-700 tabular-nums">{formatZAR(repaymentModalSource.totalInterestPaidZAR || 0)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Remaining Principal Liability:</span>
                  <strong className="text-emerald-700 tabular-nums">
                    {formatZAR(repaymentMetrics?.remainingPrincipal ?? 0)}
                  </strong>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 font-medium text-xs">
                  <input
                    type="checkbox"
                    checked={copyReceiptOnSave}
                    onChange={(e) => setCopyReceiptOnSave(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                  />
                  <span>Copy WhatsApp Receipt</span>
                </label>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRepaymentModalSource(null);
                      setPaymentReference('');
                    }}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    Save / Log Payment
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dual Action Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-lg shadow-xl border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
