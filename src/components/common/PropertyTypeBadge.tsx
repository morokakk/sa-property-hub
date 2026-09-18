'use client';

import React from 'react';
import { PropertyTitleType } from '@/types';
import { formatDate } from '@/lib/formatters';
import { Calendar } from 'lucide-react';

export function isAgmUpcoming(agmDate?: string): boolean {
  if (!agmDate) return false;
  const agm = new Date(agmDate).getTime();
  if (isNaN(agm)) return false;
  const diffDays = (agm - Date.now()) / (1000 * 60 * 60 * 24);
  return diffDays >= -1 && diffDays <= 30;
}

interface PropertyTypeBadgeProps {
  type?: PropertyTitleType;
  className?: string;
}

export function PropertyTypeBadge({ type, className = '' }: PropertyTypeBadgeProps) {
  switch (type) {
    case 'Freehold House':
      return (
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs ${className}`}
          title="Freehold Standalone Title (STSMA levies not applicable)"
        >
          <span>🏡 Freehold House</span>
        </span>
      );
    case 'Townhouse / Cluster':
      return (
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs ${className}`}
          title="Townhouse / Cluster Scheme (HOA / Body Corporate)"
        >
          <span>🏘️ Townhouse / Cluster</span>
        </span>
      );
    case 'Multi-unit Commercial':
      return (
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs ${className}`}
          title="Multi-unit Commercial Asset"
        >
          <span>🏬 Commercial</span>
        </span>
      );
    case 'Sectional Title Apartment':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs ${className}`}
          title="Sectional Title Scheme (Body Corporate STSMA)"
        >
          <span>🏢 Sectional Title</span>
        </span>
      );
  }
}

interface AgmDateChipProps {
  agmDate?: string;
  className?: string;
}

export function AgmDateChip({ agmDate, className = '' }: AgmDateChipProps) {
  if (!agmDate) return null;
  const upcoming = isAgmUpcoming(agmDate);
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all ${
        upcoming
          ? 'bg-amber-100 text-amber-950 border-amber-400 font-bold shadow-xs'
          : 'bg-slate-100 text-slate-700 border-slate-200'
      } ${className}`}
      title={
        upcoming
          ? '⚠️ Body Corporate AGM scheduled within 30 days! Check quorum and budget proxy.'
          : 'Scheduled Body Corporate Annual General Meeting (AGM)'
      }
    >
      <Calendar className={`w-2.5 h-2.5 ${upcoming ? 'text-amber-700' : 'text-slate-500'}`} />
      <span>
        AGM: {formatDate(agmDate)}
        {upcoming ? ' (Upcoming)' : ''}
      </span>
    </span>
  );
}
