'use client';

import React from 'react';
import { PortfolioSummary, RentalProperty } from '@/types';
import { formatZAR } from '@/lib/formatters';
import { Coins, ShieldCheck, Info, FileCheck2 } from 'lucide-react';
import Link from 'next/link';

interface ConsolidatedTaxCardProps {
  summary: PortfolioSummary;
  rentals: RentalProperty[];
}

export default function ConsolidatedTaxCard({ summary, rentals }: ConsolidatedTaxCardProps) {
  // Compute annual Section 11(a) bond interest tax deduction across active rentals
  const sec11aDeductibleInterest = React.useMemo(() => {
    return (rentals || [])
      .filter((r) => r && r.status !== 'Sold')
      .reduce((sum, r) => {
        if (r.outstandingBondBalanceZAR && r.bondInterestRatePercent) {
          return sum + Math.round(r.outstandingBondBalanceZAR * (r.bondInterestRatePercent / 100));
        }
        return sum;
      }, 0);
  }, [rentals]);

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
              <Coins className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded border border-amber-200">
                SARS Provisional Tax & ITR12 Reserve
              </span>
              <h3 className="text-sm font-bold text-slate-900 mt-0.5">Total Provisional Tax Reserve</h3>
            </div>
          </div>
          <Link
            href="/rentals"
            className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Audit Tax ➔
          </Link>
        </div>

        {/* Primary Headline */}
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {formatZAR(summary.totalSarsProvisionalTaxReserve)}
          </span>
          <span className="text-xs font-semibold text-slate-500 font-sans">Combined Reserve</span>
        </div>

        {/* 2-Column Tax Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
          {/* Flips 27% Corporate Tax */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
              <span className="font-medium text-slate-600">Flips 27% Corporate Tax</span>
              <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                {summary.activeFlipsCount} Active
              </span>
            </div>
            <div className="text-sm font-bold text-rose-600">
              {formatZAR(summary.totalSarsFlipTaxReserve)}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Payable via 6-monthly provisional returns
            </p>
          </div>

          {/* Rentals Income Tax Reserve */}
          <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-100 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[11px] text-amber-900 mb-1">
              <span className="font-medium">Rentals Net Cashflow Tax</span>
              <span className="text-[10px] font-semibold text-amber-800 bg-amber-100/80 px-1.5 py-0.2 rounded border border-amber-200">
                {formatZAR(summary.monthlyRentalTaxReserve)}/m
              </span>
            </div>
            <div className="text-sm font-bold text-amber-900">
              {formatZAR(summary.annualRentalTaxReserve)}
              <span className="text-xs font-normal text-amber-700">/yr</span>
            </div>
            <p className="text-[10px] text-amber-700/80 mt-0.5">
              Net taxable rental cashflow reserve
            </p>
          </div>
        </div>
      </div>

      {/* Footer: SARS Section 11(a) Deductible Interest Shield */}
      <div
        className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 text-xs"
        title="Reflects interest-only deduction per SARS ITR12 guidelines"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-slate-700 font-medium truncate">
            Sec 11(a) Deductible Interest: <strong className="text-emerald-800 font-bold">{formatZAR(sec11aDeductibleInterest)}</strong>
          </span>
          <span
            className="text-slate-400 hover:text-slate-600 cursor-help shrink-0"
            title="Reflects interest-only deduction per SARS ITR12 guidelines"
          >
            <Info className="w-3.5 h-3.5" />
          </span>
        </div>
        <span
          className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0 whitespace-nowrap"
          title="Reflects interest-only deduction per SARS ITR12 guidelines"
        >
          Code 4216 Shield
        </span>
      </div>
    </div>
  );
}
