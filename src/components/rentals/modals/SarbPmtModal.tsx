'use client';

import React, { useState, useEffect } from 'react';
import { RentalProperty } from '@/types';
import { formatZAR } from '@/lib/formatters';
import { Calculator, CheckCircle2 } from 'lucide-react';
import { calculateMonthlyBondRepayment } from '@/lib/calculations/propertyMetrics';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';

export interface SarbPmtModalProps {
  isOpen: boolean;
  property: RentalProperty | null;
  onClose: () => void;
  // Controlled props for Phase 4A backward compatibility
  interestRate?: number;
  setInterestRate?: (v: number) => void;
  loanBalance?: number;
  setLoanBalance?: (v: number) => void;
  loanYears?: number;
  setLoanYears?: (v: number) => void;
  effectiveMonth?: string;
  setEffectiveMonth?: (v: string) => void;
  revisionNote?: string;
  setRevisionNote?: (v: string) => void;
  onApply?: (e: React.FormEvent) => void;
}

export const SarbPmtModal: React.FC<SarbPmtModalProps> = ({
  isOpen,
  property,
  onClose,
  interestRate: propInterestRate,
  setInterestRate: propSetInterestRate,
  loanBalance: propLoanBalance,
  setLoanBalance: propSetLoanBalance,
  loanYears: propLoanYears,
  setLoanYears: propSetLoanYears,
  effectiveMonth: propEffectiveMonth,
  setEffectiveMonth: propSetEffectiveMonth,
  revisionNote: propRevisionNote,
  setRevisionNote: propSetRevisionNote,
  onApply: propOnApply,
}) => {
  const updateRental = usePortfolioStore((s) => s.updateRental);

  const [localInterestRate, setLocalInterestRate] = useState<number>(11.5);
  const [localLoanBalance, setLocalLoanBalance] = useState<number>(0);
  const [localLoanYears, setLocalLoanYears] = useState<number>(20);
  const [localEffectiveMonth, setLocalEffectiveMonth] = useState<string>('');
  const [localRevisionNote, setLocalRevisionNote] = useState<string>('SARB 25bps repo rate cut');

  useEffect(() => {
    if (property && isOpen && propInterestRate === undefined) {
      setLocalInterestRate(property.bondInterestRatePercent || 11.5);
      setLocalLoanBalance(property.outstandingBondBalanceZAR || 0);
      setLocalLoanYears(20);

      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const monthStr = nextMonth.toLocaleString('en-ZA', { month: 'short', year: 'numeric' });

      setLocalEffectiveMonth(property.bondPaymentEffectiveDate || monthStr);
      setLocalRevisionNote(property.bondRevisionNote || 'SARB 25bps repo rate cut');
    }
  }, [property, isOpen, propInterestRate]);

  if (!isOpen || !property) return null;

  const interestRate = propInterestRate !== undefined ? propInterestRate : localInterestRate;
  const loanBalance = propLoanBalance !== undefined ? propLoanBalance : localLoanBalance;
  const loanYears = propLoanYears !== undefined ? propLoanYears : localLoanYears;
  const effectiveMonth = propEffectiveMonth !== undefined ? propEffectiveMonth : localEffectiveMonth;
  const revisionNote = propRevisionNote !== undefined ? propRevisionNote : localRevisionNote;

  const handleInterestRateChange = (v: number) => {
    if (propSetInterestRate) propSetInterestRate(v);
    else setLocalInterestRate(v);
  };

  const handleLoanBalanceChange = (v: number) => {
    if (propSetLoanBalance) propSetLoanBalance(v);
    else setLocalLoanBalance(v);
  };

  const handleLoanYearsChange = (v: number) => {
    if (propSetLoanYears) propSetLoanYears(v);
    else setLocalLoanYears(v);
  };

  const handleEffectiveMonthChange = (v: string) => {
    if (propSetEffectiveMonth) propSetEffectiveMonth(v);
    else setLocalEffectiveMonth(v);
  };

  const handleRevisionNoteChange = (v: string) => {
    if (propSetRevisionNote) propSetRevisionNote(v);
    else setLocalRevisionNote(v);
  };

  const handleSubmit = (e: React.FormEvent) => {
    if (propOnApply) {
      propOnApply(e);
      return;
    }
    e.preventDefault();
    const newPayment = calculateMonthlyBondRepayment(loanBalance, interestRate, loanYears);
    updateRental(property.id, {
      monthlyBondPaymentZAR: newPayment,
      outstandingBondBalanceZAR: loanBalance,
      bondInterestRatePercent: interestRate,
      bondPaymentEffectiveDate: effectiveMonth.trim() || undefined,
      bondRevisionNote: revisionNote.trim() || undefined,
    });
    onClose();
  };

  const calculatedPmt = calculateMonthlyBondRepayment(loanBalance, interestRate, loanYears);
  const currentPmt = property.monthlyBondPaymentZAR || 0;
  const savings = currentPmt - calculatedPmt;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 max-h-[92vh] sm:max-h-none overflow-y-auto">
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" />
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center font-bold">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                SARB Repo Rate Bond Recalculator
              </h3>
              <p className="text-xs text-slate-500">
                Forward-only adjustment for &ldquo;{property.title}&rdquo;
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 text-xs">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-900 text-[11px] leading-relaxed">
            💡 <strong>Forward-Only Guarantee:</strong> Modifying the bond repayment takes effect from the selected <strong>Effective Month</strong> for upcoming bank debit orders. Historical performance and past months remain uncorrupted.
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Outstanding Bond Balance (ZAR)</label>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={loanBalance}
                onChange={(e) => handleLoanBalanceChange(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold bg-white text-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">New Bond Interest Rate (%)</label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="0"
                  max="30"
                  required
                  value={interestRate}
                  onChange={(e) => handleInterestRateChange(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold bg-white text-slate-900 pr-7"
                />
                <span className="absolute right-2.5 top-1.5 text-slate-400 font-bold">%</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Remaining Term (Years)</label>
              <input
                type="number"
                min="1"
                max="30"
                required
                value={loanYears}
                onChange={(e) => handleLoanYearsChange(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 font-medium"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Effective Month (Forward-Only)</label>
              <input
                type="text"
                required
                placeholder="e.g. Apr 2026 or 2026-04"
                value={effectiveMonth}
                onChange={(e) => handleEffectiveMonthChange(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900 font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Revision Note / Memo</label>
            <input
              type="text"
              placeholder="e.g. SARB 25bps repo rate cut"
              value={revisionNote}
              onChange={(e) => handleRevisionNoteChange(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-900"
            />
          </div>

          {/* Dynamic PMT Calculation Comparison Preview */}
          <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-indigo-900 uppercase">Recalculated Bond PMT</span>
              <span className="text-[10px] text-indigo-700 font-semibold bg-indigo-100 px-2 py-0.5 rounded">
                Standard SA Amortization Formula
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-indigo-950 font-mono">
                {formatZAR(calculatedPmt)}/month
              </span>
              {currentPmt > 0 && (
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block">Current: {formatZAR(currentPmt)}/m</span>
                  <span className={`text-xs font-bold ${savings >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {savings >= 0 ? `+${formatZAR(savings)}/m cashflow relief` : `${formatZAR(savings)}/m increase`}
                  </span>
                </div>
              )}
            </div>
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
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Apply Forward-Only ({effectiveMonth})</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SarbPmtModal;
