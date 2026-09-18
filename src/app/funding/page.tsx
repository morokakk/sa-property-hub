'use client';

import React, { useState } from 'react';
import TopHeader from '@/components/navigation/TopHeader';
import { usePortfolioStore, usePortfolioSummary } from '@/lib/store/usePortfolioStore';
import { formatZAR, formatPercent, formatDate } from '@/lib/formatters';
import { FundingSource, FundingType, ReturnTermType } from '@/types';
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
  Clock,
  Wallet,
  Trash2,
  FileSpreadsheet,
} from 'lucide-react';
import { exportFundingCSV } from '@/lib/export/csvExport';

export default function FundingTrackerPage() {
  const funding = usePortfolioStore((state) => state.funding);
  const addFunding = usePortfolioStore((state) => state.addFunding);
  const updateFunding = usePortfolioStore((state) => state.updateFunding);
  const deleteFunding = usePortfolioStore((state) => state.deleteFunding);
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

  // Repayment Quick Action Modal
  const [repaymentModalSource, setRepaymentModalSource] = useState<FundingSource | null>(null);
  const [repaymentAmount, setRepaymentAmount] = useState<number>(0);

  const handleAddFunding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lenderName) {
      alert('Please enter a lender or investor name.');
      return;
    }

    const linkedFlip = flips.find((f) => f.id === linkedDealId);

    const newSource: FundingSource = {
      id: `fund-${Date.now()}`,
      lenderName,
      entityOrContact,
      emailPhone,
      fundingType,
      capitalAmountZAR,
      disbursementDate,
      maturityDate,
      returnTermsType,
      returnRatePercent,
      paymentSchedule,
      linkedDealId: linkedDealId || undefined,
      linkedDealName: linkedFlip ? linkedFlip.title : 'General Portfolio Liquidity',
      totalRepaidZAR: 0,
      status: 'Active',
      notes,
    };

    addFunding(newSource);
    setShowAddModal(false);
    // Reset Form
    setLenderName('');
    setEntityOrContact('');
    setEmailPhone('');
    setNotes('');
  };

  const handleProcessRepayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repaymentModalSource || repaymentAmount <= 0) return;

    const currentRepaid = repaymentModalSource.totalRepaidZAR || 0;
    const newTotalRepaid = currentRepaid + repaymentAmount;
    const isSettled = newTotalRepaid >= repaymentModalSource.capitalAmountZAR;

    updateFunding(repaymentModalSource.id, {
      totalRepaidZAR: newTotalRepaid,
      status: isSettled ? 'Settled' : repaymentModalSource.status,
    });

    setRepaymentModalSource(null);
    setRepaymentAmount(0);
  };

  const totalCapitalDrawn = funding.reduce((sum, f) => sum + f.capitalAmountZAR, 0);
  const totalRepayments = funding.reduce((sum, f) => sum + (f.totalRepaidZAR || 0), 0);
  const totalOutstanding = summary.totalPrivateFundingLiability;

  return (
    <div className="flex-1 flex flex-col">
      <TopHeader
        title="Funding & Capital Tracker"
        subtitle="Centralized ledger managing private debt, syndicate equity splits, and loan repayments"
        actionButton={
          <div className="flex items-center gap-2">
            {funding.length > 0 && (
              <button
                onClick={() => exportFundingCSV(funding)}
                title="Download funding ledger as CSV"
                className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold px-3 py-2 rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export CSV</span>
              </button>
            )}
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
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
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Capital Raised</span>
            <div className="text-xl font-bold text-slate-900 mt-1">{formatZAR(totalCapitalDrawn)}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">{funding.length} facility agreements</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Outstanding Liability</span>
            <div className="text-xl font-bold text-rose-600 mt-1">{formatZAR(totalOutstanding)}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Excluding mortgage bonds</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Returns Repaid</span>
            <div className="text-xl font-bold text-emerald-600 mt-1">{formatZAR(totalRepayments)}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Interest & capital returned</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Bank Bonds Gearing</span>
            <div className="text-xl font-bold text-slate-900 mt-1">{formatZAR(summary.totalBondLiabilities)}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Secured over rental assets</p>
          </div>
        </div>

        {/* Funding Sources Table & Cards */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Capital Ledger & Terms</h3>
              <p className="text-xs text-slate-500">
                Track returns, maturity dates, and linked assets.
              </p>
            </div>
            <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
              {funding.filter((f) => f.status === 'Active').length} Active Tranches
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
                  <th className="p-3.5 pl-5">Lender / Partner</th>
                  <th className="p-3.5">Funding Type</th>
                  <th className="p-3.5">Principal (ZAR)</th>
                  <th className="p-3.5">Return Terms</th>
                  <th className="p-3.5">Schedule</th>
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
                    const balance = Math.max(0, item.capitalAmountZAR - item.totalRepaidZAR);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 pl-5">
                        <div className="font-bold text-slate-900">{item.lenderName}</div>
                        <div className="text-[11px] text-slate-400">{item.entityOrContact || item.emailPhone}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-800">
                          {item.fundingType}
                        </span>
                      </td>
                      <td className="p-3.5 font-bold text-slate-900">{formatZAR(item.capitalAmountZAR)}</td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-800">
                          {item.returnTermsType}
                        </div>
                        <div className="text-[11px] text-emerald-700 font-bold">
                          {item.returnRatePercent}% {item.returnTermsType === 'Fixed Interest' ? 'p.a.' : 'profit split'}
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-600">
                        <div>{item.paymentSchedule}</div>
                        <div className="text-[10px] text-slate-400">Due {formatDate(item.maturityDate)}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="text-[11px] font-medium text-slate-700 bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded">
                          {item.linkedDealName || 'General'}
                        </span>
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
                            }}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[11px] font-semibold transition-colors"
                          >
                            Log Payment
                          </button>
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
                  );
                })
              )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add Funding Source Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Coins className="w-5 h-5 text-emerald-600" />
              Add Financing / Capital Source
            </h3>

            <form onSubmit={handleAddFunding} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Lender / Investor Name *</label>
                  <input
                    type="text"
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
                    placeholder="e.g. Meyer Family Trust"
                    value={entityOrContact}
                    onChange={(e) => setEntityOrContact(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                    min="10000"
                    step="10000"
                    value={capitalAmountZAR}
                    onChange={(e) => setCapitalAmountZAR(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                    step="0.5"
                    value={returnRatePercent}
                    onChange={(e) => setReturnRatePercent(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Disbursement Date</label>
                  <input
                    type="date"
                    value={disbursementDate}
                    onChange={(e) => setDisbursementDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Maturity / Due Date</label>
                  <input
                    type="date"
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
                  placeholder="e.g. +27 82 123 4567 • Security: 2nd Mortgage Bond"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold"
                >
                  Save Capital Source
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Repayment Modal */}
      {repaymentModalSource && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-2">Log Payment to Lender</h3>
            <p className="text-xs text-slate-500 mb-4">
              Record coupon payment or principal settlement for <strong>{repaymentModalSource.lenderName}</strong>.
            </p>

            <form onSubmit={handleProcessRepayment} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Amount (ZAR)</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">R</span>
                  <input
                    type="number"
                    min="100"
                    step="100"
                    required
                    value={repaymentAmount || ''}
                    onChange={(e) => setRepaymentAmount(Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900"
                    placeholder="Amount paid"
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

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRepaymentModalSource(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
