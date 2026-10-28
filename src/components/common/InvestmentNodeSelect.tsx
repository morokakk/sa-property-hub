'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  INVESTMENT_REGION_GROUPS,
  ALL_INVESTMENT_NODES,
  findInvestmentNode,
  getNodeComplianceProfile,
  evaluateNodeBenchmarks,
  getEffectiveNodeBenchmarks,
  NodeMarketBenchmarks,
  EffectiveNodeBenchmarks,
} from '@/lib/constants/investmentNodes';
import { Province, SouthAfricanProvince, DealStrategy, CustomNodeBenchmarkOverride } from '@/types';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';
import { ShieldCheck, MapPin, Target, Sparkles, Building2, AlertTriangle, CheckCircle2, Sliders } from 'lucide-react';

const SA_PROVINCES: SouthAfricanProvince[] = [
  'Gauteng',
  'Western Cape',
  'KwaZulu-Natal',
  'Eastern Cape',
  'Free State',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape',
  'Other',
];

interface InvestmentNodeSelectProps {
  value: string;
  province?: Province;
  onChange: (city: string, province: Province) => void;
  showProfileBanner?: boolean;
  label?: string;
  selectClassName?: string;
  compact?: boolean;
  name?: string;
}

export default function InvestmentNodeSelect({
  value,
  province = 'Gauteng',
  onChange,
  showProfileBanner = true,
  label = 'City / Region',
  selectClassName = 'w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white font-medium text-slate-800',
  name = 'propertyCity',
}: InvestmentNodeSelectProps) {
  // Determine if current value is one of the 35 curated nodes
  const matchedNode = useMemo(() => findInvestmentNode(value), [value]);
  const isCuratedNode = useMemo(
    () => ALL_INVESTMENT_NODES.some((n) => n.name === value),
    [value]
  );

  const [isCustomMode, setIsCustomMode] = useState<boolean>(!isCuratedNode && value !== '' && !matchedNode);
  const [customCity, setCustomCity] = useState<string>(!isCuratedNode ? value : '');
  const [customProvince, setCustomProvince] = useState<Province>(province || matchedNode?.province || 'Gauteng');

  // Synchronize custom state if value changes externally
  useEffect(() => {
    if (isCuratedNode) {
      setIsCustomMode(false);
    } else if (value && !ALL_INVESTMENT_NODES.some((n) => n.name === value)) {
      // Check if it's a known legacy city
      const legacyNode = findInvestmentNode(value);
      if (!legacyNode) {
        setIsCustomMode(true);
        setCustomCity(value);
      }
    }
  }, [value, isCuratedNode]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    if (selected === '__custom__') {
      setIsCustomMode(true);
      onChange(customCity || 'Custom Suburb', customProvince);
      return;
    }

    setIsCustomMode(false);
    const node = ALL_INVESTMENT_NODES.find((n) => n.name === selected);
    if (node) {
      onChange(node.name, node.province);
    } else {
      onChange(selected, province);
    }
  };

  const handleCustomCityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCity = e.target.value;
    setCustomCity(newCity);
    onChange(newCity, customProvince);
  };

  const handleCustomProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProv = e.target.value as Province;
    setCustomProvince(newProv);
    onChange(customCity || value, newProv);
  };

  return (
    <div className="space-y-2">
      {label && <label className="block text-xs font-semibold text-slate-700">{label}</label>}

      {/* Main Select */}
      <div className="relative">
        <select
          name={name}
          value={isCustomMode ? '__custom__' : value}
          onChange={handleSelectChange}
          className={selectClassName}
        >
          {/* If the current value is not one of the 35 nodes, render it cleanly so it remains selected */}
          {!isCuratedNode && value && !isCustomMode && (
            <optgroup label="Selected Location">
              <option value={value}>{value}</option>
            </optgroup>
          )}

          {INVESTMENT_REGION_GROUPS.map((group) => (
            <optgroup key={group.id} label={group.title}>
              {group.nodes.map((node) => (
                <option key={node.id} value={node.name}>
                  {node.name}
                </option>
              ))}
            </optgroup>
          ))}

          <optgroup label="Other">
            <option value="__custom__">Other / Custom Location...</option>
          </optgroup>
        </select>
      </div>

      {/* Custom Location Inputs */}
      {isCustomMode && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg text-xs animate-in fade-in duration-200">
          <div>
            <label className="block text-[11px] font-semibold text-amber-900 mb-1">
              Custom Suburb / City Name
            </label>
            <input
              type="text"
              value={customCity}
              placeholder="e.g. Jeffrey's Bay or Bryanston East"
              onChange={handleCustomCityChange}
              className="w-full text-xs px-2.5 py-1.5 border border-amber-300 rounded focus:ring-1 focus:ring-amber-500 bg-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-amber-900 mb-1">Province</label>
            <select
              value={customProvince}
              onChange={handleCustomProvinceChange}
              className="w-full text-xs px-2.5 py-1.5 border border-amber-300 rounded focus:ring-1 focus:ring-amber-500 bg-white"
            >
              {SA_PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Primary Investment Profile & Compliance Banner */}
      {showProfileBanner && (
        <InvestmentNodeBanner city={value} province={province} />
      )}
    </div>
  );
}

