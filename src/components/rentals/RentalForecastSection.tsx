'use client';

import React, { useState, useMemo } from 'react';
import { RentalProperty } from '@/types';
import { generateRentalLongTermProjection, calculatePaydownImpact } from '@/lib/calculations/propertyMetrics';
import { formatZAR } from '@/lib/formatters';
import LongTermProjectionChart from '@/components/analytics/LongTermProjectionChart';
import { TrendingUp, DollarSign, ChevronDown, ChevronUp, Zap } from 'lucide-react';

export interface RentalForecastSectionProps {
  property: RentalProperty;
  forecastView: 'wealth-only' | 'cashflow-only';
  onForecastViewChange: (view: 'wealth-only' | 'cashflow-only') => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export function RentalForecastSection({
  property,
  forecastView,
  onForecastViewChange,
  isExpanded: controlledExpanded,
  onToggleExpand,
}: RentalForecastSectionProps) {
  const [internalExpanded, setInternalExpanded] = useState(false);

  const isExpanded =
    controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

  const handleToggle = () => {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setInternalExpanded((prev) => !prev);
    }
  };

  const projectionData = useMemo(
    () => generateRentalLongTermProjection(property),
    [property]
  );

  const paydownImpact = useMemo(() => {
    const extra = property.extraMonthlyPaymentZAR || 0;
    const balance = property.outstandingBondBalanceZAR || 0;
    if (extra <= 0 || balance <= 0) return null;
    return calculatePaydownImpact({
      principal: balance,
      annualRatePercent: 11.75,
      termYears: 20,
      extraMonthlyPaymentZAR: extra,
      startPropertyValue: property.marketValueZAR || property.purchasePriceZAR,
      annualGrowthPercent: 5,
      refinanceLtvPercent: 75,
    });
  }, [property]);

  return (
    <div className="border-t border-slate-200 bg-slate-50/50">
      <button
        type="button"
        onClick={handleToggle}
        className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100/70 transition-colors cursor-pointer select-none"
        aria-expanded={isExpanded}
      >
        <span className="flex items-center gap-1.5 font-bold">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          <span>20-Year Long-Term Forecast</span>
          <span className="text-[10px] font-normal text-slate-400 hidden sm:inline">
            (5% Growth • 6% Esc.)
          </span>
        </span>
        <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
          <span className="text-[10px] font-semibold bg-emerald-100/80 text-emerald-800 px-1.5 py-0.5 rounded">
            {forecastView === 'wealth-only' ? 'Wealth Track' : 'Cashflow Track'}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-white space-y-3">
          {/* Segmented View Mode Toggle */}
          <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500">
              View Preference (Global):
            </span>
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => onForecastViewChange('wealth-only')}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  forecastView === 'wealth-only'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="View Capital Growth & Bond Amortization Track"
              >
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                <span>Wealth & Equity</span>
              </button>
              <button
                type="button"
                onClick={() => onForecastViewChange('cashflow-only')}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  forecastView === 'cashflow-only'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="View Annual Rental Escalation & Net Cashflow Trajectory"
              >
                <DollarSign className="w-3.5 h-3.5 text-indigo-600" />
                <span>Cashflow</span>
              </button>
            </div>
          </div>

          {/* Accelerated Paydown Impact Summary Banner */}
          {paydownImpact && paydownImpact.monthsSaved > 0 && (
            <div className="p-3 rounded-lg border border-indigo-200 bg-indigo-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 font-bold text-indigo-950">
                  <Zap className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Accelerated Paydown Impact (+{formatZAR(property.extraMonthlyPaymentZAR || 0)}/m)</span>
                </div>
                <p className="text-[11px] text-indigo-700">
                  Bond settled in{' '}
                  <strong className="font-semibold text-indigo-950">
                    {Math.floor(paydownImpact.acceleratedMonths / 12)} yrs {paydownImpact.acceleratedMonths % 12} mos
                  </strong>{' '}
                  (saves <strong className="font-semibold text-indigo-950">{paydownImpact.monthsSaved} months</strong> &amp;{' '}
                  <strong className="font-semibold text-indigo-950">{formatZAR(paydownImpact.interestSaved)}</strong> interest).
                </p>
              </div>
              {paydownImpact.refiReadyYearAccelerated !== null && (
                <div className="shrink-0 bg-white px-2.5 py-1 rounded-md border border-indigo-200 text-right">
                  <span className="block text-[9px] uppercase font-bold text-slate-400">BRRRR Refi-Ready (75% LTV)</span>
                  <span className="font-bold text-indigo-900 text-xs">
                    Year {paydownImpact.refiReadyYearAccelerated}{' '}
                    <span className="text-[10px] text-slate-500 font-normal">
                      {paydownImpact.refiReadyYearScheduled !== null && paydownImpact.refiReadyYearScheduled !== paydownImpact.refiReadyYearAccelerated
                        ? `(vs Year ${paydownImpact.refiReadyYearScheduled})`
                        : ''}
                    </span>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Chart View */}
          <div className="overflow-x-hidden">
            <LongTermProjectionChart
              data={projectionData}
              compact={true}
              displayMode={forecastView}
              showMilestones={true}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default RentalForecastSection;
