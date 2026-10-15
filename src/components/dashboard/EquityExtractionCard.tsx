'use client';

import React from 'react';
import { PortfolioSummary, RentalProperty } from '@/types';
import { formatZAR, formatPercent } from '@/lib/formatters';
import { Landmark, ArrowUpRight, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface EquityExtractionCardProps {
  summary: PortfolioSummary;
  rentals: RentalProperty[];
}

export default function EquityExtractionCard({ summary, rentals }: EquityExtractionCardProps) {
  const equityAlerts = summary.equityAlerts || [];
  
  // Sort descending by extractable equity
  const sortedAlerts = React.useMemo(() => {
    return [...equityAlerts].sort((a, b) => b.extractableEquityZAR - a.extractableEquityZAR);
  }, [equityAlerts]);

  const totalExtractable = sortedAlerts.reduce((sum, a) => sum + a.extractableEquityZAR, 0);

  // If 0 ripe properties, calculate the closest rental to the 70% LTV threshold for helpful feedback
  const closestRental = React.useMemo<{ property: RentalProperty; ltv: number } | null>(() => {
    if (sortedAlerts.length > 0) return null;
    const active = (rentals || []).filter((r) => r && r.status !== 'Sold');
    if (active.length === 0) return null;

    let bestProp: RentalProperty | null = null;
    let lowestLtv = Infinity;

    active.forEach((r) => {
      const marketVal = r.marketValueZAR || 0;
      const bond = r.outstandingBondBalanceZAR || 0;
      const ltv = marketVal > 0 ? bond / marketVal : 1;
      if (ltv < lowestLtv) {
        lowestLtv = ltv;
        bestProp = r;
      }
    });

    return bestProp ? { property: bestProp, ltv: lowestLtv } : null;
  }, [sortedAlerts, rentals]);

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-50 text-teal-700 border border-teal-200">
              <Landmark className="w-4 h-4 text-teal-600" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 bg-teal-100/70 px-2 py-0.5 rounded border border-teal-200">
                BRRRR Refinance Opportunities
              </span>
              <h3 className="text-sm font-bold text-slate-900 mt-0.5">Equity Extraction (Refinance)</h3>
            </div>
          </div>
          <Link
            href="/rentals"
            className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-0.5"
          >
            Rentals <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Primary Headline */}
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-2xl sm:text-3xl font-black text-teal-950 tracking-tight">
            {formatZAR(totalExtractable)}
          </span>
          <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
            {sortedAlerts.length} {sortedAlerts.length === 1 ? 'Property Ripe' : 'Properties Ripe'}
          </span>
        </div>

        {/* Content Area: Capped scrollable list or 0-property fallback */}
        {sortedAlerts.length === 0 ? (
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-center min-h-[120px]">
            <div className="flex items-start gap-2 text-slate-600 mb-1.5">
              <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <p className="text-xs font-medium text-slate-700 leading-snug">
                No properties currently meet the 70% LTV &amp; 6m stabilization threshold for equity release.
              </p>
            </div>
            {closestRental && (
              <p className="text-[11px] text-slate-500 pl-6 leading-tight">
                Closest candidate: <span className="font-semibold text-slate-800">{closestRental.property.title}</span> sitting at <span className="font-bold text-teal-700">{formatPercent(closestRental.ltv * 100)} LTV</span>.
              </p>
            )}
          </div>
        ) : (
          <div className="max-h-[135px] overflow-y-auto pr-1 space-y-2">
            {sortedAlerts.map((alert) => (
              <div
                key={alert.propertyId}
                className="p-2.5 rounded-xl border border-teal-200/80 bg-teal-50/40 hover:bg-teal-50/80 transition-colors flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {alert.propertyTitle}
                    </span>
                    <span className="text-[9px] font-extrabold bg-emerald-600 text-white px-1.5 py-0.2 rounded-full uppercase shrink-0">
                      Ripe
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {alert.monthsStabilized}m stabilized • 80% LTV release model
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-bold text-teal-900">
                    +{formatZAR(alert.extractableEquityZAR)}
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                    alert.currentLTV < 0.60
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {formatPercent(alert.currentLTV * 100)} LTV
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1 text-[11px]">
          <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
          Refinance threshold: &lt; 70% LTV &amp; 6m+ holding
        </span>
        {sortedAlerts.length > 2 && (
          <span className="text-[10px] font-medium text-teal-700">
            +{sortedAlerts.length - 2} more ripe
          </span>
        )}
      </div>
    </div>
  );
}
