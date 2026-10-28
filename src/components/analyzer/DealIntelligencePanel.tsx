'use client';

import React, { useState } from 'react';
import { DealStrategy } from '@/types';
import {
  ThreeStrategyMatrixResult,
  DealRepairPrescription,
  DealRepairLever,
} from '@/lib/calculations/dealIntelligence';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sliders,
  Target,
  Building2,
  Hammer,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export interface DealIntelligencePanelProps {
  activeStrategy: DealStrategy;
  strategyMatrix: ThreeStrategyMatrixResult;
  repairPrescription: DealRepairPrescription;
  onSelectStrategy: (strategy: DealStrategy) => void;
  onApplyRepairLever: (lever: DealRepairLever) => void;
  defaultExpanded?: boolean;
}

export function DealIntelligencePanel({
  activeStrategy,
  strategyMatrix,
  repairPrescription,
  onSelectStrategy,
  onApplyRepairLever,
  defaultExpanded = false,
}: DealIntelligencePanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const strategyIcons: Record<DealStrategy, React.ComponentType<{ className?: string }>> = {
    Rental: Building2,
    Flip: Hammer,
    BRRRR: RefreshCw,
  };

  return (
    <div
      data-testid="deal-intelligence-panel"
      className="rounded-xl bg-slate-950/80 border border-slate-800 p-3 sm:px-4 sm:py-3 text-xs transition-all"
    >
      {/* Compact Header Bar: Always visible (Minimised by default) */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded((prev) => !prev);
          }
        }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer select-none"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                Deterministic Strategy Verdict &amp; Deal-Repair Engine
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/60">
                Recommended: {strategyMatrix.strategies[strategyMatrix.recommendedStrategy].label}
              </span>
              {repairPrescription.meetsBuyBox ? (
                <span
                  data-testid="deal-intelligence-status-pill"
                  className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 inline-flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>
                    {repairPrescription.passedCount}/{repairPrescription.totalCount} Passed
                  </span>
                </span>
              ) : (
                <span
                  data-testid="deal-intelligence-status-pill"
                  className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-950/90 text-amber-300 border border-amber-700/60 inline-flex items-center gap-1"
                >
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  <span>
                    {repairPrescription.passedCount}/{repairPrescription.totalCount} Hurdles •{' '}
                    {repairPrescription.levers.length}{' '}
                    {repairPrescription.levers.length === 1 ? 'Fix' : 'Fixes'} Available
                  </span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
              {strategyMatrix.recommendationReason}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
          {strategyMatrix.recommendedStrategy !== activeStrategy && (
            <button
              type="button"
              data-testid="switch-recommended-strategy-btn"
              onClick={(e) => {
                e.stopPropagation();
                onSelectStrategy(strategyMatrix.recommendedStrategy);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-colors cursor-pointer"
            >
              <span>Switch to {strategyMatrix.recommendedStrategy}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            data-testid="toggle-deal-intelligence-btn"
            aria-expanded={isExpanded}
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded((prev) => !prev);
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 transition-colors cursor-pointer"
          >
            <span>{isExpanded ? 'Minimise' : 'Expand Verdict & Fixes'}</span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div
          data-testid="deal-intelligence-expanded-body"
          className="pt-3.5 mt-3 border-t border-slate-800 space-y-4 animate-fadeIn"
        >
          {/* Part A: Side-by-Side 3-Strategy Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {(['Rental', 'Flip', 'BRRRR'] as const).map((stratKey) => {
          const item = strategyMatrix.strategies[stratKey];
          const Icon = strategyIcons[stratKey];
          const isActive = activeStrategy === stratKey;
          const isRecommended = strategyMatrix.recommendedStrategy === stratKey;

          return (
            <div
              key={stratKey}
              data-testid={`strategy-verdict-card-${stratKey}`}
              className={`p-3 rounded-xl border transition-all flex flex-col justify-between gap-2 ${
                isActive
                  ? 'bg-slate-900 border-emerald-500/60 shadow-sm'
                  : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-white">
                    <Icon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                      item.buyBox.meetsBuyBox
                        ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700/60'
                        : item.verdictBadge === 'Partial Match'
                        ? 'bg-amber-950/90 text-amber-300 border-amber-700/60'
                        : 'bg-rose-950/90 text-rose-300 border-rose-700/60'
                    }`}
                  >
                    {item.buyBox.passedCount}/{item.buyBox.totalCount} Hurdles • {item.score}/100
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1">
                  {isActive && (
                    <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      Active View
                    </span>
                  )}
                  {isRecommended && (
                    <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300 border border-teal-500/40">
                      Top Score
                    </span>
                  )}
                  {item.isNodeRecommended && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      Node Fit ✓
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
                    <span className="text-[9px] text-slate-400 block uppercase">{item.primaryKpiLabel}</span>
                    <span className="font-bold text-white font-mono text-xs">{item.primaryKpiValue}</span>
                  </div>
                  <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
                    <span className="text-[9px] text-slate-400 block uppercase">{item.secondaryKpiLabel}</span>
                    <span className="font-bold text-slate-200 font-mono text-xs">{item.secondaryKpiValue}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                <span className="text-[10px] text-slate-400 truncate">{item.summary}</span>
                {!isActive && (
                  <button
                    type="button"
                    onClick={() => onSelectStrategy(stratKey)}
                    className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 shrink-0 cursor-pointer underline"
                  >
                    Select
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Part B: Buy-Box Status & One-Click Deal-Repair Levers */}
      {repairPrescription.meetsBuyBox ? (
        <div
          data-testid="buy-box-all-passed-banner"
          className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-600/40 flex flex-wrap items-center justify-between gap-2 text-emerald-200"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong className="text-white">Buy-Box Verified ({repairPrescription.passedCount}/{repairPrescription.totalCount} Hurdles Passed):</strong>{' '}
              This deal satisfies all {activeStrategy} underwriting hurdles at current pricing and financing assumptions.
            </span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Ready for Pipeline / Pitch
          </span>
        </div>
      ) : (
        <div
          data-testid="deal-repair-levers-section"
          className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-3"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="font-bold text-amber-200 text-xs">
                Buy-Box Diagnostic ({repairPrescription.passedCount}/{repairPrescription.totalCount} Hurdles Met) — Actionable Deal-Repair Levers:
              </span>
            </div>

            {/* Failed Hurdle Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              {repairPrescription.failedHurdles.map((h) => (
                <span
                  key={h.key}
                  data-testid={`failed-hurdle-${h.key}`}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-950/90 text-rose-200 border border-rose-700/70 font-mono"
                >
                  {h.label}: {h.actualLabel} (Need {h.targetLabel})
                </span>
              ))}
            </div>
          </div>

          {repairPrescription.levers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {repairPrescription.levers.map((lever) => (
                <div
                  key={lever.id}
                  data-testid={`repair-lever-card-${lever.id}`}
                  className="p-3 rounded-lg bg-slate-900/95 border border-slate-700/90 flex flex-col justify-between gap-2.5"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-[11px] font-bold text-white flex items-center gap-1">
                        <Target className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{lever.label}</span>
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                          lever.fixesAllHurdles
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                            : 'bg-sky-950 text-sky-300 border border-sky-700/60'
                        }`}
                      >
                        {lever.fixesAllHurdles ? 'Fixes Buy-Box' : 'Improves Hurdles'}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between gap-2 pt-0.5 font-mono">
                      <span className="text-[10px] text-slate-400 line-through">{lever.currentValueLabel}</span>
                      <span className="text-xs font-extrabold text-emerald-400">{lever.targetValueLabel}</span>
                      <span className="text-[10px] font-bold text-amber-300">({lever.deltaLabel})</span>
                    </div>

                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      {lever.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    data-testid={`apply-repair-lever-${lever.id}`}
                    onClick={() => onApplyRepairLever(lever)}
                    className="w-full py-1.5 px-3 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Sliders className="w-3 h-3" />
                    <span>
                      {lever.id === 'price'
                        ? `Apply Max Bid (${lever.targetValueLabel})`
                        : lever.id === 'rent'
                        ? `Apply Target Rent (${lever.targetValueLabel})`
                        : lever.id === 'ltv'
                        ? `Apply ${lever.targetLtvPercent}% LTV`
                        : lever.id === 'exitPrice'
                        ? `Apply Exit (${lever.targetValueLabel})`
                        : `Switch to ${lever.targetStrategy}`}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-slate-300">
              Adjust acquisition price, rental income, or financing leverage simultaneously to bring this opportunity within Buy-Box thresholds.
            </p>
          )}
        </div>
      )}
        </div>
      )}
    </div>
  );
}

export default DealIntelligencePanel;
