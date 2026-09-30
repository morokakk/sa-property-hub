'use client';

import React, { useState, useEffect } from 'react';
import TopHeader from '@/components/navigation/TopHeader';
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
} from 'lucide-react';
import { exportFundingCSV } from '@/lib/export/csvExport';
import { formatPaymentStatement } from '@/lib/whatsappFormatter';

export function getFundingDrawnAndUndrawn(f: FundingSource) {
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

  // New Capital Source Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [lenderName, setLenderName] = useState('');
  const [entityOrContact, setEntityOrContact] = useState('');
  const [emailPhone, setEmailPhone] = useState('');
  const [fundingType, setFundingType] = useState<FundingType>('Private Lender');
  const [capitalAmountZAR, setCapitalAmountZAR] = useState<number>(500_000);
  const [disbursementDate, setDisbursementDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [maturityDate, setMaturityDate] = useState<string>(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [returnTermsType, setReturnTermsType] = useState<ReturnTermType>('Fixed Interest');
  const [returnRatePercent, setReturnRatePercent] = useState<number>(14);
  const [paymentSchedule, setPaymentSchedule] = useState<'Monthly Interest' | 'Quarterly' | 'At Exit (Maturity)' | 'Bi-Annual'>('Monthly Interest');
  const [linkedDealId, setLinkedDealId] = useState<string>('');
  const [notes, setNotes] = useState('');

  // Phased Tranches State for New Capital Source
  const [enableTranches, setEnableTranches] = useState(false);
  const [customTranches, setCustomTranches] = useState<Array<Omit<FundingTranche, 'id'> & { id?: string }>>([
    { name: 'Tranche 1: Acquisition & Transfer', amountZAR: 300_000, isDisbursed: true, linkedMilestonePhase: 'Deposit' },
    { name: 'Tranche 2: First Fix & Wet Works', amountZAR: 150_000, isDisbursed: false, linkedMilestonePhase: 'First Fix / Wet Works' },
    { name: 'Tranche 3: Finishes & Snagging', amountZAR: 50_000, isDisbursed: false, linkedMilestonePhase: 'Finishes' },
  ]);

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
  const [copyReceiptOnSave, setCopyReceiptOnSave] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auto-dismiss toast after 3.5 seconds
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const handleAddFunding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lenderName) {
      alert('Please enter a lender or investor name.');
      return;
    }

    const linkedFlip = flips.find((f) => f.id === linkedDealId);

    let finalTranches: FundingTranche[] | undefined = undefined;
    let finalPrincipal = capitalAmountZAR;

    if (enableTranches && customTranches.length > 0) {
      finalTranches = customTranches.map((t, idx) => ({
        id: t.id || `tr-${Date.now()}-${idx + 1}`,
        name: t.name,
        amountZAR: Number(t.amountZAR) || 0,
        isDisbursed: Boolean(t.isDisbursed),
        disbursedDate: t.isDisbursed ? (t.disbursedDate || disbursementDate) : undefined,
        linkedMilestonePhase: t.linkedMilestonePhase,
      }));
      const trTotal = finalTranches.reduce((sum, tr) => sum + tr.amountZAR, 0);
      if (trTotal > 0) {
        finalPrincipal = trTotal;
      }
    }

    const newSource: FundingSource = {
      id: `fund-${Date.now()}`,
      lenderName,
      entityOrContact,
      emailPhone,
      fundingType,
      capitalAmountZAR: finalPrincipal,
      disbursementDate,
      maturityDate,
      originalMaturityDate: maturityDate,
      returnTermsType,
      returnRatePercent,
      paymentSchedule,
      linkedDealId: linkedDealId || undefined,
      linkedDealName: linkedFlip ? linkedFlip.title : 'General Portfolio Liquidity',
      totalRepaidZAR: 0,
      status: 'Active',
      notes,
      tranches: finalTranches,
    };

    addFunding(newSource);
    setShowAddModal(false);
    // Reset Form
    setLenderName('');
    setEntityOrContact('');
    setEmailPhone('');
    setNotes('');
    setEnableTranches(false);
  };

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

    const currentRepaid = repaymentModalSource.totalRepaidZAR || 0;
    const newTotalRepaid = currentRepaid + repaymentAmount;
    const isSettled = newTotalRepaid >= repaymentModalSource.capitalAmountZAR;

    updateFunding(repaymentModalSource.id, {
      totalRepaidZAR: newTotalRepaid,
      status: isSettled ? 'Settled' : repaymentModalSource.status,
    });

    if (copyReceiptOnSave) {
      const returnTermsText = `${repaymentModalSource.returnRatePercent}% ${
        repaymentModalSource.returnTermsType === 'Fixed Interest'
          ? 'p.a. Fixed Interest'
          : repaymentModalSource.returnTermsType === 'Equity Profit Split'
          ? 'Net Profit Split'
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
  };

  const totalFacilityCapacity = funding.reduce((sum, f) => sum + f.capitalAmountZAR, 0);
  const totalCapitalDrawn = funding.reduce((sum, f) => {
    const { drawn } = getFundingDrawnAndUndrawn(f);
    return sum + drawn;
  }, 0);
  const totalUndrawnFacilities = Math.max(0, totalFacilityCapacity - totalCapitalDrawn);
  const totalRepayments = funding.reduce((sum, f) => sum + (f.totalRepaidZAR || 0), 0);
  const totalOutstanding = summary.totalPrivateFundingLiability;
  const totalMonthlyInterestExpense = funding
    .filter((f) => f.status === 'Active' && f.returnTermsType === 'Fixed Interest')
    .reduce((sum, f) => {
      const { drawn } = getFundingDrawnAndUndrawn(f);
      const activeBalance = Math.max(0, drawn - (f.totalRepaidZAR || 0));
      return sum + Math.round((activeBalance * (f.returnRatePercent / 100)) / 12);
    }, 0);

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
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 rounded-2xl p-5 text-white border border-emerald-800/40 shadow-lg">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700/50">
                    Deployable War Chest
                  </span>
                  <span className="text-xs text-slate-400">Cash + Pre-Approved Facility Capacity</span>
                </div>
                <div className="text-2xl font-black text-white mt-1">
                  {formatZAR(summary.totalAvailablePurchasingPower)}
                  <span className="text-xs font-normal text-slate-400 ml-2 font-mono">Total Purchasing Power</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border-t lg:border-t-0 lg:border-l border-slate-800 pt-3 lg:pt-0 lg:pl-6">
              <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60">
                <span className="text-[11px] text-slate-400 block">Liquid Cash Reserve</span>
                <span className="text-base font-bold text-emerald-300 block mt-0.5">
                  {formatZAR(summary.liquidCapitalReserve)}
                </span>
                <span className="text-[10px] text-slate-400 block">Includes exit proceeds</span>
              </div>
              <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60">
                <span className="text-[11px] text-slate-400 block">Unallocated Facilities</span>
                <span className="text-base font-bold text-indigo-300 block mt-0.5">
                  {formatZAR(summary.unallocatedFundingReserve)}
                </span>
                <span className="text-[10px] text-slate-400 block">General liquidity lines</span>
              </div>
              <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60 col-span-2 sm:col-span-1">
                <span className="text-[11px] text-slate-400 block">Realized Flip Gains</span>
                <span className="text-base font-bold text-amber-300 block mt-0.5">
                  {formatZAR(summary.totalRealizedFlipProfits)}
                </span>
                <span className="text-[10px] text-slate-400 block">From {summary.completedFlipsCount} exits</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top KPI Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Drawn Capital vs Capacity</span>
            <div className="text-xl font-bold text-slate-900 mt-1">{formatZAR(totalCapitalDrawn)}</div>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
              Of {formatZAR(totalFacilityCapacity)} facility capacity ({formatZAR(totalUndrawnFacilities)} undrawn)
            </p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Monthly Interest Expense</span>
            <div className="text-xl font-bold text-rose-600 mt-1">
              {formatZAR(totalMonthlyInterestExpense)}
              <span className="text-xs font-normal text-slate-400">/mo</span>
            </div>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Accrues strictly on drawn tranches</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Outstanding Liability</span>
            <div className="text-xl font-bold text-slate-900 mt-1">{formatZAR(totalOutstanding)}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Excluding mortgage bonds</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Returns Repaid</span>
            <div className="text-xl font-bold text-emerald-600 mt-1">{formatZAR(totalRepayments)}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Interest & capital returned</p>
          </div>
        </div>

        {/* Funding Sources Table & Cards */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Capital Ledger & Terms</h3>
              <p className="text-xs text-slate-500">
                Track returns, phased tranches, deal delay sync, and maturity dates.
              </p>
            </div>
            <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
              {funding.filter((f) => f.status === 'Active').length} Active Facilities
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
                    const monthlyInterest = item.returnTermsType === 'Fixed Interest'
                      ? Math.round((activeDrawnBalance * (item.returnRatePercent / 100)) / 12)
                      : 0;
                    const delayCarryingCost =
                      item.delayExtensionDays && item.delayExtensionDays > 0 && item.returnTermsType === 'Fixed Interest'
                        ? Math.round(((activeDrawnBalance * (item.returnRatePercent / 100)) / 365) * item.delayExtensionDays)
                        : 0;

                    const linkedFlip = flips.find((f) => f.id === item.linkedDealId);
                    const isLinkedFlipDelayed =
                      linkedFlip &&
                      (linkedFlip.status === 'Delayed' ||
                        linkedFlip.municipalClearance?.rccStatus === 'Disputed' ||
                        Boolean(linkedFlip.municipalClearance?.disputeNotes));
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
                        ) : (
                          <div className="text-[10px] text-slate-400">Lump Sum Facility</div>
                        )}
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-800">
                          {item.returnTermsType}
                        </div>
                        <div className="text-[11px] text-emerald-700 font-bold">
                          {item.returnRatePercent}% {item.returnTermsType === 'Fixed Interest' ? 'p.a.' : 'profit split'}
                        </div>
                        {item.returnTermsType === 'Fixed Interest' && (
                          <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                            {formatZAR(monthlyInterest)}/mo on drawn
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
                              <AlertTriangle className="w-2.5 h-2.5" /> Flip Blocked / Disputed
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-800">{formatZAR(balance)}</div>
                        <div className="text-[10px] text-slate-400">Repaid: {formatZAR(item.totalRepaidZAR)}</div>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === 'Active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'Settled'
                              ? 'bg-slate-200 text-slate-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="p-3.5 pr-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setRepaymentModalSource(item);
                              setRepaymentAmount(0);
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
                          {item.linkedDealId && (
                          <button
                            onClick={() => {
                              setSyncModalSource(item);
                              setSelectedDelayDays(30);
                              setDelayReason(
                                linkedFlip?.municipalClearance?.rccStatus === 'Disputed'
                                  ? `Section 118 municipal rates dispute: ${linkedFlip.title}`
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

      {/* Add Funding Source Modal (Mobile Bottom Sheet / Desktop Centered Dialog) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-3xl sm:rounded-xl max-w-xl w-full p-5 sm:p-6 shadow-xl border border-slate-200 max-h-[92vh] sm:max-h-none overflow-y-auto">
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" />
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Coins className="w-5 h-5 text-emerald-600" />
              Add Financing / Capital Source
            </h3>

            <form onSubmit={handleAddFunding} noValidate className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Lender / Investor Name *</label>
                  <input
                    type="text"
                    name="lenderName"
                    autoComplete="organization"
                    required
                    placeholder="e.g. Johan Meyer"
                    value={lenderName}
                    onChange={(e) => setLenderName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Entity / Trust (Optional)</label>
                  <input
                    type="text"
                    name="contactPerson"
                    autoComplete="name"
                    placeholder="e.g. Meyer Family Trust"
                    value={entityOrContact}
                    onChange={(e) => setEntityOrContact(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Funding Category</label>
                  <select
                    value={fundingType}
                    onChange={(e) => setFundingType(e.target.value as FundingType)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Private Lender">Private Lender (Angel / HNW)</option>
                    <option value="Proposal-backed">Proposal-backed (Syndicate / JV)</option>
                    <option value="Ad-hoc Friends & Family">Ad-hoc Friends & Family</option>
                    <option value="Equity Partner">Equity Partner</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Principal Amount (ZAR)</label>
                  <input
                    type="number"
                    name="capitalAmountZAR"
                    autoComplete="off"
                    min="0"
                    step="any"
                    value={capitalAmountZAR}
                    onChange={(e) => setCapitalAmountZAR(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Return Structure</label>
                  <select
                    value={returnTermsType}
                    onChange={(e) => setReturnTermsType(e.target.value as ReturnTermType)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Fixed Interest">Fixed Interest (% per annum)</option>
                    <option value="Equity Profit Split">Equity Profit Split (% of Net Flip)</option>
                    <option value="Monthly Coupon">Monthly Coupon</option>
                    <option value="Bullet Repayment">Bullet Repayment</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Rate / Split (%)</label>
                  <input
                    type="number"
                    name="returnRatePercent"
                    autoComplete="off"
                    min="0"
                    step="any"
                    value={returnRatePercent}
                    onChange={(e) => setReturnRatePercent(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Schedule</label>
                  <select
                    value={paymentSchedule}
                    onChange={(e) => setPaymentSchedule(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Monthly Interest">Monthly Interest</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="At Exit (Maturity)">At Exit (Maturity / Sale)</option>
                    <option value="Bi-Annual">Bi-Annual</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Link to Active Flip</label>
                  <select
                    value={linkedDealId}
                    onChange={(e) => setLinkedDealId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">-- General Operational Reserve --</option>
                    {flips.map((flip) => (
                      <option key={flip.id} value={flip.id}>
                        {flip.title} ({flip.city})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Disbursement Date</label>
                  <input
                    type="date"
                    name="disbursementDate"
                    autoComplete="off"
                    value={disbursementDate}
                    onChange={(e) => setDisbursementDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Maturity / Due Date</label>
                  <input
                    type="date"
                    name="maturityDate"
                    autoComplete="off"
                    value={maturityDate}
                    onChange={(e) => setMaturityDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contact Email / Phone / Notes</label>
                <input
                  type="text"
                  name="fundingNotes"
                  autoComplete="off"
                  placeholder="e.g. +27 82 123 4567 • Security: 2nd Mortgage Bond"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              {/* Phased Milestone Tranches Toggle & Configuration */}
              <div className="border-t border-slate-200 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none font-semibold text-slate-800">
                    <input
                      type="checkbox"
                      checked={enableTranches}
                      onChange={(e) => setEnableTranches(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                    />
                    <span>Configure Phased Milestone Tranches</span>
                  </label>
                  {enableTranches && (
                    <button
                      type="button"
                      onClick={() =>
                        setCustomTranches([
                          ...customTranches,
                          {
                            name: `Tranche ${customTranches.length + 1}`,
                            amountZAR: 100_000,
                            isDisbursed: false,
                            linkedMilestonePhase: 'Finishes',
                          },
                        ])
                      }
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                    >
                      + Add Tranche
                    </button>
                  )}
                </div>

                {enableTranches && (
                  <div className="space-y-2.5 mt-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <p className="text-[11px] text-slate-500">
                      Private lender interest only begins accruing on tranches marked as <strong>Disbursed</strong>.
                    </p>
                    {customTranches.map((tr, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs"
                      >
                        <div className="sm:col-span-5">
                          <label className="text-[10px] text-slate-400 block mb-0.5">Tranche Label</label>
                          <input
                            type="text"
                            placeholder="e.g. Tranche 1: Deposit"
                            value={tr.name}
                            onChange={(e) => {
                              const updated = [...customTranches];
                              updated[idx].name = e.target.value;
                              setCustomTranches(updated);
                            }}
                            className="w-full px-2 py-1 border border-slate-200 rounded text-xs font-medium"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <label className="text-[10px] text-slate-400 block mb-0.5">Amount (ZAR)</label>
                          <input
                            type="number"
                            min="0"
                            placeholder="Amount"
                            value={tr.amountZAR}
                            onChange={(e) => {
                              const updated = [...customTranches];
                              updated[idx].amountZAR = Number(e.target.value);
                              setCustomTranches(updated);
                            }}
                            className="w-full px-2 py-1 border border-slate-200 rounded text-xs font-bold"
                          />
                        </div>
                        <div className="sm:col-span-3 flex items-center pt-3.5 sm:pt-0">
                          <label className="flex items-center gap-1.5 text-[11px] text-slate-700 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={tr.isDisbursed}
                              onChange={(e) => {
                                const updated = [...customTranches];
                                updated[idx].isDisbursed = e.target.checked;
                                setCustomTranches(updated);
                              }}
                              className="w-3.5 h-3.5 accent-emerald-600 rounded"
                            />
                            <span>Drawn Day 1</span>
                          </label>
                        </div>
                        <div className="sm:col-span-1 text-right">
                          {customTranches.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setCustomTranches(customTranches.filter((_, i) => i !== idx))}
                              className="text-slate-400 hover:text-rose-600 text-xs p-1"
                              title="Delete Tranche"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="text-[11px] text-slate-600 pt-1 flex justify-between font-semibold">
                      <span>Total Phased Facility:</span>
                      <span className="text-emerald-700 font-bold">
                        {formatZAR(customTranches.reduce((s, t) => s + (Number(t.amountZAR) || 0), 0))}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-xs cursor-pointer"
                >
                  Save Capital Source
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                className="text-slate-400 hover:text-slate-600 font-bold text-base cursor-pointer"
              >
                ✕
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
                    value={syncModalSource.linkedDealName || 'Active Flip Deal'}
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
                    {syncModalSource.returnTermsType === 'Fixed Interest' && (
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

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span>Current Total Repaid:</span>
                  <strong className="text-slate-800">{formatZAR(repaymentModalSource.totalRepaidZAR)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Remaining Principal:</span>
                  <strong className="text-emerald-700">
                    {formatZAR(Math.max(0, repaymentModalSource.capitalAmountZAR - repaymentModalSource.totalRepaidZAR))}
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
                    onClick={() => setRepaymentModalSource(null)}
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
