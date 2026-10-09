'use client';

import React, { useState } from 'react';
import { RentalProperty } from '@/types';
import { generateRentalLongTermProjection } from '@/lib/calculations/propertyMetrics';
import LongTermProjectionChart from '@/components/analytics/LongTermProjectionChart';
import { TrendingUp, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';

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
          <span>📈 20-Year Long-Term Forecast</span>
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

          {/* Chart View */}
          <div className="overflow-x-hidden">
            <LongTermProjectionChart
              data={generateRentalLongTermProjection(property)}
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
