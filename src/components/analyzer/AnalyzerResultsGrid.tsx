'use client';

import React from 'react';
import { formatZAR, formatPercent } from '@/lib/formatters';
import { Sparkles } from 'lucide-react';
import { DealStrategy } from '@/types';

export interface AnalyzerResultsGridProps {
  strategy?: DealStrategy;
  builtInEquityZAR: number;
  builtInEquityPercent: number;
  totalAcquisitionCost: number;
  grossYield: number;
  capRate: number;
  monthlyCashFlow: number;
  netRoi?: number;
  minNetRoiHurdle?: number;
  dscr?: number | null;
  minDscrHurdle?: number;
  fiveYearIrrPercent?: number;
  purchasePricePerSqm?: number;
  valuationPerSqm?: number;
  numberOfUnits?: number;
  averagePricePerUnit?: number;
  projectedFlipNetProfit: number;
  projectedFlipRoi: number;
  annualizedFlipRoi?: number;
  monthlyHoldingBurnZAR?: number;
  holdingPeriodMonths?: number;
  brrrrPostRefiCashflowZAR?: number;
  brrrrEquityExtractedZAR?: number;
  brrrrCashLeftInDealZAR?: number;
  brrrrRefinanceLoanZAR?: number;
  bondTermYears: number;
  netEquityFinal: number;
  isSection13Eligible?: boolean;
  section13AnnualSavings?: number;
  section13TwentyYearSavings?: number;
}

