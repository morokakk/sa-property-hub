'use client';

import React from 'react';
import Link from 'next/link';
import { FlipProject } from '@/types';
import { Hammer, Copy, Check, Share2, ChevronRight } from 'lucide-react';
import { isEvictionActive } from '@/lib/calculations/occupantRisk';

export interface FlipProjectTabsProps {
  activeFlips: FlipProject[];
  selectedFlipId: string;
  onSelectFlip: (id: string) => void;
  activeFlip: FlipProject | null;
  copiedWhatsApp: boolean;
  onCopyWhatsApp: () => void;
  whatsAppShareUrl: string;
}

export function FlipProjectTabs({
  activeFlips,
  selectedFlipId,
  onSelectFlip,
  activeFlip,
  copiedWhatsApp,
  onCopyWhatsApp,
  whatsAppShareUrl,
}: FlipProjectTabsProps) {
  return (
    <div className="flex items-center justify-between overflow-x-auto pb-2 border-b border-slate-200 gap-3">
      <div className="flex items-center gap-2">
        {activeFlips.map((flip) => (
          <button
            key={flip.id}
            type="button"
            onClick={() => onSelectFlip(flip.id)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeFlip?.id === flip.id
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Hammer className="w-3.5 h-3.5" />
            <span>{flip.title}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
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

      {activeFlip && (
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onCopyWhatsApp}
            className="px-2.5 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
            title="Copy WhatsApp syndicate update to clipboard"
          >
            {copiedWhatsApp ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copiedWhatsApp ? 'Copied WhatsApp!' : 'Copy WhatsApp Summary'}</span>
          </button>

          <a
            href={whatsAppShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-emerald-700 hover:bg-emerald-100 bg-emerald-50 rounded-lg border border-emerald-300 transition-colors"
            title="Share directly via WhatsApp"
          >
            <Share2 className="w-3.5 h-3.5" />
          </a>

          <Link
            href={`/proposal?dealId=${activeFlip.id}`}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <span>Pitch Deck</span> <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}

export default FlipProjectTabs;
