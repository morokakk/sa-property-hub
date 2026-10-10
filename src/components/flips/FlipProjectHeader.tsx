'use client';

import React from 'react';
import { FlipProject } from '@/types';
import { formatDate } from '@/lib/formatters';
import { PropertyTypeBadge, AgmDateChip } from '@/components/common/PropertyTypeBadge';
import { Edit3, CheckCircle2, ArrowRightLeft, ShieldAlert, ShieldCheck } from 'lucide-react';
import { isEvictionActive } from '@/lib/calculations/occupantRisk';

export interface FlipProjectHeaderProps {
  flip: FlipProject;
  onUpdatePhase: (phase: FlipProject['currentPhase']) => void;
  onOpenEdit: () => void;
  onOpenExit: () => void;
  onOpenConvert: () => void;
}

export function FlipProjectHeader({
  flip,
  onUpdatePhase,
  onOpenEdit,
  onOpenExit,
  onOpenConvert,
}: FlipProjectHeaderProps) {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 flex-wrap mb-1.5">
          <PropertyTypeBadge type={flip.propertyType} />
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
              title={`Section 4(2) PIE Act Eviction Pending in ${flip.occupantRisk.evictionJurisdiction === 'high_court' ? 'High Court' : "Magistrate's Court"}`}
            >
              <ShieldAlert className="w-3 h-3 text-rose-600" />
              <span>⛔ Unlawful Occupant • PIE Act Eviction Pending</span>
              <span className="text-[9px] opacity-80">
                ({flip.occupantRisk.evictionJurisdiction === 'high_court' ? 'High Court' : "Magistrate's Court"} • {flip.occupantRisk.estimatedEvictionDelayDays}d)
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
        <h2 className="text-base font-bold text-slate-900">{flip.title}</h2>
        <p className="text-xs text-slate-500">{flip.address}, {flip.city}</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="text-xs text-slate-500 text-left md:text-right hidden sm:block">
          <span className="block text-[10px] text-slate-400">Target Completion</span>
          <span className="font-semibold text-slate-800">{formatDate(flip.targetCompletionDate)}</span>
        </div>

        <button
          type="button"
          onClick={onOpenEdit}
          className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-3 py-2 rounded-lg border border-slate-300 shadow-2xs transition-all cursor-pointer"
          title="Edit project duration, holding costs, budget & exit targets"
        >
          <Edit3 className="w-3.5 h-3.5 text-slate-600" />
          <span>Edit Flip</span>
        </button>

        <button
          type="button"
          onClick={onOpenExit}
          className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg shadow-sm transition-all cursor-pointer"
          title="Record realized sale price and move to sold archive"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          <span>Mark as Flipped / Sold</span>
        </button>

        <button
          type="button"
          onClick={onOpenConvert}
          className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg shadow-sm transition-all cursor-pointer"
          title="Convert this flip project to a long-term rental property under BRRRR strategy"
        >
          <ArrowRightLeft className="w-4 h-4 text-indigo-200" />
          <span>Convert to Rental</span>
        </button>
      </div>
    </div>
  );
}

export default FlipProjectHeader;
