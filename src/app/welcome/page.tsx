'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Hammer,
  Calculator,
  FileText,
  ShieldCheck,
  Smartphone,
  TrendingUp,
  ArrowRight,
  Compass,
} from 'lucide-react';

interface LifeGoalOption {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  humanGoal: string;
  howClearsWay: string;
  ctaLabel: string;
  ctaHref: string;
}

const LIFE_GOALS: LifeGoalOption[] = [
  {
    id: 'cashflow',
    title: 'Monthly Cash Flow',
    icon: Building2,
    humanGoal: 'Cover school or varsity fees, supplement household income, or replace your salary.',
    howClearsWay:
      'Track single-lets or multi-let rooms, manage utility & prepaid sub-meter recoveries, monitor arrears, and generate 1-click tenant statements.',
    ctaLabel: 'Explore Rental Portfolio ➔',
    ctaHref: '/rentals',
  },
  {
    id: 'flips',
    title: 'Build a Lump-Sum Cash War Chest',
    icon: Hammer,
    humanGoal: 'Generate lump-sum capital from renovations and flips to pay off debt or fund your next acquisition.',
    howClearsWay:
      'Manage 10-trade BOQ budgets, stage-gated contractor draws, Section 118 municipal clearance timelines, and holding cost burn on-site.',
    ctaLabel: 'Explore Buy-and-Flip Manager ➔',
    ctaHref: '/flips',
  },
  {
    id: 'vetting',
    title: 'Vet a Deal Before You Sign',
    icon: Calculator,
    humanGoal: "Know your true Day-1 cash requirement and net return before committing your family's capital.",
    howClearsWay:
      'Instant SARS transfer duty, LSSA conveyancing & bond tariffs, Section 118 arrears buffers, and Maximum Allowable Offer (Max Bid) calculation.',
    ctaLabel: 'Open Opportunity Analyzer ➔',
    ctaHref: '/analyzer',
  },
  {
    id: 'wealth',
    title: 'Long-Term Wealth & Partners',
    icon: FileText,
    humanGoal: 'Compound debt-free equity over 20 years, recycle capital via BRRRR, and raise private funding professionally.',
    howClearsWay:
      'Track 70% LTV refinance readiness, SARS provisional tax reserves, and generate 1-page PDF pitch decks or WhatsApp summaries in 60 seconds.',
    ctaLabel: 'Open Proposal Generator ➔',
    ctaHref: '/proposal',
  },
];

