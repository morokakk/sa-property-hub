'use client';

import React, { useState } from 'react';
import {
  ClipboardCheck,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  Share2,
  Copy,
  Check,
  Camera,
  Calendar,
  Sparkles,
} from 'lucide-react';
import {
  InspectionCategory,
  InspectionCondition,
  InspectionItem,
  LeaseInspectionRecord,
} from '@/types';
import {
  DEFAULT_INSPECTION_CATEGORIES,
  createDefaultInspectionRecord,
  ensureInspectionItems,
  normalizeWhatsAppPhone,
} from '@/lib/calculations/inspections';
import { formatInspectionForWhatsApp } from '@/lib/whatsappFormatter';
import { formatDate } from '@/lib/formatters';

export interface LeaseInspectionDrawerProps {
  inspectionRecord?: LeaseInspectionRecord;
  depositHeldZAR: number;
  propertyTitle: string;
  unitName: string;
  tenantName: string;
  tenantPhone?: string;
  statementToken?: string;
  onUpdateInspection: (record: LeaseInspectionRecord) => void;
}

const CONDITIONS: InspectionCondition[] = ['Good', 'Fair', 'Defective', 'N/A'];

export function LeaseInspectionDrawer({
  inspectionRecord,
  depositHeldZAR,
  propertyTitle,
  unitName,
  tenantName,
  tenantPhone,
  statementToken,
  onUpdateInspection,
}: LeaseInspectionDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [showSaveReminder, setShowSaveReminder] = useState(false);

  const record: LeaseInspectionRecord = inspectionRecord || {
    ingoingDate: new Date().toISOString().split('T')[0],
    ingoingTenantAgreed: false,
    items: DEFAULT_INSPECTION_CATEGORIES.map((category) => ({
      category,
      ingoingCondition: 'Good' as InspectionCondition,
    })),
  };

  const items = ensureInspectionItems(record.items);

  // Status Badge Logic
  const getStatusBadge = () => {
    if (!record.ingoingDate) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
          <AlertTriangle className="w-3 h-3 text-amber-600" />
          <span>Inspection Pending</span>
        </span>
      );
    }
    if (record.ingoingTenantAgreed) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>
            RHA Compliant • Agreed
            {record.ingoingTenantAgreedDate ? ` (${formatDate(record.ingoingTenantAgreedDate)})` : ''}
          </span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
        <Clock className="w-3 h-3 text-blue-600" />
        <span>Inspected • Awaiting Tenant WhatsApp Sign-Off</span>
      </span>
    );
  };

  const handleUpdateRecord = (updates: Partial<LeaseInspectionRecord>) => {
    const updated: LeaseInspectionRecord = {
      ...record,
      ...updates,
      items: updates.items ? updates.items : items,
    };
    onUpdateInspection(updated);
  };

  const handleSetCondition = (category: InspectionCategory, condition: InspectionCondition) => {
    const updatedItems = items.map((item) =>
      item.category === category ? { ...item, ingoingCondition: condition } : item
    );
    handleUpdateRecord({ items: updatedItems });
  };

  const handleSetNote = (category: InspectionCategory, note: string) => {
    const updatedItems = items.map((item) =>
      item.category === category ? { ...item, ingoingNotes: note } : item
    );
    handleUpdateRecord({ items: updatedItems });
  };

  const handleMarkAllGood = () => {
    const freshRecord = createDefaultInspectionRecord(
      record.ingoingDate || new Date().toISOString().split('T')[0]
    );
    // Preserve vault URL and existing agreed state if already checked
    freshRecord.ingoingPhotoVaultUrl = record.ingoingPhotoVaultUrl;
    freshRecord.ingoingTenantAgreed = record.ingoingTenantAgreed;
    freshRecord.ingoingTenantAgreedDate = record.ingoingTenantAgreedDate;
    onUpdateInspection(freshRecord);
  };

  const handleSendWhatsApp = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const portalUrl = statementToken ? `${origin}/statement/${statementToken}?tab=inspection` : undefined;

    const messageText = formatInspectionForWhatsApp({
      propertyTitle,
      unitName,
      tenantName,
      mode: 'ingoing',
      depositHeldZAR,
      record: {
        ...record,
        items,
      },
      portalUrl,
    });

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(messageText);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 3000);
    }

    setShowSaveReminder(true);
    setTimeout(() => setShowSaveReminder(false), 8000);

    const normalizedPhone = normalizeWhatsAppPhone(tenantPhone);
    const waUrl = normalizedPhone
      ? `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(messageText)}`
      : `https://wa.me/?text=${encodeURIComponent(messageText)}`;

    if (typeof window !== 'undefined') {
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="border border-indigo-100 rounded-xl bg-gradient-to-br from-indigo-50/40 via-white to-slate-50/40 overflow-hidden text-xs my-2">
      {/* Header Bar */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 flex items-center justify-between text-left hover:bg-indigo-50/50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <div className="p-1 rounded-md bg-indigo-100 text-indigo-700">
            <ClipboardCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
              <span>Ingoing Inspection Checklist</span>
              <span className="text-[10px] font-normal text-slate-500">(RHA Sec 5)</span>
            </div>
            <div className="text-[10px] text-slate-500">
              Joint condition record mandatory to legally deduct damages from deposit
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {getStatusBadge()}
          <span className="text-slate-400">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </div>
      </button>

      {/* Collapsible Drawer Body */}
      {isOpen && (
        <div className="p-3.5 border-t border-indigo-100/70 space-y-3.5 animate-in fade-in duration-150">
          {/* Quick Action & Metadata Bar */}
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-[11px] font-bold text-slate-700">Inspection Particulars</span>
              <button
                type="button"
                onClick={handleMarkAllGood}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors cursor-pointer"
                title="Sets all 8 categories to Good condition with 1 click"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Mark All 8 as Good (1-Tap)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>Ingoing Inspection Date</span>
                </label>
                <input
                  type="date"
                  value={record.ingoingDate || ''}
                  onChange={(e) => handleUpdateRecord({ ingoingDate: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                  <Camera className="w-3 h-3 text-slate-400" />
                  <span>Photo Evidence Vault URL</span>
                </label>
                <input
                  type="url"
                  placeholder="e.g. Google Drive / iCloud / Dropbox link"
                  value={record.ingoingPhotoVaultUrl || ''}
                  onChange={(e) => handleUpdateRecord({ ingoingPhotoVaultUrl: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* 8-Point Category List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 px-0.5">
              <span>8 Standard Categories</span>
              <span className="text-[10px] font-normal text-slate-500">
                Tap only what is broken or defective
              </span>
            </div>

            <div className="space-y-1.5">
              {items.map((item) => {
                const currentCondition = item.ingoingCondition || 'Good';
                return (
                  <div
                    key={item.category}
                    className="p-2.5 bg-white rounded-lg border border-slate-200/90 shadow-2xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="font-semibold text-slate-800 text-[11px]">
                        {item.category}
                      </span>

                      {/* Condition Pills */}
                      <div className="flex items-center gap-1">
                        {CONDITIONS.map((cond) => {
                          const isSelected = currentCondition === cond;
                          let pillStyle = 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200';
                          if (isSelected) {
                            if (cond === 'Good') {
                              pillStyle = 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-2xs';
                            } else if (cond === 'Fair') {
                              pillStyle = 'bg-amber-500 text-white border-amber-500 font-bold shadow-2xs';
                            } else if (cond === 'Defective') {
                              pillStyle = 'bg-rose-600 text-white border-rose-600 font-bold shadow-2xs';
                            } else {
                              pillStyle = 'bg-slate-700 text-white border-slate-700 font-bold shadow-2xs';
                            }
                          }

                          return (
                            <button
                              key={cond}
                              type="button"
                              onClick={() => handleSetCondition(item.category, cond)}
                              className={`px-2 py-0.5 rounded text-[10px] border transition-all cursor-pointer ${pillStyle}`}
                            >
                              {cond}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Inline Note Input (Always available, highlighted if Defective or Fair) */}
                    <input
                      type="text"
                      placeholder={
                        currentCondition === 'Defective' || currentCondition === 'Fair'
                          ? 'Describe existing wear/defect (e.g., crack on bottom tile, stove plate 2 faulty)...'
                          : 'Optional note (e.g., 2x remotes, 3x keys, repainted)...'
                      }
                      value={item.ingoingNotes || ''}
                      onChange={(e) => handleSetNote(item.category, e.target.value)}
                      className={`w-full px-2 py-1 text-[11px] rounded border ${
                        currentCondition === 'Defective'
                          ? 'border-rose-300 bg-rose-50/30 focus:bg-white'
                          : currentCondition === 'Fair'
                          ? 'border-amber-300 bg-amber-50/30 focus:bg-white'
                          : 'border-slate-200 bg-slate-50/50 focus:bg-white'
                      } focus:outline-hidden focus:ring-1 focus:ring-indigo-500`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* WhatsApp Electronic Sign-Off Section */}
          <div className="bg-indigo-50/60 p-3 rounded-lg border border-indigo-200/80 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-[11px] font-bold text-indigo-950 flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-indigo-700" />
                <span>Tenant WhatsApp Sign-Off Engine</span>
              </span>
              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                {copyFeedback ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copyFeedback ? 'Copied & Opening WhatsApp...' : 'Send Ingoing Report via WhatsApp'}</span>
              </button>
            </div>

            {showSaveReminder && (
              <div className="p-2 rounded bg-amber-50 border border-amber-300 text-[11px] text-amber-900 font-medium animate-in fade-in">
                💡 Inspection copied & opened in WhatsApp — remember to click <strong>Save Property</strong> at the bottom of the modal to persist your inspection records.
              </div>
            )}

            <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-indigo-100">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={Boolean(record.ingoingTenantAgreed)}
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    handleUpdateRecord({
                      ingoingTenantAgreed: isChecked,
                      ingoingTenantAgreedDate: isChecked
                        ? new Date().toISOString().split('T')[0]
                        : undefined,
                    });
                  }}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                />
                <span className="text-xs font-semibold text-slate-800">
                  Tenant Agreed via WhatsApp (RHA Section 5 Sign-Off)
                </span>
              </label>

              {record.ingoingTenantAgreed && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                  <span className="text-slate-500">Agreed Date:</span>
                  <input
                    type="date"
                    value={record.ingoingTenantAgreedDate || new Date().toISOString().split('T')[0]}
                    onChange={(e) => handleUpdateRecord({ ingoingTenantAgreedDate: e.target.value })}
                    className="px-2 py-0.5 text-[11px] border border-slate-300 rounded bg-white"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
