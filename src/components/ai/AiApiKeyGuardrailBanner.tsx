'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Key, ExternalLink, CheckCircle2 } from 'lucide-react';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';
import {
  getProviderConfig,
  validateApiKeyFormat,
  AiProvider,
} from '@/lib/ai/modelConfig';

export interface AiApiKeyGuardrailBannerProps {
  /**
   * Callback invoked immediately after an API key is saved,
   * enabling zero-friction auto re-parse without re-uploading files.
   */
  onKeySaved?: (savedKey: string) => void | Promise<void>;
  /**
   * Compact rendering mode for smaller dialog contexts.
   */
  compact?: boolean;
  className?: string;
  /**
   * Optional provider override (defaults to usePortfolioStore.aiSettings.provider).
   */
  provider?: AiProvider;
  /**
   * Optional key presence override (defaults to checking usePortfolioStore.aiSettings.apiKey).
   */
  hasApiKey?: boolean;
}

export default function AiApiKeyGuardrailBanner({
  onKeySaved,
  compact = false,
  className = '',
  provider: propProvider,
  hasApiKey: propHasApiKey,
}: AiApiKeyGuardrailBannerProps) {
  const storeAiSettings = usePortfolioStore((state) => state.aiSettings);
  const updateAiSettings = usePortfolioStore((state) => state.updateAiSettings);

  const provider: AiProvider = propProvider || storeAiSettings?.provider || 'anthropic';
  const providerConfig = getProviderConfig(provider);

  const [inputKey, setInputKey] = useState('');
  const [showQuickEntry, setShowQuickEntry] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const hasApiKey =
    propHasApiKey !== undefined
      ? propHasApiKey
      : Boolean(storeAiSettings?.apiKey && storeAiSettings.apiKey.trim().length > 5);

  if (hasApiKey && !justSaved) {
    return null;
  }

  const handleSaveKey = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputKey.trim();
    if (!trimmed) return;

    setIsSaving(true);
    try {
      updateAiSettings({
        apiKey: trimmed,
        provider,
      });
      setJustSaved(true);
      if (onKeySaved) {
        await onKeySaved(trimmed);
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (justSaved) {
    return (
      <div
        className={`bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex items-center justify-between gap-3 text-xs text-emerald-900 animate-in fade-in duration-200 ${className}`}
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">
            {providerConfig.name} API Key saved successfully! Resuming extraction...
          </span>
        </div>
      </div>
    );
  }

  const keyValidation = validateApiKeyFormat(provider, inputKey);

  return (
    <div
      className={`bg-amber-50/90 border border-amber-300 rounded-xl p-3.5 sm:p-4 text-xs text-amber-950 shadow-xs space-y-2.5 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700 shrink-0 mt-0.5">
          <Key className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold text-amber-950 flex items-center gap-1.5">
              No AI API Key Configured
              <span className="text-[10px] uppercase tracking-wider font-semibold bg-amber-200/70 text-amber-900 px-1.5 py-0.5 rounded">
                BYOK
              </span>
            </span>
          </div>

          <p className="text-amber-800 leading-relaxed text-[11px]">
            To parse visual managing agent statements and multi-page utility bills with AI, please add your{' '}
            <strong>{providerConfig.name}</strong> key. Direct browser extraction guarantees your credentials never leave your device.
          </p>

          {/* Action Row */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-1">
            <Link
              href="/settings#settings-ai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-bold text-indigo-700 hover:text-indigo-900 underline text-xs transition-colors"
            >
              Configure in Settings ↗
            </Link>

            <span className="text-amber-400 select-none">•</span>

            <a
              href={providerConfig.docUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1 transition-colors font-medium"
            >
              Don't have an API key? Get one from {provider === 'google' ? 'Google AI Studio' : 'Anthropic'}
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>

            {!showQuickEntry && (
              <>
                <span className="text-amber-400 select-none">•</span>
                <button
                  type="button"
                  onClick={() => setShowQuickEntry(true)}
                  className="text-xs font-semibold text-slate-700 hover:text-slate-900 underline cursor-pointer"
                >
                  Paste Key Here
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Inline Quick Key Entry Drawer */}
      {showQuickEntry && (
        <form
          onSubmit={handleSaveKey}
          className="pt-2 border-t border-amber-200/80 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <div className="relative flex-1">
            <input
              type="password"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder={`Paste ${providerConfig.name} key (${providerConfig.keyPlaceholder})`}
              className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-amber-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
              autoFocus
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={!inputKey.trim() || isSaving}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              {isSaving ? 'Saving...' : 'Save & Continue'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowQuickEntry(false);
                setInputKey('');
              }}
              className="px-2 py-1.5 text-xs text-amber-800 hover:text-amber-950 font-medium cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
