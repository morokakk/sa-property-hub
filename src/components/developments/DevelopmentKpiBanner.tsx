'use client';

import React, { useState } from 'react';
import { DevelopmentProject } from '@/types';
import { DevelopmentFinancialSummary } from '@/lib/calculations/developments';
import { formatZAR, formatPercent } from '@/lib/formatters';
import {
  Coins,
  TrendingUp,
  Building,
  Hammer,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck,
  Scale,
} from 'lucide-react';

export interface DevelopmentKpiBannerProps {
  development: DevelopmentProject;
  financials: DevelopmentFinancialSummary;
  showAfterTax?: boolean;
  onToggleAfterTax?: () => void;
}

export function DevelopmentKpiBanner({
  development,
  financials,
  showAfterTax: propShowAfterTax,
  onToggleAfterTax: propOnToggleAfterTax,
}: DevelopmentKpiBannerProps) {
  const [internalAfterTax, setInternalAfterTax] = useState(false);
  const isAfterTax = propShowAfterTax !== undefined ? propShowAfterTax : internalAfterTax;
  const toggleAfterTax = propOnToggleAfterTax || (() => setInternalAfterTax((prev) => !prev));

  // Profit on Cost color threshold
  const activePoc = isAfterTax ? financials.afterTaxPocPercent : financials.pocPercent;
  let pocColorClasses = 'text-rose-700 bg-rose-50 border-rose-200';
  if (activePoc >= 20) {
    pocColorClasses = 'text-emerald-700 bg-emerald-50 border-emerald-200';
  } else if (activePoc >= 12) {
    pocColorClasses = 'text-amber-700 bg-amber-50 border-amber-200';
  }

  // Hard Build Rate actual spend per m2
  const actualSpendPerSqm = financials.actualBoqSpendPerSqmZAR;

  // Pre-sales hurdle progress
  const hurdleProgressRatio = financials.preSalesHurdleProgressRatioPercent;

  // Wipeout coverage ratio
  const wipeoutCoveragePercent = financials.debtFacilityRepaidPercent;

  return (
    <div
      data-testid="development-kpi-banner"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4"
    >
      {/* 1. Total Development Cost (TDC) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider">TDC (Total Cost)</span>
          <Coins className="w-4 h-4 text-slate-400" />
        </div>
        <div>
          <div className="text-xl font-bold text-slate-900 tracking-tight">
            {formatZAR(financials.tdcZAR)}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className="text-[11px] font-medium bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
              {formatZAR(financials.tdcPerSqmZAR)}/m²
            </span>
            <span className="text-[11px] font-medium bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
              {formatZAR(financials.tdcPerUnitZAR)}/unit
            </span>
          </div>
        </div>
      </div>

      {/* 2. Gross Development Value (GDV) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider">GDV (Gross Value)</span>
          <Building className="w-4 h-4 text-blue-500" />
        </div>
        <div>
          <div className="text-xl font-bold text-slate-900 tracking-tight">
            {formatZAR(financials.gdvInclVatZAR)}
          </div>
          <div className="mt-2">
            {development.isVatRegisteredDeveloper ? (
              <span className="text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-blue-600" />
                15% VAT • R0 Buyer Duty
              </span>
            ) : (
              <span className="text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full">
                Direct / Non-VAT
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Profit on Cost (POC %) */}
      <div
        className={`bg-white rounded-xl border p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between ${
          activePoc >= 20
            ? 'border-emerald-200'
            : activePoc >= 12
            ? 'border-amber-200'
            : 'border-rose-200'
        }`}
      >
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider">Profit on Cost</span>
          <TrendingUp className="w-4 h-4 text-emerald-600" />
        </div>
        <div>
          <div className="flex items-baseline justify-between gap-1">
            <span className="text-xl font-bold text-slate-900 tracking-tight">
              {formatPercent(activePoc)}
            </span>
            <span
              className={`text-xs font-bold px-1.5 py-0.5 rounded border ${pocColorClasses}`}
            >
              {isAfterTax ? 'After Tax' : 'Pre-Tax'}
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {isAfterTax
              ? formatZAR(financials.netProfitAfterTaxZAR)
              : formatZAR(financials.netProfitBeforeTaxZAR)}
          </div>
          <div className="mt-2">
            <button
              type="button"
              onClick={toggleAfterTax}
              aria-label="Toggle 27% Corporate Tax"
              className="text-[10px] font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded border border-slate-300 transition-colors cursor-pointer"
            >
              {isAfterTax ? 'Switch to Pre-Tax' : 'Apply 27% Tax'}
            </button>
          </div>
        </div>
      </div>

      {/* 4. Hard Build Rate */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider">Hard Build Rate</span>
          <Hammer className="w-4 h-4 text-amber-500" />
        </div>
        <div>
          <div className="text-base font-bold text-slate-900">
            {formatZAR(development.budgetedHardCostPerSqmZAR)}/m²
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Actual BOQ:{' '}
            <span className="font-semibold text-slate-800">
              {actualSpendPerSqm > 0 ? `${formatZAR(actualSpendPerSqm)}/m²` : 'R 0/m²'}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Spend: {formatZAR(financials.actualBoqSpendZAR)} / {formatZAR(financials.budgetedHardBuildCostZAR)}
          </div>
        </div>
      </div>

      {/* 5. Pre-Sales Hurdle & Debt Wipeout */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider">Pre-Sales & Debt</span>
          {financials.isPreSalesHurdleMet ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <Clock className="w-4 h-4 text-amber-500" />
          )}
        </div>
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-semibold text-slate-800">
              {`${financials.preSoldUnitsCount}/${financials.totalUnitsCount} Units`}
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                financials.isPreSalesHurdleMet
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {financials.isPreSalesHurdleMet ? (
                <span className="inline-flex items-center gap-1">
                  <span>Hurdle Met</span>
                  <CheckCircle2 className="w-3 h-3 text-emerald-700 inline" />
                </span>
              ) : (
                'Pending'
              )}
            </span>
          </div>
          {/* Hurdle progress bar */}
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                financials.isPreSalesHurdleMet ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${hurdleProgressRatio}%` }}
            />
          </div>
          <div className="text-[10px] text-slate-500 mt-1.5 flex justify-between">
            <span>Pre-sold: {formatPercent(financials.preSoldGdvPercent)}</span>
            <span>Target: {formatPercent(development.preSalesHurdlePercent)}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Wipeout: {financials.unitsRequiredForDebtWipeout} units required
          </div>
        </div>
      </div>

      {/* 6. Hybrid Split-Exit Summary */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider">Hybrid Split-Exit</span>
          <Scale className="w-4 h-4 text-purple-600" />
        </div>
        <div>
          <div className="text-xs font-bold text-slate-900">
            {`${financials.unitsSoldAndTransferredCount} Sold • ${financials.unitsRetainedCount} Retained`}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Rent: <span className="font-semibold text-slate-800">{formatZAR(financials.retainedMonthlyGrossRentZAR)}/mo</span>
          </div>
          <div className="mt-2">
            {financials.isSection13SexEligible ? (
              <span className="text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded-full inline-flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-600" />
                Section 13sex Active
              </span>
            ) : (
              <span className="text-[10px] text-slate-400">
                {financials.unitsRetainedCount >= 5
                  ? 'Eligible for Sec 13sex'
                  : `${financials.unitsNeededForSection13Sex} more for Sec 13sex`}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
