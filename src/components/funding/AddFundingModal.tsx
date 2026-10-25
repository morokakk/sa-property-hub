'use client';

import React, { useState, useEffect } from 'react';
import { Coins, X } from 'lucide-react';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';
import { formatZAR } from '@/lib/formatters';
import { FundingSource, FundingTranche, FundingType, ReturnTermType } from '@/types';

export interface AddFundingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialValues?: Partial<FundingSource>;
  onSuccess?: (createdFunding: FundingSource) => void;
}

export default function AddFundingModal({
  isOpen,
  onClose,
  initialValues,
  onSuccess,
}: AddFundingModalProps) {
  const flips = usePortfolioStore((s) => s.flips);
  const rentals = usePortfolioStore((s) => s.rentals);
  const opportunities = usePortfolioStore((s) => s.opportunities);
  const addFunding = usePortfolioStore((s) => s.addFunding);

  const [lenderName, setLenderName] = useState('');
  const [entityOrContact, setEntityOrContact] = useState('');
  const [emailPhone, setEmailPhone] = useState('');
  const [fundingType, setFundingType] = useState<FundingType>('Private Lender');
  const [facilityStatus, setFacilityStatus] = useState<'Active' | 'Standby'>('Active');
  const [capitalAmountZAR, setCapitalAmountZAR] = useState<number>(500_000);
  const [returnTermsType, setReturnTermsType] = useState<ReturnTermType>('Fixed Interest');
  const [returnRatePercent, setReturnRatePercent] = useState<number>(14);
  const [paymentSchedule, setPaymentSchedule] = useState<'Monthly Interest' | 'Quarterly' | 'At Exit (Maturity)' | 'Bi-Annual'>('Monthly Interest');
  const [linkedDealId, setLinkedDealId] = useState('');
  const [disbursementDate, setDisbursementDate] = useState(new Date().toISOString().split('T')[0]);
  const [maturityDate, setMaturityDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('');
  const [enableTranches, setEnableTranches] = useState(false);
  const [customTranches, setCustomTranches] = useState<FundingTranche[]>([
    { id: 'tr-1', name: 'Tranche 1: Deposit', amountZAR: 250_000, isDisbursed: true, linkedMilestonePhase: 'Deposit' },
    { id: 'tr-2', name: 'Tranche 2: Renovation', amountZAR: 250_000, isDisbursed: false, linkedMilestonePhase: 'Finishes' },
  ]);

  // Synchronize state whenever modal opens or initialValues change
  useEffect(() => {
    if (!isOpen) return;

    const defLender = initialValues?.lenderName || '';
    const defEntity = initialValues?.entityOrContact || initialValues?.contactPerson || '';
    const defEmailPhone = initialValues?.emailPhone || '';
    const defFundingType = initialValues?.fundingType || 'Private Lender';
    const defStatus = (initialValues?.status as 'Active' | 'Standby') || 'Active';
    const defAmount = initialValues?.capitalAmountZAR ?? 500_000;
    const defReturnType: ReturnTermType = initialValues?.returnTermsType || 'Fixed Interest';
    const defReturnRate = initialValues?.returnRatePercent ?? (defReturnType === 'Equity Profit Split' ? 50 : 14);

    let defSchedule = initialValues?.paymentSchedule;
    if (!defSchedule) {
      if (defReturnType === 'Equity Profit Split' || defReturnType === 'Bullet Repayment') {
        defSchedule = 'At Exit (Maturity)';
      } else {
        defSchedule = 'Monthly Interest';
      }
    }

    const defLinkedDeal = initialValues?.linkedDealId || '';
    const defDisbursement = initialValues?.disbursementDate || new Date().toISOString().split('T')[0];
    const defMaturity = initialValues?.maturityDate || (() => {
      const d = new Date();
      d.setFullYear(d.getFullYear() + 1);
      return d.toISOString().split('T')[0];
    })();

    let defNotes = initialValues?.notes || '';
    if (initialValues?.securityOffered && !defNotes.includes(initialValues.securityOffered)) {
      defNotes = defNotes ? `Security: ${initialValues.securityOffered} • ${defNotes}` : `Security: ${initialValues.securityOffered}`;
    }

    setLenderName(defLender);
    setEntityOrContact(defEntity);
    setEmailPhone(defEmailPhone);
    setFundingType(defFundingType);
    setFacilityStatus(defStatus);
    setCapitalAmountZAR(defAmount);
    setReturnTermsType(defReturnType);
    setReturnRatePercent(defReturnRate);
    setPaymentSchedule(defSchedule as any);
    setLinkedDealId(defLinkedDeal);
    setDisbursementDate(defDisbursement);
    setMaturityDate(defMaturity);
    setNotes(defNotes);

    if (initialValues?.tranches && initialValues.tranches.length > 0) {
      setEnableTranches(true);
      setCustomTranches(initialValues.tranches);
    } else {
      setEnableTranches(false);
      const half = Math.round(defAmount / 2);
      setCustomTranches([
        { id: `tr-${Date.now()}-1`, name: 'Tranche 1: Deposit', amountZAR: half, isDisbursed: true, linkedMilestonePhase: 'Deposit' },
        { id: `tr-${Date.now()}-2`, name: 'Tranche 2: Renovation', amountZAR: defAmount - half, isDisbursed: false, linkedMilestonePhase: 'Finishes' },
      ]);
    }
  }, [isOpen, initialValues]);

  const handleReturnTermsChange = (newStructure: ReturnTermType) => {
    setReturnTermsType(newStructure);

    if (newStructure === 'Zero Interest') {
      setReturnRatePercent(0);
    } else if (newStructure === 'Equity Profit Split') {
      setPaymentSchedule('At Exit (Maturity)');
      if (returnRatePercent === 14 || returnRatePercent === 14.5 || returnRatePercent === 0) {
        setReturnRatePercent(50);
      }
    } else if (newStructure === 'Bullet Repayment') {
      setPaymentSchedule('At Exit (Maturity)');
      if (returnRatePercent === 50 || returnRatePercent === 0) {
        setReturnRatePercent(14);
      }
    } else if (newStructure === 'Monthly Coupon') {
      setPaymentSchedule('Monthly Interest');
      if (returnRatePercent === 50 || returnRatePercent === 0) {
        setReturnRatePercent(14);
      }
    } else if (newStructure === 'Fixed Interest') {
      if (paymentSchedule === 'At Exit (Maturity)') {
        setPaymentSchedule('Monthly Interest');
      }
      if (returnRatePercent === 50 || returnRatePercent === 0) {
        setReturnRatePercent(14);
      }
    }
  };

  const applyFourPhaseMilestonePreset = (totalAmount: number) => {
    const base = Math.max(0, totalAmount || 500000);
    const t1 = Math.round(base * 0.25);
    const t2 = Math.round(base * 0.35);
    const t3 = Math.round(base * 0.30);
    const t4 = Math.max(0, base - t1 - t2 - t3);
    setEnableTranches(true);
    setCustomTranches([
      {
        id: `tr-${Date.now()}-1`,
        name: 'Phase 1: Deposit & Foundation (25%)',
        amountZAR: t1,
        isDisbursed: true,
        linkedMilestonePhase: 'Deposit',
      },
      {
        id: `tr-${Date.now()}-2`,
        name: 'Phase 2: First Fix & Wet Works (35%)',
        amountZAR: t2,
        isDisbursed: false,
        linkedMilestonePhase: 'First Fix / Wet Works',
      },
      {
        id: `tr-${Date.now()}-3`,
        name: 'Phase 3: Finishes & Sub-Meters (30%)',
        amountZAR: t3,
        isDisbursed: false,
        linkedMilestonePhase: 'Finishes',
      },
      {
        id: `tr-${Date.now()}-4`,
        name: 'Phase 4: Snagging & Retention (10%)',
        amountZAR: t4,
        isDisbursed: false,
        linkedMilestonePhase: 'Retention',
      },
    ]);
  };

  const handleAddFunding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lenderName.trim()) {
      alert('Please enter a lender or investor name.');
      return;
    }

    const linkedDeal =
      flips.find((f) => f.id === linkedDealId) ||
      rentals.find((r) => r.id === linkedDealId) ||
      opportunities.find((o) => o.id === linkedDealId);

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
      lenderName: lenderName.trim(),
      entityOrContact: entityOrContact.trim(),
      emailPhone: emailPhone.trim(),
      fundingType,
      capitalAmountZAR: finalPrincipal,
      disbursementDate,
      maturityDate,
      originalMaturityDate: maturityDate,
      returnTermsType,
      returnRatePercent,
      paymentSchedule,
      linkedDealId: linkedDealId || undefined,
      linkedDealName: linkedDeal ? linkedDeal.title : (initialValues?.linkedDealName || 'General Portfolio Liquidity'),
      totalRepaidZAR: 0,
      totalInterestPaidZAR: 0,
      status: facilityStatus,
      contactPerson: entityOrContact.trim(),
      securityOffered: initialValues?.securityOffered,
      notes: notes.trim(),
      tranches: finalTranches,
    };

    addFunding(newSource);
    onSuccess?.(newSource);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-white rounded-t-3xl sm:rounded-xl max-w-xl w-full p-5 sm:p-6 shadow-xl border border-slate-200 max-h-[92vh] overflow-y-auto">
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" />
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Coins className="w-5 h-5 text-emerald-600" />
            Add Financing / Capital Source
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleAddFunding} noValidate className="space-y-4 text-xs">
          {/* Quick Micro-Developer & Build-to-Rent Facility Templates */}
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                Quick Construction &amp; Micro-Developer Templates (4-Phase BOQ Tranches)
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  if (!lenderName.trim()) setLenderName('Personal Cashflow Build');
                  setFundingType('Phased Own-Cash (Brick-by-Brick)');
                  setReturnTermsType('Zero Interest');
                  setReturnRatePercent(0);
                  setPaymentSchedule('At Exit (Maturity)');
                  applyFourPhaseMilestonePreset(capitalAmountZAR);
                }}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-all text-left cursor-pointer ${
                  fundingType === 'Phased Own-Cash (Brick-by-Brick)'
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="font-bold">🧱 Brick-by-Brick Cash</div>
                <div className={`text-[9px] ${fundingType === 'Phased Own-Cash (Brick-by-Brick)' ? 'text-emerald-100' : 'text-slate-400'}`}>
                  0% Interest • R 0 External Debt
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!lenderName.trim()) setLenderName('Property Stokvel Syndicate');
                  setFundingType('Stokvel / Micro-Syndicate');
                  setReturnTermsType('Fixed Interest');
                  setReturnRatePercent(15);
                  setPaymentSchedule('Monthly Interest');
                  applyFourPhaseMilestonePreset(capitalAmountZAR);
                }}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-all text-left cursor-pointer ${
                  fundingType === 'Stokvel / Micro-Syndicate'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="font-bold">🤝 Stokvel / Syndicate</div>
                <div className={`text-[9px] ${fundingType === 'Stokvel / Micro-Syndicate' ? 'text-indigo-100' : 'text-slate-400'}`}>
                  Phased Draws • Pooled Return
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!lenderName.trim()) setLenderName('uMaStandi / TUHF Development Facility');
                  setFundingType('DFI / Commercial Facility');
                  setReturnTermsType('Fixed Interest');
                  setReturnRatePercent(13.25);
                  setPaymentSchedule('Monthly Interest');
                  applyFourPhaseMilestonePreset(capitalAmountZAR);
                }}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-all text-left cursor-pointer ${
                  fundingType === 'DFI / Commercial Facility'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="font-bold">🏗️ DFI (TUHF / uMaStandi)</div>
                <div className={`text-[9px] ${fundingType === 'DFI / Commercial Facility' ? 'text-slate-300' : 'text-slate-400'}`}>
                  Prime + 2.5% • 4-Stage Draws
                </div>
              </button>
            </div>
          </div>

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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Funding Category</label>
              <select
                value={fundingType}
                onChange={(e) => {
                  const nextType = e.target.value as FundingType;
                  setFundingType(nextType);
                  if (nextType === 'Phased Own-Cash (Brick-by-Brick)') {
                    setReturnTermsType('Zero Interest');
                    setReturnRatePercent(0);
                  }
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="Private Lender">Private Lender (Angel / HNW)</option>
                <option value="Proposal-backed">Proposal-backed (Syndicate / JV)</option>
                <option value="Ad-hoc Friends & Family">Ad-hoc Friends &amp; Family</option>
                <option value="Equity Partner">Equity Partner</option>
                <option value="Bank Bond">Bank Bond</option>
                <option value="Phased Own-Cash (Brick-by-Brick)">Phased Own-Cash (Brick-by-Brick)</option>
                <option value="Stokvel / Micro-Syndicate">Stokvel / Micro-Syndicate</option>
                <option value="DFI / Commercial Facility">DFI / Commercial Facility (TUHF / uMaStandi)</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Facility Status</label>
              <select
                value={facilityStatus}
                onChange={(e) => setFacilityStatus(e.target.value as 'Active' | 'Standby')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium"
              >
                <option value="Active">Active (Disbursed / Accruing)</option>
                <option value="Standby">Standby (Pre-Approved / Undrawn)</option>
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
                onChange={(e) => handleReturnTermsChange(e.target.value as ReturnTermType)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="Fixed Interest">Fixed Interest (% per annum)</option>
                <option value="Equity Profit Split">Equity Profit Split (% of Net Profit)</option>
                <option value="Monthly Coupon">Monthly Coupon</option>
                <option value="Bullet Repayment">Bullet Repayment</option>
                <option value="Zero Interest">Zero Interest (0% Self-Funded / Interest-Free)</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                {returnTermsType === 'Equity Profit Split'
                  ? 'Investor Profit Share (% of Net Profit)'
                  : returnTermsType === 'Bullet Repayment'
                  ? 'Bullet Return Rate (% p.a.)'
                  : returnTermsType === 'Monthly Coupon'
                  ? 'Monthly Coupon Rate (% p.a.)'
                  : 'Annual Interest Rate (% p.a.)'}
              </label>
              <input
                type="number"
                name="returnRatePercent"
                autoComplete="off"
                min="0"
                step="any"
                value={returnRatePercent}
                onChange={(e) => setReturnRatePercent(Number(e.target.value))}
                placeholder={returnTermsType === 'Equity Profit Split' ? '50' : '14'}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                {returnTermsType === 'Equity Profit Split'
                  ? 'e.g. 50% for 50/50 JV split, or 25% of net profit upon sale'
                  : returnTermsType === 'Bullet Repayment'
                  ? 'Principal + return repaid as lump sum at maturity'
                  : returnTermsType === 'Monthly Coupon'
                  ? 'Regular monthly coupon payments on drawn facility'
                  : 'Annual interest rate charged on active drawn principal'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-slate-700">Payment Schedule</label>
                {returnTermsType === 'Equity Profit Split' && (
                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    Locked to Exit
                  </span>
                )}
              </div>
              <select
                value={paymentSchedule}
                onChange={(e) => setPaymentSchedule(e.target.value as any)}
                disabled={returnTermsType === 'Equity Profit Split'}
                className={`w-full px-3 py-2 border rounded-lg ${
                  returnTermsType === 'Equity Profit Split'
                    ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                    : 'bg-white border-slate-300'
                }`}
              >
                <option value="Monthly Interest">Monthly Interest</option>
                <option value="Quarterly">Quarterly</option>
                <option value="At Exit (Maturity)">At Exit (Maturity / Sale)</option>
                <option value="Bi-Annual">Bi-Annual</option>
              </select>
              {returnTermsType === 'Equity Profit Split' && (
                <p className="text-[11px] text-amber-700 mt-1">
                  Profit share is distributed upon deal exit &amp; deed transfer.
                </p>
              )}
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Link to Active Deal / Project</label>
              <select
                value={linkedDealId}
                onChange={(e) => setLinkedDealId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="">-- General Operational Reserve --</option>
                {flips.length > 0 && (
                  <optgroup label="Active Flips">
                    {flips.map((flip) => (
                      <option key={flip.id} value={flip.id}>
                        [FLIP] {flip.title} ({flip.city})
                      </option>
                    ))}
                  </optgroup>
                )}
                {opportunities.length > 0 && (
                  <optgroup label="Pipeline Opportunities">
                    {opportunities.map((opp) => (
                      <option key={opp.id} value={opp.id}>
                        [OPPORTUNITY] {opp.title} ({opp.city})
                      </option>
                    ))}
                  </optgroup>
                )}
                {rentals.length > 0 && (
                  <optgroup label="Portfolio Rentals">
                    {rentals.map((rental) => (
                      <option key={rental.id} value={rental.id}>
                        [RENTAL] {rental.title} ({rental.city})
                      </option>
                    ))}
                  </optgroup>
                )}
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
                        id: `tr-${Date.now()}-${customTranches.length + 1}`,
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
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <div className="text-[11px] text-slate-600 pt-1 flex justify-between font-semibold">
                  <span>Total Phased Facility:</span>
                  <span className="text-emerald-700 font-bold tabular-nums">
                    {formatZAR(customTranches.reduce((s, t) => s + (Number(t.amountZAR) || 0), 0))}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg shadow-sm cursor-pointer"
            >
              Save Capital Source
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
