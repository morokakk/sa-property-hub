'use client';

import React from 'react';
import { RateShockScenario, DscrBand } from '@/lib/calculations/propertyMetrics';
import { formatZAR } from '@/lib/formatters';
import { Activity, ShieldCheck, AlertTriangle, XCircle, Info } from 'lucide-react';

export interface RateShockStripProps {
  scenarios: RateShockScenario[];
  minDscr?: number;
  title?: string;
  subtitle?: string;
  className?: string;
}

const BAND_CONFIG: Record<
  DscrBand,
  {
    borderTop: string;
    bg: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  pass: {
    borderTop: 'border-t-emerald-500',
    bg: 'bg-emerald-50/25 print:bg-white',
    badgeBg: 'bg-emerald-100/80 print:bg-transparent',
    badgeText: 'text-emerald-800 print:text-black',
    badgeBorder: 'border-emerald-300 print:border-slate-800',
    label: 'PASS (Bankable)',
    icon: ShieldCheck,
  },
  watch: {
    borderTop: 'border-t-amber-500',
    bg: 'bg-amber-50/25 print:bg-white',
    badgeBg: 'bg-amber-100/80 print:bg-transparent',
    badgeText: 'text-amber-800 print:text-black',
    badgeBorder: 'border-amber-300 print:border-slate-800',
    label: 'WATCH (Thin DSCR)',
    icon: AlertTriangle,
  },
  fail: {
    borderTop: 'border-t-rose-600',
    bg: 'bg-rose-50/25 print:bg-white',
    badgeBg: 'bg-rose-100/80 print:bg-transparent',
    badgeText: 'text-rose-800 print:text-black',
    badgeBorder: 'border-rose-300 print:border-slate-800',
    label: 'FAIL (Deficit)',
    icon: XCircle,
  },
  cash: {
    borderTop: 'border-t-slate-400',
    bg: 'bg-slate-50/40 print:bg-white',
    badgeBg: 'bg-slate-100 print:bg-transparent',
    badgeText: 'text-slate-700 print:text-black',
    badgeBorder: 'border-slate-300 print:border-slate-800',
    label: '100% EQUITY (No Debt)',
    icon: Info,
  },
};

export const RateShockStrip: React.FC<RateShockStripProps> = ({
  scenarios,
  minDscr = 1.2,
  title = 'Interest Rate Stress Test (SARB Shock Exposure)',
  subtitle,
  className = '',
}) => {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs print:border-slate-300 print:shadow-none print:break-inside-avoid ${className}`}
    >
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 print:bg-slate-100 print:border-slate-300 print:py-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-600 shrink-0 print:text-slate-800" />
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            {title}
          </h4>
        </div>
        <div className="text-[11px] text-slate-500 font-medium">
          {subtitle ?? (
            <>
              Lender DSCR Hurdle:{' '}
              <span className="font-bold text-slate-800">{minDscr.toFixed(2)}x</span> (Rent must
              cover bond by {Math.round((minDscr - 1) * 100)}% buffer)
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 print:grid-cols-3 print:divide-y-0 print:divide-x print:divide-slate-300">
        {scenarios.map((scenario) => {
          const config = BAND_CONFIG[scenario.band];
          const Icon = config.icon;

          return (
            <div
              key={scenario.label}
              className={`p-3.5 sm:p-4 border-t-4 ${config.borderTop} ${config.bg} flex flex-col justify-between print:border-t-2 print:p-2.5`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className="text-xs font-extrabold uppercase text-slate-900 tracking-wider">
                    {scenario.label}
                  </span>
                  <span className="text-xs font-bold text-slate-700 tabular-nums">
                    {scenario.ratePercent.toFixed(2)}%
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-[11px] font-medium">Monthly Bond PMT</span>
                    <span className="font-bold text-slate-900 tabular-nums">
                      {formatZAR(scenario.monthlyBondPayment)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-[11px] font-medium">Net Monthly Cash Flow</span>
                    <span
                      className={`font-bold tabular-nums ${
                        scenario.monthlyCashFlow >= 0
                          ? 'text-emerald-700 print:text-black'
                          : 'text-rose-700 print:text-black'
                      }`}
                    >
                      {formatZAR(scenario.monthlyCashFlow)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/80 print:border-slate-300">
                    <span className="text-[11px] font-bold text-slate-700">DSCR Coverage</span>
                    <span className="font-extrabold text-slate-900 tabular-nums">
                      {scenario.dscr !== null ? `${scenario.dscr.toFixed(2)}x` : 'N/A (Cash)'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-200/60 print:mt-1.5 print:pt-1">
                <div
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${config.badgeBg} ${config.badgeText} ${config.badgeBorder}`}
                >
                  <Icon className="w-3 h-3 shrink-0" />
                  <span>{config.label}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RateShockStrip;
