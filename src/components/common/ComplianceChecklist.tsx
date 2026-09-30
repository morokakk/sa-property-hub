'use client';

import React, { useState } from 'react';
import { ComplianceCertificates, CoCItem, CoCStatus } from '@/types';
import {
  ShieldCheck,
  Zap,
  Flame,
  Fence,
  Droplet,
  Bug,
  Edit2,
  Check,
  FileCheck,
  ChevronDown,
  ChevronUp,
  MapPin,
} from 'lucide-react';

interface ComplianceChecklistProps {
  certificates?: ComplianceCertificates;
  onUpdate?: (updated: ComplianceCertificates) => void;
  readOnly?: boolean;
  city?: string;
  province?: string;
}

export function isGautengRegion(city?: string, province?: string): boolean {
  if (province && province.toLowerCase().includes('gauteng')) return true;
  if (!city) return false;
  const c = city.toLowerCase();
  return (
    c.includes('johannesburg') ||
    c.includes('joburg') ||
    c.includes('jhb') ||
    c.includes('sandton') ||
    c.includes('randburg') ||
    c.includes('roodepoort') ||
    c.includes('rosebank') ||
    c.includes('pretoria') ||
    c.includes('tshwane') ||
    c.includes('centurion') ||
    c.includes('midrand') ||
    c.includes('ekurhuleni') ||
    c.includes('kempton') ||
    c.includes('boksburg') ||
    c.includes('benoni') ||
    c.includes('bedfordview') ||
    c.includes('waterkloof') ||
    c.includes('soweto') ||
    c.includes('bryanston') ||
    c.includes('fourways') ||
    c.includes('alberton') ||
    c.includes('germiston') ||
    c.includes('krugersdorp') ||
    c.includes('edenvale') ||
    c.includes('gauteng')
  );
}

export function isCoastalRegion(city?: string, province?: string): boolean {
  if (province && (province.toLowerCase().includes('western cape') || province.toLowerCase().includes('eastern cape') || province.toLowerCase().includes('kwazulu') || province.toLowerCase().includes('kzn'))) {
    return true;
  }
  if (!city) return false;
  const c = city.toLowerCase();
  return (
    c.includes('cape town') ||
    c.includes('durban') ||
    c.includes('umhlanga') ||
    c.includes('port elizabeth') ||
    c.includes('gqeberha') ||
    c.includes('hermanus') ||
    c.includes('ballito') ||
    c.includes('stellenbosch') ||
    c.includes('somerset west') ||
    c.includes('western cape') ||
    c.includes('eastern cape') ||
    c.includes('kwazulu')
  );
}

const DEFAULT_CERTIFICATES: ComplianceCertificates = {
  electrical: { type: 'Electrical', status: 'Pending Inspection' },
  electricFence: { type: 'Electric Fence', status: 'Not Applicable' },
  gas: { type: 'Gas', status: 'Not Applicable' },
  approvedPlansSG: { type: 'Approved SG Plans', status: 'Pending Inspection' },
  plumbing: { type: 'Plumbing (Cape Town)', status: 'Not Applicable' },
  beetle: { type: 'Beetle', status: 'Not Applicable' },
};

export default function ComplianceChecklist({
  certificates = DEFAULT_CERTIFICATES,
  onUpdate,
  readOnly = false,
  city,
  province,
}: ComplianceChecklistProps) {
  const [certs, setCerts] = useState<ComplianceCertificates>(certificates);
  const [editingCertKey, setEditingCertKey] = useState<keyof ComplianceCertificates | null>(null);
  const [certNumberInput, setCertNumberInput] = useState('');
  const [showSecondaryCerts, setShowSecondaryCerts] = useState(false);

  // Sync state whenever external certificates prop changes (e.g. switching active flip)
  React.useEffect(() => {
    setCerts(certificates || DEFAULT_CERTIFICATES);
  }, [certificates]);

  // Region detection
  const isGauteng = isGautengRegion(city, province);
  const isCoastal = isCoastalRegion(city, province);

  const certMeta: Record<
    keyof ComplianceCertificates,
    { type: CoCItem['type']; label: string; sub: string; icon: React.ComponentType<{ className?: string }> }
  > = {
    electrical: {
      type: 'Electrical',
      label: 'Electrical CoC',
      sub: 'OHS Act Wireman Cert (National)',
      icon: Zap,
    },
    electricFence: {
      type: 'Electric Fence',
      label: 'Electric Fence CoC',
      sub: 'EIR 2011 Energizer System',
      icon: Fence,
    },
    gas: {
      type: 'Gas',
      label: 'Gas Compliance',
      sub: 'SANS 10087-1 (Hobs/Geysers)',
      icon: Flame,
    },
    approvedPlansSG: {
      type: 'Approved SG Plans',
      label: 'Approved Plans (SG)',
      sub: 'Surveyor-General & Town Planning',
      icon: FileCheck,
    },
    plumbing: {
      type: 'Plumbing (Cape Town)',
      label: 'Water / Plumbing',
      sub: 'City of Cape Town By-Law',
      icon: Droplet,
    },
    beetle: {
      type: 'Beetle',
      label: 'Beetle Clearance',
      sub: 'Coastal Woodborer / Borer',
      icon: Bug,
    },
  };

  // Divide into Primary and Secondary based on geography
  let primaryKeys: Array<keyof ComplianceCertificates>;
  let secondaryKeys: Array<keyof ComplianceCertificates>;

  if (isGauteng) {
    // Gauteng prioritizes Electrical, Fence, Gas, and SG Plans. Plumbing/Beetle are coastal.
    primaryKeys = ['electrical', 'electricFence', 'gas', 'approvedPlansSG'];
    secondaryKeys = ['plumbing', 'beetle'];
  } else if (isCoastal) {
    // Western Cape prioritizes Electrical, Plumbing By-law, Beetle, Gas, Fence
    primaryKeys = ['electrical', 'plumbing', 'beetle', 'gas', 'electricFence'];
    secondaryKeys = ['approvedPlansSG'];
  } else {
    // General default
    primaryKeys = ['electrical', 'gas', 'electricFence', 'approvedPlansSG'];
    secondaryKeys = ['plumbing', 'beetle'];
  }

  const handleStatusChange = (key: keyof ComplianceCertificates, nextStatus: CoCStatus) => {
    const existing: CoCItem = certs[key] || {
      type: certMeta[key].type,
      status: 'Not Applicable',
    };
    const updated: ComplianceCertificates = {
      ...certs,
      [key]: {
        ...existing,
        status: nextStatus,
        issueDate:
          nextStatus === 'Certified / Valid'
            ? new Date().toISOString().split('T')[0]
            : existing.issueDate,
      },
    };
    setCerts(updated);
    if (onUpdate) onUpdate(updated);
  };

  const handleSaveCertNumber = (key: keyof ComplianceCertificates) => {
    const existing: CoCItem = certs[key] || {
      type: certMeta[key].type,
      status: 'Not Applicable',
    };
    const updated: ComplianceCertificates = {
      ...certs,
      [key]: {
        ...existing,
        certificateNumber: certNumberInput,
      },
    };
    setCerts(updated);
    if (onUpdate) onUpdate(updated);
    setEditingCertKey(null);
    setCertNumberInput('');
  };

  const renderCertCard = (key: keyof ComplianceCertificates) => {
    const item: CoCItem = certs[key] || {
      type: certMeta[key].label as any,
      status: 'Not Applicable',
    };
    const meta = certMeta[key];
    const Icon = meta.icon;

    return (
      <div
        key={key}
        className={`p-3 rounded-xl border text-xs flex flex-col justify-between transition-all min-h-[115px] ${
          item.status === 'Certified / Valid'
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950 shadow-2xs'
            : item.status === 'Pending Inspection'
            ? 'bg-amber-50/70 border-amber-200 text-amber-950 shadow-2xs'
            : 'bg-slate-100/50 border-slate-200 text-slate-500'
        }`}
      >
        <div>
          <div className="flex items-center gap-1.5 min-w-0 mb-1">
            <Icon className="w-3.5 h-3.5 shrink-0 opacity-80" />
            <span className="font-bold text-xs truncate" title={meta.label}>
              {meta.label}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 leading-tight line-clamp-1 mb-2" title={meta.sub}>
            {meta.sub}
          </p>
        </div>

        <div className="space-y-1.5 mt-auto">
          {readOnly ? (
            <span
              className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${
                item.status === 'Certified / Valid'
                  ? 'bg-emerald-200 text-emerald-900'
                  : item.status === 'Pending Inspection'
                  ? 'bg-amber-200 text-amber-900'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {item.status}
            </span>
          ) : (
            <select
              value={item.status}
              onChange={(e) => handleStatusChange(key, e.target.value as CoCStatus)}
              className="w-full text-xs font-semibold py-1.5 px-2 rounded-lg border border-slate-300 bg-white cursor-pointer shadow-2xs"
            >
              <option value="Not Applicable">N/A</option>
              <option value="Pending Inspection">Pending</option>
              <option value="Certified / Valid">Certified</option>
            </select>
          )}

          {item.status === 'Certified / Valid' && (
            <div className="text-[9px] text-slate-600 truncate flex items-center justify-between">
              {editingCertKey === key ? (
                <div className="flex items-center gap-1 w-full mt-1">
                  <input
                    type="text"
                    placeholder="Cert #"
                    value={certNumberInput}
                    onChange={(e) => setCertNumberInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveCertNumber(key);
                      }
                    }}
                    className="w-full text-[9px] px-1 py-0.5 border rounded"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveCertNumber(key)}
                    className="text-emerald-700 font-bold cursor-pointer"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="font-mono">{item.certificateNumber || item.issueDate || 'Valid'}</span>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCertKey(key);
                        setCertNumberInput(item.certificateNumber || '');
                      }}
                      className="text-slate-400 hover:text-slate-700 ml-1 cursor-pointer"
                    >
                      <Edit2 className="w-2.5 h-2.5" />
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-50/90 rounded-xl border border-slate-200/80 p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/60 flex-wrap gap-2">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-900">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Mandatory SA Compliance Certificates (CoC)</span>
          {city && (
            <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 font-normal bg-white px-2 py-0.5 rounded border border-slate-200">
              <MapPin className="w-3 h-3 text-slate-400" />
              <span>{city}{province ? `, ${province}` : ''}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isGauteng && (
            <span className="text-[10px] sm:text-[11px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-semibold border border-blue-200">
              Gauteng Profile (SG Plans + Elec + Fence)
            </span>
          )}
          {isCoastal && (
            <span className="text-[10px] sm:text-[11px] bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded font-semibold border border-cyan-200">
              Coastal Profile (Water By-Law + Beetle)
            </span>
          )}
          <span className="text-[10px] sm:text-[11px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-semibold">
            Deeds Office Lodgement
          </span>
        </div>
      </div>

      {/* Primary Certificates Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {primaryKeys.map((key) => renderCertCard(key))}
      </div>

      {/* Secondary / Regional Certs (Opt-in collapsible) */}
      {secondaryKeys.length > 0 && (
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowSecondaryCerts((prev) => !prev)}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-800 py-1 transition-colors cursor-pointer"
          >
            {showSecondaryCerts ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>
              {isGauteng
                ? 'Coastal / Secondary Certificates (Cape Town Water By-Law & Beetle Clearance)'
                : 'Additional Clearance (Approved Council SG Plans)'}
            </span>
            <span className="text-[10px] text-slate-400 font-normal">
              ({secondaryKeys.length} {showSecondaryCerts ? 'expanded' : 'opt-in'})
            </span>
          </button>

          {showSecondaryCerts && (
            <div className="mt-2.5 p-3 rounded-xl bg-slate-100/60 border border-slate-200 animate-in fade-in duration-150">
              <p className="text-[10px] text-slate-500 mb-2">
                {isGauteng
                  ? 'Note: Water By-Law plumbing certificates and woodborer beetle clearances are typically mandated only in coastal Western Cape / KZN municipalities.'
                  : 'Municipal Approved building plans and Surveyor-General (SG) diagrams required for freehold extensions or title rectification.'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {secondaryKeys.map((key) => renderCertCard(key))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
