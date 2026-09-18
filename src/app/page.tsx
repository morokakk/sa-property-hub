'use client';

import React from 'react';
import TopHeader from '@/components/navigation/TopHeader';
import AssetAllocationChart from '@/components/dashboard/AssetAllocationChart';
import UpcomingDeadlines from '@/components/dashboard/UpcomingDeadlines';
import PriorityTasksWidget from '@/components/dashboard/PriorityTasksWidget';
import { usePortfolioStore, usePortfolioSummary } from '@/lib/store/usePortfolioStore';
import { formatZAR, formatPercent, formatDate } from '@/lib/formatters';
import { calculateRentalCashflow } from '@/lib/calculations/propertyMetrics';
import {
  TrendingUp,
  ShieldCheck,
  Building,
  Hammer,
  Coins,
  ArrowUpRight,
  PlusCircle,
  FileCheck2,
  Users,
} from 'lucide-react';
import Link from 'next/link';

export default function GlobalDashboardPage() {
  const summary = usePortfolioSummary();
  const rentals = usePortfolioStore((state) => state.rentals);
  const flips = usePortfolioStore((state) => state.flips);
  const funding = usePortfolioStore((state) => state.funding);

  const equityRatio = summary.totalGrossAssetValue > 0
    ? (summary.netEquity / summary.totalGrossAssetValue) * 100
    : 0;

  return (
    <div className="flex-1 flex flex-col">
      <TopHeader
        title="Global Portfolio Dashboard"
        subtitle="Executive South African real estate portfolio overview, net equity, and operations"
        actionButton={
          <Link
            href="/analyzer"
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-sm transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Analyze New Deal
          </Link>
        }
      />

      <main className="flex-1 p-4 sm:p-6 space-y-6 max-w-7xl w-full mx-auto">
        {/* Top Executive KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Total Portfolio Value */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Total Portfolio Value</span>
              <Building className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-bold text-slate-900 mt-1">
              {formatZAR(summary.totalGrossAssetValue)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Gross Assets</span>
              <span className="font-medium text-slate-700">{summary.activeRentalsCount + summary.activeFlipsCount} properties</span>
            </div>
          </div>

          {/* Total Liabilities */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Total Liabilities</span>
              <Coins className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-xl font-bold text-slate-900 mt-1">
              {formatZAR(summary.totalFundingLiabilities)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Bonds + Lenders</span>
              <span className="text-rose-600 font-medium">
                {formatPercent(100 - equityRatio)} Gearing
              </span>
            </div>
          </div>

          {/* Net Equity */}
          <div className="bg-emerald-900 text-white rounded-xl p-4 border border-emerald-800 shadow-md shadow-emerald-950/20">
            <div className="flex items-center justify-between text-emerald-200 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Net Equity (ZAR)</span>
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
            </div>
            <div className="text-xl font-extrabold text-white mt-1">
              {formatZAR(summary.netEquity)}
            </div>
            <div className="text-[11px] text-emerald-200/80 mt-1 flex items-center justify-between">
              <span>Assets minus Debt</span>
              <span className="bg-emerald-800/80 px-1.5 py-0.2 rounded text-emerald-100 font-semibold">
                {formatPercent(equityRatio)} Equity
              </span>
            </div>
          </div>

          {/* Monthly Net Cash Flow */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Net Monthly Cash Flow</span>
              <TrendingUp className="w-4 h-4 text-teal-600" />
            </div>
            <div className={`text-xl font-bold mt-1 ${summary.monthlyNetRentalCashflow >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
              {formatZAR(summary.monthlyNetRentalCashflow)}
              <span className="text-xs font-normal text-slate-400">/mo</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Rentals Net Cash</span>
              <span className="text-emerald-600 font-medium">After Levies & Bonds</span>
            </div>
          </div>

          {/* Flip Pipeline Upside */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Projected Flip Profits</span>
              <Hammer className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-xl font-bold text-slate-900 mt-1">
              {formatZAR(summary.totalProjectedFlipProfits)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Active Flips Upside</span>
              <span className="text-indigo-600 font-medium">{summary.activeFlipsCount} in progress</span>
            </div>
          </div>
        </div>

        {/* Middle Operational Section: Allocation Chart + Deadlines + Priority Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <AssetAllocationChart summary={summary} />
          <UpcomingDeadlines />
          <PriorityTasksWidget />
        </div>

        {/* Bottom Section: Active Deals Summary Grids */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Buy-and-Flips Quick Look */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Hammer className="w-4 h-4 text-indigo-600" />
                <h3 className="font-semibold text-slate-900 text-sm">Active Buy-and-Flips</h3>
              </div>
              <Link
                href="/flips"
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
              >
                View Flips <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {flips.map((flip) => {
                const totalBoqActual = flip.boq.reduce(
                  (sum, item) => sum + (item.actualCostZAR || item.baselineTotalZAR),
                  0
                );
                const progressPct =
                  flip.baselineRenovationBudgetZAR > 0
                    ? Math.min(100, (totalBoqActual / flip.baselineRenovationBudgetZAR) * 100)
                    : 0;

                return (
                  <div
                    key={flip.id}
                    className="p-3 rounded-lg border border-slate-100 bg-slate-50/70 hover:bg-slate-100/80 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{flip.title}</h4>
                        <p className="text-[11px] text-slate-500">{flip.address}, {flip.city}</p>
                      </div>
                      <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
                        {flip.currentPhase}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs mt-3 pt-2 border-t border-slate-200/60">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Purchase</span>
                        <span className="font-semibold text-slate-800">{formatZAR(flip.purchasePriceZAR)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Target Exit</span>
                        <span className="font-semibold text-emerald-700">{formatZAR(flip.targetExitPriceZAR)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">BOQ Spend</span>
                        <span className="font-semibold text-slate-800">
                          {formatZAR(totalBoqActual)} ({formatPercent(progressPct)})
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Rental Portfolio Quick Look */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-emerald-600" />
                <h3 className="font-semibold text-slate-900 text-sm">Active Rental Units</h3>
              </div>
              <Link
                href="/rentals"
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
              >
                View Rentals <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {rentals.map((rental) => {
                const { netMonthlyCashflowZAR: netMonthly } = calculateRentalCashflow(rental);

                return (
                  <div
                    key={rental.id}
                    className="p-3 rounded-lg border border-slate-100 bg-slate-50/70 hover:bg-slate-100/80 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{rental.title}</h4>
                        <p className="text-[11px] text-slate-500">
                          Tenant: <span className="font-medium text-slate-700">{rental.tenantName}</span> (Lease to {formatDate(rental.leaseEndDate)})
                        </p>
                      </div>
                      <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                        {rental.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs mt-3 pt-2 border-t border-slate-200/60">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Market Value</span>
                        <span className="font-semibold text-slate-800">{formatZAR(rental.marketValueZAR)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Gross Rent</span>
                        <span className="font-semibold text-slate-800">{formatZAR(rental.monthlyGrossRentZAR)}/m</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Net Cashflow</span>
                        <span className={`font-bold ${netMonthly >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {formatZAR(netMonthly)}/m
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Centralized Financing Summary Banner */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-5 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold">Funding & Capital Facility Status</h4>
              <p className="text-xs text-slate-300 mt-0.5">
                {funding.length} Active capital sources registered across private lenders, joint ventures, and angel investors.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-right">
            <div>
              <span className="text-[10px] uppercase text-slate-400 font-semibold block">Total Facility Drawn</span>
              <span className="text-base font-bold text-emerald-400">{formatZAR(summary.totalPrivateFundingLiability)}</span>
            </div>
            <Link
              href="/funding"
              className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors border border-white/10"
            >
              Manage Ledger
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