export default function WelcomePage() {
  const [selectedGoalId, setSelectedGoalId] = useState<string>('cashflow');
  const activeGoal = LIFE_GOALS.find((g) => g.id === selectedGoalId) || LIFE_GOALS[0];
  const ActiveIcon = activeGoal.icon;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* ========================================================================= */}
      {/* A. TOP BAR                                                               */}
      {/* ========================================================================= */}
      <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 group shrink min-w-0">
            <img
              src="/moremela-logo.svg"
              alt="Moremela Properties Emblem"
              className="w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-lg object-contain shrink-0 shadow-xs"
            />
            <span className="font-bold text-xs sm:text-base tracking-tight text-white group-hover:text-emerald-400 transition-colors truncate">
              Moremela Property Hub
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              href="/get-started"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              <Compass className="w-4 h-4 text-emerald-400" strokeWidth={1.75} />
              <span>Get Started Guide</span>
            </Link>

            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors shrink-0 whitespace-nowrap"
            >
              <span>Open Dashboard ➔</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MAIN CONTAINER                                                            */}
      {/* ========================================================================= */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-12 sm:space-y-16">
        {/* ======================================================================= */}
        {/* B. SECTION 1: HERO & INTERACTIVE GOAL SWITCHER                          */}
        {/* ======================================================================= */}
        <section className="space-y-8 sm:space-y-10">
          {/* Hero Header */}
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center px-3.5 py-1 rounded-full text-xs font-semibold tracking-wide bg-emerald-50 border border-emerald-300/80 text-emerald-900 shadow-2xs">
              <span>MOREMELA — &ldquo;THE ONE WHO CLEARS THE WAY&rdquo;</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Build Your Foundation. One Property at a Time.
            </h1>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
              We give solo South African property entrepreneurs the speed and simplicity to vet profitable deals,
              manage flips on-site, and compound their portfolio equity from their phones—without needing fragile
              spreadsheets or expensive corporate software.
            </p>

            {/* Primary Hero CTAs */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-xs transition-colors"
              >
                <span>Open Portfolio Dashboard ➔</span>
              </Link>

              <Link
                href="/get-started"
                className="inline-flex items-center gap-2 bg-white border border-slate-300 text-slate-800 hover:bg-slate-100 text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
              >
                <span>Follow Quick-Start Guide</span>
              </Link>
            </div>
          </div>

          {/* Interactive Life Goal Switcher */}
          <div
            data-testid="life-goal-switcher"
            className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 shadow-xs space-y-6 max-w-3xl mx-auto"
          >
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block mb-1">
                Interactive Goal Alignment
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                &ldquo;What is your next property meant to do for your life?&rdquo;
              </h2>
            </div>

            {/* 4 Goal Selection Pills in 2x2 Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {LIFE_GOALS.map((goal) => {
                const Icon = goal.icon;
                const isSelected = goal.id === selectedGoalId;
                return (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => setSelectedGoalId(goal.id)}
                    className={`flex items-center gap-3 p-3.5 rounded-xl text-left border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-2xs ring-1 ring-emerald-600'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" strokeWidth={1.75} />
                    </div>
                    <span className="text-xs sm:text-sm">{goal.title}</span>
                  </button>
                );
              })}
            </div>

            {/* Preview Card Linking Goal to Live Module */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200/80">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <ActiveIcon className="w-4 h-4" strokeWidth={1.75} />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">{activeGoal.title}</h3>
              </div>

              <div className="space-y-3 text-xs sm:text-sm">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
                    Goal
                  </span>
                  <p className="text-slate-800 font-medium leading-relaxed">{activeGoal.humanGoal}</p>
                </div>

                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block mb-0.5">
                    How Moremela Clears the Way
                  </span>
                  <p className="text-slate-600 leading-relaxed">{activeGoal.howClearsWay}</p>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href={activeGoal.ctaHref}
                  className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-lg shadow-xs transition-colors"
                >
                  <span>{activeGoal.ctaLabel}</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================================= */}
        {/* C. SECTION 2: "GUARD THE KRAAL. GROW THE BAOBAB." CARD GRID             */}
        {/* ======================================================================= */}
        <section className="space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Protection &amp; Growth Architecture
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Guard the Kraal. Grow the Baobab.
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Engineered specifically for South African transaction friction, municipal reality, and solo operators.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1 */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" strokeWidth={1.75} />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Guard Your Day-1 Cash (The Kraal)
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Stop losing margin to hidden South African transaction traps. Automatically model SARS transfer duties,
                  LSSA legal fees, Section 118 municipal arrears, and provisional tax reserves.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 text-xs font-semibold text-emerald-700 flex items-center gap-1">
                <span>SARS &amp; Legal Practice Council tariffs</span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5" strokeWidth={1.75} />
                </div>
                <h3 className="text-base font-bold text-slate-900">Run Operations From Your Phone</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Built for building sites and hardware store aisles—not corporate boardrooms. Track BOQ trade draws,
                  holding cost burn, lease ledgers, and statutory deadlines on mobile.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-1">
                <span>10-Trade Bill of Quantities &amp; Ledgers</span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5" strokeWidth={1.75} />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Pitch Lenders &amp; Partners Instantly (The Baobab)
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Turn any analyzed deal, active flip, or rental into a structured WhatsApp investment memo or a
                  printable 1-page PDF tear-sheet.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 text-xs font-semibold text-indigo-700 flex items-center gap-1">
                <span>1-Click PDF Decks &amp; WhatsApp Memos</span>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================================= */}
        {/* D. SECTION 3: DARK INSTITUTIONAL CTA BANNER                             */}
        {/* ======================================================================= */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8 text-white shadow-xs relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="max-w-xl space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Clear the complicated math and admin out of your way.
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Explore the pre-loaded South African demo portfolio or clear it in one click to enter your own deals.
              </p>
            </div>
            <div className="shrink-0">
              <Link
                href="/"
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-lg shadow-xs transition-colors"
              >
                <span>Go to Global Portfolio ➔</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ========================================================================= */}
      {/* FOOTER                                                                    */}
      {/* ========================================================================= */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <img src="/moremela-logo.svg" alt="Moremela Logo" className="w-5 h-5 rounded object-contain shrink-0" />
            <span>Moremela Properties (Pty) Ltd (2026/838397/07)</span>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-emerald-700 transition-colors font-medium">
              Global Portfolio
            </Link>
            <Link href="/get-started" className="hover:text-emerald-700 transition-colors font-medium">
              Get Started Guide
            </Link>
            <Link href="/privacy" className="hover:text-emerald-700 transition-colors font-medium">
              Privacy &amp; POPIA
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
