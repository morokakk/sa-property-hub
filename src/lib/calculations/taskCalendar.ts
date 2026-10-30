import { TaskItem, TaskPriority } from '@/types';
import { calculateNextDueDate, daysInMonth, formatDateParts } from './recurrence';

export const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  Urgent: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

/**
 * Checks whether a task is overdue relative to today's ISO date (YYYY-MM-DD).
 */
export function isTaskOverdue(task: TaskItem, todayISO: string): boolean {
  if (task.status === 'Completed') return false;
  return task.dueDate < todayISO;
}

/**
 * Strictly sorts tasks chronologically:
 * 1. Active/Pending tasks first, Completed tasks at the bottom.
 * 2. By dueDate ascending (new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).
 * 3. Ties on the same dueDate broken by priority (Urgent -> High -> Medium -> Low).
 */
export function sortTasksChronologically(tasks: TaskItem[]): TaskItem[] {
  return [...tasks].sort((a, b) => {
    const aCompleted = a.status === 'Completed';
    const bCompleted = b.status === 'Completed';
    if (aCompleted !== bCompleted) {
      return aCompleted ? 1 : -1;
    }

    const timeDiff = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    if (timeDiff !== 0) {
      return timeDiff;
    }

    return (PRIORITY_WEIGHT[a.priority] ?? 99) - (PRIORITY_WEIGHT[b.priority] ?? 99);
  });
}

export interface CalendarDayCell {
  dateISO: string; // YYYY-MM-DD
  year: number;
  month: number; // 1..12
  day: number; // 1..31
  isCurrentMonth: boolean;
}

/**
 * Generates a 7-column Monday-first calendar grid for a given year and month (1..12).
 * Always returns 35 or 42 cells covering full weeks from Monday to Sunday.
 */
export function buildCalendarMonthGrid(year: number, month: number): CalendarDayCell[] {
  const firstDayDate = new Date(year, month - 1, 1);
  // JS getDay(): 0 = Sun, 1 = Mon, ..., 6 = Sat
  // Convert to Monday-first offset: Mon = 0, Tue = 1, ..., Sun = 6
  const startOffset = (firstDayDate.getDay() + 6) % 7;

  const currentMonthDays = daysInMonth(year, month);

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonthDays = daysInMonth(prevYear, prevMonth);

  const cells: CalendarDayCell[] = [];

  // Leading days from previous month
  for (let i = startOffset - 1; i >= 0; i--) {
    const day = prevMonthDays - i;
    cells.push({
      dateISO: formatDateParts(prevYear, prevMonth, day),
      year: prevYear,
      month: prevMonth,
      day,
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let day = 1; day <= currentMonthDays; day++) {
    cells.push({
      dateISO: formatDateParts(year, month, day),
      year,
      month,
      day,
      isCurrentMonth: true,
    });
  }

  // Trailing days from next month to complete the final week (multiple of 7)
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const remaining = (7 - (cells.length % 7)) % 7;

  for (let day = 1; day <= remaining; day++) {
    cells.push({
      dateISO: formatDateParts(nextYear, nextMonth, day),
      year: nextYear,
      month: nextMonth,
      day,
      isCurrentMonth: false,
    });
  }

  return cells;
}

export interface ProjectedGhostTask {
  id: string;
  sourceTaskId: string;
  title: string;
  description?: string;
  dueDate: string; // Projected YYYY-MM-DD
  sourceDueDate: string; // Current active instance due date
  priority: TaskPriority;
  recurrence: NonNullable<TaskItem['recurrence']>;
  recurrenceEndDate?: string;
  linkedEntity: TaskItem['linkedEntity'];
  isGhost: true;
}

/**
 * Projects future recurring ghost occurrences for active recurring tasks within a date range [rangeStartISO, rangeEndISO].
 * Respects recurrenceEndDate and prevents duplicating existing actual task instances.
 */
export function projectRecurringGhostTasks(
  tasks: TaskItem[],
  rangeStartISO: string,
  rangeEndISO: string
): ProjectedGhostTask[] {
  const ghosts: ProjectedGhostTask[] = [];

  for (const task of tasks) {
    if (task.status === 'Completed') continue;
    if (!task.recurrence || task.recurrence === 'None') continue;

    let cursorDate = calculateNextDueDate(task.dueDate, task.recurrence);
    let safetyCounter = 0;

    while (cursorDate && cursorDate <= rangeEndISO && safetyCounter < 200) {
      safetyCounter++;

      if (task.recurrenceEndDate && cursorDate > task.recurrenceEndDate) {
        break;
      }

      if (cursorDate >= rangeStartISO && cursorDate > task.dueDate) {
        const groupId = task.recurrenceGroupId || `series-${task.id}`;
        const alreadyExists = tasks.some(
          (existing) =>
            existing.dueDate === cursorDate &&
            (existing.recurrenceGroupId === groupId || existing.title === task.title)
        );

        const ghostAlreadyAdded = ghosts.some(
          (g) => g.dueDate === cursorDate && g.title === task.title
        );

        if (!alreadyExists && !ghostAlreadyAdded) {
          ghosts.push({
            id: `ghost-${task.id}-${cursorDate}`,
            sourceTaskId: task.id,
            title: task.title,
            description: task.description,
            dueDate: cursorDate,
            sourceDueDate: task.dueDate,
            priority: task.priority,
            recurrence: task.recurrence,
            recurrenceEndDate: task.recurrenceEndDate,
            linkedEntity: task.linkedEntity,
            isGhost: true,
          });
        }
      }

      cursorDate = calculateNextDueDate(cursorDate, task.recurrence);
    }
  }

  return ghosts.sort((a, b) => {
    const timeDiff = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    if (timeDiff !== 0) return timeDiff;
    return (PRIORITY_WEIGHT[a.priority] ?? 99) - (PRIORITY_WEIGHT[b.priority] ?? 99);
  });
}
