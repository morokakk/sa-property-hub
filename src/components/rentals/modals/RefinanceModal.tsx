'use client';

import React, { useState, useEffect } from 'react';
import { RentalProperty } from '@/types';
import { formatZAR } from '@/lib/formatters';
import { ArrowUpRight } from 'lucide-react';
import { calculateMonthlyBondRepayment } from '@/lib/calculations/propertyMetrics';

export interface RefinanceModalProps {
  isOpen: boolean;
  property: RentalProperty | null;
  currentLiquidReserve: number;
  onClose: () => void;
  onSave: (params: {
    rentalId: string;
    newBankValuationZAR: number;
    newMonthlyBondPaymentZAR: number;
    cashEquityPulledOutZAR: number;
    newBondBalanceZAR: number;
    refinanceDate: string;
    notes?: string;
  }) => void;
  // Controlled props for Phase 4A backward compatibility
  newValuation?: number;
  setNewValuation?: (v: number) => void;
  newBondPayment?: number;
  setNewBondPayment?: (v: number) => void;
  cashPulledOut?: number;
  setCashPulledOut?: (v: number) => void;
  newBondBalance?: number;
  setNewBondBalance?: (v: number) => void;
  refinanceDate?: string;
  setRefinanceDate?: (v: string) => void;
  notes?: string;
  setNotes?: (v: string) => void;
  onSubmit?: (e: React.FormEvent) => void;
}

