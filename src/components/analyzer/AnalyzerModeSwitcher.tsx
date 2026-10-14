'use client';

import React from 'react';
import { Calculator, Layers, Rows } from 'lucide-react';

export interface AnalyzerModeSwitcherProps {
  activeTab: 'calculator' | 'pipeline';
  onTabChange: (tab: 'calculator' | 'pipeline') => void;
  activeDealsCount: number;
  passedDealsCount: number;
  isStacked: boolean;
  onToggleStacked: () => void;
}

export function AnalyzerModeSwitcher({
  activeTab,
  onTabChange,
  activeDealsCount,
  passedDealsCount,
  isStacked,
  onToggleStacked,
}: AnalyzerModeSwitcherProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-200">
      {/* 2 Primary Mode Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
        <button
          type="button"
          onClick={() => onTabChange('calculator')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
            activeTab === 'calculator' && !isStacked
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Calculator className={`w-3.5 h-3.5 ${activeTab === 'calculator' && !isStacked ? 'text-emerald-400' : 'text-slate-500'}`} />
          <span className="hidden sm:inline">Deal Calculator &amp; Underwriting</span>
          <span className="sm:hidden">Calculator</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('pipeline')}
          className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
            activeTab === 'pipeline' && !isStacked
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Layers className={`w-3.5 h-3.5 ${activeTab === 'pipeline' && !isStacked ? 'text-sky-400' : 'text-slate-500'}`} />
          <span className="hidden sm:inline">Deal Sourcing Pipeline</span>
          <span className="sm:hidden">Pipeline</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
              activeTab === 'pipeline' && !isStacked
                ? 'bg-slate-800 text-slate-200'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {activeDealsCount}
          </span>
        </button>
      </div>

      {/* Desktop Stacked View Toggle */}
      <div className="hidden lg:flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleStacked}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
            isStacked
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
          title="Display both the Deal Calculator and Pipeline stacked on screen simultaneously"
        >
          <Rows className={`w-3.5 h-3.5 ${isStacked ? 'text-emerald-600' : 'text-slate-400'}`} />
          <span>{isStacked ? 'Stacked View: Active' : 'View Both Stacked'}</span>
        </button>
      </div>
    </div>
  );
}

export default AnalyzerModeSwitcher;
