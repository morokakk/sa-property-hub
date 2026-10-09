'use client';

import React from 'react';
import { FlipProject } from '@/types';
import { FlipFinancialSummary } from '@/lib/calculations/flips';
import { formatZAR, formatPercent } from '@/lib/formatters';
import { AlertCircle, Gift } from 'lucide-react';

export interface FlipOperationalMathBannerProps {
  flip: FlipProject;
  financials: FlipFinancialSummary;
  onUpdateTaxMode?: (mode: 'Company (27%)' | 'Individual (45%)' | 'Pre-Tax') => void;
}

export function FlipOperationalMathBanner({
  flip,
  financials,
  onUpdateTaxMode,
}: FlipOperationalMathBannerProps) {
  const {
    totalBOQActualZAR: totalBOQActual,
    flipHoldingMonths,
    flipMonthlyHoldingCostZAR: flipMonthlyHoldingCost,
    totalHoldingCostZAR: totalHoldingCost,
    totalMunicipalClearanceOutlayZAR: totalMunicipalClearanceOutlay,
    exitCommissionPercent,
    exitCommissionZAR,
    projectedNetProfitZAR: projectedNetProfit,
    projectedRoiPercent: projectedROI,
    taxEntityType: currentTaxMode,
    effectiveTaxRatePercent: effectiveTaxRate,
    estimatedTaxProvisionZAR: estimatedTaxProvision,
    netProfitAfterTaxZAR: netProfitAfterTax,
    afterTaxRoiPercent: afterTaxROI,
    totalSponsorItemsCount,
    totalRetailBOQZAR: totalRetailBOQ,
    totalActualCashBOQZAR: totalActualCashBOQ,
    totalSponsorSavingsZAR: totalSponsorSavings,
  } = financials;

  const preTaxProfit = projectedNetProfit;

  return (
    <div className="bg-amber-50/60 border border-amber-200/90 rounded-xl p-3.5 px-4 space-y-2.5 text-xs shadow-2xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap text-slate-700">
          <span className="font-bold text-slate-900 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span>Operational Math:</span>
          </span>
          <span>Exit {formatZAR(flip.targetExitPriceZAR)}</span>
          <span className="text-slate-400">−</span>
          <span>Acquisition ({formatZAR(flip.purchasePriceZAR + flip.acquisitionCostsZAR)})</span>
          <span className="text-slate-400">−</span>
          <span>BOQ Spend ({formatZAR(totalBOQActual)})</span>
          {totalMunicipalClearanceOutlay > 0 && (
            <>
              <span className="text-slate-400">−</span>
              <span className="font-semibold text-blue-900 bg-blue-100 border border-blue-300 px-2 py-0.5 rounded">
                Sec 118 Clearance ({formatZAR(totalMunicipalClearanceOutlay)})
              </span>
            </>
          )}
          <span className="text-slate-400">−</span>
          <span className="font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded">
            Holding ({flipHoldingMonths} mos × {formatZAR(flipMonthlyHoldingCost)}/mo = {formatZAR(totalHoldingCost)})
          </span>
          {exitCommissionZAR > 0 && (
            <>
              <span className="text-slate-400">−</span>
              <span className="font-semibold text-rose-900 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded">
                Exit Comm {exitCommissionPercent}% ({formatZAR(exitCommissionZAR)})
              </span>
            </>
          )}
        </div>

        {/* Entity Tax Toggle (Pre-Tax / 27% Company / 45% Individual) */}
        {onUpdateTaxMode && (
          <div className="flex items-center gap-1.5 shrink-0 bg-white p-1 rounded-lg border border-amber-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase px-1">Entity Tax:</span>
            {(['Company (27%)', 'Individual (45%)', 'Pre-Tax'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onUpdateTaxMode(mode)}
                className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                  currentTaxMode === mode
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {mode === 'Company (27%)'
                  ? 'Company (27%)'
                  : mode === 'Individual (45%)'
                  ? 'Individual (45%)'
                  : 'Pre-Tax'}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 border-t border-amber-200/60 gap-2">
        {/* Sponsor / Barter Summary pill */}
        <div className="flex items-center gap-2 flex-wrap text-[11px]">
          {totalSponsorItemsCount > 0 ? (
            <div className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-900 border border-purple-200 px-2.5 py-0.5 rounded-lg font-semibold">
              <Gift className="w-3.5 h-3.5 text-purple-600" />
              <span>
                Commercial Retail Value: <strong>{formatZAR(totalRetailBOQ)}</strong>
              </span>
              <span>•</span>
              <span>
                Cash Outlay: <strong>{formatZAR(totalActualCashBOQ)}</strong>
              </span>
              <span>•</span>
              <span className="text-emerald-700 font-bold">
                Saved {formatZAR(totalSponsorSavings)} (
                {totalRetailBOQ > 0 ? ((totalSponsorSavings / totalRetailBOQ) * 100).toFixed(0) : 0}%)
              </span>
            </div>
          ) : (
            <span className="text-slate-500 text-[10px]">
              Pre-Tax Operational Profit: <strong>{formatZAR(preTaxProfit)}</strong> (
              {formatPercent(projectedROI)} Pre-Tax ROI)
            </span>
          )}
        </div>

        {/* Pre-Tax vs Post-Tax Result */}
        <div className="flex items-center gap-3 shrink-0 text-right">
          {effectiveTaxRate > 0 ? (
            <>
              <div className="text-[11px] text-slate-500">
                <span>
                  Pre-Tax: <strong>{formatZAR(preTaxProfit)}</strong>
                </span>
                <span className="text-rose-600 font-medium ml-1.5">
                  (-{formatZAR(estimatedTaxProvision)} tax)
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-medium mr-1.5 text-xs">
                  = Net Cash After {effectiveTaxRate}% Tax:
                </span>
                <strong className="text-emerald-700 font-black text-sm">
                  {formatZAR(netProfitAfterTax)}
                </strong>
                <span className="ml-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                  {formatPercent(afterTaxROI)} After-Tax
                </span>
              </div>
            </>
          ) : (
            <div>
              <span className="text-slate-500 font-medium mr-1.5 text-xs">= Pre-Tax Net Profit:</span>
              <strong className="text-emerald-700 font-black text-sm">
                {formatZAR(projectedNetProfit)}
              </strong>
              <span className="ml-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                {formatPercent(projectedROI)} Pre-Tax
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FlipOperationalMathBanner;
