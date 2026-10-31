import { TaskItem, TaskPriority } from '@/types';
import { parseDateParts, formatDateParts } from '@/lib/calculations/recurrence';

/**
 * Escapes text values per RFC 5545 Section 3.3.11:
 * Backslashes, semicolons, commas, and newlines.
 */
export function escapeICSText(text: string | undefined | null): string {
  if (!text) return '';
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Converts an ISO date string (YYYY-MM-DD) to compact RFC 5545 date format (YYYYMMDD).
 */
export function formatICSDate(dateISO: string): string {
  const parsed = parseDateParts(dateISO);
  if (!parsed) {
    return dateISO.replace(/-/g, '');
  }
  const m = String(parsed.month).padStart(2, '0');
  const d = String(parsed.day).padStart(2, '0');
  return `${parsed.year}${m}${d}`;
}

/**
 * Adds a number of calendar days to an ISO date string (YYYY-MM-DD) without timezone drift.
 */
export function addDaysISO(dateISO: string, daysToAdd: number): string {
  const parsed = parseDateParts(dateISO);
  if (!parsed) return dateISO;
  const d = new Date(parsed.year, parsed.month - 1, parsed.day);
  d.setDate(d.getDate() + daysToAdd);
  return formatDateParts(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/**
 * Formats a Date object as an RFC 5545 UTC timestamp: YYYYMMDDTHHMMSSZ.
 */
export function formatUTCStamp(date: Date = new Date()): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}T${hh}${min}${ss}Z`;
}

/**
 * Maps TaskPriority to RFC 5545 PRIORITY integer (1 = highest, 9 = lowest).
 */
export function mapPriorityToICS(priority: TaskPriority): number {
  switch (priority) {
    case 'Urgent':
      return 1;
    case 'High':
      return 3;
    case 'Medium':
      return 5;
    case 'Low':
      return 9;
    default:
      return 5;
  }
}

/**
 * Builds the plain-text details block for a TaskItem.
 */
export function buildTaskDetailsText(task: TaskItem): string {
  const lines: string[] = [];
  if (task.description && task.description.trim()) {
    lines.push(task.description.trim());
  }
  if (task.linkedEntity) {
    lines.push(`Linked Entity: ${task.linkedEntity.name} (${task.linkedEntity.type})`);
  }
  lines.push(`Status: ${task.status}`);
  return lines.join('\n');
}

/**
 * Builds an RFC 5545 RRULE value string (excluding the 'RRULE:' prefix) for recurring tasks.
 * Returns null if the task does not repeat.
 */
export function buildTaskRRule(task: TaskItem): string | null {
  if (!task.recurrence || task.recurrence === 'None') {
    return null;
  }

  let rule = '';
  switch (task.recurrence) {
    case 'Weekly':
      rule = 'FREQ=WEEKLY';
      break;
    case 'Monthly':
      rule = 'FREQ=MONTHLY';
      break;
    case 'Quarterly':
      rule = 'FREQ=MONTHLY;INTERVAL=3';
      break;
    case 'Annually':
      rule = 'FREQ=YEARLY';
      break;
    default:
      return null;
  }

  if (task.recurrenceEndDate) {
    const untilCompact = formatICSDate(task.recurrenceEndDate);
    rule += `;UNTIL=${untilCompact}T235959Z`;
  }

  return rule;
}

/**
 * Generates a valid RFC 5545 VCALENDAR (.ics) string with CRLF (\r\n) line endings.
 */
export function buildTaskICS(tasks: TaskItem[], dtstampDate: Date = new Date()): string {
  const dtstamp = formatUTCStamp(dtstampDate);
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Moremela Property Hub//Task Engine//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const task of tasks) {
    const dtStart = formatICSDate(task.dueDate);
    const dtEnd = formatICSDate(addDaysISO(task.dueDate, 1));
    const summary = escapeICSText(`[${task.priority}] ${task.title}`);
    const description = escapeICSText(buildTaskDetailsText(task));
    const priorityNum = mapPriorityToICS(task.priority);
    const rrule = buildTaskRRule(task);

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${task.id}@moremela.property`);
    lines.push(`DTSTAMP:${dtstamp}`);
    lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
    lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
    lines.push(`SUMMARY:${summary}`);
    lines.push(`DESCRIPTION:${description}`);
    lines.push(`PRIORITY:${priorityNum}`);

    if (rrule) {
      lines.push(`RRULE:${rrule}`);
    }

    // Standard 9:00 AM day-of reminder (VALARM)
    lines.push('BEGIN:VALARM');
    lines.push('ACTION:DISPLAY');
    lines.push('TRIGGER:PT9H');
    lines.push('DESCRIPTION:Reminder');
    lines.push('END:VALARM');

    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

/**
 * Triggers a browser download of an RFC 5545 .ics file for the given tasks.
 * Returns the number of exported tasks.
 */
export function exportTasksToICS(tasks: TaskItem[], filenamePrefix?: string): number {
  if (!tasks || tasks.length === 0) return 0;

  const icsContent = buildTaskICS(tasks);

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    const todayStr = new Date().toISOString().split('T')[0];
    let filename = `moremela-tasks-${todayStr}.ics`;

    if (filenamePrefix) {
      const cleanSlug = filenamePrefix
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      filename = `${cleanSlug || 'moremela-task'}.ics`;
    } else if (tasks.length === 1) {
      const singleSlug = tasks[0].title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40);
      filename = `moremela-task-${singleSlug || tasks[0].id}-${tasks[0].dueDate}.ics`;
    }

    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  return tasks.length;
}

/**
 * Builds a Google Calendar event creation deep link for a single task.
 */
export function buildGoogleCalendarUrl(task: TaskItem): string {
  const startCompact = formatICSDate(task.dueDate);
  const endCompact = formatICSDate(addDaysISO(task.dueDate, 1));
  const text = `[${task.priority}] ${task.title}`;
  const details = buildTaskDetailsText(task);
  const rrule = buildTaskRRule(task);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text,
    dates: `${startCompact}/${endCompact}`,
    details,
  });

  if (rrule) {
    params.set('recur', `RRULE:${rrule}`);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Builds a Microsoft Outlook Web / Office 365 calendar compose deep link for a single task.
 */
export function buildOutlookWebUrl(task: TaskItem): string {
  const startISO = task.dueDate;
  const endISO = addDaysISO(task.dueDate, 1);
  const subject = `[${task.priority}] ${task.title}`;
  const body = buildTaskDetailsText(task);

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject,
    startdt: startISO,
    enddt: endISO,
    allday: 'true',
    body,
  });

  return `https://outlook.office.com/calendar/0/deeplink/compose?${params.toString()}`;
}
