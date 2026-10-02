import { TaskItem, TaskRecurrence } from '@/types';

export function parseDateParts(dateStr: string): { year: number; month: number; day: number } | null {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return { year, month, day };
}

export function formatDateParts(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Calculates the next due date based on the scheduled due date and recurrence interval.
 */
export function calculateNextDueDate(currentDueDate: string, recurrence: TaskRecurrence): string | null {
  if (!recurrence || recurrence === 'None') return null;

  const parsed = parseDateParts(currentDueDate);
  if (!parsed) return null;

  const { year, month, day } = parsed;

  switch (recurrence) {
    case 'Weekly': {
      const d = new Date(year, month - 1, day);
      d.setDate(d.getDate() + 7);
      return formatDateParts(d.getFullYear(), d.getMonth() + 1, d.getDate());
    }

    case 'Monthly': {
      let targetMonth = month + 1;
      let targetYear = year;
      if (targetMonth > 12) {
        targetMonth = 1;
        targetYear += 1;
      }
      const maxDays = daysInMonth(targetYear, targetMonth);
      const targetDay = Math.min(day, maxDays);
      return formatDateParts(targetYear, targetMonth, targetDay);
    }

    case 'Quarterly': {
      let targetMonth = month + 3;
      let targetYear = year;
      while (targetMonth > 12) {
        targetMonth -= 12;
        targetYear += 1;
      }
      const maxDays = daysInMonth(targetYear, targetMonth);
      const targetDay = Math.min(day, maxDays);
      return formatDateParts(targetYear, targetMonth, targetDay);
    }

    case 'Annually': {
      const targetYear = year + 1;
      const maxDays = daysInMonth(targetYear, month);
      const targetDay = Math.min(day, maxDays);
      return formatDateParts(targetYear, month, targetDay);
    }

    default:
      return null;
  }
}

/**
 * Determines whether a recurring task should spawn its next instance.
 */
export function shouldSpawnNextRecurringTask(
  task: TaskItem,
  nextDueDate: string | null
): boolean {
  if (!task.recurrence || task.recurrence === 'None' || !nextDueDate) {
    return false;
  }

  if (task.recurrenceEndDate) {
    // If the next calculated due date exceeds the end date, stop recurring
    if (nextDueDate > task.recurrenceEndDate) {
      return false;
    }
  }

  return true;
}

/**
 * Generates the next pending TaskItem instance for a recurring task series.
 */
export function createNextRecurringTask(task: TaskItem, nextDueDate: string): TaskItem {
  const groupId = task.recurrenceGroupId || `series-${task.id}`;

  return {
    id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title: task.title,
    description: task.description,
    dueDate: nextDueDate,
    priority: task.priority,
    status: 'Pending',
    linkedEntity: { ...task.linkedEntity },
    createdAt: new Date().toISOString(),
    recurrence: task.recurrence,
    recurrenceEndDate: task.recurrenceEndDate,
    recurrenceGroupId: groupId,
  };
}

/**
 * Handles completing a recurring task by checking if a new pending task
 * should be spawned, while preventing duplicates.
 */
export function handleTaskCompletionRecurrence(
  task: TaskItem,
  existingTasks: TaskItem[]
): TaskItem | null {
  if (!task.recurrence || task.recurrence === 'None') return null;

  const nextDueDate = calculateNextDueDate(task.dueDate, task.recurrence);
  if (!nextDueDate || !shouldSpawnNextRecurringTask(task, nextDueDate)) {
    return null;
  }

  const groupId = task.recurrenceGroupId || `series-${task.id}`;
  const alreadyExists = existingTasks.some(
    (t) =>
      (t.recurrenceGroupId === groupId || t.id === task.id) &&
      t.dueDate === nextDueDate &&
      t.title === task.title
  );

  if (alreadyExists) return null;

  return createNextRecurringTask({ ...task, recurrenceGroupId: groupId }, nextDueDate);
}

