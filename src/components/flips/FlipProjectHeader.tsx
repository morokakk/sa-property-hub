'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { FlipProject } from '@/types';
import { formatDate } from '@/lib/formatters';
import { PropertyTypeBadge, AgmDateChip } from '@/components/common/PropertyTypeBadge';
import {
  Edit3,
  CheckCircle2,
  ArrowRightLeft,
  ShieldAlert,
  ShieldCheck,
  Copy,
  Check,
  Share2,
  ChevronRight,
  ChevronDown,
  Coins,
} from 'lucide-react';
import { isEvictionActive } from '@/lib/calculations/occupantRisk';

export interface FlipProjectHeaderProps {
  flip: FlipProject;
  onUpdatePhase: (phase: FlipProject['currentPhase']) => void;
  onOpenEdit: () => void;
  onOpenExit: () => void;
  onOpenConvert: () => void;
  copiedWhatsApp?: boolean;
  onCopyWhatsApp?: () => void;
  whatsAppShareUrl?: string;
}

export function FlipProjectHeader({
  flip,
  onUpdatePhase,
  onOpenEdit,
  onOpenExit,
  onOpenConvert,
  copiedWhatsApp = false,
  onCopyWhatsApp,
  whatsAppShareUrl,
}: FlipProjectHeaderProps) {
  const [isExitMenuOpen, setIsExitMenuOpen] = useState(false);
  const exitMenuRef = useRef<HTMLDivElement>(null);

  // Close exit dropdown menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exitMenuRef.current && !exitMenuRef.current.contains(event.target as Node)) {
        setIsExitMenuOpen(false);
      }
    }
    if (isExitMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExitMenuOpen]);

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap mb-1.5">
          <PropertyTypeBadge type={flip.propertyType} />
          {(() => {
            const sqm = flip.floorAreaSqm || (flip.notes ? Number(flip.notes.match(/(\d+)\s*m²/)?.[1]) : undefined);
            if (!sqm || sqm <= 0) return null;
            const ratePerSqm = Math.round(flip.purchasePriceZAR / sqm);
            return (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-full"
                title={`Total Floor Area: ${sqm} m² • Purchase Rate: R ${ratePerSqm.toLocaleString('en-ZA')}/m²`}
              >
                <span>📐 {sqm} m²</span>
                <span className="text-slate-400 font-normal text-[9px]">
                  (R {ratePerSqm.toLocaleString('en-ZA')}/m²)
                </span>
              </span>
            );
          })()}
          <AgmDateChip agmDate={flip.agmDate} />

          {/* Interactive Phase Selector */}
          <select
            value={flip.currentPhase}
            onChange={(e) => onUpdatePhase(e.target.value as FlipProject['currentPhase'])}
            className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full cursor-pointer hover:bg-emerald-100 transition-colors"
            title="Change current project phase"
          >
            <option value="Acquisition & Conveyancing">Acquisition & Conveyancing</option>
            <option value="Strip & Demolition">Strip & Demolition</option>
            <option value="First Fix (Plumbing/Elec)">First Fix (Plumbing/Elec)</option>
            <option value="Finishes & Tiling">Finishes & Tiling</option>
            <option value="Snagging">Snagging</option>
            <option value="Staging & Marketing">Staging & Marketing</option>
            <option value="Sold / Awaiting Transfer">Sold / Awaiting Transfer</option>
          </select>

          {/* Eviction / Occupancy Status Badge */}
          {flip.occupantRisk && isEvictionActive(flip.occupantRisk) && (
            <span
              className="text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded-full flex items-center gap-1"
              title={`Section 4(2) PIE Act Eviction Pending in ${
                flip.occupantRisk.evictionJurisdiction === 'high_court' ? 'High Court' : "Magistrate's Court"
              }`}
            >
              <ShieldAlert className="w-3 h-3 text-rose-600" />
              <span>⛔ Unlawful Occupant • PIE Act Eviction Pending</span>
              <span className="text-[9px] opacity-80">
                ({flip.occupantRisk.evictionJurisdiction === 'high_court' ? 'High Court' : "Magistrate's Court"} •{' '}
                {flip.occupantRisk.estimatedEvictionDelayDays}d)
              </span>
            </span>
          )}

          {flip.occupantRisk?.occupancyStatus === 'vacant' && flip.occupantRisk.possessionObtainedDate && (
            <span
              className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1"
              title={`Vacant possession obtained on ${flip.occupantRisk.possessionObtainedDate}`}
            >
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>✓ Vacant Possession Secured</span>
            </span>
          )}
        </div>
        <h2 className="text-base font-bold text-slate-900 truncate">{flip.title}</h2>
        <p className="text-xs text-slate-500 truncate">{flip.address}, {flip.city}</p>
      </div>

      {/* Project Action Toolbar */}
      <div className="flex items-center gap-2 flex-wrap md:justify-end shrink-0">
        <div className="text-xs text-slate-500 text-left md:text-right hidden xl:block mr-1">
          <span className="block text-[10px] text-slate-400">Target Completion</span>
          <span className="font-semibold text-slate-800">{formatDate(flip.targetCompletionDate)}</span>
        </div>

        {/* 1. Edit Flip */}
        <button
          type="button"
          onClick={onOpenEdit}
          className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 shadow-2xs transition-colors cursor-pointer"
          title="Edit project duration, holding costs, budget & exit targets"
        >
          <Edit3 className="w-3.5 h-3.5 text-slate-500" />
          <span>Edit Flip</span>
        </button>

        {/* 2. WhatsApp Summary */}
        {onCopyWhatsApp && (
          <div className="inline-flex items-center rounded-lg border border-emerald-300 bg-emerald-50 shadow-2xs overflow-hidden">
            <button
              type="button"
              onClick={onCopyWhatsApp}
              className="px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors flex items-center gap-1 cursor-pointer"
              title="Copy WhatsApp syndicate update to clipboard"
            >
              {copiedWhatsApp ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-emerald-600" />
              )}
              <span>{copiedWhatsApp ? 'Copied!' : 'WhatsApp'}</span>
            </button>
            {whatsAppShareUrl && (
              <a
                href={whatsAppShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-emerald-700 hover:bg-emerald-100 border-l border-emerald-300 transition-colors"
                title="Share directly via WhatsApp"
              >
                <Share2 className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}

        {/* 3. Pitch Deck Link */}
        <Link
          href={`/proposal?dealId=${flip.id}`}
          className="inline-flex items-center gap-1 text-xs text-indigo-700 hover:text-indigo-900 font-semibold bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1.5 rounded-lg transition-colors shadow-2xs"
          title="View syndicate presentation deck"
        >
          <span>Pitch Deck</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>

        {/* 4. Exit Lifecycle Dropdown */}
        <div className="relative" ref={exitMenuRef}>
          <button
            type="button"
            id="flips-exit-lifecycle-btn"
            data-testid="flips-exit-lifecycle-btn"
            onClick={() => setIsExitMenuOpen((prev) => !prev)}
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer"
            title="Project exit & conversion options"
          >
            <Coins className="w-3.5 h-3.5 text-emerald-200" />
            <span>Exit / Convert</span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-emerald-200 transition-transform duration-150 ${
                isExitMenuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {isExitMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
              <button
                type="button"
                onClick={() => {
                  setIsExitMenuOpen(false);
                  onOpenExit();
                }}
                className="w-full text-left px-3.5 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-bold text-slate-900">Mark as Flipped / Sold</div>
                  <div className="text-[10px] text-slate-500 font-normal">
                    Record realized sale price & archive project
                  </div>
                </div>
              </button>

              <div className="my-1 border-t border-slate-100" />

              <button
                type="button"
                onClick={() => {
                  setIsExitMenuOpen(false);
                  onOpenConvert();
                }}
                className="w-full text-left px-3.5 py-2 text-xs font-semibold text-indigo-800 hover:bg-indigo-50 flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <ArrowRightLeft className="w-4 h-4 text-indigo-600 shrink-0" />
                <div>
                  <div className="font-bold text-slate-900">Convert to Rental (BRRRR)</div>
                  <div className="text-[10px] text-slate-500 font-normal">
                    Transition asset into active rental portfolio
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FlipProjectHeader;
