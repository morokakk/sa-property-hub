'use client';

import React from 'react';
import {
  OccupancyStatus,
  EvictionJurisdiction,
  OccupantRiskProfile,
} from '@/types';
import {
  getOccupantRiskDefaults,
  EVICTION_JURISDICTION_DEFAULTS,
} from '@/lib/calculations/occupantRisk';
import { formatZAR } from '@/lib/formatters';
import {
  Scale,
  ShieldAlert,
  AlertTriangle,
  Building,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  Gavel,
} from 'lucide-react';

export interface OccupancyRiskCardProps {
  value: OccupantRiskProfile;
  onChange: (updated: OccupantRiskProfile) => void;
  maoReductionZAR?: number;
  evictionDelayBurnZAR?: number;
  totalOccupantCostZAR?: number;
  maoMode?: 'Flip' | 'Rental';
}

export const OccupancyRiskCard: React.FC<OccupancyRiskCardProps> = ({
  value,
  onChange,
  maoReductionZAR = 0,
  evictionDelayBurnZAR = 0,
  totalOccupantCostZAR = 0,
  maoMode = 'Flip',
}) => {
  const isUnlawful = value.occupancyStatus === 'unlawful_occupant';

  const handleStatusChange = (status: OccupancyStatus) => {
    if (status === value.occupancyStatus) return;
    if (status === 'unlawful_occupant') {
      const jurisdiction =
        value.evictionJurisdiction && value.evictionJurisdiction !== 'none'
          ? value.evictionJurisdiction
          : 'magistrates_court';
      onChange(getOccupantRiskDefaults('unlawful_occupant', jurisdiction));
    } else {
      onChange(getOccupantRiskDefaults(status));
    }
  };

  const handleJurisdictionChange = (jurisdiction: EvictionJurisdiction) => {
    if (jurisdiction === value.evictionJurisdiction) return;
    const defaults = EVICTION_JURISDICTION_DEFAULTS[jurisdiction];
    onChange({
      ...value,
      evictionJurisdiction: jurisdiction,
      estimatedEvictionDelayDays: defaults.days,
      budgetedLegalEvictionCostZAR: defaults.legalZAR,
    });
  };

  return (
    <div
      className={`rounded-2xl border p-5 transition-all ${
        isUnlawful
          ? 'bg-rose-50/60 border-rose-300 shadow-xs'
          : 'bg-white border-slate-200'
      }`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-xl border ${
              isUnlawful
                ? 'bg-rose-100 border-rose-300 text-rose-800'
                : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Occupancy & Site Possession (PIE Act Risk)
              </h3>
              {isUnlawful && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                  <XCircle className="w-3 h-3 text-rose-600" />
                  Eviction Order Required
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              Prevention of Illegal Eviction Act 19 of 1998 • Legal fee reserves & carrying burn
            </p>
          </div>
        </div>

        {/* Header Total Impact Pill */}
        {isUnlawful && totalOccupantCostZAR > 0 && (
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <span className="text-[11px] text-slate-600 font-medium">Total Burden:</span>
            <span className="text-xs font-bold text-rose-900 bg-rose-100 px-2.5 py-0.5 rounded-md border border-rose-300">
              +{formatZAR(totalOccupantCostZAR)}
            </span>
          </div>
        )}
      </div>

      {/* 3-Way Segmented Control */}
      <div className="space-y-3">
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
            Physical Possession Status at Acquisition
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Vacant */}
            <button
              type="button"
              onClick={() => handleStatusChange('vacant')}
              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                value.occupancyStatus === 'vacant'
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Vacant Possession</span>
            </button>

            {/* Tenanted Verified */}
            <button
              type="button"
              onClick={() => handleStatusChange('tenanted_verified')}
              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                value.occupancyStatus === 'tenanted_verified'
                  ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Tenanted (Verified Lease)</span>
            </button>

            {/* Unlawful Occupant */}
            <button
              type="button"
              onClick={() => handleStatusChange('unlawful_occupant')}
              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                value.occupancyStatus === 'unlawful_occupant'
                  ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Unlawful Occupants / Repo</span>
            </button>
          </div>
        </div>

        {/* Conditional Unlawful Occupant Details */}
        {isUnlawful && (
          <div className="space-y-4 pt-2">
            {/* Court Jurisdiction Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
                  <Gavel className="w-3.5 h-3.5 text-rose-700" />
                  Eviction Court Jurisdiction Tier
                </label>
                <span className="text-[10px] text-slate-500">Auto-populates default horizon & fees</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Magistrates Court */}
                <button
                  type="button"
                  onClick={() => handleJurisdictionChange('magistrates_court')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    value.evictionJurisdiction === 'magistrates_court'
                      ? 'bg-white border-rose-500 ring-2 ring-rose-200 shadow-xs'
                      : 'bg-white/70 border-rose-200 hover:bg-white text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900">Magistrate&apos;s Court</span>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      R 40,000 Budget
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-600 leading-relaxed">
                    Unopposed / Standard PIE application. Typical timeline: <strong>90–120 days</strong>.
                  </p>
                </button>

                {/* High Court */}
                <button
                  type="button"
                  onClick={() => handleJurisdictionChange('high_court')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    value.evictionJurisdiction === 'high_court'
                      ? 'bg-white border-rose-500 ring-2 ring-rose-200 shadow-xs'
                      : 'bg-white/70 border-rose-200 hover:bg-white text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900">High Court (Complex)</span>
                    <span className="text-[10px] font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      R 85,000 Budget
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-600 leading-relaxed">
                    Opposed / Contested / Constitutional defense. Timeline: <strong>180–270+ days</strong>.
                  </p>
                </button>
              </div>
            </div>

            {/* Inputs Grid: Days, Legal Fees, Site Security */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Estimated Delay Days */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Estimated Eviction Delay (Days)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="15"
                    value={value.estimatedEvictionDelayDays || ''}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        estimatedEvictionDelayDays: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="w-full text-xs pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-rose-500 font-semibold text-slate-900 bg-white"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  ~{Number(((value.estimatedEvictionDelayDays || 0) / 30.416).toFixed(1))} carrying months
                </span>
              </div>

              {/* Budgeted Legal Eviction Cost */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Budgeted Legal Eviction Cost (ZAR)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">R</span>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    value={value.budgetedLegalEvictionCostZAR || ''}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        budgetedLegalEvictionCostZAR: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="w-full text-xs pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-rose-500 font-semibold text-slate-900 bg-white"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Sheriff service, attorney & advocate fees
                </span>
              </div>

              {/* Monthly Site Security */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Monthly Site Security (ZAR/pm)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">R</span>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    placeholder="0"
                    value={value.monthlySiteSecurityZAR || ''}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        monthlySiteSecurityZAR: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="w-full text-xs pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-rose-500 font-semibold text-slate-900 bg-white"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Armed patrol to prevent secondary invasion
                </span>
              </div>
            </div>

            {/* Statutory PIE Act Guidance Card */}
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-xs text-amber-950">
                <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Section 4(2) PIE Act & Spoliation Statutory Risk Notice</span>
              </div>
              <ul className="list-disc list-inside text-[10px] text-amber-800 space-y-1">
                <li>
                  <strong>Section 4(2) Notice:</strong> Court must serve written notice at least 14 days prior to the hearing on both the occupants and the local municipality.
                </li>
                <li>
                  <strong>Just and Equitable Test (s4(6)/(7)):</strong> Courts must evaluate the rights of the elderly, children, disabled persons, and whether alternative municipal emergency housing is required if occupation exceeds 6 months.
                </li>
                <li>
                  <strong>Strict Prohibition of Self-Help:</strong> Changing locks, removing doors/roofs, or disconnecting municipal water/power constitutes unlawful spoliation (<em>mandament van spolie</em>) and exposes the buyer to urgent punitive High Court interdicts and damages under Section 26(3) of the RSA Constitution.
                </li>
              </ul>
            </div>

            {/* Live MAO & Capital Stack Feedback Strip */}
            <div className="p-3 rounded-xl bg-white border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                  <span>📉</span>
                  <span>
                    −{formatZAR(maoReductionZAR)} {maoMode} MAO Bid Ceiling Reduction
                  </span>
                </div>
                <p className="text-[10px] text-slate-600">
                  Reflects {formatZAR(value.budgetedLegalEvictionCostZAR)} legal reserve + {formatZAR(evictionDelayBurnZAR)} interim carrying burn across {value.estimatedEvictionDelayDays} days.
                </p>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <span className="text-[10px] font-semibold text-slate-500">Day-1 Capital Stack:</span>
                <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  +{formatZAR(value.budgetedLegalEvictionCostZAR)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
