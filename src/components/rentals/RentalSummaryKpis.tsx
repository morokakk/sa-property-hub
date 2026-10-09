'use client';

import React from 'react';
import { formatZAR } from '@/lib/formatters';
import { AlertTriangle } from 'lucide-react';

export interface RentalSummaryKpisProps {
  totalRentalValue: number;
  totalGrossMonthlyRent: number;
  netMonthlyCashflow: number;
  totalBondLiabilities: number;
  annualRentalTaxReserve: number;
  monthlyRentalTaxReserve: number;
  activeRentalsCount: number;
}

export function RentalSummaryKpis({
  totalRentalValue,
  totalGrossMonthlyRent,
  netMonthlyCashflow,
  totalBondLiabilities,
  annualRentalTaxReserve,
  monthlyRentalTaxReserve,
  activeRentalsCount,
}: RentalSummaryKpisProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
        <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Rental Asset Value</span>
        <div className="text-xl font-bold text-slate-900 mt-1">{formatZAR(totalRentalValue)}</div>
        <p className="text-[11px] text-slate-400 mt-0.5">{activeRentalsCount} active rental units</p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
        <span className="text-[11px] font-semibold text-slate-500 uppercase">Gross Monthly Rent</span>
        <div className="text-xl font-bold text-slate-900 mt-1">{formatZAR(totalGrossMonthlyRent)}/m</div>
        <p className="text-[11px] text-slate-400 mt-0.5">Annual: {formatZAR(totalGrossMonthlyRent * 12)}</p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
        <span className="text-[11px] font-semibold text-slate-500 uppercase">Net Monthly Cash Flow</span>
        <div className={`text-xl font-bold mt-1 ${netMonthlyCashflow >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
          {formatZAR(netMonthlyCashflow)}/m
        </div>
        <p className="text-[11px] text-slate-400 mt-0.5">Operational pre-tax cash flow</p>
      </div>

      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
        <span className="text-[11px] font-semibold text-slate-500 uppercase">Rental Bonds Outstanding</span>
        <div className="text-xl font-bold text-slate-900 mt-1">{formatZAR(totalBondLiabilities)}</div>
        <p className="text-[11px] text-slate-400 mt-0.5">Active mortgage debt</p>
      </div>

      <div className="bg-amber-50/70 rounded-xl p-4 border border-amber-200 shadow-xs">
        <div className="flex items-center justify-between text-amber-800 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider">Rental Tax Reserve</span>
          <AlertTriangle className="w-4 h-4 text-amber-600" />
        </div>
        <div className="text-xl font-bold text-amber-900 mt-1">
          {formatZAR(annualRentalTaxReserve)}
          <span className="text-xs font-normal text-amber-600">/yr</span>
        </div>
        <p className="text-[11px] text-amber-700 mt-0.5">
          {formatZAR(monthlyRentalTaxReserve)}/m • SARS Liability Reserve
        </p>
      </div>
    </div>
  );
}

export default RentalSummaryKpis;
