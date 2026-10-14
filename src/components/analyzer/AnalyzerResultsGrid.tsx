'use client';

import React from 'react';
import { formatZAR, formatPercent } from '@/lib/formatters';
import { Sparkles } from 'lucide-react';

export interface AnalyzerResultsGridProps {
  builtInEquityZAR: number;
  builtInEquityPercent: number;
  totalAcquisitionCost: number;
  grossYield: number;
  capRate: number;
  monthlyCashFlow: number;
  projectedFlipNetProfit: number;
  projectedFlipRoi: number;
  bondTermYears: number;
  netEquityFinal: number;
  isSection13Eligible?: boolean;
  section13AnnualSavings?: number;
  section13TwentyYearSavings?: number;
}

export function AnalyzerResultsGrid({
  builtInEquityZAR,
  builtInEquityPercent,
  totalAcquisitionCost,
  grossYield,
  capRate,
  monthlyCashFlow,
  projectedFlipNetProfit,
  projectedFlipRoi,
  bondTermYears,
  netEquityFinal,
  isSection13Eligible = false,
  section13AnnualSavings = 0,
  section13TwentyYearSavings = 0,
}: AnalyzerResultsGridProps) {
  return (
    <div className="space-y-3 pt-1">
      {/* 4-column x 2-row Balanced Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        {/* Metric 1: Built-in Equity */}
        <div className="bg-emerald-950/70 p-3 rounded-xl border border-emerald-500/40 flex flex-col justify-between min-h-[76px]">
          <span className="text-emerald-400 block text-[10px] font-semibold uppercase tracking-wide">
            Built-in Equity
          </span>
          <div className="text-sm sm:text-base font-extrabold text-emerald-300 font-mono">
            {formatZAR(builtInEquityZAR)}
          </div>
          <span className="text-[10px] text-emerald-400/80 block">
            {builtInEquityPercent >= 0 ? '+' : ''}{formatPercent(builtInEquityPercent)} vs Val
          </span>
        </div>

        {/* Metric 2: Total Acquisition Cost */}
        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/80 flex flex-col justify-between min-h-[76px]">
          <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wide">
            Total Acquisition Cost
          </span>
          <div className="text-sm sm:text-base font-bold text-white font-mono">
            {formatZAR(totalAcquisitionCost)}
          </div>
          <span className="text-[10px] text-slate-400 block">
            Duty + Deeds + Legal
          </span>
        </div>

        {/* Metric 3: Gross Rental Yield */}
        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/80 flex flex-col justify-between min-h-[76px]">
          <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wide">
            Gross Rental Yield
          </span>
          <div className="text-sm sm:text-base font-bold text-emerald-400 font-mono">
            {formatPercent(grossYield)}
          </div>
          <span className="text-[10px] text-slate-400 block">
            Annual Rent / Cost
          </span>
        </div>

        {/* Metric 4: Cap Rate (Net Yield) */}
        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/80 flex flex-col justify-between min-h-[76px]">
          <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wide">
            Cap Rate (Net Yield)
          </span>
          <div className="text-sm sm:text-base font-bold text-teal-300 font-mono">
            {formatPercent(capRate)}
          </div>
          <span className="text-[10px] text-slate-400 block">
            Net Operating Income
          </span>
        </div>

        {/* Metric 5: Net Cashflow (p.m.) */}
        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/80 flex flex-col justify-between min-h-[76px]">
          <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wide">
            Net Cashflow (p.m.)
          </span>
          <div className={`text-sm sm:text-base font-bold font-mono ${monthlyCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatZAR(monthlyCashFlow)}
          </div>
          <span className="text-[10px] text-slate-400 block">
            After Bond &amp; Levies
          </span>
        </div>

        {/* Metric 6: Projected Flip Profit */}
        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/80 flex flex-col justify-between min-h-[76px]">
          <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wide">
            Projected Flip Profit
          </span>
          <div className="text-sm sm:text-base font-bold text-amber-300 font-mono">
            {formatZAR(projectedFlipNetProfit)}
          </div>
          <span className="text-[10px] text-slate-400 block">
            Net after commission
          </span>
        </div>

        {/* Metric 7: Projected Flip ROI */}
        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/80 flex flex-col justify-between min-h-[76px]">
          <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wide">
            Projected Flip ROI
          </span>
          <div className="text-sm sm:text-base font-bold text-white font-mono">
            {formatPercent(projectedFlipRoi)}
          </div>
          <span className="text-[10px] text-slate-400 block">
            On invested capital
          </span>
        </div>

        {/* Metric 8: 20y Net Equity */}
        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/80 flex flex-col justify-between min-h-[76px]">
          <span className="text-teal-400 block text-[10px] font-semibold uppercase tracking-wide">
            {bondTermYears}y Net Equity
          </span>
          <div className="text-sm sm:text-base font-bold text-teal-300 font-mono">
            {formatZAR(netEquityFinal)}
          </div>
          <span className="text-[10px] text-slate-400 block">
            Compounding asset
          </span>
        </div>
      </div>

      {/* Section 13sex Tax Shield Highlight Bar */}
      {isSection13Eligible && (
        <div className="bg-emerald-950/70 p-2.5 rounded-xl border border-emerald-500/40 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>SARS Section 13sex Tax Shield Active</span>
            </span>
            <span className="text-[11px] text-emerald-300/90 font-medium hidden sm:inline">
              (5% straight-line annual building deduction)
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-emerald-300">
              +{formatZAR(section13AnnualSavings)}/yr
            </span>
            <span className="text-[10px] text-emerald-400/80 bg-emerald-900/80 px-2 py-0.5 rounded-full border border-emerald-500/40">
              20y Cumulative: {formatZAR(section13TwentyYearSavings)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default AnalyzerResultsGrid;
