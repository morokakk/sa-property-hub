'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';

export default function Sidebar() {
  const pathname = usePathname();
  const summary = usePortfolioStore((state) => state.getSummary());
  const tasks = usePortfolioStore((state) => state.tasks);
  const pendingTasksCount = tasks.filter((t) => t.status !== 'Completed').length;

  // Mobile Drawer State
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

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
      badge: isMounted && summary.pendingOpportunitiesCount > 0 ? `${summary.pendingOpportunitiesCount}` : null,
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
      badge: isMounted && summary.activeFlipsCount > 0 ? `${summary.activeFlipsCount} Active` : null,
    },
    {
      name: 'Rental Portfolio',
      href: '/rentals',
      icon: Building2,
      badge: isMounted && summary.activeRentalsCount > 0 ? `${summary.activeRentalsCount} Units` : null,
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
            <div>
              {/* Drawer Brand Header */}
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
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
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md min-h-[40px] min-w-[40px] flex items-center justify-center"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Navigation Links */}
              <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-180px)]">
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
            </div>

            {/* Drawer Footer Status */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 text-xs text-slate-400">
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
    </>
  );
}
