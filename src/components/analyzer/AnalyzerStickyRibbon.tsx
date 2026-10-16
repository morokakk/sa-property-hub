'use client';

import React, { useState, useRef, useEffect } from 'react';
import { formatZAR, formatPercent } from '@/lib/formatters';
import { PlusCircle, Check, ArrowDownCircle, ChevronUp, Sparkles, X } from 'lucide-react';
import { DealStrategy } from '@/types';

export interface AnalyzerStickyRibbonProps {
  strategy?: DealStrategy;
  dayOneCapitalRequired: number;
  builtInEquity: number;
  builtInEquityPercent: number;
  grossYield: number;
  netCapRate: number;
  monthlyNetCashFlow: number;
  netRoi?: number;
  dscr?: number | null;
  fiveYearIrrPercent?: number;
  projectedFlipProfit: number;
  projectedFlipROI: number;
  annualizedFlipROI?: number;
  monthlyHoldingBurnZAR?: number;
  brrrrPostRefiCashflowZAR?: number;
  brrrrEquityExtractedZAR?: number;
  brrrrCashLeftInDealZAR?: number;
  isEditing?: boolean;
  onSaveDeal: () => void;
  onScrollToResults?: () => void;
  // Itemized breakdown details for the popover
  cashDeposit?: number;
  transferDuty?: number;
  legalFees?: number;
  rehabCost?: number;
  auctioneerCommission?: number;
  municipalArrears?: number;
}

