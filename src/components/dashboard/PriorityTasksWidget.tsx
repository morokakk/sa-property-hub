'use client';

import React from 'react';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';
import { formatDate } from '@/lib/formatters';
import { CheckSquare, AlertCircle, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

export default function PriorityTasksWidget() {
  const tasks = usePortfolioStore((state) => state.tasks);
  const toggleTaskStatus = usePortfolioStore((state) => state.toggleTaskStatus);

  const priorityTasks = tasks
    .filter((t) => t.status !== 'Completed')
    .sort((a, b) => {
      const pOrder = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
      return pOrder[a.priority] - pOrder[b.priority];
    })
    .slice(0, 5);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-emerald-600" />
            <h3 className="font-semibold text-slate-900 text-sm">High-Priority Operational Tasks</h3>
          </div>
          <Link
            href="/tasks"
            className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-0.5"
          >
            Manage <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        {priorityTasks.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">All high priority tasks completed!</p>
        ) : (
          <div className="space-y-2.5">
            {priorityTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-3 p-2.5 rounded-lg border border-slate-100 hover:border-slate-200 bg-slate-50/60 transition-all"
              >
                <input
                  type="checkbox"
                  checked={task.status === 'Completed'}
                  onChange={() => toggleTaskStatus(task.id)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                        task.priority === 'Urgent'
                          ? 'bg-rose-100 text-rose-800'
                          : task.priority === 'High'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {task.priority}
                    </span>
                    <span className="text-[11px] text-slate-400">Due {formatDate(task.dueDate)}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-900 mt-1">{task.title}</p>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    Linked: <span className="font-medium text-slate-700">{task.linkedEntity.name}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>Pending priority actions</span>
        <span className="font-semibold text-slate-700">{priorityTasks.length} to-dos</span>
      </div>
    </div>
  );
}
