'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  INVESTMENT_REGION_GROUPS,
  ALL_INVESTMENT_NODES,
  findInvestmentNode,
  getNodeComplianceProfile,
  InvestmentNode,
} from '@/lib/constants/investmentNodes';
import { Province, SouthAfricanProvince } from '@/types';
import { ShieldCheck, MapPin, Target, Sparkles, Building2, HelpCircle } from 'lucide-react';

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
  compact = false,
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

  const compliance = useMemo(
    () => getNodeComplianceProfile(value, province || matchedNode?.province),
    [value, province, matchedNode]
  );

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

export function InvestmentNodeBanner({
  city,
  province,
  className = '',
}: {
  city?: string;
  province?: Province;
  className?: string;
}) {
  const matchedNode = useMemo(() => findInvestmentNode(city), [city]);
  const compliance = useMemo(
    () => getNodeComplianceProfile(city, province || matchedNode?.province),
    [city, province, matchedNode]
  );

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
        </div>

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

      {/* Recommended Strategies */}
      {matchedNode?.recommendedStrategies && matchedNode.recommendedStrategies.length > 0 && (
        <div className="flex items-center gap-1.5 pt-0.5">
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

      {/* Compliance Notes */}
      <div className="text-[11px] text-slate-500 italic pt-0.5">
        {compliance.notes}
      </div>
    </div>
  );
}
