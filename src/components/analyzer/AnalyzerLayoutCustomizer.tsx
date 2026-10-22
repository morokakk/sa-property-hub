'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  AnalyzerSectionId,
  AnalyzerLayoutPreset,
  DealStrategy,
} from '@/types';
import {
  SlidersHorizontal,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Zap,
  AlertTriangle,
  X,
  Check,
  Layers,
  Building,
  Sliders,
  Scale,
  MapPin,
  TrendingUp,
  ShieldAlert,
} from 'lucide-react';

export interface SectionMeta {
  id: AnalyzerSectionId;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const ANALYZER_SECTION_METADATA: Record<AnalyzerSectionId, SectionMeta> = {
  scorecard: {
    id: 'scorecard',
    label: 'Location & Amenity Scorecard',
    description: 'Schools, SAPS, clinic & mall proximity scoring',
    icon: MapPin,
  },
  holdingExit: {
    id: 'holdingExit',
    label: 'Holding Period & Exit VAT Sensitivity',
    description: '1–12 mos duration slider & VAT-exempt agent toggle',
    icon: Sliders,
  },
  vacancyAgent: {
    id: 'vacancyAgent',
    label: 'Vacancy & Managing Agent Fees',
    description: 'Credit loss buffer % & agency commission with 15% VAT',
    icon: Building,
  },
  opexReserves: {
    id: 'opexReserves',
    label: 'Fine-Tune OpEx Reserves',
    description: 'Maintenance, prepaid vending, communal services & SPV audit',
    icon: Sliders,
  },
  auctionDistressed: {
    id: 'auctionDistressed',
    label: 'Auction & Distressed Outlays',
    description: "Buyer's premium commission & municipal rates clearance arrears",
    icon: Scale,
  },
  pieActRisk: {
    id: 'pieActRisk',
    label: 'Occupancy & Site Possession (PIE Act)',
    description: 'Eviction legal budget, court tier & carrying burn',
    icon: ShieldAlert,
  },
  mortgageEngine: {
    id: 'mortgageEngine',
    label: 'Mortgage Financing & Cash Deposit',
    description: 'Bidirectional LTV & deposit sync, prime spread & bond repayment',
    icon: Scale,
  },
  longTermProjections: {
    id: 'longTermProjections',
    label: 'Advanced Assumptions & Projections',
    description: '20/30-year wealth projection model, escalation & SVG chart',
    icon: TrendingUp,
  },
  stressTaxOverrides: {
    id: 'stressTaxOverrides',
    label: 'Stress-Test & SARS Tax Overrides',
    description: 'Custom transfer duty, conveyancing & Section 13sex shield',
    icon: Scale,
  },
};

export interface AnalyzerLayoutCustomizerProps {
  sectionOrder: AnalyzerSectionId[];
  hiddenSections: AnalyzerSectionId[];
  onToggleVisibility: (id: AnalyzerSectionId) => void;
  onMoveSection: (id: AnalyzerSectionId, direction: 'up' | 'down') => void;
  onApplyPreset: (preset: AnalyzerLayoutPreset) => void;
  activeOverrides?: Partial<Record<AnalyzerSectionId, { active: boolean; label?: string }>>;
  isDistressedSource?: boolean;
  strategy?: DealStrategy;
}

export default function AnalyzerLayoutCustomizer({
  sectionOrder,
  hiddenSections,
  onToggleVisibility,
  onMoveSection,
  onApplyPreset,
  activeOverrides = {},
  isDistressedSource = false,
  strategy = 'Rental',
}: AnalyzerLayoutCustomizerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const totalSectionsCount = 9;
  const visibleSectionsCount = totalSectionsCount - hiddenSections.length;
  const isCustomized = hiddenSections.length > 0;

  // Check if any currently hidden section contains an active non-default override
  const hiddenSectionsWithOverrides = hiddenSections.filter(
    (id) => activeOverrides[id]?.active
  );
  const hasHiddenActiveOverride = hiddenSectionsWithOverrides.length > 0;

  const getSectionContextNotice = (id: AnalyzerSectionId): string | null => {
    if (id === 'auctionDistressed' && !isDistressedSource) {
      return 'Auction/Repo sources only';
    }
    if (id === 'opexReserves' && strategy === 'Flip') {
      return 'Hidden for Buy & Flip';
    }
    return null;
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Header Trigger Button */}
      <button
        type="button"
        data-testid="analyzer-layout-customizer-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        title="Customize Calculator Layout: Show, hide, or reorder sections"
        className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
          hasHiddenActiveOverride
            ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 ring-1 ring-amber-400'
            : isCustomized
            ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border-indigo-300'
            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
        }`}
      >
        <SlidersHorizontal className="w-3.5 h-3.5 text-slate-600" />
        <span>Customize Layout</span>
        {isCustomized ? (
          <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-indigo-200/80 text-indigo-950">
            {`Layout (${visibleSectionsCount}/${totalSectionsCount})`}
          </span>
        ) : null}

        {hasHiddenActiveOverride && (
          <span
            className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-200 text-amber-950 flex items-center gap-1"
            title="Warning: One or more hidden sections contain active cost or tax overrides"
          >
            <AlertTriangle className="w-3 h-3 text-amber-700" />
            <span className="hidden sm:inline">Active override hidden</span>
          </span>
        )}
      </button>

      {/* Popover / Mobile Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="fixed inset-0" onClick={() => setIsOpen(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="layout-customizer-title"
            data-testid="analyzer-layout-customizer-panel"
            className="relative bg-white rounded-t-3xl sm:rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto z-10 animate-in slide-in-from-bottom duration-200 sm:duration-150 sm:zoom-in-95 text-slate-900"
          >
            {/* Mobile Drag Indicator */}
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 id="layout-customizer-title" className="text-sm font-bold text-slate-900">
                    Customize Calculator Layout
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Hide, show, and reorder modular sections. Persists globally.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 min-h-[32px] min-w-[32px] flex items-center justify-center cursor-pointer transition-colors"
                aria-label="Close customizer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Hidden Active Override Warning Banner */}
            {hasHiddenActiveOverride && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 text-xs flex items-start gap-2.5 shadow-2xs">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">Active Overrides in Hidden Sections:</strong>
                  <p className="text-[11px] text-amber-900 mt-0.5">
                    {hiddenSectionsWithOverrides.length} hidden section(s) currently contain non-zero cost penalties or tax overrides affecting your Day-1 Capital or ROI. Look for the amber badge below.
                  </p>
                </div>
              </div>
            )}

            {/* Quick Presets Row */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Quick Presets
                </span>
                <span className="text-[10px] text-slate-400">One-click view toggles</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  data-testid="layout-preset-napkin"
                  onClick={() => onApplyPreset('napkin')}
                  className="py-2 px-3 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100 text-amber-950 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  <span>⚡ Quick Napkin Screen</span>
                </button>
                <button
                  type="button"
                  data-testid="layout-preset-full"
                  onClick={() => onApplyPreset('full')}
                  className="py-2 px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
                  <span>🏦 Full Institutional (Reset)</span>
                </button>
              </div>
            </div>

            {/* Pinned Top Core Anchor Notice */}
            <div className="mb-3 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 flex items-center justify-between">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-600" />
                Top & Bottom Core Anchors Pinned
              </span>
              <span className="text-[10px] text-slate-400">
                Identity, Valuation, Bid & Results always visible
              </span>
            </div>

            {/* Section List (9 modular sections in current order) */}
            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {sectionOrder.map((sectionId, index) => {
                const meta = ANALYZER_SECTION_METADATA[sectionId] || {
                  id: sectionId,
                  label: sectionId,
                  description: '',
                  icon: Layers,
                };
                const SectionIcon = meta.icon;
                const isHidden = hiddenSections.includes(sectionId);
                const isFirst = index === 0;
                const isLast = index === sectionOrder.length - 1;
                const contextNotice = getSectionContextNotice(sectionId);
                const sectionOverride = activeOverrides[sectionId];
                const hasSectionActiveOverride = Boolean(sectionOverride?.active);

                return (
                  <div
                    key={sectionId}
                    data-customizer-section={sectionId}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-2.5 ${
                      isHidden
                        ? hasSectionActiveOverride
                          ? 'bg-amber-50/50 border-amber-300 text-slate-500'
                          : 'bg-slate-50/80 border-slate-200 text-slate-400'
                        : 'bg-white border-slate-200 text-slate-800 shadow-2xs'
                    }`}
                  >
                    {/* Reorder and Identity Left */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`text-xs font-bold truncate ${
                              isHidden ? 'line-through opacity-70' : 'text-slate-900'
                            }`}
                          >
                            {meta.label}
                          </span>

                          {/* Contextual notice if conditional on Strategy/Source */}
                          {contextNotice && (
                            <span className="text-[9px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded border border-slate-200">
                              {contextNotice}
                            </span>
                          )}

                          {/* Active override hidden guardrail badge */}
                          {isHidden && hasSectionActiveOverride && (
                            <span
                              data-testid={`hidden-warning-${sectionId}`}
                              className="text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 rounded flex items-center gap-1"
                              title={sectionOverride?.label || 'Contains active non-default financial inputs'}
                            >
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              Active override hidden
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          {meta.description}
                        </p>
                      </div>
                    </div>

                    {/* Controls Right: Move Up, Move Down, Visibility Toggle */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Move Up Button */}
                      <button
                        type="button"
                        data-testid={`move-up-${sectionId}`}
                        onClick={() => onMoveSection(sectionId, 'up')}
                        disabled={isFirst}
                        title={`Move ${meta.label} Up`}
                        className="min-h-[36px] min-w-[36px] rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer"
                        aria-label={`Move ${meta.label} Up`}
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>

                      {/* Move Down Button */}
                      <button
                        type="button"
                        data-testid={`move-down-${sectionId}`}
                        onClick={() => onMoveSection(sectionId, 'down')}
                        disabled={isLast}
                        title={`Move ${meta.label} Down`}
                        className="min-h-[36px] min-w-[36px] rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer"
                        aria-label={`Move ${meta.label} Down`}
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>

                      {/* Visibility Toggle Button */}
                      <button
                        type="button"
                        role="switch"
                        data-testid={`toggle-visibility-${sectionId}`}
                        aria-checked={!isHidden}
                        onClick={() => onToggleVisibility(sectionId)}
                        title={isHidden ? `Show ${meta.label}` : `Hide ${meta.label}`}
                        className={`min-h-[36px] px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                          isHidden
                            ? 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                        }`}
                      >
                        {isHidden ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                            <span className="hidden sm:inline">Hidden</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="hidden sm:inline">Visible</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer Summary */}
            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                {visibleSectionsCount} of {totalSectionsCount} sections visible
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-xl transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