export function AnalyzerResultsGrid({
  strategy = 'Rental',
  builtInEquityZAR,
  builtInEquityPercent,
  totalAcquisitionCost,
  grossYield,
  capRate,
  monthlyCashFlow,
  netRoi = 0,
  minNetRoiHurdle = 8.0,
  dscr = null,
  minDscrHurdle = 1.20,
  fiveYearIrrPercent = 0,
  purchasePricePerSqm = 0,
  valuationPerSqm = 0,
  numberOfUnits = 1,
  averagePricePerUnit = 0,
  projectedFlipNetProfit,
  projectedFlipRoi,
  annualizedFlipRoi = 0,
  monthlyHoldingBurnZAR = 0,
  holdingPeriodMonths = 6,
  brrrrPostRefiCashflowZAR = 0,
  brrrrEquityExtractedZAR = 0,
  brrrrCashLeftInDealZAR = 0,
  bondTermYears,
  netEquityFinal,
  isSection13Eligible = false,
  section13AnnualSavings = 0,
  section13TwentyYearSavings = 0,
}: AnalyzerResultsGridProps) {
  const meetsRoiHurdle = netRoi >= minNetRoiHurdle;
  const isCashDeal = dscr === null;
  const meetsDscrHurdle = isCashDeal || dscr >= minDscrHurdle - 1e-4;

  return (
    <div className="space-y-3 pt-1">
      {/* 4-column x 2-row Balanced Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        {/* Metric 1: Built-in Equity (Universal) */}
        <div className="bg-emerald-950/70 p-3 rounded-xl border border-emerald-500/40 flex flex-col justify-between min-h-[76px]">
          <span className="text-emerald-400 block text-[10px] font-semibold uppercase tracking-wide">
            Built-in Equity
          </span>
          <div className="text-sm sm:text-base font-extrabold text-emerald-300 font-mono">
            {formatZAR(builtInEquityZAR)}
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-emerald-400/80 block">
              {builtInEquityPercent >= 0 ? '+' : ''}{formatPercent(builtInEquityPercent)} vs Val
            </span>
            {purchasePricePerSqm > 0 && (
              <span className="text-[9px] text-emerald-300/90 font-mono block truncate" title={`Bid: ${formatZAR(purchasePricePerSqm)}/m² vs Val: ${formatZAR(valuationPerSqm)}/m²`}>
                {formatZAR(purchasePricePerSqm)}/m² {valuationPerSqm > 0 ? `(Val ${formatZAR(valuationPerSqm)}/m²)` : ''}
              </span>
            )}
            {numberOfUnits > 1 && averagePricePerUnit > 0 && (
              <span className="text-[9px] text-emerald-200/80 font-mono block truncate">
                {numberOfUnits} units &bull; Avg {formatZAR(averagePricePerUnit)}/unit
              </span>
            )}
          </div>
        </div>

        {/* Metric 2: Total Acquisition Cost (Universal) */}
        <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/80 flex flex-col justify-between min-h-[76px]">
          <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wide">
            Total Acquisition Cost
          </span>
          <div className="text-sm sm:text-base font-bold text-white font-mono">
            {formatZAR(totalAcquisitionCost)}
          </div>
          <span className="text-[10px] text-slate-400 block">
            Purchase + Duty + Legal + Capex
          </span>
        </div>

        {/* Metric 3: Gross Rental Yield (Universal) */}
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

        {/* Metric 4: Cap Rate (Net Yield) (Universal) */}
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

        {/* Row 2 dynamically adapts to selected Investment Strategy */}
        {strategy === 'Rental' && (
          <>
            {/* Metric 5: Net Cashflow (P.M.) */}
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/80 flex flex-col justify-between min-h-[76px]">
              <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wide">
                Net Cashflow (P.M.)
              </span>
              <div className={`text-sm sm:text-base font-bold font-mono ${monthlyCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatZAR(monthlyCashFlow)}
              </div>
              <span className="text-[10px] text-slate-400 block">
                After Bond &amp; OpEx
              </span>
            </div>

            {/* Metric 6: Cash-on-Cash ROI (Yr 1) */}
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/80 flex flex-col justify-between min-h-[76px]">
              <div className="flex items-center justify-between gap-1">
                <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wide">
                  Cash-on-Cash ROI (Yr 1)
                </span>
                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${meetsRoiHurdle ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60' : 'bg-amber-950 text-amber-300 border border-amber-700/60'}`}>
                  {meetsRoiHurdle ? `≥${minNetRoiHurdle}%` : `<${minNetRoiHurdle}%`}
                </span>
              </div>
              <div className={`text-sm sm:text-base font-bold font-mono ${meetsRoiHurdle ? 'text-emerald-400' : netRoi >= 0 ? 'text-amber-300' : 'text-rose-400'}`}>
                {formatPercent(netRoi)}
              </div>
              <span className="text-[10px] text-slate-400 block">
                Annual Cashflow &divide; Day-1 Cash
              </span>
            </div>

            {/* Metric 7: Debt Coverage (DSCR) or 5-Yr IRR % if unleveraged */}
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/80 flex flex-col justify-between min-h-[76px]">
              <div className="flex items-center justify-between gap-1">
                <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wide">
                  {isCashDeal ? '5-Yr IRR (Unleveraged)' : 'Debt Coverage (DSCR)'}
                </span>
                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${meetsDscrHurdle ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60' : 'bg-rose-950 text-rose-300 border border-rose-700/60'}`}>
                  {isCashDeal ? 'N/A (Cash)' : meetsDscrHurdle ? `≥ ${minDscrHurdle.toFixed(2)}x` : `< ${minDscrHurdle.toFixed(2)}x`}
                </span>
              </div>
              <div className={`text-sm sm:text-base font-bold font-mono ${meetsDscrHurdle ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isCashDeal ? formatPercent(fiveYearIrrPercent) : `${dscr.toFixed(2)}x`}
              </div>
              <span className="text-[10px] text-slate-400 block">
                {isCashDeal ? 'DSCR: N/A (Cash) • 5Y Compound' : 'NOI ÷ Bond Repayment'}
              </span>
            </div>

            {/* Metric 8: 20Y Net Equity (with 5Y Est. IRR subtitle) */}
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/80 flex flex-col justify-between min-h-[76px]">
              <span className="text-teal-400 block text-[10px] font-semibold uppercase tracking-wide">
                {bondTermYears}Y Net Equity
              </span>
              <div className="text-sm sm:text-base font-bold text-teal-300 font-mono">
                {formatZAR(netEquityFinal)}
              </div>
              <span className="text-[10px] text-slate-400 block">
                5Y Est. IRR: <strong className="text-teal-300 font-mono">{formatPercent(fiveYearIrrPercent)}</strong>
              </span>
            </div>
          </>
        )}

        {strategy === 'Flip' && (
          <>
            {/* Metric 5: Monthly Holding Burn */}
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/80 flex flex-col justify-between min-h-[76px]">
              <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wide">
                Monthly Holding Burn
              </span>
              <div className="text-sm sm:text-base font-bold text-rose-400 font-mono">
                -{formatZAR(monthlyHoldingBurnZAR)}
              </div>
              <span className="text-[10px] text-slate-400 block">
                Bond + Rates + Levies + Sec
              </span>
            </div>

            {/* Metric 6: Projected Flip Profit */}
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/80 flex flex-col justify-between min-h-[76px]">
              <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wide">
                Projected Flip Profit
              </span>
              <div className={`text-sm sm:text-base font-bold font-mono ${projectedFlipNetProfit >= 0 ? 'text-amber-300' : 'text-rose-400'}`}>
                {formatZAR(projectedFlipNetProfit)}
              </div>
              <span className="text-[10px] text-slate-400 block">
                Net after comm &amp; {holdingPeriodMonths}m burn
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
                On Day-1 &amp; holding cash
              </span>
            </div>

            {/* Metric 8: Annualized Flip ROI */}
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/80 flex flex-col justify-between min-h-[76px]">
              <span className="text-amber-400 block text-[10px] font-semibold uppercase tracking-wide">
                Annualized Flip ROI
              </span>
              <div className="text-sm sm:text-base font-bold text-amber-300 font-mono">
                {formatPercent(annualizedFlipRoi)}
              </div>
              <span className="text-[10px] text-slate-400 block">
                Flip ROI &times; (12 / {holdingPeriodMonths} mos)
              </span>
            </div>
          </>
        )}

        {strategy === 'BRRRR' && (
          <>
            {/* Metric 5: Post-Refi Cashflow (P.M.) */}
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/80 flex flex-col justify-between min-h-[76px]">
              <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wide">
                Post-Refi Cashflow (P.M.)
              </span>
              <div className={`text-sm sm:text-base font-bold font-mono ${brrrrPostRefiCashflowZAR >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatZAR(brrrrPostRefiCashflowZAR)}
              </div>
              <span className="text-[10px] text-slate-400 block">
                NOI minus Post-Refi Bond
              </span>
            </div>

            {/* Metric 6: Refi Cash Extracted */}
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/80 flex flex-col justify-between min-h-[76px]">
              <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wide">
                Refi Cash Extracted
              </span>
              <div className="text-sm sm:text-base font-bold text-purple-300 font-mono">
                {formatZAR(brrrrEquityExtractedZAR)}
              </div>
              <span className="text-[10px] text-slate-400 block">
                Refi Bond &minus; All-In Cost
              </span>
            </div>

            {/* Metric 7: Cash Left in Deal */}
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/80 flex flex-col justify-between min-h-[76px]">
              <div className="flex items-center justify-between gap-1">
                <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wide">
                  Cash Left in Deal
                </span>
                {brrrrCashLeftInDealZAR === 0 && (
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/60">
                    R 0 = Infinite ROI
                  </span>
                )}
              </div>
              <div className={`text-sm sm:text-base font-bold font-mono ${brrrrCashLeftInDealZAR === 0 ? 'text-emerald-400' : 'text-white'}`}>
                {formatZAR(brrrrCashLeftInDealZAR)}
              </div>
              <span className="text-[10px] text-slate-400 block">
                {brrrrCashLeftInDealZAR === 0 ? '100% Capital Recycled' : 'Unrecovered Day-1 Equity'}
              </span>
            </div>

            {/* Metric 8: 20Y Net Equity */}
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/80 flex flex-col justify-between min-h-[76px]">
              <span className="text-teal-400 block text-[10px] font-semibold uppercase tracking-wide">
                {bondTermYears}Y Net Equity
              </span>
              <div className="text-sm sm:text-base font-bold text-teal-300 font-mono">
                {formatZAR(netEquityFinal)}
              </div>
              <span className="text-[10px] text-slate-400 block">
                Compounding asset value
              </span>
            </div>
          </>
        )}
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
