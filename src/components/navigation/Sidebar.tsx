'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Calculator,
  Coins,
  Hammer,
  Building2,
  CheckSquare,
  FileText,
  TrendingUp,
  ShieldCheck,
  Settings,
  Menu,
  X,
  RotateCcw,
  Trash2,
  Upload,
  FileSpreadsheet,
  FileCode2,
  CheckCircle2,
} from 'lucide-react';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';
import { exportPortfolioToExcel } from '@/lib/export/excelExport';

export default function Sidebar() {
  const pathname = usePathname();
  const pendingOpportunitiesCount = usePortfolioStore((state) => state.opportunities.length);
  const activeFlipsCount = usePortfolioStore((state) => state.flips.filter((f) => f.status === 'Active').length);
  const activeRentalsCount = usePortfolioStore((state) => state.rentals.length);
  const tasks = usePortfolioStore((state) => state.tasks);
  const pendingTasksCount = tasks.filter((t) => t.status !== 'Completed').length;
  const resetToDemoData = usePortfolioStore((state) => state.resetToDemoData);
  const clearAllData = usePortfolioStore((state) => state.clearAllData);
  const importPortfolioJSON = usePortfolioStore((state) => state.importPortfolioJSON);

  // Mobile Drawer State
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [drawerNotice, setDrawerNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showDrawerNotice = (msg: string) => {
    setDrawerNotice(msg);
    setTimeout(() => setDrawerNotice(null), 3500);
  };

  const handleReset = () => {
    if (confirm('Reset portfolio state to South African realistic demo data? This will restore sample rentals, flips, funding and tasks.')) {
      resetToDemoData();
      showDrawerNotice('Portfolio reset to South African demo dataset.');
    }
  };

  const handleClearDemo = () => {
    if (
      confirm(
        'Clear all demo data and start with an empty portfolio? (You can always restore the demo dataset anytime using Reset Demo)'
      )
    ) {
      clearAllData();
      showDrawerNotice('Portfolio cleared.');
    }
  };

  const handleExportExcel = () => {
    const currentState = usePortfolioStore.getState();
    exportPortfolioToExcel({
      rentals: currentState.rentals,
      flips: currentState.flips,
      opportunities: currentState.opportunities,
      funding: currentState.funding,
      summary: currentState.getSummary(),
      investorProfile: currentState.investorProfile,
    });
    showDrawerNotice('Exported to Excel (.xlsx).');
  };

  const handleExportJSON = () => {
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
    showDrawerNotice('Exported to JSON backup.');
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      const success = importPortfolioJSON(content);
      if (success) {
        showDrawerNotice('Portfolio restored from JSON.');
      } else {
        alert('Invalid JSON file format.');
      }
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Close mobile drawer upon route change
  useEffect(() => {
    setIsMobileDrawerOpen(false);
  }, [pathname]);

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileDrawerOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navItems = [
    {
      name: 'Global Portfolio',
      href: '/',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      name: 'Opportunity Analyzer',
      href: '/analyzer',
      icon: Calculator,
      badge: isMounted && pendingOpportunitiesCount > 0 ? `${pendingOpportunitiesCount}` : null,
    },
    {
      name: 'Funding & Capital',
      href: '/funding',
      icon: Coins,
      badge: null,
    },
    {
      name: 'Buy-and-Flip Manager',
      href: '/flips',
      icon: Hammer,
      badge: isMounted && activeFlipsCount > 0 ? `${activeFlipsCount} Active` : null,
    },
    {
      name: 'Rental Portfolio',
      href: '/rentals',
      icon: Building2,
      badge: isMounted && activeRentalsCount > 0 ? `${activeRentalsCount} Units` : null,
    },
    {
      name: 'Tasks & Reminders',
      href: '/tasks',
      icon: CheckSquare,
      badge: isMounted && pendingTasksCount > 0 ? `${pendingTasksCount}` : null,
      badgeColor: 'bg-amber-100 text-amber-800',
    },
    {
      name: 'Proposal Generator',
      href: '/proposal',
      icon: FileText,
      badge: 'Pitch Deck',
      badgeColor: 'bg-emerald-100 text-emerald-800',
    },
    {
      name: 'Investor Profile & Settings',
      href: '/settings',
      icon: Settings,
      badge: null,
    },
  ];

  // Mobile Bottom Quick Navigation Tabs (4 Core Modules + More Drawer Trigger)
  const bottomTabs = [
    { name: 'Portfolio', href: '/', icon: LayoutDashboard },
    { name: 'Sourcing', href: '/analyzer', icon: Calculator },
    { name: 'Flips', href: '/flips', icon: Hammer },
    { name: 'Rentals', href: '/rentals', icon: Building2 },
  ];

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. DESKTOP PERMANENT SIDEBAR (Hidden on mobile < md)                      */}
      {/* ========================================================================= */}
      <aside className="no-print hidden md:flex w-64 bg-slate-900 text-slate-100 flex-col shrink-0 min-h-screen border-r border-slate-800">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-950/50">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold tracking-tight text-white flex items-center gap-1.5 text-base">
              SA Property Hub
            </div>
            <p className="text-xs text-slate-400 font-medium">Investor Suite (ZAR)</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1">
          <div className="px-3 py-2 text-[10px] uppercase tracking-wider font-semibold text-slate-400">
            Core Modules
          </div>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-900/40 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                      item.badgeColor || (isActive ? 'bg-emerald-700 text-white' : 'bg-slate-800 text-slate-300')
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* System Status / Regional Badge */}
        <div className="p-4 border-t border-slate-800 text-xs text-slate-400 bg-slate-950/40">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5 text-slate-300 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              SARS Tax Engine v2025
            </span>
            <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">ZAR</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Legal Practice Council fee scales & SARS transfer brackets integrated.
          </p>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MOBILE TOP APP BAR (< md)                                              */}
      {/* ========================================================================= */}
      <header className="no-print md:hidden bg-slate-900 text-white px-4 py-3 border-b border-slate-800 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-950/50">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-bold tracking-tight text-white text-sm block leading-none">
              SA Property Hub
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
              Investor Suite
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-1.5 text-[11px] bg-slate-800/80 text-emerald-400 font-semibold px-2.5 py-1 rounded-full border border-slate-700/60">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>ZAR</span>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 3. MOBILE SLIDE-OUT DRAWER OVERLAY (< md)                                */}
      {/* ========================================================================= */}
      {isMobileDrawerOpen && (
        <div className="no-print md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs transition-opacity duration-200"
            onClick={() => setIsMobileDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Content */}
          <div className="relative w-72 max-w-[85vw] bg-slate-900 text-white h-full shadow-2xl flex flex-col justify-between border-r border-slate-800 z-10 animate-in slide-in-from-left duration-200">
            <div className="flex-1 overflow-y-auto">
              {/* Drawer Brand Header */}
              <div className="p-4 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur-xs z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white font-bold">
                    <Building2 className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <span className="font-bold text-sm block">SA Property Hub</span>
                    <span className="text-[10px] text-slate-400">All Modules & Settings</span>
                  </div>
                </div>

                <button
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Navigation Links */}
              <nav className="p-3 space-y-1">
                <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                  Navigation
                </div>
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileDrawerOpen(false)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                        <span>{item.name}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                            item.badgeColor || (isActive ? 'bg-emerald-700 text-white' : 'bg-slate-800 text-slate-300')
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>

              {/* Portfolio Data & Backup Section */}
              <div className="p-3 border-t border-slate-800">
                <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                  Portfolio Data & Backup
                </div>
                <div className="space-y-1 mt-1">
                  <button
                    onClick={handleExportExcel}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer text-left"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Export to Excel (.xlsx)</span>
                  </button>

                  <button
                    onClick={handleExportJSON}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer text-left"
                  >
                    <FileCode2 className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>Download JSON Backup</span>
                  </button>

                  <label className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer text-left">
                    <Upload className="w-4 h-4 text-teal-400 shrink-0" />
                    <span>Restore from JSON</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={handleImportJSON}
                    />
                  </label>

                  <button
                    onClick={handleReset}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer text-left"
                  >
                    <RotateCcw className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Reset Demo Data</span>
                  </button>

                  <button
                    onClick={handleClearDemo}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-rose-300 hover:bg-rose-950/40 hover:text-rose-200 transition-colors cursor-pointer text-left"
                  >
                    <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>Clear All Portfolio Data</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Drawer Footer Status */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 text-xs text-slate-400 shrink-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1.5 text-slate-300 font-medium text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  SARS Tax Engine Active
                </span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded font-mono">
                  ZAR
                </span>
              </div>
              <p className="text-[10px] text-slate-500">
                LPC sliding fee scales & SARS brackets configured.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MOBILE FIXED BOTTOM QUICK-TAB BAR (< md)                               */}
      {/* ========================================================================= */}
      <nav
        aria-label="Mobile bottom navigation"
        className="no-print md:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 flex items-center justify-around px-1 py-1.5 text-[10px]"
      >
        {bottomTabs.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-md min-w-[56px] min-h-[44px] transition-colors ${
                isActive ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-4 h-4 mb-0.5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span className="truncate">{tab.name}</span>
            </Link>
          );
        })}

        {/* 5th Tab: More Button (Triggers Drawer) */}
        <button
          onClick={() => setIsMobileDrawerOpen(true)}
          className="flex flex-col items-center justify-center py-1 px-2 rounded-md min-w-[56px] min-h-[44px] text-slate-400 hover:text-slate-200 transition-colors relative"
          aria-label="Open more modules"
        >
          <Menu className="w-4 h-4 mb-0.5 text-slate-400" />
          <span className="truncate">More</span>
          {isMounted && pendingTasksCount > 0 && (
            <span className="absolute top-1 right-2.5 w-2 h-2 bg-amber-400 rounded-full"></span>
          )}
        </button>
      </nav>

      {/* Mobile Toast Notification for Drawer Operations */}
      {drawerNotice && (
        <div className="no-print md:hidden fixed bottom-18 left-4 right-4 z-50 bg-slate-950 text-white text-xs px-3.5 py-2.5 rounded-lg shadow-2xl border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{drawerNotice}</span>
        </div>
      )}
    </>
  );
}
