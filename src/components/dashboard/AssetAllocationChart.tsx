'use client';

import React from 'react';
import { formatZAR, formatPercent } from '@/lib/formatters';
import { PortfolioSummary } from '@/types';

interface AssetAllocationChartProps {
  summary: PortfolioSummary;
}

export default function AssetAllocationChart({ summary }: AssetAllocationChartProps) {
  const { totalRentalValue, totalFlipValue, liquidCapitalReserve, totalGrossAssetValue } = summary;

  const total = totalGrossAssetValue || 1;
  const rentalPercent = (totalRentalValue / total) * 100;
  const flipPercent = (totalFlipValue / total) * 100;
  const cashPercent = (liquidCapitalReserve / total) * 100;

  // SVG Donut calculation
  const radius = 68;
  const circumference = 2 * Math.PI * radius;

  const rentalStroke = (rentalPercent / 100) * circumference;
  const flipStroke = (flipPercent / 100) * circumference;
  const cashStroke = (cashPercent / 100) * circumference;

  const rentalOffset = 0;
  const flipOffset = -rentalStroke;
  const cashOffset = -(rentalStroke + flipStroke);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900 text-sm">Asset Allocation</h3>
          <span className="text-xs text-slate-500 font-medium">Gross Asset Basis</span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6 my-2">
          {/* SVG Donut Chart */}
          <div className="relative w-44 h-44 flex items-center justify-center shrink-0">
            <svg className="w-44 h-44 -rotate-90 transform" viewBox="0 0 160 160">
              {/* Background circle */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                className="text-slate-100"
                strokeWidth="18"
                stroke="currentColor"
                fill="transparent"
              />
              {/* Rentals - Emerald */}
              {rentalPercent > 0 && (
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  stroke="#10b981"
                  strokeWidth="18"
                  strokeDasharray={`${rentalStroke} ${circumference}`}
                  strokeDashoffset={rentalOffset}
                  strokeLinecap="butt"
                  fill="transparent"
                  className="transition-all duration-500"
                />
              )}
              {/* Flips - Indigo / Blue */}
              {flipPercent > 0 && (
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  stroke="#6366f1"
                  strokeWidth="18"
                  strokeDasharray={`${flipStroke} ${circumference}`}
                  strokeDashoffset={flipOffset}
                  strokeLinecap="butt"
                  fill="transparent"
                  className="transition-all duration-500"
                />
              )}
              {/* Liquid Cash - Amber */}
              {cashPercent > 0 && (
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  stroke="#f59e0b"
                  strokeWidth="18"
                  strokeDasharray={`${cashStroke} ${circumference}`}
                  strokeDashoffset={cashOffset}
                  strokeLinecap="butt"
                  fill="transparent"
                  className="transition-all duration-500"
                />
              )}
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Assets</span>
              <span className="text-xs font-bold text-slate-800">
                {formatZAR(totalGrossAssetValue, { compact: true })}
              </span>
            </div>
          </div>

          {/* Legend and values */}
          <div className="flex-1 w-full space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-emerald-500 shrink-0"></span>
                <span className="text-slate-700 font-medium">Active Rentals ({formatPercent(rentalPercent)})</span>
              </div>
              <span className="font-semibold text-slate-900">{formatZAR(totalRentalValue)}</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-indigo-500 shrink-0"></span>
                <span className="text-slate-700 font-medium">Ongoing Flips ({formatPercent(flipPercent)})</span>
              </div>
              <span className="font-semibold text-slate-900">{formatZAR(totalFlipValue)}</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-amber-500 shrink-0"></span>
                <span className="text-slate-700 font-medium">Liquid Cash ({formatPercent(cashPercent)})</span>
              </div>
              <span className="font-semibold text-slate-900">{formatZAR(liquidCapitalReserve)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Liabilities Comparison Bar */}
      <div className="mt-4 pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-slate-500 font-medium">Funding Liabilities vs Gross Assets</span>
          <span className="font-semibold text-slate-700">
            {formatPercent((summary.totalFundingLiabilities / (totalGrossAssetValue || 1)) * 100)} LTV
          </span>
        </div>
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
          <div
            className="bg-rose-500 h-full transition-all duration-500"
            style={{
              width: `${Math.min(100, (summary.totalFundingLiabilities / (totalGrossAssetValue || 1)) * 100)}%`,
            }}
            title={`Total Liabilities: ${formatZAR(summary.totalFundingLiabilities)}`}
          ></div>
          <div
            className="bg-emerald-500 h-full transition-all duration-500 flex-1"
            title={`Net Equity: ${formatZAR(summary.netEquity)}`}
          ></div>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
          <span>Liabilities: {formatZAR(summary.totalFundingLiabilities)}</span>
          <span className="text-emerald-700 font-semibold">Net Equity: {formatZAR(summary.netEquity)}</span>
        </div>
      </div>
    </div>
  );
}
