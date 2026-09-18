'use client';

import React from 'react';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';
import { formatDate } from '@/lib/formatters';
import { Calendar, Clock, AlertTriangle, Building, Coins, Hammer } from 'lucide-react';
import Link from 'next/link';

export default function UpcomingDeadlines() {
  const flips = usePortfolioStore((state) => state.flips);
  const funding = usePortfolioStore((state) => state.funding);
  const rentals = usePortfolioStore((state) => state.rentals);
  const tasks = usePortfolioStore((state) => state.tasks);

  // Compile operational deadlines
  interface DeadlineItem {
    id: string;
    title: string;
    date: string;
    type: 'conveyancing' | 'coupon' | 'flip' | 'lease' | 'task';
    badge: string;
    badgeColor: string;
    detail: string;
  }

  const deadlines: DeadlineItem[] = [];

  // 1. Task deadlines
  tasks
    .filter((t) => t.status !== 'Completed')
    .forEach((t) => {
      deadlines.push({
        id: `t-${t.id}`,
        title: t.title,
        date: t.dueDate,
        type: 'task',
        badge: t.priority,
        badgeColor:
          t.priority === 'Urgent'
            ? 'bg-rose-100 text-rose-800 border-rose-200'
            : t.priority === 'High'
            ? 'bg-amber-100 text-amber-800 border-amber-200'
            : 'bg-blue-100 text-blue-800 border-blue-200',
        detail: t.linkedEntity.name,
      });
    });

  // 2. Flip target completion dates
  flips
    .filter((f) => f.status === 'Active')
    .forEach((f) => {
      deadlines.push({
        id: `f-${f.id}`,
        title: `Target Exit: ${f.title}`,
        date: f.targetCompletionDate,
        type: 'flip',
        badge: 'Flip Handover',
        badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        detail: `${f.city} • Phase: ${f.currentPhase}`,
      });
    });

  // 3. Funding maturity dates
  funding
    .filter((f) => f.status === 'Active')
    .forEach((f) => {
      deadlines.push({
        id: `fund-${f.id}`,
        title: `Loan Maturity: ${f.lenderName}`,
        date: f.maturityDate,
        type: 'coupon',
        badge: 'Capital Repayment',
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        detail: `${f.returnTermsType} • ${f.fundingType}`,
      });
    });

  // Sort by earliest date
  const sortedDeadlines = deadlines
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <h3 className="font-semibold text-slate-900 text-sm">Upcoming Operational Deadlines</h3>
          </div>
          <Link
            href="/tasks"
            className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
          >
            View All
          </Link>
        </div>

        {sortedDeadlines.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">No upcoming deadlines registered.</p>
        ) : (
          <div className="space-y-3">
            {sortedDeadlines.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100/70 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                    <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {formatDate(item.date)}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-900 truncate">{item.title}</p>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>Active operational pipeline</span>
        <span className="font-semibold text-slate-700">{deadlines.length} tracked dates</span>
      </div>
    </div>
  );
}