export function AnalyzerStickyRibbon({
  strategy = 'Rental',
  dayOneCapitalRequired,
  builtInEquity,
  builtInEquityPercent,
  grossYield,
  netCapRate,
  monthlyNetCashFlow,
  netRoi = 0,
  dscr = null,
  fiveYearIrrPercent = 0,
  projectedFlipProfit,
  projectedFlipROI,
  annualizedFlipROI = 0,
  monthlyHoldingBurnZAR = 0,
  brrrrPostRefiCashflowZAR = 0,
  brrrrEquityExtractedZAR = 0,
  brrrrCashLeftInDealZAR = 0,
  isEditing = false,
  onSaveDeal,
  onScrollToResults,
  cashDeposit,
  transferDuty,
  legalFees,
  rehabCost,
  auctioneerCommission,
  municipalArrears,
}: AnalyzerStickyRibbonProps) {
  const [showBreakdownPopover, setShowBreakdownPopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close breakdown popover on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowBreakdownPopover(false);
      }
    }
    if (showBreakdownPopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showBreakdownPopover]);

  const handleJumpToResults = () => {
    setShowBreakdownPopover(false);
    onScrollToResults?.();
  };

  return (
    <div className="fixed bottom-20 md:bottom-5 left-3 right-3 md:left-[276px] md:right-8 z-30 bg-slate-900/95 backdrop-blur-md text-white border border-slate-700/80 shadow-2xl px-3.5 sm:px-4 py-2.5 rounded-2xl animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        {/* Metric Pills Strip */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 text-xs flex-1 scrollbar-thin">
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

          {/* Strategy-Matched Primary KPIs */}
          {strategy === 'Rental' && (
            <>
              <div className="bg-slate-800/90 border border-slate-700 px-2.5 py-1 rounded-lg shrink-0">
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Net Cashflow / CoC</span>
                <span className={`font-bold font-mono ${monthlyNetCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatZAR(monthlyNetCashFlow)}/m ({formatPercent(netRoi)})
                </span>
              </div>
              <div className="bg-slate-800/90 border border-slate-700 px-2.5 py-1 rounded-lg shrink-0">
                <span className="text-[10px] text-slate-400 block uppercase font-medium">
                  {dscr === null ? 'DSCR / 5Y IRR' : 'DSCR / 5Y IRR'}
                </span>
                <span className="font-bold text-teal-300 font-mono">
                  {dscr === null ? 'N/A (Cash)' : `${dscr.toFixed(2)}x`} &bull; {formatPercent(fiveYearIrrPercent)} IRR
                </span>
              </div>
            </>
          )}

          {strategy === 'Flip' && (
            <>
              <div className="bg-slate-800/90 border border-slate-700 px-2.5 py-1 rounded-lg shrink-0">
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Monthly Burn</span>
                <span className="font-bold text-rose-400 font-mono">
                  -{formatZAR(monthlyHoldingBurnZAR)}/m
                </span>
              </div>
              <div className="bg-slate-800/90 border border-slate-700 px-2.5 py-1 rounded-lg shrink-0">
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Flip Profit / ROI (Ann.)</span>
                <span className="font-bold text-amber-300 font-mono">
                  {formatZAR(projectedFlipProfit)} ({formatPercent(projectedFlipROI)} &bull; {formatPercent(annualizedFlipROI)}/yr)
                </span>
              </div>
            </>
          )}

          {strategy === 'BRRRR' && (
            <>
              <div className="bg-slate-800/90 border border-slate-700 px-2.5 py-1 rounded-lg shrink-0">
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Post-Refi Cashflow</span>
                <span className={`font-bold font-mono ${brrrrPostRefiCashflowZAR >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatZAR(brrrrPostRefiCashflowZAR)}/m
                </span>
              </div>
              <div className="bg-slate-800/90 border border-slate-700 px-2.5 py-1 rounded-lg shrink-0">
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Cash Left / Extracted</span>
                <span className="font-bold text-purple-300 font-mono">
                  {brrrrCashLeftInDealZAR === 0 ? 'R 0 (Infinite ROI)' : formatZAR(brrrrCashLeftInDealZAR)} &bull; +{formatZAR(brrrrEquityExtractedZAR)}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Action Buttons & Popover */}
        <div className="relative flex items-center gap-2 shrink-0 self-end lg:self-center" ref={popoverRef}>
          {/* Breakdown Popover */}
          {showBreakdownPopover && (
            <div className="absolute bottom-full right-0 mb-3 w-80 sm:w-96 bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-700">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                    Day-1 Capital Breakdown
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBreakdownPopover(false)}
                  className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 text-xs cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Itemized Table */}
              <div className="space-y-1.5 text-xs">
                {cashDeposit !== undefined && (
                  <div className="flex justify-between text-slate-300">
                    <span>Cash Deposit:</span>
                    <span className="font-semibold text-emerald-400 font-mono">{formatZAR(cashDeposit)}</span>
                  </div>
                )}
                {transferDuty !== undefined && (
                  <div className="flex justify-between text-slate-300">
                    <span>SARS Transfer Duty:</span>
                    <span className="font-semibold text-slate-200 font-mono">{formatZAR(transferDuty)}</span>
                  </div>
                )}
                {legalFees !== undefined && (
                  <div className="flex justify-between text-slate-300">
                    <span>Legal &amp; Bond Fees:</span>
                    <span className="font-semibold text-slate-200 font-mono">{formatZAR(legalFees)}</span>
                  </div>
                )}
                {rehabCost !== undefined && (
                  <div className="flex justify-between text-slate-300">
                    <span>Renovation / Capex:</span>
                    <span className="font-semibold text-amber-400 font-mono">{formatZAR(rehabCost)}</span>
                  </div>
                )}
                {auctioneerCommission !== undefined && auctioneerCommission > 0 && (
                  <div className="flex justify-between text-amber-300">
                    <span>Auctioneer Commission:</span>
                    <span className="font-semibold font-mono">{formatZAR(auctioneerCommission)}</span>
                  </div>
                )}
                {municipalArrears !== undefined && municipalArrears > 0 && (
                  <div className="flex justify-between text-rose-300">
                    <span>Rates &amp; Taxes Arrears:</span>
                    <span className="font-semibold font-mono">{formatZAR(municipalArrears)}</span>
                  </div>
                )}

                <div className="pt-2 mt-2 border-t border-slate-700 flex justify-between items-center font-bold">
                  <span className="text-white text-xs">Total Day-1 Capital Required:</span>
                  <span className="text-emerald-400 font-mono text-sm">{formatZAR(dayOneCapitalRequired)}</span>
                </div>
              </div>

              {/* Jump Button */}
              {onScrollToResults && (
                <button
                  type="button"
                  onClick={handleJumpToResults}
                  className="w-full mt-3 bg-slate-800 hover:bg-slate-700 text-teal-300 hover:text-white border border-slate-600 rounded-lg py-2 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <ArrowDownCircle className="w-3.5 h-3.5 text-teal-400" />
                  <span>Jump to Full Results &amp; Projections ↓</span>
                </button>
              )}
            </div>
          )}

          {/* Breakdown Toggle Button */}
          <button
            type="button"
            onClick={() => setShowBreakdownPopover(!showBreakdownPopover)}
            className={`text-[11px] px-2.5 py-1.5 rounded-lg border transition-colors flex items-center gap-1 cursor-pointer ${
              showBreakdownPopover
                ? 'bg-slate-700 text-white border-slate-500 shadow-inner'
                : 'text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border-slate-600'
            }`}
            title="Inspect itemized cost and capital breakdown"
          >
            <ArrowDownCircle className="w-3.5 h-3.5 text-teal-400" />
            <span>Breakdown ▾</span>
          </button>

          {/* Save / Update Deal Button */}
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
