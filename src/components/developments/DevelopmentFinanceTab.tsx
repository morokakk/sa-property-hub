'use client';

import React, { useState, useEffect } from 'react';
import { DevelopmentProject } from '@/types';
import {
  DevelopmentFinancialSummary,
  calculateIncreasedAmount,
} from '@/lib/calculations/developments';
import { formatZAR, formatPercent } from '@/lib/formatters';
import {
  Coins,
  CheckCircle2,
  Clock,
  ShieldCheck,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Building,
  ArrowRight,
  Layers,
  Sparkles,
  X,
} from 'lucide-react';

export interface DevelopmentFinanceTabProps {
  development: DevelopmentProject;
  financials: DevelopmentFinancialSummary;
  onUpdateDevelopment: (updates: Partial<DevelopmentProject>) => void;
  onOpenFundingModal?: () => void;
  onPayDownDebt?: (amountZAR: number) => void;
}

export function DevelopmentFinanceTab({
  development,
  financials,
  onUpdateDevelopment,
  onOpenFundingModal,
  onPayDownDebt,
}: DevelopmentFinanceTabProps) {
  const [isRepayModalOpen, setIsRepayModalOpen] = useState(false);
  const [repayAmount, setRepayAmount] = useState(500000);
  const [isDrawModalOpen, setIsDrawModalOpen] = useState(false);
  const [drawAmount, setDrawAmount] = useState(500000);

  useEffect(() => {
    if (!isRepayModalOpen && !isDrawModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsRepayModalOpen(false);
        setIsDrawModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRepayModalOpen, isDrawModalOpen]);

  const availableToDraw = financials.availableFacilityUndrawnZAR;

  const handleRecordRepayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (repayAmount <= 0) return;
    if (onPayDownDebt) {
      onPayDownDebt(repayAmount);
    } else {
      const newRepaid = calculateIncreasedAmount(
        development.developmentFacilityRepaidZAR,
        repayAmount
      );
      onUpdateDevelopment({ developmentFacilityRepaidZAR: newRepaid });
    }
    setIsRepayModalOpen(false);
  };

  const handleRecordDrawdown = (e: React.FormEvent) => {
    e.preventDefault();
    if (drawAmount <= 0) return;
    const newDrawn = calculateIncreasedAmount(
      development.developmentFacilityDrawnZAR,
      drawAmount
    );
    onUpdateDevelopment({ developmentFacilityDrawnZAR: newDrawn });
    setIsDrawModalOpen(false);
  };

  // Pre-sales hurdle metrics
  const hurdleRatio = financials.preSalesHurdleProgressRatioPercent;

  const units = development.units || [];
  const wipeoutUnitsCount = financials.unitsRequiredForDebtWipeout;

  const visualUnits = units.map((unit, index) => {
    const isDebtExtinguisher = index < wipeoutUnitsCount;
    const isSold = unit.status === 'Sold & Transferred';
    const isRetained = unit.status === 'Retained for Rental';
    const debtIndex = index + 1;
    const debtBadgeLabel = isDebtExtinguisher ? `Debt #${debtIndex}` : 'Free-Carry';
    return {
      unit,
      isDebtExtinguisher,
      isSold,
      isRetained,
      debtBadgeLabel,
    };
  });

  return (
    <div data-testid="development-finance-tab" className="space-y-6">
      {/* Top 3 Scoreboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Facility Health Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Senior Bank Facility
            </span>
            <Coins className="w-4 h-4 text-blue-600" />
          </div>

          <div>
            <div className="text-xs text-slate-400">Outstanding Facility Debt:</div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatZAR(financials.outstandingDevFacilityZAR)}
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Facility Limit:</span>
              <span className="font-semibold">{formatZAR(development.developmentFacilityLimitZAR)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Total Drawn:</span>
              <span className="font-semibold">{formatZAR(development.developmentFacilityDrawnZAR)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Total Repaid:</span>
              <span className="font-semibold text-emerald-700">
                {formatZAR(development.developmentFacilityRepaidZAR)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Available Undrawn:</span>
              <span className="font-semibold text-blue-700">{formatZAR(availableToDraw)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsDrawModalOpen(true)}
              className="flex-1 text-center text-xs font-semibold px-2.5 py-1.5 rounded border border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
            >
              + Record Drawdown
            </button>
            <button
              type="button"
              onClick={() => setIsRepayModalOpen(true)}
              className="flex-1 text-center text-xs font-semibold px-2.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
            >
              Record Repayment
            </button>
          </div>
        </div>

        {/* Card 2: Pre-Sales Hurdle Meter */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Pre-Sales Bank Gate
            </span>
            {financials.isPreSalesHurdleMet ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <Clock className="w-4 h-4 text-amber-500" />
            )}
          </div>

          <div>
            <div className="text-xs text-slate-400">Current Pre-Sold GDV:</div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatPercent(financials.preSoldGdvPercent)}
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  financials.isPreSalesHurdleMet ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                style={{ width: `${hurdleRatio}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Pre-Sold: {formatZAR(financials.preSoldGdvZAR)}</span>
              <span>Hurdle Target: {formatPercent(development.preSalesHurdlePercent)}</span>
            </div>
          </div>

          <div
            className={`p-2.5 rounded-lg border text-xs font-medium ${
              financials.isPreSalesHurdleMet
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            {financials.isPreSalesHurdleMet ? (
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>HURDLE MET: Construction draws unlocked by senior bank.</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>HURDLE PENDING: Bank construction draws ring-fenced.</span>
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-500">
            {financials.preSoldUnitsCount} of {financials.totalUnitsCount} units contracted (Reserved, Bond Approved, or Sold).
          </div>
        </div>

        {/* Card 3: Debt Wipeout Breakeven */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Debt Wipeout Breakeven
            </span>
            <TrendingUp className="w-4 h-4 text-purple-600" />
          </div>

          <div>
            <div className="text-xs text-slate-400">Units for 100% Debt Wipeout:</div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {wipeoutUnitsCount} Units
            </div>
          </div>

          <div className="space-y-1 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Avg Net List Price:</span>
              <span className="font-semibold">{formatZAR(financials.avgUnitListPriceZAR)}</span>
            </div>
            <div className="flex justify-between">
              <span>Outstanding Debt:</span>
              <span className="font-semibold text-rose-700">
                {formatZAR(financials.outstandingDevFacilityZAR)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Unencumbered Surplus:</span>
              <span className="font-semibold text-emerald-700">
                {financials.unencumberedUnitsCount} Units
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-200 text-xs text-purple-800">
            Once {wipeoutUnitsCount} units are transferred, senior facility is fully settled (R 0 debt balance). All remaining units become unencumbered sponsor profit or free-carry rental equity.
          </div>
        </div>
      </div>

      {/* Visual Debt Wipeout & Equity Free-Carry Stack */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-600" />
              <span>Unit-by-Unit Waterfall: Debt Extinguishment vs Unencumbered Equity</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Interactive waterfall showing which sales extinguish senior debt (Units 1..K) and which units represent pure equity/profit (Units K+1..N).
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 text-blue-700">
              <span className="w-3 h-3 rounded-xs bg-blue-500 inline-block" />
              Senior Debt Repayment
            </span>
            <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
              <span className="w-3 h-3 rounded-xs bg-emerald-500 inline-block" />
              Free-Carry Sponsor Equity
            </span>
          </div>
        </div>

        {/* Visual Units Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {visualUnits.map(({ unit, isDebtExtinguisher, isSold, isRetained, debtBadgeLabel }) => (
            <div
              key={unit.id}
                className={`rounded-lg border p-3 flex flex-col justify-between text-xs space-y-2 transition-all ${
                  isDebtExtinguisher
                    ? 'border-blue-200 bg-blue-50/40 hover:bg-blue-50/70'
                    : 'border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50/70'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{unit.unitNumber}</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                        isDebtExtinguisher
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {debtBadgeLabel}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{unit.configuration}</div>
                  <div className="font-mono font-semibold text-slate-800 mt-1">
                    {formatZAR(unit.listPriceVatInclZAR)}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60">
                  <span
                    title={unit.status}
                    className={`text-[10px] font-medium block truncate ${
                      isSold
                        ? 'text-emerald-700 font-bold'
                        : isRetained
                        ? 'text-purple-700 font-bold'
                        : 'text-slate-600'
                    }`}
                  >
                    {unit.status}
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Record Repayment Modal */}
      {isRepayModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setIsRepayModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-sm w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 cursor-default"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="text-base font-bold text-slate-900">Record Facility Repayment</h4>
              <button
                type="button"
                onClick={() => setIsRepayModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRecordRepayment} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Repayment Amount (ZAR)
                </label>
                <input
                  type="number"
                  required
                  min={1000}
                  step={10000}
                  value={repayAmount}
                  onChange={(e) => setRepayAmount(Number(e.target.value))}
                  className="w-full rounded border border-slate-300 px-3 py-1.5 focus:ring-1 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Outstanding debt: {formatZAR(financials.outstandingDevFacilityZAR)}.
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRepayModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer"
                >
                  Save Repayment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Drawdown Modal */}
      {isDrawModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setIsDrawModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-sm w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 cursor-default"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="text-base font-bold text-slate-900">Record Tranche Drawdown</h4>
              <button
                type="button"
                onClick={() => setIsDrawModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRecordDrawdown} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Drawdown Amount (ZAR)
                </label>
                <input
                  type="number"
                  required
                  min={1000}
                  step={10000}
                  value={drawAmount}
                  onChange={(e) => setDrawAmount(Number(e.target.value))}
                  className="w-full rounded border border-slate-300 px-3 py-1.5 focus:ring-1 focus:ring-blue-500"
                />
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Available undrawn: {formatZAR(availableToDraw)}.
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDrawModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer"
                >
                  Save Drawdown
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
