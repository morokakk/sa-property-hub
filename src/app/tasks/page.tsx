'use client';

import React, { useState } from 'react';
import TopHeader from '@/components/navigation/TopHeader';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';
import { formatDate } from '@/lib/formatters';
import { TaskItem, TaskPriority, TaskStatus, LinkedEntity } from '@/types';
import {
  CheckSquare,
  PlusCircle,
  Calendar,
  AlertTriangle,
  Clock,
  Building,
  Hammer,
  Coins,
  Calculator,
  Trash2,
  Filter,
  CheckCircle2,
} from 'lucide-react';

export default function TaskEnginePage() {
  const tasks = usePortfolioStore((state) => state.tasks);
  const addTask = usePortfolioStore((state) => state.addTask);
  const toggleTaskStatus = usePortfolioStore((state) => state.toggleTaskStatus);
  const updateTask = usePortfolioStore((state) => state.updateTask);
  const deleteTask = usePortfolioStore((state) => state.deleteTask);

  const rentals = usePortfolioStore((state) => state.rentals);
  const flips = usePortfolioStore((state) => state.flips);
  const funding = usePortfolioStore((state) => state.funding);
  const opportunities = usePortfolioStore((state) => state.opportunities);

  // Filter States
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterEntityType, setFilterEntityType] = useState<string>('ALL');

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [priority, setPriority] = useState<TaskPriority>('High');
  const [linkedType, setLinkedType] = useState<LinkedEntity['type']>('flip');
  const [linkedId, setLinkedId] = useState<string>('');

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    let entityName = 'General Operational';
    if (linkedType === 'flip') {
      const f = flips.find((item) => item.id === linkedId) || flips[0];
      if (f) entityName = f.title;
    } else if (linkedType === 'rental') {
      const r = rentals.find((item) => item.id === linkedId) || rentals[0];
      if (r) entityName = r.title;
    } else if (linkedType === 'funding') {
      const fund = funding.find((item) => item.id === linkedId) || funding[0];
      if (fund) entityName = fund.lenderName;
    } else if (linkedType === 'opportunity') {
      const opp = opportunities.find((item) => item.id === linkedId) || opportunities[0];
      if (opp) entityName = opp.title;
    }

    addTask({
      title,
      description,
      dueDate,
      priority,
      status: 'Pending',
      linkedEntity: {
        type: linkedType,
        id: linkedId || undefined,
        name: entityName,
      },
    });

    setShowAddModal(false);
    setTitle('');
    setDescription('');
  };

  // Filter logic
  const filteredTasks = tasks.filter((t) => {
    if (filterPriority !== 'ALL' && t.priority !== filterPriority) return false;
    if (filterStatus !== 'ALL' && t.status !== filterStatus) return false;
    if (filterEntityType !== 'ALL' && t.linkedEntity.type !== filterEntityType) return false;
    return true;
  });

  const urgentCount = tasks.filter((t) => t.priority === 'Urgent' && t.status !== 'Completed').length;
  const pendingCount = tasks.filter((t) => t.status !== 'Completed').length;
  const completedCount = tasks.filter((t) => t.status === 'Completed').length;

  return (
    <div className="flex-1 flex flex-col">
      <TopHeader
        title="Task & Reminder Engine"
        subtitle="Centralized operational to-do ledger linked to properties, funding partners, and legal conveyancing"
        actionButton={
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-sm transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Create Task
          </button>
        }
      />

      <main className="flex-1 p-4 sm:p-6 space-y-6 max-w-7xl w-full mx-auto">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Pending Tasks</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">{pendingCount}</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Active operational to-dos</p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Urgent Tasks</span>
              <div className="text-2xl font-bold text-rose-600 mt-1">{urgentCount}</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Requires immediate attention</p>
            </div>
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Completed</span>
              <div className="text-2xl font-bold text-emerald-600 mt-1">{completedCount}</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Successfully closed out</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500 font-semibold flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filters:
            </span>

            {/* Priority Filter */}
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 font-medium"
            >
              <option value="ALL">All Priorities</option>
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 font-medium"
            >
              <option value="ALL">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>

            {/* Linked Entity Filter */}
            <select
              value={filterEntityType}
              onChange={(e) => setFilterEntityType(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 font-medium"
            >
              <option value="ALL">All Linked Entities</option>
              <option value="flip">Buy-and-Flips</option>
              <option value="rental">Rental Properties</option>
              <option value="funding">Funding Partners</option>
              <option value="opportunity">Opportunity Pipeline</option>
            </select>
          </div>

          <span className="text-slate-400 font-medium">
            Showing {filteredTasks.length} of {tasks.length} tasks
          </span>
        </div>

        {/* Task Items List */}
        <div className="space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center border border-slate-200">
              <p className="text-xs text-slate-400">No tasks match your selected filter criteria.</p>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <div
                key={task.id}
                className={`bg-white rounded-xl border p-4 shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  task.status === 'Completed'
                    ? 'border-slate-200 bg-slate-50/70 opacity-75'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={task.status === 'Completed'}
                    onChange={() => toggleTaskStatus(task.id)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          task.priority === 'Urgent'
                            ? 'bg-rose-100 text-rose-800'
                            : task.priority === 'High'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {task.priority}
                      </span>

                      <span className="text-xs font-semibold text-slate-900">
                        {task.title}
                      </span>
                    </div>

                    {task.description && (
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {task.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 mt-2">
                      <span className="flex items-center gap-1 font-medium text-slate-500">
                        <Calendar className="w-3 h-3" /> Due {formatDate(task.dueDate)}
                      </span>
                      <span>•</span>
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-semibold">
                        Linked: {task.linkedEntity.name} ({task.linkedEntity.type})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <select
                    value={task.status}
                    onChange={(e) =>
                      updateTask(task.id, { status: e.target.value as TaskStatus })
                    }
                    className="text-xs font-semibold px-2 py-1 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>

                  <button
                    onClick={() => deleteTask(task.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                    title="Delete task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Create Task Modal (Mobile Bottom Sheet / Desktop Centered Dialog) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-3xl sm:rounded-xl max-w-md w-full p-5 sm:p-6 shadow-xl border border-slate-200 max-h-[92vh] sm:max-h-none overflow-y-auto">
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" />
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-emerald-600" />
              Create Operational Task & Reminder
            </h3>

            <form onSubmit={handleCreateTask} noValidate className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Task Title *</label>
                <input
                  type="text"
                  name="taskTitle"
                  autoComplete="off"
                  required
                  placeholder="e.g. Lodge Deeds transfer papers with STBB"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg min-h-[40px]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description / Notes</label>
                <textarea
                  rows={3}
                  name="taskDescription"
                  autoComplete="off"
                  placeholder="Additional context, attorney reference, invoice details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    name="taskDueDate"
                    autoComplete="off"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg min-h-[40px]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold min-h-[40px]"
                  >
                    <option value="Urgent">Urgent</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Link to Module</label>
                  <select
                    value={linkedType}
                    onChange={(e) => {
                      setLinkedType(e.target.value as any);
                      setLinkedId('');
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="flip">Buy-and-Flip Project</option>
                    <option value="rental">Rental Property</option>
                    <option value="funding">Funding Partner / Lender</option>
                    <option value="opportunity">Opportunity Pipeline</option>
                    <option value="general">General Administration</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Select Specific Entity</label>
                  <select
                    value={linkedId}
                    onChange={(e) => setLinkedId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">-- Choose Target --</option>
                    {linkedType === 'flip' &&
                      flips.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.title}
                        </option>
                      ))}
                    {linkedType === 'rental' &&
                      rentals.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.title}
                        </option>
                      ))}
                    {linkedType === 'funding' &&
                      funding.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.lenderName}
                        </option>
                      ))}
                    {linkedType === 'opportunity' &&
                      opportunities.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.title}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
