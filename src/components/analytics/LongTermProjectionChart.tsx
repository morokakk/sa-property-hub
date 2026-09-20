'use client';

import React, { useState, useMemo, useRef, useCallback } from 'react';
import { LongTermProjectionYear } from '@/types';
import { formatZAR, formatPercent } from '@/lib/formatters';
import { TrendingUp, ShieldCheck, DollarSign, Calendar, ChevronRight } from 'lucide-react';

interface LongTermProjectionChartProps {
  data: LongTermProjectionYear[];
  compact?: boolean;
  showCashflowTrack?: boolean;
  showMilestones?: boolean;
  className?: string;
}

function formatCompactZAR(val: number): string {
  if (Math.abs(val) >= 1_000_000) {
    return `R ${(val / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(val) >= 1_000) {
    return `R ${(val / 1_000).toFixed(0)}k`;
  }
  return `R ${val}`;
}

/**
 * Custom SVG path generator with monotone smoothing
 */
function createSmoothSvgPath(points: { x: number; y: number }[]): string {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cp1x = prev.x + (curr.x - prev.x) / 2;
    const cp1y = prev.y;
    const cp2x = prev.x + (curr.x - prev.x) / 2;
    const cp2y = curr.y;
    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
  }
  return path;
}

/**
 * Creates closed area polygon path for gradients under curves
 */
function createAreaPath(points: { x: number; y: number }[], baselineY: number): string {
  if (!points || points.length === 0) return '';
  const line = createSmoothSvgPath(points);
  const last = points[points.length - 1];
  const first = points[0];
  return `${line} L ${last.x.toFixed(1)} ${baselineY.toFixed(1)} L ${first.x.toFixed(1)} ${baselineY.toFixed(1)} Z`;
}

export default function LongTermProjectionChart({
  data,
  compact = false,
  showCashflowTrack = true,
  showMilestones = true,
  className = '',
}: LongTermProjectionChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const chartRef = useRef<SVGSVGElement | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
        No projection data available.
      </div>
    );
  }

  // Dimensions
  const width = 720;
  const wealthHeight = compact ? 180 : 220;
  const cashflowHeight = compact ? 130 : 150;
  const margin = { top: 20, right: 25, bottom: 30, left: 65 };
  const innerWidth = width - margin.left - margin.right;
  const innerWealthHeight = wealthHeight - margin.top - margin.bottom;
  const innerCashflowHeight = cashflowHeight - margin.top - margin.bottom;

  // X Coordinate calculation based on year index
  const getX = useCallback(
    (index: number) => {
      if (data.length <= 1) return margin.left;
      return margin.left + (index / (data.length - 1)) * innerWidth;
    },
    [data.length, innerWidth, margin.left]
  );

  // Wealth Scale (Property Value, Net Equity, Outstanding Bond)
  const maxWealth = useMemo(() => {
    const values = data.map((d) => Math.max(d.propertyValue, d.netEquity, d.outstandingBond));
    const highest = Math.max(...values, 100_000);
    return Math.ceil((highest * 1.1) / 500_000) * 500_000;
  }, [data]);

  const getYWealth = useCallback(
    (val: number) => {
      const clamped = Math.max(0, val);
      return margin.top + innerWealthHeight - (clamped / maxWealth) * innerWealthHeight;
    },
    [innerWealthHeight, margin.top, maxWealth]
  );

  // Cashflow Scale (Rent, Costs, Net Cashflow)
  const { minCash, maxCash, rangeCash } = useMemo(() => {
    const allCashValues = data.flatMap((d) => [d.rent, d.costs, d.netCashflow]);
    const lowest = Math.min(0, ...allCashValues);
    const highest = Math.max(10_000, ...allCashValues);
    const paddedMax = Math.ceil((highest * 1.15) / 50_000) * 50_000;
    const paddedMin = lowest < 0 ? Math.floor((lowest * 1.15) / 20_000) * 20_000 : 0;
    return {
      minCash: paddedMin,
      maxCash: paddedMax,
      rangeCash: paddedMax - paddedMin || 1,
    };
  }, [data]);

  const getYCash = useCallback(
    (val: number) => {
      return margin.top + innerCashflowHeight - ((val - minCash) / rangeCash) * innerCashflowHeight;
    },
    [innerCashflowHeight, margin.top, minCash, rangeCash]
  );

  // Curve Points for Wealth Track
  const propValuePoints = useMemo(
    () => data.map((d, i) => ({ x: getX(i), y: getYWealth(d.propertyValue) })),
    [data, getX, getYWealth]
  );
  const netEquityPoints = useMemo(
    () => data.map((d, i) => ({ x: getX(i), y: getYWealth(d.netEquity) })),
    [data, getX, getYWealth]
  );
  const bondPoints = useMemo(
    () => data.map((d, i) => ({ x: getX(i), y: getYWealth(d.outstandingBond) })),
    [data, getX, getYWealth]
  );

  // Curve Points for Cashflow Track
  const rentPoints = useMemo(
    () => data.map((d, i) => ({ x: getX(i), y: getYCash(d.rent) })),
    [data, getX, getYCash]
  );
  const costsPoints = useMemo(
    () => data.map((d, i) => ({ x: getX(i), y: getYCash(d.costs) })),
    [data, getX, getYCash]
  );
  const cashflowPoints = useMemo(
    () => data.map((d, i) => ({ x: getX(i), y: getYCash(d.netCashflow) })),
    [data, getX, getYCash]
  );

  // Baseline Y coordinates
  const wealthBaselineY = margin.top + innerWealthHeight;
  const cashflowZeroY = getYCash(0);

  // Grid Ticks
  const wealthTicks = [0, maxWealth * 0.33, maxWealth * 0.66, maxWealth];
  const cashTicks = [minCash, minCash + rangeCash * 0.5, maxCash];

  // Mouse hover tracking
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!chartRef.current) return;
    const rect = chartRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const scaleX = width / rect.width;
    const svgX = clientX * scaleX;

    const boundedX = Math.max(margin.left, Math.min(width - margin.right, svgX));
    const ratio = (boundedX - margin.left) / innerWidth;
    const index = Math.round(ratio * (data.length - 1));
    const safeIndex = Math.max(0, Math.min(data.length - 1, index));
    setHoverIndex(safeIndex);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const activeSnapshot = hoverIndex !== null ? data[hoverIndex] : data[data.length - 1];

  // Milestone points: Year 1, Year 5, Year 10, Final Year
  const milestoneYears = useMemo(() => {
    const milestones = [1];
    if (data.length >= 5) milestones.push(5);
    if (data.length >= 10) milestones.push(10);
    milestones.push(data.length);
    const unique = Array.from(new Set(milestones));
    return unique.map((y) => data.find((d) => d.year === y)).filter(Boolean) as LongTermProjectionYear[];
  }, [data]);

  return (
    <div className={`space-y-4 print:space-y-3 ${className}`}>
      {/* Interactive Active Snapshot Bar (Hidden on print) */}
      <div className="no-print bg-slate-900 text-white rounded-xl p-3.5 sm:p-4 border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Snapshot: Year {activeSnapshot.year} of {data.length}
              </span>
              {hoverIndex !== null ? (
                <span className="text-[10px] bg-emerald-500/30 text-emerald-300 font-semibold px-2 py-0.5 rounded-full">
                  Hovering Year {activeSnapshot.year}
                </span>
              ) : (
                <span className="text-[10px] bg-slate-800 text-slate-400 font-medium px-2 py-0.5 rounded-full">
                  Maturity Horizon
                </span>
              )}
            </div>
            <div className="text-lg sm:text-xl font-extrabold text-white font-mono mt-0.5">
              Net Equity: <span className="text-emerald-400">{formatZAR(activeSnapshot.netEquity)}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700">
            <span className="text-[10px] text-slate-400 block font-medium">Property Value</span>
            <span className="font-bold text-slate-100 text-xs">{formatZAR(activeSnapshot.propertyValue)}</span>
          </div>
          <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700">
            <span className="text-[10px] text-rose-400 block font-medium">Outstanding Bond</span>
            <span className="font-bold text-rose-300 text-xs">{formatZAR(activeSnapshot.outstandingBond)}</span>
          </div>
          <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700">
            <span className="text-[10px] text-indigo-400 block font-medium">Annual Rent</span>
            <span className="font-bold text-indigo-300 text-xs">{formatZAR(activeSnapshot.rent)}</span>
          </div>
          <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700">
            <span className="text-[10px] text-emerald-400 block font-medium">Annual Cashflow</span>
            <span
              className={`font-bold text-xs ${
                activeSnapshot.netCashflow >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatZAR(activeSnapshot.netCashflow)}
            </span>
          </div>
        </div>
      </div>

      {/* Chart 1: Wealth & Amortization Track */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs print:border-slate-300 print:p-3 print:shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-100">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Capital Growth & Bond Amortization Schedule
            </h4>
            <p className="text-[11px] text-slate-500">
              Tracking asset valuation vs. outstanding mortgage principal paydown over {data.length} years
            </p>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 text-[11px] font-semibold">
            <div className="flex items-center gap-1.5 text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              <span>Property Value</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block"></span>
              <span>Net Equity</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
              <span>Outstanding Bond</span>
            </div>
          </div>
        </div>

        {/* Wealth Track SVG */}
        <div className="w-full overflow-hidden">
          <svg
            ref={chartRef}
            viewBox={`0 0 ${width} ${wealthHeight}`}
            className="w-full h-auto cursor-crosshair select-none"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <defs>
              <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="propGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid Lines */}
            {wealthTicks.map((tick, i) => {
              const y = getYWealth(tick);
              return (
                <g key={i}>
                  <line
                    x1={margin.left}
                    y1={y}
                    x2={width - margin.right}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <text
                    x={margin.left - 8}
                    y={y + 3.5}
                    textAnchor="end"
                    className="text-[10px] fill-slate-400 font-medium font-mono"
                  >
                    {formatCompactZAR(tick)}
                  </text>
                </g>
              );
            })}

            {/* X-Axis Ticks */}
            {data.map((d, i) => {
              // Show label every 5 years and year 1 & last
              const isKeyYear = d.year === 1 || d.year % 5 === 0 || d.year === data.length;
              if (!isKeyYear) return null;
              const x = getX(i);
              return (
                <g key={i}>
                  <line
                    x1={x}
                    y1={wealthBaselineY}
                    x2={x}
                    y2={wealthBaselineY + 4}
                    stroke="#cbd5e1"
                    strokeWidth="1"
                  />
                  <text
                    x={x}
                    y={wealthBaselineY + 16}
                    textAnchor="middle"
                    className="text-[10px] fill-slate-500 font-semibold font-mono"
                  >
                    Y{d.year}
                  </text>
                </g>
              );
            })}

            {/* Gradient Fills */}
            <path d={createAreaPath(propValuePoints, wealthBaselineY)} fill="url(#propGrad)" />
            <path d={createAreaPath(netEquityPoints, wealthBaselineY)} fill="url(#equityGrad)" />

            {/* Trend Lines */}
            {/* Property Value Line */}
            <path
              d={createSmoothSvgPath(propValuePoints)}
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Net Equity Line */}
            <path
              d={createSmoothSvgPath(netEquityPoints)}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Outstanding Bond Line */}
            <path
              d={createSmoothSvgPath(bondPoints)}
              fill="none"
              stroke="#f43f5e"
              strokeWidth="2"
              strokeDasharray="5 3"
              strokeLinecap="round"
            />

            {/* Interactive Vertical Crosshair */}
            {hoverIndex !== null && (
              <g>
                <line
                  x1={getX(hoverIndex)}
                  y1={margin.top}
                  x2={getX(hoverIndex)}
                  y2={wealthBaselineY}
                  stroke="#475569"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
                {/* Dots on Curves */}
                <circle
                  cx={propValuePoints[hoverIndex].x}
                  cy={propValuePoints[hoverIndex].y}
                  r="4"
                  fill="#10b981"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
                <circle
                  cx={netEquityPoints[hoverIndex].x}
                  cy={netEquityPoints[hoverIndex].y}
                  r="4"
                  fill="#06b6d4"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
                <circle
                  cx={bondPoints[hoverIndex].x}
                  cy={bondPoints[hoverIndex].y}
                  r="4"
                  fill="#f43f5e"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
              </g>
            )}
          </svg>
        </div>
      </div>

      {/* Chart 2: Cashflow & Escalating Rental Track */}
      {showCashflowTrack && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs print:border-slate-300 print:p-3 print:shadow-none">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-100">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-indigo-600" />
                Annual Rental Escalation & Net Cashflow Trajectory
              </h4>
              <p className="text-[11px] text-slate-500">
                Annual gross rental income vs. operating expenses and net cashflow after debt service
              </p>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 text-[11px] font-semibold">
              <div className="flex items-center gap-1.5 text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block"></span>
                <span>Gross Rental</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                <span>Operating Costs</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                <span>Net Cashflow</span>
              </div>
            </div>
          </div>

          {/* Cashflow Track SVG */}
          <div className="w-full overflow-hidden">
            <svg
              viewBox={`0 0 ${width} ${cashflowHeight}`}
              className="w-full h-auto cursor-crosshair select-none"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <defs>
                <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid Lines */}
              {cashTicks.map((tick, i) => {
                const y = getYCash(tick);
                return (
                  <g key={i}>
                    <line
                      x1={margin.left}
                      y1={y}
                      x2={width - margin.right}
                      y2={y}
                      stroke="#e2e8f0"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                    <text
                      x={margin.left - 8}
                      y={y + 3.5}
                      textAnchor="end"
                      className="text-[10px] fill-slate-400 font-medium font-mono"
                    >
                      {formatCompactZAR(tick)}
                    </text>
                  </g>
                );
              })}

              {/* Zero Line if minCash < 0 */}
              {minCash < 0 && (
                <line
                  x1={margin.left}
                  y1={cashflowZeroY}
                  x2={width - margin.right}
                  y2={cashflowZeroY}
                  stroke="#94a3b8"
                  strokeWidth="1"
                />
              )}

              {/* X-Axis Ticks */}
              {data.map((d, i) => {
                const isKeyYear = d.year === 1 || d.year % 5 === 0 || d.year === data.length;
                if (!isKeyYear) return null;
                const x = getX(i);
                const baseline = margin.top + innerCashflowHeight;
                return (
                  <g key={i}>
                    <line x1={x} y1={baseline} x2={x} y2={baseline + 4} stroke="#cbd5e1" strokeWidth="1" />
                    <text
                      x={x}
                      y={baseline + 16}
                      textAnchor="middle"
                      className="text-[10px] fill-slate-500 font-semibold font-mono"
                    >
                      Y{d.year}
                    </text>
                  </g>
                );
              })}

              {/* Area under Net Cashflow */}
              <path
                d={createAreaPath(cashflowPoints, margin.top + innerCashflowHeight)}
                fill="url(#cashGrad)"
              />

              {/* Trend Lines */}
              {/* Gross Rent Line */}
              <path
                d={createSmoothSvgPath(rentPoints)}
                fill="none"
                stroke="#6366f1"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {/* Costs Line */}
              <path
                d={createSmoothSvgPath(costsPoints)}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2"
                strokeLinecap="round"
              />
              {/* Net Cashflow Line */}
              <path
                d={createSmoothSvgPath(cashflowPoints)}
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Interactive Crosshair */}
              {hoverIndex !== null && (
                <g>
                  <line
                    x1={getX(hoverIndex)}
                    y1={margin.top}
                    x2={getX(hoverIndex)}
                    y2={margin.top + innerCashflowHeight}
                    stroke="#475569"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                  <circle
                    cx={rentPoints[hoverIndex].x}
                    cy={rentPoints[hoverIndex].y}
                    r="4"
                    fill="#6366f1"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                  <circle
                    cx={costsPoints[hoverIndex].x}
                    cy={costsPoints[hoverIndex].y}
                    r="4"
                    fill="#f59e0b"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                  <circle
                    cx={cashflowPoints[hoverIndex].x}
                    cy={cashflowPoints[hoverIndex].y}
                    r="4"
                    fill="#10b981"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                </g>
              )}
            </svg>
          </div>
        </div>
      )}

      {/* Strategic Milestone Cards (Print-friendly & Responsive) */}
      {showMilestones && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs print:grid-cols-4 print:gap-2">
          {milestoneYears.map((snap) => {
            const isMaturity = snap.year === data.length;
            return (
              <div
                key={snap.year}
                className={`p-3 rounded-xl border ${
                  isMaturity
                    ? 'bg-emerald-50/80 border-emerald-300'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      isMaturity ? 'text-emerald-800' : 'text-slate-600'
                    }`}
                  >
                    Year {snap.year} {isMaturity && '(Maturity)'}
                  </span>
                  <span
                    className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                      isMaturity ? 'bg-emerald-200/80 text-emerald-900' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {isMaturity ? 'Bond Paid Off' : `Bond: ${formatCompactZAR(snap.outstandingBond)}`}
                  </span>
                </div>

                <div className="space-y-1 mt-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-[10px]">Net Equity:</span>
                    <strong className="text-slate-900 font-mono text-xs">{formatZAR(snap.netEquity)}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-[10px]">Property Value:</span>
                    <span className="text-slate-700 font-mono text-[11px]">{formatZAR(snap.propertyValue)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-[10px]">Net Cashflow:</span>
                    <span
                      className={`font-mono text-[11px] font-semibold ${
                        snap.netCashflow >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {formatZAR(snap.netCashflow)}/yr
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
