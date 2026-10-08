'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import TopHeader from '@/components/navigation/TopHeader';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';
import {
  GET_STARTED_STAGES,
  GO_LIVE_STEP,
  DEMO_DATA_TIP,
  getAllGuideStepIds,
  countCompletedGuideSteps,
  type GuideFeature,
  type JourneyStage,
} from '@/lib/onboarding/getStartedContent';
import {
  Compass,
  Lightbulb,
  ChevronDown,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Rocket,
  CheckCircle2,
} from 'lucide-react';

const TOTAL_STEPS = getAllGuideStepIds().length;
const ALL_FEATURE_IDS = GET_STARTED_STAGES.flatMap((s) => s.modules.flatMap((m) => m.features.map((f) => f.id)));

function stageFeatureIds(stage: JourneyStage): string[] {
  return stage.modules.flatMap((m) => m.features.map((f) => f.id));
}

interface FeatureItemProps {
  feature: GuideFeature;
  checked: boolean;
  expanded: boolean;
  onToggleChecked: () => void;
  onToggleExpanded: () => void;
}

function FeatureItem({ feature, checked, expanded, onToggleChecked, onToggleExpanded }: FeatureItemProps) {
  const panelId = `guide-panel-${feature.id}`;
  return (
    <li
      data-testid={`guide-step-${feature.id}`}
      className={`rounded-xl border transition-colors ${
        checked ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-start gap-3 p-3 sm:p-3.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggleChecked}
          aria-label={`Mark "${feature.title}" as done`}
          className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
        />
        <button
          type="button"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
          aria-controls={panelId}
          className="flex-1 min-w-0 flex items-start justify-between gap-3 text-left cursor-pointer"
        >
          <span className="min-w-0">
            <span className={`block text-sm font-bold ${checked ? 'text-emerald-900' : 'text-slate-900'}`}>
              {feature.title}
            </span>
            <span className="block text-xs text-slate-500 mt-0.5">{feature.summary}</span>
          </span>
          <ChevronDown
            className={`w-4 h-4 mt-0.5 shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
      </div>

      {expanded && (
        <div id={panelId} className="px-3 sm:px-3.5 pb-3.5 sm:pl-11 space-y-3">
          {feature.powers && (
            <p className="text-xs text-indigo-900 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
              <strong className="font-semibold">Powers:</strong> {feature.powers}
            </p>
          )}

          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">How to</h4>
            <ol className="list-decimal pl-5 space-y-1 text-xs text-slate-700 leading-relaxed">
              {feature.howTo.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>

          <div className="flex items-start gap-2 text-xs text-amber-950 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
            <Lightbulb className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" aria-hidden="true" />
            <p className="leading-relaxed">
              <strong className="font-semibold">SA Pro Tip:</strong> {feature.proTip}
            </p>
          </div>

          <Link
            href={feature.href}
            aria-label={`Go to feature: ${feature.ctaLabel}`}
            title={feature.ctaLabel}
            className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors"
          >
            Go to feature
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>
      )}
    </li>
  );
}

export default function GetStartedPage() {
  const completedGuideSteps = usePortfolioStore((state) => state.completedGuideSteps);
  const toggleGuideStep = usePortfolioStore((state) => state.toggleGuideStep);
  const resetGuideProgress = usePortfolioStore((state) => state.resetGuideProgress);

  // Purely presentational, so it stays in local state (not persisted)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const completedSet = useMemo(() => new Set(completedGuideSteps), [completedGuideSteps]);
  const doneCount = countCompletedGuideSteps(completedGuideSteps);
  const percent = TOTAL_STEPS > 0 ? Math.round((doneCount / TOTAL_STEPS) * 100) : 0;
  const allExpanded = ALL_FEATURE_IDS.every((id) => expandedIds.has(id));

  const foundationFeatureIds = useMemo(() => stageFeatureIds(GET_STARTED_STAGES[0]), []);
  const foundationTotal = foundationFeatureIds.length;
  const foundationDone = useMemo(
    () => foundationFeatureIds.filter((id) => completedSet.has(id)).length,
    [foundationFeatureIds, completedSet]
  );
  const discoveryTotal = TOTAL_STEPS - foundationTotal;
  const discoveryDone = doneCount - foundationDone;

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleReset = () => {
    if (confirm('Untick every Get Started step? Your portfolio data is not affected.')) {
      resetGuideProgress();
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <TopHeader
        title="Get Started"
        subtitle="Quick-start guide and reference desk: set up Settings first, then follow the 5-stage investor journey"
      />

      <main className="flex-1 p-4 sm:p-6 space-y-6 max-w-5xl w-full mx-auto">
        {/* Intro, progress & demo tip */}
        <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <Compass className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">Operator Roadmap &amp; Quick Start</h2>
                <p className="text-xs text-slate-500 mt-0.5 max-w-2xl leading-relaxed">
                  Start with <strong className="text-slate-700">Step 0 – Foundation</strong> (3 steps to lock in your entity &amp; deal hurdles in ~5 mins). The remaining 24 feature guides serve as an on-demand reference desk to explore at your own pace as you scale.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleReset}
              disabled={doneCount === 0}
              className="self-start inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-300 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              Reset progress
            </button>
          </div>

          {/* Two-Tier Progress Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Tier 1: Foundation (Primary) */}
            <div
              className={`p-3.5 rounded-xl border transition-all ${
                foundationDone === foundationTotal
                  ? 'bg-emerald-50/70 border-emerald-200'
                  : 'bg-amber-50/60 border-amber-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      foundationDone === foundationTotal ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                    }`}
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Foundation Setup (5 mins)
                  </span>
                </div>
                <span
                  className={`text-xs font-bold ${
                    foundationDone === foundationTotal ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {foundationDone} of {foundationTotal} complete
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-200/80 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    foundationDone === foundationTotal ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${(foundationDone / foundationTotal) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-600 mt-2">
                {foundationDone === foundationTotal
                  ? '✓ Core entity, finance & buy-box rules configured in Settings.'
                  : 'Configure entity, finance defaults & buy-box hurdles in Settings.'}
              </p>
            </div>

            {/* Tier 2: Feature Hub (Secondary / Self-Paced) */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <span className="text-xs font-bold text-slate-800">
                    Feature Hub &amp; Reference
                  </span>
                </div>
                <span className="text-xs font-semibold text-slate-600">
                  {discoveryDone} of {discoveryTotal} explored
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full bg-slate-500 transition-all"
                  style={{ width: `${discoveryTotal > 0 ? (discoveryDone / discoveryTotal) * 100 : 0}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                On-demand guides for pipeline analysis, flips, funding &amp; monitoring.
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-700" data-testid="guide-progress-text">
                {doneCount} of {TOTAL_STEPS} steps complete
              </span>
              <span className="font-bold text-emerald-700">{percent}% overall</span>
            </div>
            <div
              role="progressbar"
              aria-label="Get Started progress"
              aria-valuemin={0}
              aria-valuemax={TOTAL_STEPS}
              aria-valuenow={doneCount}
              className="h-2 w-full rounded-full bg-slate-100 overflow-hidden"
            >
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${percent}%` }} />
            </div>
          </div>

          <div className="flex items-start gap-2 text-xs text-teal-950 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2.5">
            <Sparkles className="w-4 h-4 shrink-0 text-teal-600 mt-0.5" aria-hidden="true" />
            <p className="leading-relaxed">{DEMO_DATA_TIP}</p>
          </div>
        </section>

        {/* Journey overview (static, in-page jump links) */}
        <nav aria-label="Investor journey stages" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
          {GET_STARTED_STAGES.map((stage) => {
            const ids = stageFeatureIds(stage);
            const done = ids.filter((id) => completedSet.has(id)).length;
            return (
              <a
                key={stage.id}
                href={`#${stage.id}`}
                className="rounded-xl border border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50 px-3 py-2 transition-colors"
              >
                <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  Step {stage.stepNumber} · {stage.phase}
                </span>
                <span className="block text-[11px] text-slate-500 mt-0.5">
                  {done}/{ids.length} done
                </span>
              </a>
            );
          })}
          <a
            href="#go-live"
            className="rounded-xl border border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50 px-3 py-2 transition-colors"
          >
            <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-700">Go Live</span>
            <span className="block text-[11px] text-slate-500 mt-0.5">
              {completedSet.has(GO_LIVE_STEP.id) ? '1/1 done' : '0/1 done'}
            </span>
          </a>
        </nav>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setExpandedIds(allExpanded ? new Set() : new Set(ALL_FEATURE_IDS))}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
          >
            {allExpanded ? 'Collapse all guides' : 'Expand all guides'}
          </button>
        </div>

        {/* Stages */}
        {GET_STARTED_STAGES.map((stage) => (
          <section
            key={stage.id}
            id={stage.id}
            aria-labelledby={`${stage.id}-title`}
            className="scroll-mt-20 space-y-3"
            data-testid={`guide-stage-${stage.stepNumber}`}
          >
            <div>
              <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded">
                Step {stage.stepNumber} · {stage.phase}
              </span>
              <h2 id={`${stage.id}-title`} className="text-base sm:text-lg font-bold text-slate-900 mt-1.5">
                {stage.title}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{stage.summary}</p>
            </div>

            {stage.modules.map((mod) => (
              <div key={mod.id} className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{mod.moduleName}</h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      <span className="font-semibold text-slate-700">What it&apos;s for:</span> {mod.purpose}
                    </p>
                  </div>
                  <Link
                    href={mod.route}
                    className="self-start inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 whitespace-nowrap"
                  >
                    Open module
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </Link>
                </div>

                <ul className="space-y-2">
                  {mod.features.map((feature) => (
                    <FeatureItem
                      key={feature.id}
                      feature={feature}
                      checked={completedSet.has(feature.id)}
                      expanded={expandedIds.has(feature.id)}
                      onToggleChecked={() => toggleGuideStep(feature.id)}
                      onToggleExpanded={() => toggleExpanded(feature.id)}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ))}

        {/* Final step: Go Live */}
        <section
          id="go-live"
          aria-labelledby="go-live-title"
          className="scroll-mt-20 bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 text-white rounded-2xl p-4 sm:p-6 border border-emerald-800/40 shadow-lg space-y-3"
          data-testid="guide-go-live"
        >
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={completedSet.has(GO_LIVE_STEP.id)}
              onChange={() => toggleGuideStep(GO_LIVE_STEP.id)}
              aria-label={`Mark "${GO_LIVE_STEP.title}" as done`}
              className="mt-1 h-5 w-5 shrink-0 rounded border-slate-500 text-emerald-500 focus:ring-emerald-400 cursor-pointer"
            />
            <div>
              <h2 id="go-live-title" className="text-base sm:text-lg font-bold flex items-center gap-2">
                <Rocket className="w-5 h-5 text-emerald-400" aria-hidden="true" />
                {GO_LIVE_STEP.title}
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">{GO_LIVE_STEP.summary}</p>
            </div>
          </div>
          <ol className="list-decimal pl-5 sm:pl-12 space-y-1 text-xs text-slate-200 leading-relaxed">
            {GO_LIVE_STEP.howTo.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
          <div className="sm:ml-8 flex items-start gap-2 text-xs text-emerald-50 bg-emerald-900/40 border border-emerald-700/50 rounded-lg px-3 py-2.5">
            <Lightbulb className="w-4 h-4 shrink-0 text-emerald-300 mt-0.5" aria-hidden="true" />
            <p className="leading-relaxed">
              <strong className="font-semibold">SA Pro Tip:</strong> {GO_LIVE_STEP.proTip}
            </p>
          </div>
          {doneCount === TOTAL_STEPS && (
            <p className="sm:ml-8 flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
              All steps complete. You know your way around SA Property Hub.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
