'use client';

import React, { useState } from 'react';
import { FlipProject } from '@/types';
import { FlipFinancialSummary } from '@/lib/calculations/flips';
import { formatZAR, formatPercent, formatDate } from '@/lib/formatters';
import { Clock } from 'lucide-react';

export interface FlipMetricsCardsProps {
  flip: FlipProject;
  financials: FlipFinancialSummary;
  onOpenDelayMatrix: () => void;
}

export function FlipMetricsCards({
  flip,
  financials,
  onOpenDelayMatrix,
}: FlipMetricsCardsProps) {
  const [showHoldingBreakdown, setShowHoldingBreakdown] = useState(false);

  const {
    totalBOQActualZAR: totalBOQActual,
    totalBOQVarianceZAR: totalBOQVariance,
    flipHoldingMonths,
    flipMonthlyHoldingCostZAR: flipMonthlyHoldingCost,
    totalHoldingCostZAR: totalHoldingCost,
    totalMunicipalClearanceOutlayZAR: totalMunicipalClearanceOutlay,
    projectedNetProfitZAR: projectedNetProfit,
    projectedRoiPercent: projectedROI,
    effectiveTaxRatePercent: effectiveTaxRate,
    netProfitAfterTaxZAR: netProfitAfterTax,
    afterTaxRoiPercent: afterTaxROI,
  } = financials;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
      {/* 1. Purchase & Costs */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <span className="text-[11px] font-semibold text-slate-500 uppercase">Purchase & Costs</span>
        <div className="text-xl font-bold text-slate-900 mt-1">
          {formatZAR(flip.purchasePriceZAR + flip.acquisitionCostsZAR + totalMunicipalClearanceOutlay)}
        </div>
        <div
          className="text-[11px] text-slate-400 mt-0.5 truncate"
          title={`Legal/Duty: ${formatZAR(flip.acquisitionCostsZAR)}${totalMunicipalClearanceOutlay > 0 ? ` • Sec 118: ${formatZAR(totalMunicipalClearanceOutlay)}` : ''}`}
        >
          Legal: {formatZAR(flip.acquisitionCostsZAR)}
          {totalMunicipalClearanceOutlay > 0 ? ` • Sec 118: ${formatZAR(totalMunicipalClearanceOutlay)}` : ''}
        </div>
      </div>

      {/* 2. BOQ Renovation Spend */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <span className="text-[11px] font-semibold text-slate-500 uppercase">BOQ Renovation Spend</span>
        <div className="text-xl font-bold text-indigo-700 mt-1">
          {formatZAR(totalBOQActual)}
        </div>
        <div className="text-[11px] text-slate-400 mt-0.5">
          Budget: {formatZAR(flip.baselineRenovationBudgetZAR)}
        </div>
      </div>

      {/* 3. Total Holding Cost Card (Expandable Itemization) */}
      <div
        id="flips-holding-cost"
        className="scroll-mt-20 bg-white p-4 rounded-xl border border-amber-200/90 shadow-xs flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Holding Cost</span>
            <span className="text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded font-bold border border-amber-200">
              {flipHoldingMonths} Mos
            </span>
          </div>
          <div className="text-xl font-bold text-amber-700 mt-1">
            - {formatZAR(totalHoldingCost)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5" title={`${formatZAR(flipMonthlyHoldingCost)}/mo carrying burn`}>
            {formatZAR(flipMonthlyHoldingCost)}/mo carrying burn
          </div>
        </div>

        <div className="mt-2.5 pt-2 border-t border-amber-100 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => setShowHoldingBreakdown((prev) => !prev)}
            className="text-[10px] font-semibold text-amber-800 hover:text-amber-950 flex items-center justify-between w-full cursor-pointer transition-colors"
          >
            <span>{showHoldingBreakdown ? '▲ Hide Breakdown' : '▼ Itemized Breakdown'}</span>
            <span className="text-[9px] text-slate-400">Monthly</span>
          </button>

          {showHoldingBreakdown && (
            <div className="mt-1 space-y-1 text-[10px] text-slate-600 bg-amber-50/60 p-2 rounded-lg border border-amber-200/80 animate-in fade-in duration-150">
              <div className="flex justify-between">
                <span>Interim Bond:</span>
                <strong className="text-slate-800 font-semibold">{formatZAR(flip.monthlyBondPaymentZAR || 0)}/m</strong>
              </div>
              <div className="flex justify-between">
                <span>{flip.propertyType === 'Freehold House' ? 'Levies (N/A):' : 'Body Corporate / HOA:'}</span>
                <strong className="text-slate-800 font-semibold">
                  {flip.propertyType === 'Freehold House' ? 'R 0 (Freehold)' : `${formatZAR(flip.monthlyLeviesZAR || 0)}/m`}
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Rates & Taxes:</span>
                <strong className="text-slate-800 font-semibold">{formatZAR(flip.monthlyRatesTaxesZAR || 0)}/m</strong>
              </div>
              <div className="flex justify-between">
                <span>Security & Other:</span>
                <strong className="text-slate-800 font-semibold">{formatZAR(flip.monthlyOtherHoldingCostZAR || 0)}/m</strong>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onOpenDelayMatrix}
            className="w-full py-1.5 px-2 bg-amber-100/90 hover:bg-amber-200/90 text-amber-950 font-bold text-[10px] rounded-lg border border-amber-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            title="Simulate Council / Transfer Delay Matrix (+30, +60, +90, +120 Days)"
          >
            <Clock className="w-3.5 h-3.5 text-amber-800" />
            <span>Simulate Delay Matrix (+30–120d)</span>
          </button>
        </div>
      </div>

      {/* 4. Budget Variance */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <span className="text-[11px] font-semibold text-slate-500 uppercase">Budget Variance</span>
        <div
          className={`text-xl font-bold mt-1 ${
            totalBOQVariance <= 0 ? 'text-emerald-600' : 'text-rose-600'
          }`}
        >
          {totalBOQVariance > 0 ? `+${formatZAR(totalBOQVariance)}` : formatZAR(totalBOQVariance)}
        </div>
        <div className="text-[11px] text-slate-400 mt-0.5">
          {totalBOQVariance <= 0 ? 'On or under budget' : 'Over budget'}
        </div>
      </div>

      {/* 5. Target Exit Valuation */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <span className="text-[11px] font-semibold text-slate-500 uppercase">Target Exit Valuation</span>
        <div className="text-xl font-bold text-slate-900 mt-1">
          {formatZAR(flip.targetExitPriceZAR)}
        </div>
        <div className="text-[11px] text-slate-400 mt-0.5">
          Target: {formatDate(flip.targetCompletionDate)}
        </div>
      </div>

      {/* 6. Projected Net Upside */}
      <div className="bg-gradient-to-br from-emerald-800 to-teal-900 text-white p-4 rounded-xl shadow-sm">
        <span className="text-[11px] font-semibold text-emerald-200 uppercase">Projected Net Upside</span>
        <div className="text-xl font-extrabold text-white mt-1">
          {effectiveTaxRate > 0 ? formatZAR(netProfitAfterTax) : formatZAR(projectedNetProfit)}
        </div>
        <div className="text-[11px] text-emerald-200 mt-0.5 font-bold flex items-center justify-between">
          <span>
            {effectiveTaxRate > 0 ? formatPercent(afterTaxROI) : formatPercent(projectedROI)}{' '}
            {effectiveTaxRate > 0 ? 'After-Tax ROI' : 'Net ROI'}
          </span>
          <span className="text-[9px] text-emerald-300 opacity-90 font-medium">
            {effectiveTaxRate > 0 ? `${effectiveTaxRate}% Tax Deducted` : 'Pre-Tax Margin'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default FlipMetricsCards;
