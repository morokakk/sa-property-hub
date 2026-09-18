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
  Wallet,
  Edit3,
  ArrowRight,
  Check,
} from 'lucide-react';
import Link from 'next/link';

export default function GlobalDashboardPage() {
  const summary = usePortfolioSummary();
  const rentals = usePortfolioStore((state) => state.rentals);
  const flips = usePortfolioStore((state) => state.flips);
  const funding = usePortfolioStore((state) => state.funding);
  const updateLiquidReserve = usePortfolioStore((state) => state.updateLiquidReserve);

  const [showEditSeedModal, setShowEditSeedModal] = React.useState(false);
  const [seedAmount, setSeedAmount] = React.useState(summary.liquidCapitalReserve);

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
        {/* Available Liquidity & Purchasing Power Banner */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 rounded-2xl p-5 text-white border border-emerald-800/40 shadow-lg relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700/50">
                    Seed Capital & Purchasing Power
                  </span>
                  <span className="text-xs text-slate-400">Ready for next flip / acquisition</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white mt-1 tracking-tight flex items-baseline gap-2">
                  {formatZAR(summary.totalAvailablePurchasingPower)}
                  <span className="text-xs font-normal text-slate-400 font-sans">Total Purchasing Power</span>
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border-t lg:border-t-0 lg:border-l border-slate-800 pt-3 lg:pt-0 lg:pl-6">
              <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-0.5">
                  <span>Liquid Cash Reserve</span>
                  <button
                    onClick={() => {
                      setSeedAmount(summary.liquidCapitalReserve);
                      setShowEditSeedModal(true);
                    }}
                    className="text-emerald-400 hover:text-emerald-300 p-0.5 rounded hover:bg-emerald-950 transition-colors"
                    title="Edit Seed Capital Reserve"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                </div>
                <div className="text-base font-bold text-emerald-300">
                  {formatZAR(summary.liquidCapitalReserve)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Direct cash in reserve
                </div>
              </div>

              <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60">
                <div className="text-[11px] text-slate-400 mb-0.5">Unallocated Debt/Facilities</div>
                <div className="text-base font-bold text-indigo-300">
                  {formatZAR(summary.unallocatedFundingReserve)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Pre-approved lender facilities
                </div>
              </div>

              <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60 col-span-2 sm:col-span-1">
                <div className="text-[11px] text-slate-400 mb-0.5">Realized Flip Profits</div>
                <div className="text-base font-bold text-amber-300">
                  {formatZAR(summary.totalRealizedFlipProfits)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  From {summary.completedFlipsCount} completed exits
                </div>
              </div>
            </div>
          </div>
        </div>

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

        {/* Quick Edit Seed Capital Modal */}
        {showEditSeedModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Adjust Liquid Seed Capital</h3>
                    <p className="text-xs text-slate-500">Unallocated cash reserve for future deals</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEditSeedModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              <div className="py-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Liquid Cash in Reserve (ZAR)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">R</span>
                    <input
                      type="number"
                      value={seedAmount}
                      onChange={(e) => setSeedAmount(Number(e.target.value))}
                      className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold text-lg focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                      placeholder="650000"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                    Note: Marking flipped projects or sold rental properties as completed will automatically credit 100% of their net sale cash proceeds into this liquid balance.
                  </p>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200/60 flex items-start gap-2.5 text-xs text-emerald-900">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Automatic Multi-Property Flow</p>
                    <p className="text-emerald-700 text-[11px] mt-0.5">
                      Current realized profits from closed exits: <span className="font-bold">{formatZAR(summary.totalRealizedFlipProfits)}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setShowEditSeedModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    updateLiquidReserve(Number(seedAmount));
                    setShowEditSeedModal(false);
                  }}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
                >
                  Save Reserve Balance
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
