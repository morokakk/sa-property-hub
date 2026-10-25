'use client';

import React, { useState } from 'react';
import { FlipProject } from '@/types';
import { FlipFinancialSummary } from '@/lib/calculations/flips';
import { formatZAR, formatPercent, formatDate } from '@/lib/formatters';

export interface FlipMetricsCardsProps {
  flip: FlipProject;
  financials: FlipFinancialSummary;
  onOpenDelayMatrix?: () => void;
}

export function FlipMetricsCards({
  flip,
  financials,
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
    numberOfUnits,
    rehabCostPerUnitZAR,
    allInCostPerUnitZAR,
    isBuildToRent,
  } = financials;
  const isMultiUnit = (numberOfUnits || 1) > 1;

  // Calculate BOQ Baseline vs Master Budget Contingency
  const boqBaselineTotal = (flip.boq || []).reduce((acc, item) => acc + (item.baselineTotalZAR || 0), 0);
  const contingencyBufferZAR = Math.max(0, flip.baselineRenovationBudgetZAR - boqBaselineTotal);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
      {/* 1. Purchase & Costs */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between min-h-[112px]">
        <div>
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Purchase &amp; Costs</span>
          <div className="text-xl font-bold text-slate-900 tabular-nums tracking-tight mt-0.5">
            {formatZAR(flip.purchasePriceZAR + flip.acquisitionCostsZAR + totalMunicipalClearanceOutlay)}
          </div>
        </div>
        <div
          className="text-[11px] text-slate-500 mt-1 leading-tight"
          title={`Purchase Price: ${formatZAR(flip.purchasePriceZAR)} • Conveyancing & Duty: ${formatZAR(flip.acquisitionCostsZAR)}${totalMunicipalClearanceOutlay > 0 ? ` • Sec 118 RCC Outlay: ${formatZAR(totalMunicipalClearanceOutlay)}` : ''}${isMultiUnit ? ` • All-In Cost / Unit: ${formatZAR(allInCostPerUnitZAR)}` : ''}`}
        >
          <div>Acq &amp; Legal: {formatZAR(flip.purchasePriceZAR + flip.acquisitionCostsZAR, { compact: true })}</div>
          {isMultiUnit ? (
            <div className="text-[10px] font-bold text-indigo-700">
              All-In: {formatZAR(allInCostPerUnitZAR, { compact: true })} / unit ({numberOfUnits}u)
            </div>
          ) : (
            <div className="text-[10px] text-slate-400">
              {totalMunicipalClearanceOutlay > 0 ? `Sec 118: ${formatZAR(totalMunicipalClearanceOutlay, { compact: true })}` : 'Rates Clearance: R 0'}
            </div>
          )}
        </div>
      </div>

      {/* 2. BOQ Renovation Spend */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between min-h-[112px]">
        <div>
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">BOQ Renovation Spend</span>
          <div className="text-xl font-bold text-indigo-700 tabular-nums tracking-tight mt-0.5">
            {formatZAR(totalBOQActual)}
          </div>
        </div>
        <div
          className="text-[11px] text-slate-500 mt-1 leading-tight"
          title={`Master Budget: ${formatZAR(flip.baselineRenovationBudgetZAR)} (${formatZAR(boqBaselineTotal)} allocated BOQ baseline + ${formatZAR(contingencyBufferZAR)} unallocated contingency buffer)${isMultiUnit ? ` • Build Cost / Unit: ${formatZAR(rehabCostPerUnitZAR)}` : ''}`}
        >
          <div>BOQ Baseline: {formatZAR(boqBaselineTotal, { compact: true })}</div>
          {isMultiUnit ? (
            <div className="text-[10px] text-indigo-600 font-bold">
              Build: {formatZAR(rehabCostPerUnitZAR, { compact: true })} / unit
            </div>
          ) : (
            <div className="text-[10px] text-emerald-600 font-medium">Contingency: {formatZAR(contingencyBufferZAR, { compact: true })} Buffer</div>
          )}
        </div>
      </div>

      {/* 3. Total Holding Cost Card (Expandable Itemization) */}
      <div
        id="flips-holding-cost"
        className="scroll-mt-20 bg-white p-3.5 rounded-xl border border-amber-200/90 shadow-2xs flex flex-col justify-between min-h-[112px] relative"
      >
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Holding Cost</span>
            <span className="text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded font-bold border border-amber-200 tabular-nums">
              {flipHoldingMonths} Mos
            </span>
          </div>
          <div className="text-xl font-bold text-amber-700 tabular-nums tracking-tight mt-0.5">
            - {formatZAR(totalHoldingCost)}
          </div>
        </div>

        <div className="mt-1 pt-1.5 border-t border-amber-100 flex items-center justify-between">
          <div className="text-[10px] text-slate-600 font-medium" title={`${formatZAR(flipMonthlyHoldingCost)}/mo carrying burn`}>
            {formatZAR(flipMonthlyHoldingCost, { compact: true })}/mo burn
          </div>
          <button
            type="button"
            onClick={() => setShowHoldingBreakdown((prev) => !prev)}
            className="text-[10px] font-semibold text-amber-800 hover:text-amber-950 cursor-pointer transition-colors shrink-0"
          >
            {showHoldingBreakdown ? '▲ Hide' : '▼ Breakdown'}
          </button>
        </div>

        {showHoldingBreakdown && (
          <div className="absolute left-0 right-0 top-full mt-1.5 z-20 space-y-1 text-[10px] text-slate-600 bg-white p-3 rounded-xl border border-amber-300 shadow-xl animate-in fade-in zoom-in-95 duration-100">
            <div className="font-bold text-slate-800 border-b border-amber-100 pb-1 mb-1.5">Monthly Carrying Burn Breakdown</div>
            <div className="flex justify-between">
              <span>Interim Bond:</span>
              <strong className="text-slate-800 font-semibold tabular-nums">{formatZAR(flip.monthlyBondPaymentZAR || 0)}/m</strong>
            </div>
            <div className="flex justify-between">
              <span>{flip.propertyType === 'Freehold House' ? 'Levies (N/A):' : 'Body Corporate / HOA:'}</span>
              <strong className="text-slate-800 font-semibold">
                {flip.propertyType === 'Freehold House' ? 'R 0 (Freehold)' : `${formatZAR(flip.monthlyLeviesZAR || 0)}/m`}
              </strong>
            </div>
            <div className="flex justify-between">
              <span>Rates &amp; Taxes:</span>
              <strong className="text-slate-800 font-semibold tabular-nums">{formatZAR(flip.monthlyRatesTaxesZAR || 0)}/m</strong>
            </div>
            <div className="flex justify-between">
              <span>Security &amp; Other:</span>
              <strong className="text-slate-800 font-semibold tabular-nums">{formatZAR(flip.monthlyOtherHoldingCostZAR || 0)}/m</strong>
            </div>
          </div>
        )}
      </div>

      {/* 4. Budget Variance */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between min-h-[112px]">
        <div>
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Budget Variance</span>
          <div
            className={`text-xl font-bold tabular-nums tracking-tight mt-0.5 ${
              totalBOQVariance <= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {totalBOQVariance > 0 ? `+${formatZAR(totalBOQVariance)}` : formatZAR(totalBOQVariance)}
          </div>
        </div>
        <div
          className="text-[11px] text-slate-500 mt-1 leading-tight"
          title={`Net Trade Variance vs ${formatZAR(boqBaselineTotal)} BOQ Baseline: ${formatZAR(totalBOQVariance)}`}
        >
          <div>{totalBOQVariance <= 0 ? 'Under BOQ Baseline' : 'Over BOQ Baseline'}</div>
          <div className="text-[10px] text-emerald-600 font-medium">
            {formatZAR(contingencyBufferZAR, { compact: true })} Buffer Intact
          </div>
        </div>
      </div>

      {/* 5. Target Exit Valuation */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between min-h-[112px]">
        <div>
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Target Exit Valuation</span>
          <div className="text-xl font-bold text-slate-900 tabular-nums tracking-tight mt-0.5">
            {formatZAR(flip.targetExitPriceZAR)}
          </div>
        </div>
        <div className="text-[11px] text-slate-500 mt-1 leading-tight">
          <div className="text-[10px] uppercase font-semibold text-slate-400">Target Date</div>
          <div className="font-medium text-slate-700">{formatDate(flip.targetCompletionDate)}</div>
        </div>
      </div>

      {/* 6. Projected Net Upside / Post-Build Equity Created */}
      <div className="bg-slate-900 text-white p-3.5 rounded-xl border border-slate-800 shadow-xs flex flex-col justify-between min-h-[112px]">
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            {isBuildToRent ? 'Post-Build Equity Created' : 'Projected Net Upside'}
          </span>
          <div className="text-xl font-bold text-emerald-400 tabular-nums tracking-tight mt-0.5">
            {effectiveTaxRate > 0 ? formatZAR(netProfitAfterTax) : formatZAR(projectedNetProfit)}
          </div>
        </div>
        <div className="text-[11px] text-slate-300 mt-1 font-semibold leading-tight flex items-center justify-between gap-1">
          <span>
            {isBuildToRent
              ? `${formatPercent(projectedROI)} Equity Gain`
              : `${effectiveTaxRate > 0 ? formatPercent(afterTaxROI) : formatPercent(projectedROI)} ${
                  effectiveTaxRate > 0 ? 'After-Tax ROI' : 'Net ROI'
                }`}
          </span>
          <span className="text-[10px] text-emerald-400 font-medium bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded tabular-nums">
            {isBuildToRent
              ? 'Hold for Rent (0% Tax)'
              : effectiveTaxRate > 0
                ? `${effectiveTaxRate}% Tax`
                : 'Pre-Tax'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default FlipMetricsCards;
