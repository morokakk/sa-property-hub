'use client';

import React, { useState, useEffect } from 'react';
import TopHeader from '@/components/navigation/TopHeader';
import AddFundingModal from '@/components/funding/AddFundingModal';
import { usePortfolioStore, usePortfolioSummary } from '@/lib/store/usePortfolioStore';
import { formatZAR, formatPercent, formatDate } from '@/lib/formatters';
import { FundingSource, FundingTranche, FundingType, ReturnTermType } from '@/types';
import {
  Coins,
  PlusCircle,
  Users,
  Calendar,
  Percent,
  CreditCard,
  ShieldCheck,
  Building,
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
} from 'lucide-react';
import { exportFundingCSV } from '@/lib/export/csvExport';
import { formatPaymentStatement } from '@/lib/whatsappFormatter';

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
  const rentals = usePortfolioStore((state) => state.rentals);

  // New Capital Source Form State
  const [showAddModal, setShowAddModal] = useState(false);

  // Deal Delay Sync Modal State
  const [syncModalSource, setSyncModalSource] = useState<FundingSource | null>(null);
  const [selectedDelayDays, setSelectedDelayDays] = useState<number>(30);
  const [delayReason, setDelayReason] = useState<string>('Contractor Snagging & Conveyancing Lodgement');

  // Tranche expansion state in ledger table
  const [expandedTranchesId, setExpandedTranchesId] = useState<string | null>(null);

  // Repayment Quick Action Modal State
  const [repaymentModalSource, setRepaymentModalSource] = useState<FundingSource | null>(null);
  const [repaymentAmount, setRepaymentAmount] = useState<number>(0);
  const [paymentType, setPaymentType] = useState<string>('Monthly Coupon / Interest');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [copyReceiptOnSave, setCopyReceiptOnSave] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auto-dismiss toast after 3.5 seconds
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

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
    setToastMessage('Tranche disbursement status updated');
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
              <PlusCircle className="w-3.5 h-3.5" />
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
              {formatZAR(totalMonthlyInterestExpense)}
              <span className="text-xs font-normal text-slate-400">/mo</span>
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
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Capital Ledger & Terms</h3>
              <p className="text-xs text-slate-500">
                Track returns, phased tranches, deal delay sync, and maturity dates.
              </p>
            </div>
            <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
              {funding.filter((f) => f.status === 'Active').length} Active • {funding.filter((f) => f.status === 'Standby').length} Standby
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
                  <th className="p-3.5 pl-5">Lender / Partner</th>
                  <th className="p-3.5">Funding Type</th>
                  <th className="p-3.5">Facility / Tranches</th>
                  <th className="p-3.5">Return Terms</th>
                  <th className="p-3.5">Schedule & Maturity</th>
                  <th className="p-3.5">Linked Asset</th>
                  <th className="p-3.5">Repaid / Bal</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {funding.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 bg-slate-50/50">
                      <p className="text-xs font-semibold text-slate-700">No funding sources registered yet</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Click &quot;Add Capital Source&quot; above to register private lenders, JV syndicate partners, or bank facilities.</p>
                    </td>
                  </tr>
                ) : (
                  funding.map((item) => {
                    const { drawn, undrawn, drawnCount, totalTranches, hasTranches } = getFundingDrawnAndUndrawn(item);
                    const balance = Math.max(0, item.capitalAmountZAR - (item.totalRepaidZAR || 0));
                    const activeDrawnBalance = Math.max(0, drawn - (item.totalRepaidZAR || 0));
                    const monthlyInterest =
                      item.returnTermsType === 'Fixed Interest' || item.returnTermsType === 'Monthly Coupon'
                        ? Math.round((activeDrawnBalance * (item.returnRatePercent / 100)) / 12)
                        : 0;
                    const delayCarryingCost =
                      item.delayExtensionDays && item.delayExtensionDays > 0 && item.returnTermsType !== 'Equity Profit Split'
                        ? Math.round(((activeDrawnBalance * (item.returnRatePercent / 100)) / 365) * item.delayExtensionDays)
                        : 0;

                    const linkedDeal = flips.find((f) => f.id === item.linkedDealId) || rentals.find((r) => r.id === item.linkedDealId);
                    const isLinkedFlipDelayed =
                      linkedDeal &&
                      ('municipalClearance' in linkedDeal ? 
                        (linkedDeal.status === 'Delayed' ||
                          linkedDeal.municipalClearance?.rccStatus === 'Disputed' ||
                          Boolean(linkedDeal.municipalClearance?.disputeNotes)) : false);
                    const isExpanded = expandedTranchesId === item.id;

                  return (
                    <React.Fragment key={item.id}>
                    <tr className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 pl-5">
                        <div className="font-bold text-slate-900">{item.lenderName}</div>
                        <div className="text-[11px] text-slate-400">{item.entityOrContact || item.emailPhone}</div>
                        {hasTranches && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded mt-1">
                            <Layers className="w-2.5 h-2.5" /> {drawnCount}/{totalTranches} Tranches Drawn
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-800">
                          {item.fundingType}
                        </span>
                        {item.fundingType === 'Phased Own-Cash (Brick-by-Brick)' && (
                          <span className="block mt-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded w-fit">
                            🧱 SELF-FUNDED (R 0 EXTERNAL DEBT)
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{formatZAR(item.capitalAmountZAR)}</div>
                        {hasTranches ? (
                          <div className="mt-0.5 space-y-0.5">
                            <div className="text-[11px] text-emerald-700 font-semibold">
                              Drawn: {formatZAR(drawn)} / {formatZAR(drawn + undrawn)}
                            </div>
                            {undrawn > 0 && (
                              <div className="text-[10px] text-slate-400">
                                Undrawn: {formatZAR(undrawn)}
                              </div>
                            )}
                            <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1">
                              <div
                                className="bg-emerald-500 h-1.5 rounded-full transition-all"
                                style={{ width: `${Math.round((drawn / (drawn + undrawn || 1)) * 100)}%` }}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => setExpandedTranchesId(isExpanded ? null : item.id)}
                              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-0.5 pt-0.5 cursor-pointer"
                            >
                              {isExpanded ? 'Hide Tranches ▲' : 'View Tranches ▼'}
                            </button>
                          </div>
                        ) : item.status === 'Standby' ? (
                          <div className="mt-0.5 space-y-0.5">
                            <div className="text-[11px] text-amber-700 font-semibold">
                              Undrawn: {formatZAR(undrawn)}
                            </div>
                            <div className="text-[10px] text-slate-400">Pre-approved standby capacity</div>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400">Lump Sum Facility</div>
                        )}
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-800">
                          {item.returnTermsType}
                        </div>
                        <div className="text-[11px] text-emerald-700 font-bold">
                          {item.returnRatePercent}% {item.returnTermsType === 'Equity Profit Split' ? 'profit split' : 'p.a.'}
                        </div>
                        {(item.returnTermsType === 'Fixed Interest' || item.returnTermsType === 'Monthly Coupon') && (
                          <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                            {item.status === 'Standby'
                              ? 'R 0/mo (Undrawn Standby)'
                              : `${formatZAR(monthlyInterest)}/mo on drawn`}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-600">
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
                              <div className="text-[9px] text-rose-700 font-semibold mt-0.5">
                                +{formatZAR(delayCarryingCost)} delay interest
                              </div>
                            )}
                          </div>
                        ) : null}
                      </td>
                      <td className="p-3.5">
                        <span className="text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          {item.linkedDealName || 'General'}
                        </span>
                        {isLinkedFlipDelayed && (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded">
                              <AlertTriangle className="w-2.5 h-2.5" /> Deal Blocked / Disputed
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-800">
                          {item.status === 'Standby' ? 'R 0 (Undrawn)' : formatZAR(activeDrawnBalance)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Repaid: {formatZAR(item.totalRepaidZAR)}
                          {item.totalInterestPaidZAR ? ` • Interest: ${formatZAR(item.totalInterestPaidZAR)}` : ''}
                        </div>
                        {item.lastPaymentReference && (
                          <div
                            className="text-[10px] text-slate-500 font-mono truncate max-w-[150px] mt-0.5"
                            title={`Last Payment Reference: ${item.lastPaymentReference}`}
                          >
                            Ref: {item.lastPaymentReference}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === 'Active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'Standby'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : item.status === 'Settled'
                              ? 'bg-slate-200 text-slate-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.status === 'Standby' ? 'Standby Facility (Undrawn War Chest)' : item.status}
                        </span>
                      </td>
                      <td className="p-3.5 pr-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.status === 'Standby' ? (
                            <button
                              onClick={() => {
                                updateFunding(item.id, { status: 'Active' });
                                setToastMessage(`Facility "${item.lenderName}" activated`);
                              }}
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                              title="Activate and draw standby credit line"
                            >
                              Activate
                            </button>
                          ) : (
                            <button
                              onClick={() => {
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
                              }}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                            >
                              Log Payment
                            </button>
                          )}
                          {item.linkedDealId && (
                          <button
                            onClick={() => {
                              setSyncModalSource(item);
                              setSelectedDelayDays(30);
                              setDelayReason(
                                linkedDeal && 'municipalClearance' in linkedDeal && linkedDeal.municipalClearance?.rccStatus === 'Disputed'
                                  ? `Section 118 municipal rates dispute: ${linkedDeal.title}`
                                  : 'Contractor snagging & conveyancing queue'
                              );
                            }}
                            className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-[11px] font-semibold transition-colors cursor-pointer inline-flex items-center gap-1"
                            title="Sync maturity date with deal delay"
                          >
                            <Clock className="w-3 h-3" />
                            <span>Sync Delay</span>
                          </button>
                          )}
                          <button
                            onClick={() => {
                              if (confirm(`Delete funding source "${item.lenderName}"?`)) {
                                deleteFunding(item.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Tranches Drawer */}
                    {isExpanded && item.tranches && item.tranches.length > 0 && (
                      <tr className="bg-slate-50/90 border-b border-slate-200">
                        <td colSpan={9} className="p-4 pl-6 sm:pl-8">
                          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-100">
                              <div className="flex items-center gap-2">
                                <Layers className="w-4 h-4 text-indigo-600" />
                                <span className="font-bold text-slate-900 text-xs">
                                  Milestone Tranches: {item.lenderName}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-500">
                                Interest accrues only on disbursed tranches ({formatZAR(drawn)} of {formatZAR(item.capitalAmountZAR)})
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                              {item.tranches.map((tr) => (
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
                                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                                          tr.isDisbursed
                                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                            : 'bg-slate-200 text-slate-700 border-slate-300'
                                        }`}
                                      >
                                        {tr.isDisbursed ? 'Disbursed' : 'Undrawn'}
                                      </span>
                                    </div>
                                    <div className="text-base font-extrabold text-slate-900 mt-1">
                                      {formatZAR(tr.amountZAR)}
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-1">
                                      Milestone Phase: <strong className="text-slate-800">{tr.linkedMilestonePhase || 'Deposit'}</strong>
                                    </div>
                                    {tr.disbursedDate && (
                                      <div className="text-[10px] text-slate-400 mt-0.5">
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
                              ))}
                            </div>
                          </div>
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-xl border border-slate-200 max-h-[92vh] sm:max-h-none overflow-y-auto">
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" />
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-3xl sm:rounded-xl max-w-md w-full p-5 sm:p-6 shadow-xl border border-slate-200 max-h-[92vh] sm:max-h-none overflow-y-auto">
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" />
            <h3 className="text-base font-bold text-slate-900 mb-2">Log Payment to Lender</h3>
            <p className="text-xs text-slate-500 mb-4">
              Record coupon payment or principal settlement for <strong>{repaymentModalSource.lenderName}</strong>.
            </p>

            <form onSubmit={handleProcessRepayment} noValidate className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Amount (ZAR) *</label>
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
                    className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900"
                    placeholder="Amount paid"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Type</label>
                  <select
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Monthly Coupon / Interest">Monthly Coupon / Interest</option>
                    <option value="Principal Repayment">Principal Repayment</option>
                    <option value="Partial Return">Partial Return</option>
                    <option value="Full Settlement">Full Settlement</option>
                    <option value="Profit Share Distribution">Profit Share Distribution</option>
                  </select>
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
                  <strong className="text-slate-800">{formatZAR(repaymentModalSource.totalRepaidZAR || 0)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Interest / Coupons Serviced:</span>
                  <strong className="text-amber-700">{formatZAR(repaymentModalSource.totalInterestPaidZAR || 0)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Remaining Principal Liability:</span>
                  <strong className="text-emerald-700">
                    {(() => {
                      const { drawn } = getFundingDrawnAndUndrawn(repaymentModalSource);
                      const targetPrincipal = (repaymentModalSource.tranches && repaymentModalSource.tranches.length > 0) ? drawn : repaymentModalSource.capitalAmountZAR;
                      return formatZAR(Math.max(0, targetPrincipal - (repaymentModalSource.totalRepaidZAR || 0)));
                    })()}
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
