'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileText,
  Sparkles,
  AlertCircle,
  Loader2,
  Key,
  ShieldCheck,
  CheckCircle2,
  Building,
  Zap,
  Droplets,
  ArrowRight,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';
import { ExtractedRentalUnit, UtilityStatement } from '@/types';
import {
  parseStatementWithAnthropic,
  getDemoStatementData,
} from '@/lib/ai/anthropicParser';
import { parseUtilityPdf } from '@/lib/utilities/pdfParser';
import { formatZAR, formatDate } from '@/lib/formatters';

interface StatementUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExtractionSuccess?: (units: ExtractedRentalUnit[]) => void;
  onExtracted?: (units: ExtractedRentalUnit[]) => void;
  onOpenTenantStatement?: (propertyId: string) => void;
}

export default function StatementUploadModal({
  isOpen,
  onClose,
  onExtractionSuccess,
  onExtracted,
  onOpenTenantStatement,
}: StatementUploadModalProps) {
  const aiSettings = usePortfolioStore((state) => state.aiSettings);
  const rentals = usePortfolioStore((state) => state.rentals);
  const addUtilityStatement = usePortfolioStore((state) => state.addUtilityStatement);

  const activeRentals = rentals.filter((r) => r.status !== 'Sold');

  // Mode Selection: 'agent' (Managing Agent Payout) vs 'utility' (Municipal / Eskom Bill)
  const [docType, setDocType] = useState<'agent' | 'utility'>('agent');

  // Agent Statement State
  const [isProcessingAgent, setIsProcessingAgent] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [dragActiveAgent, setDragActiveAgent] = useState(false);
  const agentFileInputRef = useRef<HTMLInputElement>(null);

  // Utility Bill State
  const [isProcessingUtility, setIsProcessingUtility] = useState(false);
  const [utilityError, setUtilityError] = useState<string | null>(null);
  const [dragActiveUtility, setDragActiveUtility] = useState(false);
  const [parsedUtility, setParsedUtility] = useState<UtilityStatement | null>(null);
  const [targetPropertyId, setTargetPropertyId] = useState<string>(
    activeRentals[0]?.id || ''
  );
  const [utilitySavedSuccess, setUtilitySavedSuccess] = useState(false);
  const utilityFileInputRef = useRef<HTMLInputElement>(null);

  const notifySuccess = (units: ExtractedRentalUnit[]) => {
    onExtractionSuccess?.(units);
    onExtracted?.(units);
  };

  if (!isOpen) return null;

  const hasApiKey = Boolean(aiSettings?.apiKey && aiSettings.apiKey.trim().length > 5);

  // ==========================================
  // Agent Statement Handlers
  // ==========================================
  const handleProcessAgentFile = async (file: File) => {
    if (!hasApiKey) {
      setAgentError('Please configure your Anthropic API Key in Settings before uploading live statements.');
      return;
    }

    setAgentError(null);
    setIsProcessingAgent(true);

    try {
      const result = await parseStatementWithAnthropic(
        file,
        aiSettings.apiKey,
        aiSettings.model
      );

      if (!result.success) {
        setAgentError(result.error || 'Failed to parse managing agent statement.');
      } else {
        onClose();
        notifySuccess(result.units);
      }
    } catch (err: any) {
      setAgentError(err?.message || 'An unexpected error occurred while parsing.');
    } finally {
      setIsProcessingAgent(false);
    }
  };

  const handleLoadDemoAgent = () => {
    const demoUnits = getDemoStatementData();
    onClose();
    notifySuccess(demoUnits);
  };

  // ==========================================
  // Municipal / Eskom Utility Handlers
  // ==========================================
  const handleProcessUtilityFile = async (file: File) => {
    setIsProcessingUtility(true);
    setUtilityError(null);
    setParsedUtility(null);
    setUtilitySavedSuccess(false);

    try {
      const result = await parseUtilityPdf(file, aiSettings);

      if (!result.success || !result.statement) {
        setUtilityError(result.error || 'Failed to extract municipal statement line items.');
      } else {
        const stmt = result.statement;
        setParsedUtility(stmt);

        // Smart Auto-match Property
        const matched = activeRentals.find((r) => {
          if (stmt.accountNumber && r.utilityStatements?.some((s) => s.accountNumber === stmt.accountNumber)) {
            return true;
          }
          if (result.rawText && r.address) {
            const cleanAddr = r.address.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
            const words = cleanAddr.split(/\s+/).filter(
              (w) => w.length > 3 && !['street', 'road', 'avenue', 'drive', 'crescent', 'ext'].includes(w)
            );
            const rawLower = result.rawText.toLowerCase();
            if (words.some((w) => rawLower.includes(w))) {
              return true;
            }
          }
          return false;
        });

        if (matched) {
          setTargetPropertyId(matched.id);
        } else if (activeRentals.length > 0 && !targetPropertyId) {
          setTargetPropertyId(activeRentals[0].id);
        }
      }
    } catch (err: any) {
      setUtilityError(err?.message || 'Failed to parse municipal bill.');
    } finally {
      setIsProcessingUtility(false);
    }
  };

  const handleSaveUtilityStatement = () => {
    if (!parsedUtility || !targetPropertyId) return;
    addUtilityStatement(targetPropertyId, parsedUtility);
    setUtilitySavedSuccess(true);
  };

  const targetRentalObj = activeRentals.find((r) => r.id === targetPropertyId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">
                Smart Document Import Hub
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Upload Managing Agent Payout Sheets or Municipal / Eskom Tax Invoices
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Segmented Document Type Selector Tabs */}
        <div className="bg-slate-100 p-2 border-b border-slate-200 flex gap-2">
          <button
            type="button"
            onClick={() => setDocType('agent')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              docType === 'agent'
                ? 'bg-white text-purple-900 shadow-xs border border-purple-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Building className="w-3.5 h-3.5 text-purple-600" />
            <span>Managing Agent Payout</span>
          </button>
          <button
            type="button"
            onClick={() => setDocType('utility')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              docType === 'utility'
                ? 'bg-white text-teal-900 shadow-xs border border-teal-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-teal-600" />
            <span>Municipal / Eskom Utility Bill</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {/* ======================================================== */}
          {/* TAB 1: MANAGING AGENT PAYOUT STATEMENT                   */}
          {/* ======================================================== */}
          {docType === 'agent' && (
            <div className="space-y-4">
              <div className="p-3 bg-purple-50/60 border border-purple-100 rounded-xl">
                <span className="font-bold text-purple-950 block">
                  Reconcile Landlord Rental Payouts
                </span>
                <p className="text-[11px] text-purple-800 leading-relaxed mt-0.5">
                  Extracts gross rent, agency commission (+VAT), levies, and net disbursements from managing agent accounting sheets (iGrow, WeconnectU, Pam Golding, Rawson) to sync with your active portfolio.
                </p>
              </div>

              {/* Missing API Key Warning */}
              {!hasApiKey && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-950">
                  <Key className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-bold">No AI API Key Configured</span>
                    <p className="text-amber-800 leading-relaxed text-[11px]">
                      To parse live PDF statements, please add your Anthropic API key in Settings. Alternatively, test the complete multi-unit reconciliation flow with the demo statement below.
                    </p>
                    <Link
                      href="/settings"
                      className="inline-flex items-center gap-1 font-bold text-indigo-700 hover:text-indigo-900 underline mt-1"
                    >
                      Configure API Key in Settings →
                    </Link>
                  </div>
                </div>
              )}

              {agentError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-rose-800">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{agentError}</p>
                </div>
              )}

              {/* Drag & Drop Upload Zone */}
              <div
                onDragEnter={(e) => {
                  e.preventDefault();
                  setDragActiveAgent(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setDragActiveAgent(false);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActiveAgent(true);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActiveAgent(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleProcessAgentFile(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => agentFileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-7 text-center transition-all cursor-pointer ${
                  dragActiveAgent
                    ? 'border-purple-500 bg-purple-50/50'
                    : 'border-slate-300 hover:border-purple-400 hover:bg-slate-50/60'
                }`}
              >
                <input
                  ref={agentFileInputRef}
                  type="file"
                  accept=".pdf, .png, .jpg, .jpeg, .webp"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleProcessAgentFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                {isProcessingAgent ? (
                  <div className="py-4 space-y-3">
                    <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto" />
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-800">
                        Analyzing Managing Agent Statement...
                      </p>
                      <p className="text-xs text-slate-400">
                        Extracting rental ledger entries, management fee deductions, and net payouts
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-11 h-11 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        Click to browse or drop managing agent statement
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Supports PDF (.pdf) and high-res scanned images (.png, .jpg, up to 15MB)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Built-in Demo Option */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    Test without API tokens?
                  </span>
                  <p className="text-slate-500 text-[11px]">
                    Load verified Clearwater Village iGrow statement ledger data.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLoadDemoAgent}
                  className="px-3.5 py-1.5 bg-white hover:bg-purple-50 text-purple-700 font-bold border border-purple-200 rounded-lg shadow-2xs transition-colors shrink-0 cursor-pointer"
                >
                  Load Demo Statement
                </button>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-400 justify-center">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Direct browser-to-AI extraction (no intermediary server storage).</span>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: MUNICIPAL / ESKOM UTILITY BILL                    */}
          {/* ======================================================== */}
          {docType === 'utility' && (
            <div className="space-y-4">
              <div className="p-3 bg-teal-50/60 border border-teal-100 rounded-xl">
                <span className="font-bold text-teal-950 block">
                  Municipal Utility & Meter Reading Extraction
                </span>
                <p className="text-[11px] text-teal-800 leading-relaxed mt-0.5">
                  Upload City of Johannesburg or Eskom tax invoices. The Dual-Parser automatically itemizes electricity, water, refuse, sewer, and physical meter readings, calculating month-over-month variance.
                </p>
              </div>

              {utilityError && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-rose-800">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{utilityError}</p>
                </div>
              )}

              {/* Upload Dropzone */}
              {!parsedUtility && (
                <div
                  onDragEnter={(e) => {
                    e.preventDefault();
                    setDragActiveUtility(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setDragActiveUtility(false);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragActiveUtility(true);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragActiveUtility(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleProcessUtilityFile(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => utilityFileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-7 text-center transition-all cursor-pointer ${
                    dragActiveUtility
                      ? 'border-teal-500 bg-teal-50/50'
                      : 'border-slate-300 hover:border-teal-400 hover:bg-slate-50/60'
                  }`}
                >
                  <input
                    ref={utilityFileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleProcessUtilityFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />

                  {isProcessingUtility ? (
                    <div className="py-4 space-y-3">
                      <Loader2 className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-800">
                          Processing Municipal Bill...
                        </p>
                        <p className="text-xs text-slate-400">
                          Dual-Parser is reading CoJ / Eskom line items and physical meter registers
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-11 h-11 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          Click to browse or drop municipal/Eskom statement PDF
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Works with City of Johannesburg (CoJ) and Eskom tax invoices (.pdf)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Parsed Result & Property Target Selection */}
              {parsedUtility && (
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        {parsedUtility.provider} • {parsedUtility.billingPeriod || parsedUtility.statementDate}
                      </span>
                      <h4 className="text-sm font-black text-slate-900 mt-1">
                        Statement Extracted Successfully
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {parsedUtility.accountNumber ? `Account: ${parsedUtility.accountNumber}` : 'Account unassigned'} • Date: {formatDate(parsedUtility.statementDate)}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Charges</span>
                      <strong className="text-base font-black font-mono text-slate-900">
                        {formatZAR(parsedUtility.totalDueZAR, { includeDecimals: true })}
                      </strong>
                    </div>
                  </div>

                  {/* Extracted Line Items Preview */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center bg-white p-3 rounded-lg border border-slate-200">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Electricity</span>
                      <strong className="text-xs font-mono text-slate-800">
                        {formatZAR(parsedUtility.electricityZAR, { includeDecimals: true })}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Water</span>
                      <strong className="text-xs font-mono text-slate-800">
                        {formatZAR(parsedUtility.waterZAR, { includeDecimals: true })}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Refuse</span>
                      <strong className="text-xs font-mono text-slate-800">
                        {formatZAR(parsedUtility.refuseZAR, { includeDecimals: true })}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Sewerage</span>
                      <strong className="text-xs font-mono text-slate-800">
                        {formatZAR(parsedUtility.sewerageZAR, { includeDecimals: true })}
                      </strong>
                    </div>
                  </div>

                  {/* Meter Readings Preview if Extracted */}
                  {parsedUtility.extractedMeterReadings && parsedUtility.extractedMeterReadings.length > 0 && (
                    <div className="p-2.5 bg-cyan-50/60 border border-cyan-200 rounded-lg space-y-1">
                      <span className="text-[10px] font-bold uppercase text-cyan-800 block">
                        Auto-Extracted Meter Readings ({parsedUtility.extractedMeterReadings.length}):
                      </span>
                      {parsedUtility.extractedMeterReadings.map((mr, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[11px] text-cyan-950 font-mono">
                          <span>{mr.utilityType.toUpperCase()} (Meter #{mr.meterNumber || '—'}): {mr.previousReadingValue ?? '—'} → {mr.readingValue}</span>
                          <span className="font-bold text-emerald-700">+{mr.consumption ?? 0} {mr.utilityType === 'electricity' ? 'kWh' : 'KL'}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Target Rental Property Dropdown Selector */}
                  <div className="pt-2 border-t border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700">
                        Assign to Rental Property *
                      </label>
                      <span className="text-[10px] text-slate-400">
                        Auto-detected or override manually
                      </span>
                    </div>

                    <select
                      value={targetPropertyId}
                      onChange={(e) => setTargetPropertyId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 font-bold focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    >
                      {activeRentals.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.title} — {r.address}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Success Banner */}
                  {utilitySavedSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-2 text-emerald-800 font-semibold animate-in fade-in">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Saved to {targetRentalObj?.title} utility ledger!</span>
                      </div>
                      {onOpenTenantStatement && (
                        <button
                          type="button"
                          onClick={() => onOpenTenantStatement(targetPropertyId)}
                          className="inline-flex items-center gap-1 text-[11px] text-emerald-900 underline font-bold cursor-pointer"
                        >
                          <span>Open Tenant Statement</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setParsedUtility(null);
                        setUtilitySavedSuccess(false);
                      }}
                      className="text-slate-500 hover:text-slate-800 text-xs font-semibold cursor-pointer"
                    >
                      ← Upload Different Bill
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold text-xs cursor-pointer"
                      >
                        Close
                      </button>
                      {!utilitySavedSuccess && (
                        <button
                          type="button"
                          onClick={handleSaveUtilityStatement}
                          className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Save to Property Ledger</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
