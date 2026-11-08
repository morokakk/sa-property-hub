'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { MunicipalZoningCode, ZoningProfile } from '@/types';
import {
  calculateZoningEnvelope,
  ZONING_PRESETS,
  formatZoningTransitionLabel,
} from '@/lib/calculations/zoning';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

const MUNICIPAL_ZONING_CODES: MunicipalZoningCode[] = [
  'Residential 1',
  'Residential 2',
  'Residential 3',
  'Residential 4',
  'Business 1',
  'Business 2',
  'Mixed Use',
  'Industrial 1',
  'Special',
  'Agricultural',
  'Unzoned / Township Scheme',
];

export interface ZoningEnvelopeSubPanelProps {
  zoningProfile: ZoningProfile | undefined;
  onUpdateZoning: (updates: Partial<ZoningProfile>) => void;
  onApplyPreset: (presetId: string) => void;
  plannedBuildableSqm: number;
  plannedUnits: number;
  preApprovalMonths?: number;
  onSetPreApprovalMonths?: (months: number) => void;
  isCollapsible?: boolean;
  defaultOpen?: boolean;
}

export function ZoningEnvelopeSubPanel({
  zoningProfile,
  onUpdateZoning,
  onApplyPreset,
  plannedBuildableSqm,
  plannedUnits,
  preApprovalMonths = 6,
  onSetPreApprovalMonths,
  isCollapsible = true,
  defaultOpen = false,
}: ZoningEnvelopeSubPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    setIsOpen(defaultOpen);
  }, [defaultOpen]);

  // Comma-friendly decimal input state
  const [farInput, setFarInput] = useState<string>(String(zoningProfile?.farRatio ?? 0.8));
  const [coverageInput, setCoverageInput] = useState<string>(String(zoningProfile?.coveragePercent ?? 50));

  useEffect(() => {
    if (zoningProfile?.farRatio !== undefined) {
      setFarInput(String(zoningProfile.farRatio));
    }
  }, [zoningProfile?.farRatio]);

  useEffect(() => {
    if (zoningProfile?.coveragePercent !== undefined) {
      setCoverageInput(String(zoningProfile.coveragePercent));
    }
  }, [zoningProfile?.coveragePercent]);

  const parseDecimal = (val: string, fallback: number = 0): number => {
    const cleaned = val.replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? fallback : parsed;
  };

  const isPresetActive = (preset: typeof ZONING_PRESETS[number]) => {
    if (!zoningProfile) return false;
    const currentMatches = zoningProfile.currentZoning === preset.profile.currentZoning;
    const targetMatches = (zoningProfile.targetZoning || '') === (preset.profile.targetZoning || '');
    const farMatches = Math.abs(zoningProfile.farRatio - preset.profile.farRatio) < 0.001;
    const covMatches = Math.abs(zoningProfile.coveragePercent - preset.profile.coveragePercent) < 0.001;
    const heightMatches = zoningProfile.maxHeightStoreys === preset.profile.maxHeightStoreys;
    return currentMatches && targetMatches && farMatches && covMatches && heightMatches;
  };

  const envelope = useMemo(() => {
    if (!zoningProfile) return null;
    return calculateZoningEnvelope(
      zoningProfile,
      plannedBuildableSqm || 320,
      plannedUnits || 1
    );
  }, [zoningProfile, plannedBuildableSqm, plannedUnits]);

  return (
    <div className="p-3.5 rounded-xl bg-white border border-amber-200/80 space-y-3 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
              Municipal Zoning Rights &amp; Bulk Envelope
            </span>
            {zoningProfile && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-900 text-white">
                {formatZoningTransitionLabel(zoningProfile.currentZoning, zoningProfile.targetZoning)}
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-500">
            Town planning bulk envelope (FAR), coverage, height, and SPLUMA Section 42 rezoning guardrails
          </span>
        </div>

        {/* Presets and Toggle */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] uppercase font-bold text-slate-500">Presets:</span>
          {ZONING_PRESETS.map((preset) => {
            const active = isPresetActive(preset);
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  onApplyPreset(preset.id);
                  setIsOpen(true);
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer shadow-2xs transition-colors ${
                  active
                    ? 'bg-slate-900 text-white border border-slate-900'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
          {isCollapsible && (
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded cursor-pointer transition-colors"
            >
              {isOpen ? 'Hide Controls ▴' : 'Edit Parameters ▾'}
            </button>
          )}
        </div>
      </div>

      {/* Collapsed Compact Live Summary Pill */}
      {!isOpen && zoningProfile && envelope && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs animate-in fade-in duration-150">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-900">
              {formatZoningTransitionLabel(zoningProfile.currentZoning, zoningProfile.targetZoning)}
            </span>
            <span className="text-slate-400">&bull;</span>
            <span className="text-slate-600">
              Max Bulk:{' '}
              <span
                className={`font-bold font-mono tabular-nums ${
                  envelope.isBulkExceeded ? 'text-rose-600' : 'text-slate-900'
                }`}
              >
                {envelope.maxPermittedBulkSqm.toLocaleString('en-ZA')} m²
              </span>{' '}
              ({envelope.bulkUtilizationPercent.toFixed(1)}% Utilized)
            </span>
          </div>
          <div>
            {envelope.isSplumaRezoningTriggered ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                <AlertTriangle className="w-3 h-3 text-amber-700 shrink-0" />
                <span>SPLUMA Rezoning Required</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                <CheckCircle2 className="w-3 h-3 text-emerald-700 shrink-0" />
                <span>As-of-Right</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Expanded Live Badge & Alerts */}
      {isOpen && zoningProfile && envelope && (
        <div className="space-y-2 animate-in fade-in duration-150">
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-600">Max Permitted Bulk:</span>
              <span
                className={`font-bold tabular-nums font-mono ${
                  envelope.isBulkExceeded ? 'text-rose-600' : 'text-emerald-700'
                }`}
              >
                {envelope.maxPermittedBulkSqm.toLocaleString('en-ZA')} m²
              </span>
              <span className="text-slate-400">&bull;</span>
              <span className="text-slate-600">
                Planned: {plannedBuildableSqm || 320} m² ({envelope.bulkUtilizationPercent.toFixed(1)}% utilization)
              </span>
            </div>
            <div>
              {envelope.isSplumaRezoningTriggered ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  <AlertTriangle className="w-3 h-3 text-amber-700 shrink-0" />
                  <span>SPLUMA Rezoning Tribunal Triggered</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                  <CheckCircle2 className="w-3 h-3 text-emerald-700 shrink-0" />
                  <span>As-of-Right Statutory Rights</span>
                </span>
              )}
            </div>
          </div>

          {/* Amber/Rose Guardrail Alerts */}
          {envelope.isBulkExceeded && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <span className="font-bold shrink-0">Bulk Exceeded:</span>
              <span>
                Planned bulk of {plannedBuildableSqm || 320} m² exceeds maximum permitted stand bulk of{' '}
                {envelope.maxPermittedBulkSqm.toLocaleString('en-ZA')} m² (by{' '}
                {((plannedBuildableSqm || 320) - envelope.maxPermittedBulkSqm).toLocaleString('en-ZA')} m²).
                Increase stand FAR via rezoning or reduce buildable area.
              </span>
            </div>
          )}

          {envelope.isHeightExceeded && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <span className="font-bold shrink-0">Height Exceeded:</span>
              <span>
                Planned scheme requires at least {envelope.minStoreysRequired} storeys to stay within maximum
                ground coverage ({envelope.maxGroundFootprintSqm.toLocaleString('en-ZA')} m² footprint),
                exceeding the {zoningProfile.maxHeightStoreys}-storey limit.
              </span>
            </div>
          )}

          {envelope.isDensityExceeded && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <span className="font-bold shrink-0">Density Exceeded:</span>
              <span>
                Planned {plannedUnits} units exceeds the municipal density cap of{' '}
                {envelope.maxPermittedUnitsByDensity} units permitted on this {zoningProfile.erfSizeSqm} m² stand
                ({zoningProfile.maxDensityDuPerHa} du/ha).
              </span>
            </div>
          )}

          {envelope.isSplumaRezoningTriggered && preApprovalMonths < 6 && (
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  <strong>SPLUMA Holding Delay Risk:</strong> Statutory rezoning typically requires 6–12 months tribunal review. Current Pre-Approval timeline ({preApprovalMonths} mos) may underestimate carrying holding burn.
                </span>
              </div>
              {onSetPreApprovalMonths && (
                <button
                  type="button"
                  onClick={() => onSetPreApprovalMonths(6)}
                  className="shrink-0 px-2.5 py-1 text-[11px] font-bold rounded bg-amber-600 hover:bg-amber-700 text-white cursor-pointer transition-colors shadow-2xs"
                >
                  Set to 6m
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Collapsible Parameter Controls */}
      {isOpen && (
        <div className="pt-3 border-t border-slate-100 space-y-3 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Current Zoning</label>
              <select
                value={zoningProfile?.currentZoning || 'Residential 1'}
                onChange={(e) => onUpdateZoning({ currentZoning: e.target.value as MunicipalZoningCode })}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg font-semibold text-slate-900 bg-white"
              >
                {MUNICIPAL_ZONING_CODES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Target Zoning</label>
              <select
                value={zoningProfile?.targetZoning || ''}
                onChange={(e) =>
                  onUpdateZoning({ targetZoning: (e.target.value as MunicipalZoningCode) || undefined })
                }
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg font-semibold text-slate-900 bg-white"
              >
                <option value="">Same (As-of-Right)</option>
                {MUNICIPAL_ZONING_CODES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Stand Erf Size (m²)</label>
              <input
                type="number"
                min="10"
                step="50"
                value={zoningProfile?.erfSizeSqm || 1000}
                onChange={(e) => onUpdateZoning({ erfSizeSqm: Math.max(0, Number(e.target.value) || 0) })}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg font-semibold text-slate-900 bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Floor Area Ratio (FAR)</label>
              <input
                type="text"
                inputMode="decimal"
                value={farInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setFarInput(val);
                  const parsed = parseDecimal(val, 0);
                  if (parsed > 0) onUpdateZoning({ farRatio: parsed });
                }}
                onBlur={() => {
                  const parsed = parseDecimal(farInput, zoningProfile?.farRatio || 0.8);
                  if (parsed > 0) {
                    onUpdateZoning({ farRatio: parsed });
                    setFarInput(String(parsed));
                  } else {
                    setFarInput(String(zoningProfile?.farRatio || 0.8));
                  }
                }}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg font-semibold text-slate-900 bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Coverage (%)</label>
              <input
                type="text"
                inputMode="decimal"
                value={coverageInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setCoverageInput(val);
                  const parsed = parseDecimal(val, 0);
                  if (parsed > 0) onUpdateZoning({ coveragePercent: parsed });
                }}
                onBlur={() => {
                  const parsed = parseDecimal(coverageInput, zoningProfile?.coveragePercent || 50);
                  if (parsed > 0) {
                    onUpdateZoning({ coveragePercent: parsed });
                    setCoverageInput(String(parsed));
                  } else {
                    setCoverageInput(String(zoningProfile?.coveragePercent || 50));
                  }
                }}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg font-semibold text-slate-900 bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Max Height (Storeys)</label>
              <input
                type="number"
                min="1"
                max="20"
                step="1"
                value={zoningProfile?.maxHeightStoreys || 2}
                onChange={(e) => onUpdateZoning({ maxHeightStoreys: Math.max(1, Number(e.target.value) || 1) })}
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg font-semibold text-slate-900 bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Max Density (du / ha)</label>
              <input
                type="number"
                min="1"
                max="1000"
                step="10"
                placeholder="Unrestricted"
                value={zoningProfile?.maxDensityDuPerHa || ''}
                onChange={(e) =>
                  onUpdateZoning({
                    maxDensityDuPerHa: e.target.value === '' ? undefined : Math.max(0, Number(e.target.value) || 0),
                  })
                }
                className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg font-semibold text-slate-900 bg-white"
              />
            </div>

            <div className="flex flex-col justify-end">
              <div className="h-[34px] flex items-center">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800 text-[11px] select-none">
                  <input
                    type="checkbox"
                    checked={Boolean(zoningProfile?.requiresRezoning)}
                    onChange={(e) => onUpdateZoning({ requiresRezoning: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <span>SPLUMA Rezoning Required</span>
                </label>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-4 text-[11px]">
            <span className="font-semibold text-slate-500">Consent Uses:</span>
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
              <input
                type="checkbox"
                checked={Boolean(zoningProfile?.consentUses?.secondDwellingPermitted)}
                onChange={(e) =>
                  onUpdateZoning({
                    consentUses: {
                      ...(zoningProfile?.consentUses || {
                        secondDwellingPermitted: false,
                        studentCommuneConsent: false,
                        backyardMicroUnitsPermitted: false,
                        homeEnterprisePermitted: false,
                      }),
                      secondDwellingPermitted: e.target.checked,
                    },
                  })
                }
                className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span>2nd Dwelling</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
              <input
                type="checkbox"
                checked={Boolean(zoningProfile?.consentUses?.backyardMicroUnitsPermitted)}
                onChange={(e) =>
                  onUpdateZoning({
                    consentUses: {
                      ...(zoningProfile?.consentUses || {
                        secondDwellingPermitted: false,
                        studentCommuneConsent: false,
                        backyardMicroUnitsPermitted: false,
                        homeEnterprisePermitted: false,
                      }),
                      backyardMicroUnitsPermitted: e.target.checked,
                    },
                  })
                }
                className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span>Backyard Micro-Units</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
              <input
                type="checkbox"
                checked={Boolean(zoningProfile?.consentUses?.studentCommuneConsent)}
                onChange={(e) =>
                  onUpdateZoning({
                    consentUses: {
                      ...(zoningProfile?.consentUses || {
                        secondDwellingPermitted: false,
                        studentCommuneConsent: false,
                        backyardMicroUnitsPermitted: false,
                        homeEnterprisePermitted: false,
                      }),
                      studentCommuneConsent: e.target.checked,
                    },
                  })
                }
                className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span>Student Commune</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
              <input
                type="checkbox"
                checked={Boolean(zoningProfile?.consentUses?.homeEnterprisePermitted)}
                onChange={(e) =>
                  onUpdateZoning({
                    consentUses: {
                      ...(zoningProfile?.consentUses || {
                        secondDwellingPermitted: false,
                        studentCommuneConsent: false,
                        backyardMicroUnitsPermitted: false,
                        homeEnterprisePermitted: false,
                      }),
                      homeEnterprisePermitted: e.target.checked,
                    },
                  })
                }
                className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span>Home Enterprise</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
