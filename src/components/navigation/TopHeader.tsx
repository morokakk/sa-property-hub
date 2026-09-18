'use client';

import React, { useRef, useState, useEffect } from 'react';
import { usePortfolioStore, usePortfolioSummary } from '@/lib/store/usePortfolioStore';
import { formatZAR } from '@/lib/formatters';
import {
  RotateCcw,
  Download,
  Upload,
  Coins,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';

interface TopHeaderProps {
  title: string;
  subtitle?: string;
  actionButton?: React.ReactNode;
}

export default function TopHeader({ title, subtitle, actionButton }: TopHeaderProps) {
  const summary = usePortfolioSummary();
  const resetToDemoData = usePortfolioStore((state) => state.resetToDemoData);
  const importPortfolioJSON = usePortfolioStore((state) => state.importPortfolioJSON);

  const [notification, setNotification] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleReset = () => {
    if (confirm('Reset portfolio state to South African realistic demo data? This will restore sample rentals, flips, funding and tasks.')) {
      resetToDemoData();
      showNotification('Portfolio reset to South African demo dataset.');
    }
  };

  const handleExport = () => {
    const currentState = usePortfolioStore.getState();
    const dataStr = JSON.stringify(
      {
        rentals: currentState.rentals,
        flips: currentState.flips,
        funding: currentState.funding,
        opportunities: currentState.opportunities,
        suppliers: currentState.suppliers,
        tasks: currentState.tasks,
        liquidCapitalReserve: currentState.liquidCapitalReserve,
        investorProfile: currentState.investorProfile,
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sa-property-portfolio-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showNotification('Portfolio state exported to JSON backup.');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      const success = importPortfolioJSON(content);
      if (success) {
        showNotification('Portfolio successfully restored from JSON.');
      } else {
        alert('Invalid JSON file format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <header className="no-print bg-white border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-4 sticky top-0 md:top-0 z-20 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        {/* Left: Page Title */}
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>

        {/* Right: Net Equity Pill & Actions */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Net Equity Quick Pill */}
          <div className="bg-emerald-50 border border-emerald-200 px-2.5 sm:px-3.5 py-1.5 rounded-lg flex items-center gap-2">
            <Coins className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="text-left">
              <span className="text-[9px] sm:text-[10px] uppercase font-semibold text-emerald-800 tracking-wider block leading-none">
                Net Equity (ZAR)
              </span>
              <span className="text-xs sm:text-sm font-bold text-emerald-950" suppressHydrationWarning>
                {isMounted ? formatZAR(summary.netEquity) : 'R 10 735 000'}
              </span>
            </div>
          </div>

          {actionButton}

          {/* Quick Portfolio Controls */}
          <div className="flex items-center gap-1 border-l border-slate-200 pl-2 sm:pl-3">
            <button
              onClick={handleReset}
              title="Reset to realistic South African demo data"
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors flex items-center gap-1 text-xs font-medium min-h-[36px] min-w-[36px] justify-center"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Reset Demo</span>
            </button>

            <button
              onClick={handleExport}
              title="Export state to JSON file"
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors flex items-center gap-1 text-xs font-medium min-h-[36px] min-w-[36px] justify-center"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Export</span>
            </button>

            <label
              title="Import state from JSON file"
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer flex items-center gap-1 text-xs font-medium min-h-[36px] min-w-[36px] justify-center"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Import</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImport}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Global Action Toast Notification */}
      {notification && (
        <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-lg shadow-xl border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}
    </header>
  );
}