export const RefinanceModal: React.FC<RefinanceModalProps> = ({
  isOpen,
  property,
  currentLiquidReserve,
  onClose,
  onSave,
  newValuation: propNewValuation,
  setNewValuation: propSetNewValuation,
  newBondPayment: propNewBondPayment,
  setNewBondPayment: propSetNewBondPayment,
  cashPulledOut: propCashPulledOut,
  setCashPulledOut: propSetCashPulledOut,
  newBondBalance: propNewBondBalance,
  setNewBondBalance: propSetNewBondBalance,
  refinanceDate: propRefinanceDate,
  setRefinanceDate: propSetRefinanceDate,
  notes: propNotes,
  setNotes: propSetNotes,
  onSubmit: propOnSubmit,
}) => {
  const [localValuation, setLocalValuation] = useState<number>(0);
  const [localBondPayment, setLocalBondPayment] = useState<number>(0);
  const [localCashPulledOut, setLocalCashPulledOut] = useState<number>(0);
  const [localBondBalance, setLocalBondBalance] = useState<number>(0);
  const [localDate, setLocalDate] = useState<string>('');
  const [localNotes, setLocalNotes] = useState<string>('');

  useEffect(() => {
    if (property && isOpen && propNewValuation === undefined) {
      const estNewVal = Math.round(((property.marketValueZAR || 0) * 1.15) / 50000) * 50000;
      const targetBond = Math.round((estNewVal * 0.70) / 10000) * 10000;
      const cashOut = Math.max(0, targetBond - (property.outstandingBondBalanceZAR || 0));
      const newBond = (property.outstandingBondBalanceZAR || 0) + cashOut;
      const estPmt = calculateMonthlyBondRepayment(newBond, property.bondInterestRatePercent || 11.5, 20);

      setLocalValuation(estNewVal);
      setLocalBondPayment(estPmt);
      setLocalCashPulledOut(cashOut);
      setLocalBondBalance(newBond);
      setLocalDate(new Date().toISOString().split('T')[0]);
      setLocalNotes('');
    }
  }, [property, isOpen, propNewValuation]);

  if (!isOpen || !property) return null;

  const valuation = propNewValuation !== undefined ? propNewValuation : localValuation;
  const bondPayment = propNewBondPayment !== undefined ? propNewBondPayment : localBondPayment;
  const cashOut = propCashPulledOut !== undefined ? propCashPulledOut : localCashPulledOut;
  const bondBalance = propNewBondBalance !== undefined ? propNewBondBalance : localBondBalance;
  const dateStr = propRefinanceDate !== undefined ? propRefinanceDate : localDate;
  const notesStr = propNotes !== undefined ? propNotes : localNotes;

  const handleValuationChange = (val: number) => {
    if (propSetNewValuation) {
      propSetNewValuation(val);
    } else {
      setLocalValuation(val);
    }
  };

  const handleBondPaymentChange = (val: number) => {
    if (propSetNewBondPayment) {
      propSetNewBondPayment(val);
    } else {
      setLocalBondPayment(val);
    }
  };

  const handleCashOutChange = (val: number) => {
    if (propSetCashPulledOut) {
      propSetCashPulledOut(val);
    } else {
      setLocalCashPulledOut(val);
    }
    const newBal = (property.outstandingBondBalanceZAR || 0) + val;
    if (propSetNewBondBalance) {
      propSetNewBondBalance(newBal);
    } else {
      setLocalBondBalance(newBal);
    }
  };

  const handleBondBalanceChange = (val: number) => {
    if (propSetNewBondBalance) {
      propSetNewBondBalance(val);
    } else {
      setLocalBondBalance(val);
    }
  };

  const handleDateChange = (val: string) => {
    if (propSetRefinanceDate) {
      propSetRefinanceDate(val);
    } else {
      setLocalDate(val);
    }
  };

  const handleNotesChange = (val: string) => {
    if (propSetNotes) {
      propSetNotes(val);
    } else {
      setLocalNotes(val);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    if (propOnSubmit) {
      propOnSubmit(e);
      return;
    }
    e.preventDefault();
    onSave({
      rentalId: property.id,
      newBankValuationZAR: valuation,
      newMonthlyBondPaymentZAR: bondPayment,
      cashEquityPulledOutZAR: cashOut,
      newBondBalanceZAR: bondBalance,
      refinanceDate: dateStr,
      notes: notesStr,
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-t-3xl sm:rounded-xl max-w-lg w-full p-5 sm:p-6 shadow-xl border border-slate-200 animate-in fade-in sm:my-8 max-h-[92vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" />
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5 text-purple-600" />
            <span>Refinance & Pull Out Equity (BRRRR)</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-slate-500 mb-4">
          Refinance <strong>{property.title}</strong> based on its updated bank valuation. The cash equity pulled out is immediately credited into your <strong>Liquid Capital Reserve (Seed Capital pool)</strong> to acquire your next property.
        </p>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 text-xs">
          {/* Previous Financial Baseline */}
          <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100 grid grid-cols-3 gap-2 text-center">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Current Market Value</span>
              <strong className="text-xs text-slate-800">{formatZAR(property.marketValueZAR)}</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Current Bond Balance</span>
              <strong className="text-xs text-slate-800">{formatZAR(property.outstandingBondBalanceZAR || 0)}</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Current Bond Repayment</span>
              <strong className="text-xs text-slate-800">{formatZAR(property.monthlyBondPaymentZAR)}/m</strong>
            </div>
          </div>

          {/* Metric 1: New Bank Valuation */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              1. New Bank Valuation (ZAR) *
            </label>
            <input
              type="number"
              name="refinanceNewValuationZAR"
              autoComplete="off"
              required
              min="0"
              step="any"
              value={valuation || ''}
              onChange={(e) => handleValuationChange(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900 text-sm focus:ring-1 focus:ring-purple-500"
              placeholder="e.g. 2800000"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Official bank / Lightstone appraisal valuation
            </span>
          </div>

          {/* Metric 2: New Monthly Bond Repayment */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              2. New Monthly Bond Repayment (ZAR) *
            </label>
            <input
              type="number"
              name="refinanceNewBondPaymentZAR"
              autoComplete="off"
              required
              min="0"
              step="any"
              value={bondPayment || ''}
              onChange={(e) => handleBondPaymentChange(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900 text-sm focus:ring-1 focus:ring-purple-500"
              placeholder="e.g. 19500"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              New debit order installment quoted by the financing bank
            </span>
          </div>

          {/* Metric 3: Cash Equity Pulled Out */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-semibold text-slate-700">
                3. Cash Equity Pulled Out (ZAR) *
              </label>
              <span className="text-[10px] font-bold text-emerald-600">
                + Deposited directly to Seed Capital
              </span>
            </div>
            <input
              type="number"
              name="refinanceCashPulledOutZAR"
              autoComplete="off"
              required
              min="0"
              step="any"
              value={cashOut || ''}
              onChange={(e) => handleCashOutChange(Number(e.target.value))}
              className="w-full px-3 py-2 border border-emerald-300 rounded-lg font-bold text-emerald-700 text-base focus:ring-1 focus:ring-emerald-500 bg-emerald-50/30"
              placeholder="e.g. 450000"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Net liquid cash released from home loan advance
            </span>
          </div>

          {/* Updated Outstanding Bond Balance */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-semibold text-slate-700">
                New Outstanding Mortgage Debt (ZAR) *
              </label>
              {valuation > 0 && bondBalance > 0 && (
                <span className="text-[10px] text-slate-500 font-medium">
                  Bank LTV: {((bondBalance / valuation) * 100).toFixed(1)}%
                </span>
              )}
            </div>
            <input
              type="number"
              name="refinanceNewBondBalanceZAR"
              autoComplete="off"
              required
              min="0"
              step="any"
              value={bondBalance || ''}
              onChange={(e) => handleBondBalanceChange(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-800 text-sm"
              placeholder="Auto-calculated (Previous Balance + Cash Out)"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Balance sheet liability recorded against the property
            </span>
          </div>

          {/* Date & Facility Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Refinance Date</label>
              <input
                type="date"
                required
                value={dateStr}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Bank / Facility Notes</label>
              <input
                type="text"
                value={notesStr}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="e.g. Standard Bank 70% LTV, Prime - 0.25%"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          {/* Impact Banner */}
          <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-purple-900 uppercase block">
                Capital Available for Next Deal:
              </span>
              <span className="text-[11px] text-purple-700">
                Seed Capital pool: {formatZAR(currentLiquidReserve)} → {formatZAR(currentLiquidReserve + (Number(cashOut) || 0))}
              </span>
            </div>
            <strong className="text-sm font-black text-purple-900">
              +{formatZAR(Number(cashOut) || 0)}
            </strong>
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
              className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Save Refinance & Credit Reserve</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RefinanceModal;