export interface InvestmentNodeBannerProps {
  city?: string;
  province?: Province;
  className?: string;
  liveInputs?: {
    strategy?: DealStrategy;
    purchasePrice?: number;
    openMarketValue?: number;
    grossYield?: number;
    vacancyRatePercent?: number;
    annualCapitalGrowthPercent?: number;
    monthlyRatesZAR?: number;
    purchasePricePerSqm?: number;
  };
  onApplyNodeBenchmarks?: (benchmarks: NodeMarketBenchmarks) => void;
  customOverrides?: Record<string, CustomNodeBenchmarkOverride>;
}

export function InvestmentNodeBanner({
  city,
  province,
  className = '',
  liveInputs,
  onApplyNodeBenchmarks,
  customOverrides,
}: InvestmentNodeBannerProps) {
  const storeOverrides = usePortfolioStore((state) => state.investorProfile?.customNodeBenchmarks);
  const overrides = customOverrides ?? storeOverrides;

  const matchedNode = useMemo(() => findInvestmentNode(city), [city]);
  const effectiveBenchmarks = useMemo(
    () => (matchedNode ? getEffectiveNodeBenchmarks(matchedNode, overrides) : null),
    [matchedNode, overrides]
  );

  const compliance = useMemo(
    () => getNodeComplianceProfile(city, province || matchedNode?.province),
    [city, province, matchedNode]
  );

  const benchmarkAudit = useMemo(() => {
    if (!matchedNode || !liveInputs) return null;
    return evaluateNodeBenchmarks(matchedNode, liveInputs, overrides);
  }, [matchedNode, liveInputs, overrides]);

  return (
    <div className={`rounded-xl border border-slate-200 bg-slate-50/90 p-3 space-y-2 text-xs text-slate-700 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-800">
          <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
          <span>{matchedNode ? matchedNode.regionGroup : `${province || 'South Africa'} Region`}</span>
          {matchedNode && (
            <span className="text-[10px] font-normal text-slate-500">
              • {matchedNode.province}
            </span>
          )}
          {effectiveBenchmarks && (
            effectiveBenchmarks.isOverridden ? (
              <span
                data-testid="node-provenance-badge"
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-300 ml-1"
              >
                <ShieldCheck className="w-3 h-3 text-emerald-700" />
                <span>
                  Custom / Verified
                  {effectiveBenchmarks.source ? ` · ${effectiveBenchmarks.source}` : ''}
                  {effectiveBenchmarks.asOfDate ? ` · ${effectiveBenchmarks.asOfDate}` : ''}
                </span>
              </span>
            ) : (
              <span
                data-testid="node-provenance-badge"
                className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 ml-1"
              >
                <span>Indicative estimate — unverified</span>
              </span>
            )
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {/* Compliance Badge */}
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
              compliance.zone === 'western_cape'
                ? 'bg-cyan-50 text-cyan-800 border-cyan-300'
                : compliance.zone === 'coastal'
                ? 'bg-blue-50 text-blue-800 border-blue-300'
                : 'bg-emerald-50 text-emerald-800 border-emerald-300'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
            {compliance.zone === 'western_cape'
              ? 'Western Cape: Plumbing By-Law & Beetle Required'
              : compliance.zone === 'coastal'
              ? 'Coastal: Beetle Clearance Customary'
              : 'Inland: Standard OHS & SG Plans'}
          </span>

          {/* 1-Click Apply Node Benchmarks CTA */}
          {effectiveBenchmarks && onApplyNodeBenchmarks && (
            <button
              type="button"
              data-testid="apply-node-benchmarks-btn"
              onClick={() => onApplyNodeBenchmarks(effectiveBenchmarks)}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-300 transition-colors cursor-pointer shadow-2xs"
              title={`Apply ${matchedNode?.name} norms: ${effectiveBenchmarks.typicalVacancyPercent}% Vacancy, ${effectiveBenchmarks.typicalCapitalGrowthPercent}% Capital Growth, and ~${effectiveBenchmarks.typicalMonthlyRatesPercentOfVal}% Municipal Rates`}
            >
              <Sliders className="w-3 h-3 text-indigo-600" />
              <span>Use Node Defaults</span>
            </button>
          )}
        </div>
      </div>

      {/* Primary Profile description */}
      {matchedNode?.primaryInvestmentProfile && (
        <div className="text-xs text-slate-600 leading-relaxed flex items-start gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
          <span>
            <strong className="text-slate-800">Primary Investment Profile:</strong> {matchedNode.primaryInvestmentProfile}
          </span>
        </div>
      )}

      {/* Recommended Strategies & Node Market Benchmarks Strip */}
      {matchedNode && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          {matchedNode.recommendedStrategies.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span className="text-[11px] text-slate-500 font-medium">Target Strategy:</span>
              <div className="flex flex-wrap gap-1">
                {matchedNode.recommendedStrategies.map((st) => (
                  <span
                    key={st}
                    className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100/70 text-emerald-800 border border-emerald-200"
                  >
                    {st === 'Flip' ? 'Buy & Flip' : st === 'Rental' ? 'Buy & Hold' : 'BRRRR'}
                  </span>
                ))}
              </div>
            </div>
          )}

          {effectiveBenchmarks && (
            <div
              data-testid="node-benchmark-reference-strip"
              className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-600 font-mono bg-white/80 px-2.5 py-1 rounded-lg border border-slate-200"
            >
              <span className="font-sans font-bold text-slate-700">Node Norms:</span>
              <span>Yield {effectiveBenchmarks.grossYieldRangePercent[0]}–{effectiveBenchmarks.grossYieldRangePercent[1]}%</span>
              <span>•</span>
              <span>Vacancy {effectiveBenchmarks.typicalVacancyPercent}%</span>
              <span>•</span>
              <span>Growth {effectiveBenchmarks.typicalCapitalGrowthPercent}%</span>
              <span>•</span>
              <span>
                R{effectiveBenchmarks.pricePerSqmRangeZAR[0].toLocaleString('en-ZA')}–R{effectiveBenchmarks.pricePerSqmRangeZAR[1].toLocaleString('en-ZA')}/m²
              </span>
            </div>
          )}
        </div>
      )}

      {/* Non-Destructive Guardrail Badges */}
      {benchmarkAudit && benchmarkAudit.items.length > 0 && (
        <div data-testid="node-benchmark-audit-badges" className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200/80">
          {benchmarkAudit.items.map((item) => {
            const isOptimistic = item.status === 'optimistic';
            const isConservative = item.status === 'conservative';
            return (
              <span
                key={item.metric}
                data-testid={`benchmark-badge-${item.metric}`}
                title={item.message}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                  isOptimistic
                    ? 'bg-amber-50 text-amber-900 border-amber-300'
                    : isConservative
                    ? 'bg-sky-50 text-sky-900 border-sky-200'
                    : 'bg-emerald-50/70 text-emerald-800 border-emerald-200'
                }`}
              >
                {isOptimistic ? (
                  <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                ) : isConservative ? (
                  <Sparkles className="w-3 h-3 text-sky-600 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                )}
                <span>{item.message}</span>
              </span>
            );
          })}
        </div>
      )}

      {/* Compliance Notes */}
      <div className="text-[11px] text-slate-500 italic pt-0.5">
        {compliance.notes}
      </div>
    </div>
  );
}
