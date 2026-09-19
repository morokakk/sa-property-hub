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
  FileSpreadsheet,
} from 'lucide-react';
import Link from 'next/link';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';
import { ExtractedRentalUnit } from '@/types';
import {
  parseStatementWithAnthropic,
  getDemoStatementData,
} from '@/lib/ai/anthropicParser';

interface StatementUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExtractionSuccess?: (units: ExtractedRentalUnit[]) => void;
  onExtracted?: (units: ExtractedRentalUnit[]) => void;
}

export default function StatementUploadModal({
  isOpen,
  onClose,
  onExtractionSuccess,
  onExtracted,
}: StatementUploadModalProps) {
  const aiSettings = usePortfolioStore((state) => state.aiSettings);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const notifySuccess = (units: ExtractedRentalUnit[]) => {
    onExtractionSuccess?.(units);
    onExtracted?.(units);
  };

  if (!isOpen) return null;

  const hasApiKey = Boolean(aiSettings?.apiKey && aiSettings.apiKey.trim().length > 5);

  const handleProcessFile = async (file: File) => {
    if (!hasApiKey) {
      setErrorMessage('Please configure your Anthropic API Key in Settings before uploading live statements.');
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const result = await parseStatementWithAnthropic(
        file,
        aiSettings.apiKey,
        aiSettings.model
      );

      if (!result.success) {
        setErrorMessage(result.error || 'Failed to parse statement.');
      } else {
        onClose();
        notifySuccess(result.units);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleProcessFile(e.target.files[0]);
    }
  };

  const handleLoadDemo = () => {
    const demoUnits = getDemoStatementData();
    onClose();
    notifySuccess(demoUnits);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">
                AI Statement Parser (BYOK)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Upload PDF or image statements from managing agents (iGrow, WeconnectU).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Missing API Key Warning */}
          {!hasApiKey && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-950">
              <Key className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold">No Anthropic API Key Configured</span>
                <p className="text-amber-800 leading-relaxed text-[11px]">
                  To parse your live PDF statements, please add your Claude API key in Settings. Alternatively, test the complete reconciliation flow using the demo statement below.
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

          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{errorMessage}</p>
            </div>
          )}

          {/* Drag & Drop Upload Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
              dragActive
                ? 'border-indigo-500 bg-indigo-50/50'
                : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50/60'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf, .png, .jpg, .jpeg, .webp"
              onChange={handleFileChange}
              className="hidden"
            />

            {isProcessing ? (
              <div className="py-6 space-y-3">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-800">
                    Analyzing Managing Agent Statement...
                  </p>
                  <p className="text-xs text-slate-400">
                    Claude 3.5 Sonnet is reading ledger tables and extracting contractual line items
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mx-auto">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-800">
                    Click to browse or drag and drop statement
                  </p>
                  <p className="text-xs text-slate-400">
                    Supports native PDF (.pdf) and scanned high-res images (.png, .jpg, up to 15MB)
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Built-in Demo Option */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Want to test without using API tokens?
              </span>
              <p className="text-slate-500 text-[11px]">
                Load realistic Clearwater Village iGrow statement ledger data instantly.
              </p>
            </div>
            <button
              type="button"
              onClick={handleLoadDemo}
              className="px-3.5 py-2 bg-white hover:bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 rounded-lg shadow-2xs transition-colors shrink-0 cursor-pointer"
            >
              Load Demo iGrow Statement
            </button>
          </div>

          {/* Privacy Disclaimer */}
          <div className="flex items-center gap-2 text-[11px] text-slate-400 justify-center">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Direct Client-to-Anthropic browser communication (no intermediate server).</span>
          </div>
        </div>
      </div>
    </div>
  );
}
