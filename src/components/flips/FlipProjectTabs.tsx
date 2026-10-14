'use client';

import React from 'react';
import { FlipProject } from '@/types';
import { Hammer } from 'lucide-react';
import { isEvictionActive } from '@/lib/calculations/occupantRisk';

export interface FlipProjectTabsProps {
  activeFlips: FlipProject[];
  selectedFlipId: string;
  onSelectFlip: (id: string) => void;
  activeFlip?: FlipProject | null;
  copiedWhatsApp?: boolean;
  onCopyWhatsApp?: () => void;
  whatsAppShareUrl?: string;
}

export function FlipProjectTabs({
  activeFlips,
  selectedFlipId,
  onSelectFlip,
  activeFlip,
}: FlipProjectTabsProps) {
  return (
    <div className="flex items-center justify-between overflow-x-auto pb-1 border-b border-slate-200 gap-2">
      <div className="flex items-center gap-2">
        {activeFlips.map((flip) => (
          <button
            key={flip.id}
            type="button"
            onClick={() => onSelectFlip(flip.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              (activeFlip?.id || selectedFlipId) === flip.id
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Hammer className="w-3.5 h-3.5 text-amber-500" />
            <span>{flip.title}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                (activeFlip?.id || selectedFlipId) === flip.id
                  ? 'bg-slate-800 text-slate-300'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {flip.city}
            </span>
            {flip.occupantRisk && isEvictionActive(flip.occupantRisk) && (
              <span
                className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-rose-600 text-white"
                title="Section 4(2) PIE Act Eviction Pending"
              >
                PIE
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export default FlipProjectTabs;
