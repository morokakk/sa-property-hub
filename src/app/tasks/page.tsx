'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import TopHeader from '@/components/navigation/TopHeader';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';
import { formatDate } from '@/lib/formatters';
import { TaskItem, TaskPriority, TaskStatus, LinkedEntity, TaskRecurrence } from '@/types';
import {
  isTaskOverdue,
  sortTasksChronologically,
  buildCalendarMonthGrid,
  projectRecurringGhostTasks,
  ProjectedGhostTask,
} from '@/lib/calculations/taskCalendar';
import { formatDateParts } from '@/lib/calculations/recurrence';
import {
  exportTasksToICS,
  buildGoogleCalendarUrl,
  buildOutlookWebUrl,
} from '@/lib/export/calendarExport';
import {
  CheckSquare,
  PlusCircle,
  Calendar,
  CalendarPlus,
  Download,
  ExternalLink,
  AlertTriangle,
  Clock,
  Trash2,
  Filter,
  CheckCircle2,
  Repeat,
  ChevronLeft,
  ChevronRight,
  ListTodo,
} from 'lucide-react';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function getLocalTodayISO(): string {
  const now = new Date();
  return formatDateParts(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

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

  const todayISO = useMemo(() => getLocalTodayISO(), []);

  // View Tab State ('ledger' | 'calendar')
  const [activeView, setActiveView] = useState<'ledger' | 'calendar'>('ledger');

  // Calendar Navigation & Selection States
  const [calendarYear, setCalendarYear] = useState<number>(() => new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(() => new Date().getMonth() + 1); // 1..12
  const [selectedDateISO, setSelectedDateISO] = useState<string>(() => getLocalTodayISO());

  const dayInspectorRef = useRef<HTMLDivElement | null>(null);

  // Filter States
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterEntityType, setFilterEntityType] = useState<string>('ALL');
  const [filterRecurrence, setFilterRecurrence] = useState<string>('ALL');

  // Per-task Calendar Quick Action Menu State
  const [openCalendarMenuTaskId, setOpenCalendarMenuTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (!openCalendarMenuTaskId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenCalendarMenuTaskId(null);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && !target.closest('[data-calendar-menu-container]')) {
        setOpenCalendarMenuTaskId(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [openCalendarMenuTaskId]);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [priority, setPriority] = useState<TaskPriority>('High');
  const [recurrence, setRecurrence] = useState<TaskRecurrence>('None');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<string>('');
  const [linkedType, setLinkedType] = useState<LinkedEntity['type']>('flip');
  const [linkedId, setLinkedId] = useState<string>('');

  const handleOpenAddModalWithDate = (prefillDate?: string) => {
    if (prefillDate) {
      setDueDate(prefillDate);
    } else {
      setDueDate(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    }
    setShowAddModal(true);
  };

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
      recurrence: recurrence !== 'None' ? recurrence : undefined,
      recurrenceEndDate: recurrence !== 'None' && recurrenceEndDate ? recurrenceEndDate : undefined,
      linkedEntity: {
        type: linkedType,
        id: linkedId || undefined,
        name: entityName,
      },
    });

    setShowAddModal(false);
    setTitle('');
    setDescription('');
    setRecurrence('None');
    setRecurrenceEndDate('');
  };

  // Filter logic + Strict Chronological Sorting
  const filteredTasks = useMemo(() => {
    const matching = tasks.filter((t) => {
      if (filterPriority !== 'ALL' && t.priority !== filterPriority) return false;
      if (filterStatus !== 'ALL' && t.status !== filterStatus) return false;
      if (filterEntityType !== 'ALL' && t.linkedEntity.type !== filterEntityType) return false;
      if (filterRecurrence === 'RECURRING' && (!t.recurrence || t.recurrence === 'None')) return false;
      if (filterRecurrence === 'ONEOFF' && t.recurrence && t.recurrence !== 'None') return false;
      return true;
    });
    return sortTasksChronologically(matching);
  }, [tasks, filterPriority, filterStatus, filterEntityType, filterRecurrence]);

  // Active (non-completed) filtered tasks for bulk .ics export
  const filteredActiveTasks = useMemo(
    () => filteredTasks.filter((t) => t.status !== 'Completed'),
    [filteredTasks]
  );

  // KPI Counts
  const urgentCount = tasks.filter((t) => t.priority === 'Urgent' && t.status !== 'Completed').length;
  const pendingCount = tasks.filter((t) => t.status !== 'Completed').length;
  const completedCount = tasks.filter((t) => t.status === 'Completed').length;
  const overdueCount = tasks.filter((t) => isTaskOverdue(t, todayISO)).length;

  // Calendar Grid & Ghost Task Projections
  const calendarCells = useMemo(
    () => buildCalendarMonthGrid(calendarYear, calendarMonth),
    [calendarYear, calendarMonth]
  );

  const ghostTasksInGrid = useMemo(() => {
    if (calendarCells.length === 0) return [];
    // If user explicitly filters for Completed or One-off Only, do not project recurring pending ghosts
    if (filterStatus === 'Completed' || filterRecurrence === 'ONEOFF') return [];
    const rangeStart = calendarCells[0].dateISO;
    const rangeEnd = calendarCells[calendarCells.length - 1].dateISO;
    return projectRecurringGhostTasks(filteredTasks, rangeStart, rangeEnd);
  }, [calendarCells, filteredTasks, filterStatus, filterRecurrence]);

  // Group actual tasks and ghost previews by dateISO
  const itemsByDate = useMemo(() => {
    const map: Record<string, { actual: TaskItem[]; ghosts: ProjectedGhostTask[] }> = {};
    for (const cell of calendarCells) {
      map[cell.dateISO] = { actual: [], ghosts: [] };
    }
    for (const t of filteredTasks) {
      if (!map[t.dueDate]) {
        map[t.dueDate] = { actual: [], ghosts: [] };
      }
      map[t.dueDate].actual.push(t);
    }
    for (const g of ghostTasksInGrid) {
      if (!map[g.dueDate]) {
        map[g.dueDate] = { actual: [], ghosts: [] };
      }
      map[g.dueDate].ghosts.push(g);
    }
    return map;
  }, [calendarCells, filteredTasks, ghostTasksInGrid]);

  // Navigation handlers for Calendar
  const handlePrevMonth = () => {
    let nextM = calendarMonth - 1;
    let nextY = calendarYear;
    if (nextM < 1) {
      nextM = 12;
      nextY -= 1;
    }
    setCalendarYear(nextY);
    setCalendarMonth(nextM);
    setSelectedDateISO(formatDateParts(nextY, nextM, 1));
  };

  const handleNextMonth = () => {
    let nextM = calendarMonth + 1;
    let nextY = calendarYear;
    if (nextM > 12) {
      nextM = 1;
      nextY += 1;
    }
    setCalendarYear(nextY);
    setCalendarMonth(nextM);
    setSelectedDateISO(formatDateParts(nextY, nextM, 1));
  };

  const handleTodayClick = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const d = now.getDate();
    setCalendarYear(y);
    setCalendarMonth(m);
    setSelectedDateISO(formatDateParts(y, m, d));
  };

  const handleSelectDayCell = (cellDateISO: string, cellYear: number, cellMonth: number) => {
    setSelectedDateISO(cellDateISO);
    if (cellYear !== calendarYear || cellMonth !== calendarMonth) {
      setCalendarYear(cellYear);
      setCalendarMonth(cellMonth);
    }
    if (typeof window !== 'undefined' && window.innerWidth < 1024 && dayInspectorRef.current) {
      dayInspectorRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const selectedDayBucket = itemsByDate[selectedDateISO] || { actual: [], ghosts: [] };

  // Tasks in the currently viewed month (for Month Agenda fallback / summary)
  const monthPrefix = `${calendarYear}-${String(calendarMonth).padStart(2, '0')}`;
  const currentMonthActualTasks = useMemo(
    () => filteredTasks.filter((t) => t.dueDate.startsWith(monthPrefix)),
    [filteredTasks, monthPrefix]
  );

  // Pill styling helper for Calendar day cells
  const getCalendarPillClasses = (task: TaskItem) => {
    if (task.status === 'Completed') {
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200 line-through';
    }
    if (task.priority === 'Urgent' || isTaskOverdue(task, todayISO)) {
      return 'bg-rose-50 text-rose-700 border border-rose-200';
    }
    if (task.priority === 'High') {
      return 'bg-amber-50 text-amber-800 border border-amber-200';
    }
    return 'bg-slate-100 text-slate-700 border border-slate-200';
  };

  // Mobile dot color helper
  const getMobileDotColor = (task: TaskItem) => {
    if (task.status === 'Completed') return 'bg-emerald-500';
    if (task.priority === 'Urgent' || isTaskOverdue(task, todayISO)) return 'bg-rose-500';
    if (task.priority === 'High') return 'bg-amber-500';
    return 'bg-slate-500';
  };

  const renderTaskCard = (task: TaskItem, compact = false) => {
    const overdue = isTaskOverdue(task, todayISO);
    return (
      <div
        key={task.id}
        data-testid={`task-card-${task.id}`}
        className={`bg-white rounded-xl border p-4 shadow-xs transition-all flex flex-col ${
          compact ? 'gap-3' : 'sm:flex-row sm:items-center justify-between gap-4'
        } ${
          task.status === 'Completed'
            ? 'border-slate-200 bg-slate-50/70 opacity-75'
            : overdue
            ? 'border-slate-200 border-l-4 border-l-rose-500 hover:border-slate-300'
            : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={task.status === 'Completed'}
            onChange={() => toggleTaskStatus(task.id)}
            aria-label={`Mark "${task.title}" as completed`}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0"
          />
          <div className="min-w-0 flex-1">
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

              {task.recurrence && task.recurrence !== 'None' && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200"
                  title={
                    task.recurrenceEndDate
                      ? `Repeats ${task.recurrence} until ${formatDate(task.recurrenceEndDate)}`
                      : `Repeats ${task.recurrence} indefinitely`
                  }
                >
                  <Repeat className="w-2.5 h-2.5" />
                  {task.recurrence}
                </span>
              )}

              <span
                className={`text-xs font-semibold ${
                  task.status === 'Completed' ? 'line-through text-slate-500' : 'text-slate-900'
                }`}
              >
                {task.title}
              </span>
            </div>

            {task.description && (
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{task.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-2">
              {overdue ? (
                <span
                  data-testid={`overdue-pill-${task.id}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-semibold"
                >
                  ⚠️ Overdue: {formatDate(task.dueDate)}
                </span>
              ) : (
                <span className="flex items-center gap-1 font-medium text-slate-500">
                  <Calendar className="w-3 h-3" /> Due {formatDate(task.dueDate)}
                </span>
              )}

              {task.recurrence && task.recurrence !== 'None' && task.recurrenceEndDate && (
                <>
                  <span>•</span>
                  <span className="text-indigo-600 font-medium">
                    Repeats until {formatDate(task.recurrenceEndDate)}
                  </span>
                </>
              )}
              <span>•</span>
              <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-semibold">
                Linked: {task.linkedEntity.name} ({task.linkedEntity.type})
              </span>
            </div>
          </div>
        </div>

        <div
          className={`flex items-center gap-2 ${
            compact ? 'justify-end pt-2 border-t border-slate-100' : 'self-end sm:self-center shrink-0'
          }`}
        >
          {/* Per-Task "Add to Calendar" Quick Action Popover */}
          <div className="relative" data-calendar-menu-container>
            <button
              type="button"
              data-testid={`task-calendar-menu-btn-${task.id}`}
              onClick={() =>
                setOpenCalendarMenuTaskId((prev) => (prev === task.id ? null : task.id))
              }
              aria-expanded={openCalendarMenuTaskId === task.id}
              aria-haspopup="menu"
              title="Add to External Calendar (.ics / Google / Outlook)"
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-semibold transition-colors ${
                openCalendarMenuTaskId === task.id
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <CalendarPlus className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden xl:inline">Sync</span>
            </button>

            {openCalendarMenuTaskId === task.id && (
              <div
                role="menu"
                data-testid={`task-calendar-menu-${task.id}`}
                className="absolute right-0 mt-1.5 w-64 rounded-xl bg-white border border-slate-200 shadow-lg py-1.5 z-30 text-xs"
              >
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  Add Task to Calendar
                </div>

                <button
                  type="button"
                  role="menuitem"
                  data-testid={`task-download-ics-${task.id}`}
                  onClick={() => {
                    exportTasksToICS([task]);
                    setOpenCalendarMenuTaskId(null);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 font-medium flex items-center justify-between gap-2 transition-colors"
                >
                  <span>📥 Download .ics (Outlook Desktop / Apple / Mobile)</span>
                  <Download className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>

                <a
                  role="menuitem"
                  data-testid={`task-google-cal-${task.id}`}
                  href={buildGoogleCalendarUrl(task)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpenCalendarMenuTaskId(null)}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 font-medium flex items-center justify-between gap-2 transition-colors"
                >
                  <span>🌐 Add to Google Calendar</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </a>

                <a
                  role="menuitem"
                  data-testid={`task-outlook-cal-${task.id}`}
                  href={buildOutlookWebUrl(task)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpenCalendarMenuTaskId(null)}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 font-medium flex items-center justify-between gap-2 transition-colors"
                >
                  <span>📧 Add to Outlook 365 / Web</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </a>
              </div>
            )}
          </div>

          <select
            value={task.status}
            onChange={(e) => updateTask(task.id, { status: e.target.value as TaskStatus })}
            aria-label={`Status for ${task.title}`}
            className="text-xs font-semibold px-2 py-1 border border-slate-300 rounded-lg bg-white text-slate-700"
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
    );
  };

  return (
    <div className="flex-1 flex flex-col">
      <TopHeader
        title="Task & Reminder Engine"
        subtitle="Centralized operational to-do ledger linked to properties, funding partners, and legal conveyancing"
        actionButton={
          <button
            onClick={() => handleOpenAddModalWithDate()}
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
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-bold text-slate-900">{pendingCount}</span>
                {overdueCount > 0 && (
                  <span
                    data-testid="kpi-overdue-badge"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200"
                  >
                    {overdueCount} overdue
                  </span>
                )}
              </div>
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

        {/* Filter Controls Bar & Segmented View Switcher */}
        <div
          id="tasks-toolbar"
          className="scroll-mt-20 bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500 font-semibold flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filters:
            </span>

            {/* Priority Filter */}
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              aria-label="Filter by Priority"
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
              aria-label="Filter by Status"
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
              aria-label="Filter by Linked Entity"
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 font-medium"
            >
              <option value="ALL">All Linked Entities</option>
              <option value="flip">Buy-and-Flips</option>
              <option value="rental">Rental Properties</option>
              <option value="funding">Funding Partners</option>
              <option value="opportunity">Opportunity Pipeline</option>
            </select>

            {/* Recurrence Filter */}
            <select
              value={filterRecurrence}
              onChange={(e) => setFilterRecurrence(e.target.value)}
              aria-label="Filter by Schedule"
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 font-medium"
            >
              <option value="ALL">All Schedules</option>
              <option value="RECURRING">Recurring Only</option>
              <option value="ONEOFF">One-off Only</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-3 ml-auto">
            <span className="text-slate-400 font-medium">
              Showing {filteredTasks.length} of {tasks.length} tasks
            </span>

            {/* Bulk RFC 5545 .ics Export Button */}
            <button
              type="button"
              data-testid="export-bulk-ics-btn"
              disabled={filteredActiveTasks.length === 0}
              onClick={() => exportTasksToICS(filteredActiveTasks)}
              title="Export filtered active tasks to an RFC 5545 .ics calendar file (Outlook, Apple Calendar, Google Calendar)"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
            >
              <span aria-hidden="true">📅</span>
              <span>Export .ics ({filteredActiveTasks.length})</span>
            </button>

            {/* High-Ergonomics Segmented View Switcher */}
            <div
              role="tablist"
              aria-label="Task View Switcher"
              className="inline-flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeView === 'ledger'}
                data-testid="tab-task-ledger"
                onClick={() => setActiveView('ledger')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  activeView === 'ledger'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span aria-hidden="true">📋</span>
                <span>Task Ledger</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeView === 'calendar'}
                data-testid="tab-calendar-view"
                onClick={() => setActiveView('calendar')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  activeView === 'calendar'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span aria-hidden="true">📅</span>
                <span>Calendar View</span>
              </button>
            </div>
          </div>
        </div>

        {/* VIEW 1: TASK LEDGER */}
        {activeView === 'ledger' && (
          <div id="tasks-list" className="scroll-mt-20 space-y-3">
            {filteredTasks.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center border border-slate-200">
                <p className="text-xs text-slate-400">No tasks match your selected filter criteria.</p>
              </div>
            ) : (
              filteredTasks.map((task) => renderTaskCard(task, false))
            )}
          </div>
        )}

        {/* VIEW 2: INTERACTIVE CALENDAR VIEW */}
        {activeView === 'calendar' && (
          <div
            data-testid="calendar-view-container"
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
          >
            {/* Left Column (lg:col-span-8): Monthly Calendar Grid */}
            <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Calendar Header */}
              <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2
                    data-testid="calendar-month-title"
                    className="text-base font-bold text-slate-900 flex items-center gap-2"
                  >
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    {MONTH_NAMES[calendarMonth - 1]} {calendarYear}
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Click any date to inspect tasks or schedule a new reminder
                  </p>
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    data-testid="calendar-prev-month"
                    onClick={handlePrevMonth}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-semibold transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Prev
                  </button>
                  <button
                    type="button"
                    data-testid="calendar-today-btn"
                    onClick={handleTodayClick}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-semibold transition-colors"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    data-testid="calendar-next-month"
                    onClick={handleNextMonth}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-semibold transition-colors"
                  >
                    Next
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 7-Column Weekday Header (Mon through Sun) */}
              <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200 text-center">
                {WEEKDAYS.map((dayName) => (
                  <div
                    key={dayName}
                    className="py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500"
                  >
                    {dayName}
                  </div>
                ))}
              </div>

              {/* 7-Column Day Cells Grid */}
              <div className="grid grid-cols-7 divide-x divide-y divide-slate-200 border-b border-slate-200">
                {calendarCells.map((cell) => {
                  const bucket = itemsByDate[cell.dateISO] || { actual: [], ghosts: [] };
                  const totalItems = bucket.actual.length + bucket.ghosts.length;
                  const isSelected = selectedDateISO === cell.dateISO;
                  const isToday = cell.dateISO === todayISO;

                  // Combine actual + ghost up to 3 pills for desktop display
                  const combinedPills: Array<
                    | { kind: 'actual'; item: TaskItem }
                    | { kind: 'ghost'; item: ProjectedGhostTask }
                  > = [
                    ...bucket.actual.map((item) => ({ kind: 'actual' as const, item })),
                    ...bucket.ghosts.map((item) => ({ kind: 'ghost' as const, item })),
                  ];
                  const visiblePills = combinedPills.slice(0, 3);
                  const overflowCount = combinedPills.length - visiblePills.length;

                  return (
                    <button
                      key={cell.dateISO}
                      type="button"
                      data-testid={`calendar-day-${cell.dateISO}`}
                      onClick={() => handleSelectDayCell(cell.dateISO, cell.year, cell.month)}
                      className={`min-h-[68px] md:min-h-[108px] p-1.5 sm:p-2 text-left flex flex-col justify-between transition-colors relative focus:outline-none ${
                        !cell.isCurrentMonth
                          ? 'bg-slate-50/60 text-slate-400 hover:bg-slate-100/70'
                          : 'bg-white text-slate-900 hover:bg-slate-50'
                      } ${
                        isSelected
                          ? 'ring-2 ring-inset ring-emerald-600 bg-emerald-50/20 z-10'
                          : ''
                      }`}
                    >
                      {/* Top row: Date number + count badge on mobile */}
                      <div className="flex items-center justify-between w-full">
                        <span
                          className={`inline-flex items-center justify-center text-xs font-bold w-6 h-6 rounded-full ${
                            isToday
                              ? 'bg-emerald-600 text-white'
                              : isSelected
                              ? 'text-emerald-700 font-extrabold'
                              : cell.isCurrentMonth
                              ? 'text-slate-700'
                              : 'text-slate-400'
                          }`}
                        >
                          {cell.day}
                        </span>

                        {totalItems > 0 && (
                          <span className="md:hidden text-[10px] font-bold text-slate-500">
                            {totalItems}
                          </span>
                        )}
                      </div>

                      {/* Desktop (>= md): Up to 3 compact task pills */}
                      <div className="hidden md:flex flex-col gap-1 mt-1.5 w-full">
                        {visiblePills.map((entry) => {
                          if (entry.kind === 'actual') {
                            const t = entry.item;
                            return (
                              <div
                                key={t.id}
                                title={`${t.priority}: ${t.title} (${t.status})`}
                                className={`text-[10px] leading-tight font-medium px-1.5 py-0.5 rounded truncate ${getCalendarPillClasses(
                                  t
                                )}`}
                              >
                                {t.title}
                              </div>
                            );
                          } else {
                            const g = entry.item;
                            return (
                              <div
                                key={g.id}
                                data-testid={`ghost-pill-${g.dueDate}`}
                                title={`Scheduled Recurring Preview (${g.recurrence}): ${g.title}`}
                                className="text-[10px] leading-tight font-medium px-1.5 py-0.5 rounded truncate border border-dashed border-indigo-300 bg-indigo-50/60 text-indigo-700 flex items-center gap-1"
                              >
                                <Repeat className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate">{g.title}</span>
                              </div>
                            );
                          }
                        })}

                        {overflowCount > 0 && (
                          <div className="text-[10px] font-semibold text-slate-500 pl-1">
                            +{overflowCount} more
                          </div>
                        )}
                      </div>

                      {/* Mobile (< md): Compact priority dots */}
                      {totalItems > 0 && (
                        <div className="flex md:hidden items-center justify-center gap-1 mt-auto pt-1 flex-wrap">
                          {bucket.actual.slice(0, 4).map((t) => (
                            <span
                              key={t.id}
                              className={`w-1.5 h-1.5 rounded-full ${getMobileDotColor(t)}`}
                            />
                          ))}
                          {bucket.ghosts.slice(0, 2).map((g) => (
                            <span
                              key={g.id}
                              className="w-1.5 h-1.5 rounded-full border border-indigo-500 bg-indigo-200"
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Calendar Legend Footer */}
              <div className="px-4 py-2.5 bg-slate-50 flex flex-wrap items-center gap-4 text-[11px] text-slate-600">
                <span className="font-semibold text-slate-500">Legend:</span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-rose-100 border border-rose-300" />
                  Urgent / Overdue
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-amber-100 border border-amber-300" />
                  High Priority
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-slate-200 border border-slate-300" />
                  Medium / Low
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-100 border border-emerald-300" />
                  Completed
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-indigo-50 border border-dashed border-indigo-400" />
                  Recurring Preview
                </span>
              </div>
            </div>

            {/* Right Column (lg:col-span-4): Selected Day / Month Agenda Sidebar */}
            <div
              ref={dayInspectorRef}
              data-testid="calendar-agenda-sidebar"
              className="lg:col-span-4 space-y-4 scroll-mt-20"
            >
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-4">
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                      Selected Date Inspector
                    </span>
                    <h3
                      data-testid="selected-date-heading"
                      className="text-sm font-bold text-slate-900 mt-0.5"
                    >
                      {formatDate(selectedDateISO)}
                      {selectedDateISO === todayISO && (
                        <span className="ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Today
                        </span>
                      )}
                    </h3>
                  </div>

                  <button
                    type="button"
                    data-testid="add-task-selected-date-btn"
                    onClick={() => handleOpenAddModalWithDate(selectedDateISO)}
                    className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg shadow-xs transition-colors shrink-0"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    + Add Task on Selected Date
                  </button>
                </div>

                {/* Selected Date Actual Tasks */}
                <div className="space-y-3">
                  {selectedDayBucket.actual.length === 0 &&
                  selectedDayBucket.ghosts.length === 0 ? (
                    <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-5 text-center space-y-2">
                      <Calendar className="w-5 h-5 text-slate-400 mx-auto" />
                      <p className="text-xs font-medium text-slate-600">
                        No tasks scheduled for {formatDate(selectedDateISO)}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Click the button above to create a task due on this date.
                      </p>
                    </div>
                  ) : (
                    <>
                      {selectedDayBucket.actual.map((task) => renderTaskCard(task, true))}

                      {/* Read-Only Recurring Ghost Previews on Selected Day */}
                      {selectedDayBucket.ghosts.map((ghost) => (
                        <div
                          key={ghost.id}
                          data-testid={`agenda-ghost-card-${ghost.dueDate}`}
                          className="rounded-xl border border-dashed border-indigo-300 bg-indigo-50/40 p-3.5 space-y-2"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                              <Repeat className="w-2.5 h-2.5" />
                              Scheduled {ghost.recurrence} Preview
                            </span>
                            <span className="text-[10px] font-semibold text-indigo-600">
                              {ghost.priority} Priority
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-slate-900">{ghost.title}</p>
                          {ghost.description && (
                            <p className="text-[11px] text-slate-500 leading-relaxed">
                              {ghost.description}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-500">
                            <span>
                              Linked: <strong>{ghost.linkedEntity.name}</strong>
                            </span>
                            <span className="text-[10px] italic text-indigo-600">
                              Spawns after {formatDate(ghost.sourceDueDate)} is completed
                            </span>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Month Agenda Quick Overview */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <ListTodo className="w-3.5 h-3.5 text-slate-400" />
                    {MONTH_NAMES[calendarMonth - 1]} {calendarYear} Agenda (
                    {currentMonthActualTasks.length})
                  </h4>
                </div>

                {currentMonthActualTasks.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">
                    No active or completed tasks due in {MONTH_NAMES[calendarMonth - 1]}{' '}
                    {calendarYear}.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {currentMonthActualTasks.map((t) => {
                      const overdue = isTaskOverdue(t, todayISO);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setSelectedDateISO(t.dueDate)}
                          className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all flex items-center justify-between gap-2 ${
                            selectedDateISO === t.dueDate
                              ? 'border-emerald-500 bg-emerald-50/40'
                              : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p
                              className={`font-semibold truncate ${
                                t.status === 'Completed'
                                  ? 'line-through text-slate-400'
                                  : 'text-slate-800'
                              }`}
                            >
                              {t.title}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              {t.linkedEntity.name}
                            </p>
                          </div>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded shrink-0 ${
                              overdue
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : t.status === 'Completed'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {formatDate(t.dueDate)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
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
                  <label className="block font-semibold text-slate-700 mb-1">Recurrence Schedule</label>
                  <select
                    value={recurrence}
                    onChange={(e) => setRecurrence(e.target.value as TaskRecurrence)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold min-h-[40px]"
                  >
                    <option value="None">Does not repeat (One-off)</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Annually">Annually</option>
                  </select>
                </div>
                {recurrence !== 'None' ? (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Repeat Until (Optional)</label>
                    <input
                      type="date"
                      name="taskRecurrenceEndDate"
                      autoComplete="off"
                      value={recurrenceEndDate}
                      min={dueDate}
                      onChange={(e) => setRecurrenceEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg min-h-[40px]"
                    />
                  </div>
                ) : (
                  <div>
                    <span className="block font-semibold text-slate-400 mb-1">Repeat Cadence</span>
                    <p className="text-slate-400 text-xs py-2 italic">Standard single-instance task</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Link to Module</label>
                  <select
                    value={linkedType}
                    onChange={(e) => {
                      setLinkedType(e.target.value as LinkedEntity['type']);
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
