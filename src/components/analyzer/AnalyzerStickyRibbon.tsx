'use client';

import React from 'react';
import { formatZAR, formatPercent } from '@/lib/formatters';
import { TrendingUp, PlusCircle, Check, ArrowDownCircle } from 'lucide-react';

export interface AnalyzerStickyRibbonProps {
  dayOneCapitalRequired: number;
  builtInEquity: number;
  builtInEquityPercent: number;
  grossYield: number;
  netCapRate: number;
  monthlyNetCashFlow: number;
  projectedFlipProfit: number;
  projectedFlipROI: number;
  isEditing?: boolean;
  onSaveDeal: () => void;
  onScrollToResults?: () => void;
}

export function AnalyzerStickyRibbon({
  dayOneCapitalRequired,
  builtInEquity,
  builtInEquityPercent,
  grossYield,
  netCapRate,
  monthlyNetCashFlow,
  projectedFlipProfit,
  projectedFlipROI,
  isEditing = false,
  onSaveDeal,
  onScrollToResults,
}: AnalyzerStickyRibbonProps) {
  return (
    <div className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md text-white border border-slate-700/80 shadow-md px-3.5 py-2.5 rounded-xl mb-4 animate-in fade-in duration-150">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Metric Pills Strip */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 text-xs flex-1">
          {/* Day-1 Cash */}
          <div className="bg-slate-800/90 border border-slate-700 px-2.5 py-1 rounded-lg shrink-0">
            <span className="text-[10px] text-slate-400 block uppercase font-medium">Day-1 Cash</span>
            <span className="font-bold text-white font-mono">{formatZAR(dayOneCapitalRequired)}</span>
          </div>

          {/* Built-in Equity */}
          <div className="bg-slate-800/90 border border-slate-700 px-2.5 py-1 rounded-lg shrink-0">
            <span className="text-[10px] text-slate-400 block uppercase font-medium">Built-in Equity</span>
            <span className={`font-bold font-mono ${builtInEquity >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatZAR(builtInEquity)}
              <span className="text-[10px] font-normal ml-1">
                ({builtInEquityPercent >= 0 ? '+' : ''}{formatPercent(builtInEquityPercent)})
              </span>
            </span>
          </div>

          {/* Yields */}
          <div className="bg-slate-800/90 border border-slate-700 px-2.5 py-1 rounded-lg shrink-0">
            <span className="text-[10px] text-slate-400 block uppercase font-medium">Gross / Net Yield</span>
            <span className="font-bold text-emerald-400 font-mono">
              {formatPercent(grossYield)} / {formatPercent(netCapRate)}
            </span>
          </div>

          {/* Monthly Cashflow */}
          <div className="bg-slate-800/90 border border-slate-700 px-2.5 py-1 rounded-lg shrink-0">
            <span className="text-[10px] text-slate-400 block uppercase font-medium">Monthly Cashflow</span>
            <span className={`font-bold font-mono ${monthlyNetCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatZAR(monthlyNetCashFlow)}/m
            </span>
          </div>

          {/* Flip Profit / ROI */}
          <div className="bg-slate-800/90 border border-slate-700 px-2.5 py-1 rounded-lg shrink-0">
            <span className="text-[10px] text-slate-400 block uppercase font-medium">Flip Profit / ROI</span>
            <span className="font-bold text-amber-300 font-mono">
              {formatZAR(projectedFlipProfit)} ({formatPercent(projectedFlipROI)})
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
          {onScrollToResults && (
            <button
              type="button"
              onClick={onScrollToResults}
              className="text-[11px] text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-600 transition-colors flex items-center gap-1 cursor-pointer"
              title="Jump down to detailed returns breakdown"
            >
              <ArrowDownCircle className="w-3.5 h-3.5 text-teal-400" />
              <span>Breakdown ▾</span>
            </button>
          )}

          <button
            type="button"
            onClick={onSaveDeal}
            className={`text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer ${
              isEditing
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {isEditing ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Update Deal</span>
              </>
            ) : (
              <>
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Save Deal</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AnalyzerStickyRibbon;
