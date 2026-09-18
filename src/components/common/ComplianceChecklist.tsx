'use client';

import React, { useState } from 'react';
import { ComplianceCertificates, CoCItem, CoCStatus } from '@/types';
import {
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Clock,
  MinusCircle,
  Zap,
  Flame,
  Fence,
  Droplet,
  Bug,
  Edit2,
  Check,
} from 'lucide-react';

interface ComplianceChecklistProps {
  certificates?: ComplianceCertificates;
  onUpdate?: (updated: ComplianceCertificates) => void;
  readOnly?: boolean;
}

const DEFAULT_CERTIFICATES: ComplianceCertificates = {
  electrical: { type: 'Electrical', status: 'Pending Inspection' },
  gas: { type: 'Gas', status: 'Not Applicable' },
  electricFence: { type: 'Electric Fence', status: 'Not Applicable' },
  plumbing: { type: 'Plumbing (Cape Town)', status: 'Pending Inspection' },
  beetle: { type: 'Beetle', status: 'Certified / Valid', issueDate: '2026-08-10', certificateNumber: 'BC-99104' },
};

export default function ComplianceChecklist({
  certificates = DEFAULT_CERTIFICATES,
  onUpdate,
  readOnly = false,
}: ComplianceChecklistProps) {
  const [certs, setCerts] = useState<ComplianceCertificates>(certificates);
  const [editingCertKey, setEditingCertKey] = useState<keyof ComplianceCertificates | null>(null);
  const [certNumberInput, setCertNumberInput] = useState('');

  const certMeta: Record<
    keyof ComplianceCertificates,
    { label: string; sub: string; icon: React.ComponentType<{ className?: string }> }
  > = {
    electrical: {
      label: 'Electrical CoC',
      sub: 'OHS Act Wireman Cert',
      icon: Zap,
    },
    gas: {
      label: 'Gas Compliance',
      sub: 'SANS 10087-1 (Hobs/Geysers)',
      icon: Flame,
    },
    electricFence: {
      label: 'Electric Fence',
      sub: 'EIR 2011 Energizer System',
      icon: Fence,
    },
    plumbing: {
      label: 'Water / Plumbing',
      sub: 'City of Cape Town By-Law',
      icon: Droplet,
    },
    beetle: {
      label: 'Beetle Clearance',
      sub: 'Coastal Woodborer / Borer',
      icon: Bug,
    },
  };

  const handleStatusChange = (key: keyof ComplianceCertificates, nextStatus: CoCStatus) => {
    const updated: ComplianceCertificates = {
      ...certs,
      [key]: {
        ...certs[key],
        status: nextStatus,
        issueDate: nextStatus === 'Certified / Valid' ? new Date().toISOString().split('T')[0] : certs[key].issueDate,
      },
    };
    setCerts(updated);
    if (onUpdate) onUpdate(updated);
  };

  const handleSaveCertNumber = (key: keyof ComplianceCertificates) => {
    const updated: ComplianceCertificates = {
      ...certs,
      [key]: {
        ...certs[key],
        certificateNumber: certNumberInput,
      },
    };
    setCerts(updated);
    if (onUpdate) onUpdate(updated);
    setEditingCertKey(null);
    setCertNumberInput('');
  };

  return (
    <div className="bg-slate-50/90 rounded-xl border border-slate-200/80 p-3.5 space-y-2.5">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Mandatory SA Compliance Certificates (CoC)</span>
        </div>
        <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-semibold">
          Deeds Office Clearance
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
        {(Object.keys(certMeta) as Array<keyof ComplianceCertificates>).map((key) => {
          const item = certs[key] || { type: certMeta[key].label, status: 'Not Applicable' };
          const meta = certMeta[key];
          const Icon = meta.icon;

          return (
            <div
              key={key}
              className={`p-2.5 rounded-lg border text-xs flex flex-col justify-between transition-all ${
                item.status === 'Certified / Valid'
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                  : item.status === 'Pending Inspection'
                  ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                  : 'bg-slate-100/50 border-slate-200 text-slate-500'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1">
                    <Icon className="w-3.5 h-3.5 shrink-0 opacity-80" />
                    <span className="font-bold text-[11px] truncate">{meta.label}</span>
                  </div>
                </div>
                <p className="text-[9px] text-slate-500 truncate mb-1.5">{meta.sub}</p>
              </div>

              <div className="space-y-1 mt-1">
                {readOnly ? (
                  <span
                    className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded ${
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
                    className="w-full text-[10px] font-bold py-1 px-1 rounded border border-slate-300 bg-white cursor-pointer"
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
                          className="w-full text-[9px] px-1 py-0.5 border rounded"
                        />
                        <button
                          onClick={() => handleSaveCertNumber(key)}
                          className="text-emerald-700 font-bold"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="font-mono">{item.certificateNumber || item.issueDate || 'Valid'}</span>
                        {!readOnly && (
                          <button
                            onClick={() => {
                              setEditingCertKey(key);
                              setCertNumberInput(item.certificateNumber || '');
                            }}
                            className="text-slate-400 hover:text-slate-700 ml-1"
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
        })}
      </div>
    </div>
  );
}
