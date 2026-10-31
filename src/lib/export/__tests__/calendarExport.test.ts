import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  escapeICSText,
  formatICSDate,
  addDaysISO,
  formatUTCStamp,
  mapPriorityToICS,
  buildTaskDetailsText,
  buildTaskRRule,
  buildTaskICS,
  exportTasksToICS,
  buildGoogleCalendarUrl,
  buildOutlookWebUrl,
} from '../calendarExport';
import { TaskItem } from '@/types';

const mockFixedDate = new Date(Date.UTC(2026, 9, 31, 10, 30, 45)); // 20261031T103045Z

const sampleTask: TaskItem = {
  id: 'task-101',
  title: 'Follow up with Bond Originator, SARS; & Attorneys\\Co',
  description: 'Verify final tax clearance\nand transfer duty receipt.',
  dueDate: '2026-10-31',
  priority: 'Urgent',
  status: 'Pending',
  createdAt: '2026-10-01',
  linkedEntity: {
    type: 'flip',
    id: 'flip-1',
    name: '42 Maple Drive',
  },
};

describe('calendarExport Engine (RFC 5545 .ics & Deep Links)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Helper Formatting & Escaping Functions', () => {
    it('escapes commas, semicolons, backslashes, and newlines per RFC 5545', () => {
      const raw = 'Line 1, with comma; semicolon \\ backslash\r\nand Line 2\nLine 3';
      expect(escapeICSText(raw)).toBe(
        'Line 1\\, with comma\\; semicolon \\\\ backslash\\nand Line 2\\nLine 3'
      );
      expect(escapeICSText('')).toBe('');
      expect(escapeICSText(undefined)).toBe('');
    });

    it('formats ISO dates as compact YYYYMMDD and handles month/year rollovers in addDaysISO', () => {
      expect(formatICSDate('2026-10-05')).toBe('20261005');
      expect(addDaysISO('2026-10-31', 1)).toBe('2026-11-01');
      expect(addDaysISO('2026-12-31', 1)).toBe('2027-01-01');
      expect(formatICSDate(addDaysISO('2026-10-31', 1))).toBe('20261101');
    });

    it('formats UTC timestamp as YYYYMMDDTHHMMSSZ', () => {
      expect(formatUTCStamp(mockFixedDate)).toBe('20261031T103045Z');
    });

    it('maps TaskPriority to RFC 5545 PRIORITY numbers accurately', () => {
      expect(mapPriorityToICS('Urgent')).toBe(1);
      expect(mapPriorityToICS('High')).toBe(3);
      expect(mapPriorityToICS('Medium')).toBe(5);
      expect(mapPriorityToICS('Low')).toBe(9);
    });

    it('combines description, linked entity, and status in buildTaskDetailsText', () => {
      const details = buildTaskDetailsText(sampleTask);
      expect(details).toContain('Verify final tax clearance\nand transfer duty receipt.');
      expect(details).toContain('Linked Entity: 42 Maple Drive (flip)');
      expect(details).toContain('Status: Pending');
    });
  });

  describe('Recurrence Rule (RRULE) Generation', () => {
    it('returns null when recurrence is None or undefined', () => {
      expect(buildTaskRRule(sampleTask)).toBeNull();
      expect(buildTaskRRule({ ...sampleTask, recurrence: 'None' })).toBeNull();
    });

    it('generates valid RRULE strings for Weekly, Monthly, Quarterly (INTERVAL=3), and Annually', () => {
      expect(buildTaskRRule({ ...sampleTask, recurrence: 'Weekly' })).toBe('FREQ=WEEKLY');
      expect(buildTaskRRule({ ...sampleTask, recurrence: 'Monthly' })).toBe('FREQ=MONTHLY');
      expect(buildTaskRRule({ ...sampleTask, recurrence: 'Quarterly' })).toBe(
        'FREQ=MONTHLY;INTERVAL=3'
      );
      expect(buildTaskRRule({ ...sampleTask, recurrence: 'Annually' })).toBe('FREQ=YEARLY');
    });

    it('appends UNTIL=YYYYMMDDT235959Z when recurrenceEndDate is specified', () => {
      expect(
        buildTaskRRule({
          ...sampleTask,
          recurrence: 'Quarterly',
          recurrenceEndDate: '2027-06-30',
        })
      ).toBe('FREQ=MONTHLY;INTERVAL=3;UNTIL=20270630T235959Z');

      expect(
        buildTaskRRule({
          ...sampleTask,
          recurrence: 'Monthly',
          recurrenceEndDate: '2026-12-31',
        })
      ).toBe('FREQ=MONTHLY;UNTIL=20261231T235959Z');
    });
  });

  describe('buildTaskICS RFC 5545 Payload Structure', () => {
    it('outputs valid VCALENDAR and VEVENT structure with CRLF (\\r\\n) line endings and VALARM', () => {
      const recurringTask: TaskItem = {
        ...sampleTask,
        id: 'task-202',
        priority: 'High',
        recurrence: 'Quarterly',
        recurrenceEndDate: '2027-10-31',
      };

      const ics = buildTaskICS([sampleTask, recurringTask], mockFixedDate);

      // Verify CRLF line endings throughout
      expect(ics).toContain('\r\n');
      const lines = ics.trimEnd().split('\r\n');

      expect(lines[0]).toBe('BEGIN:VCALENDAR');
      expect(lines).toContain('VERSION:2.0');
      expect(lines).toContain('PRODID:-//Moremela Property Hub//Task Engine//EN');
      expect(lines).toContain('CALSCALE:GREGORIAN');
      expect(lines).toContain('METHOD:PUBLISH');
      expect(lines[lines.length - 1]).toBe('END:VCALENDAR');

      // Check Task 1 fields
      expect(lines).toContain('UID:task-101@moremela.property');
      expect(lines).toContain('DTSTAMP:20261031T103045Z');
      expect(lines).toContain('DTSTART;VALUE=DATE:20261031');
      expect(lines).toContain('DTEND;VALUE=DATE:20261101'); // Exclusive +1 day
      expect(lines).toContain(
        'SUMMARY:[Urgent] Follow up with Bond Originator\\, SARS\\; & Attorneys\\\\Co'
      );
      expect(lines).toContain(
        'DESCRIPTION:Verify final tax clearance\\nand transfer duty receipt.\\nLinked Entity: 42 Maple Drive (flip)\\nStatus: Pending'
      );
      expect(lines).toContain('PRIORITY:1');

      // Check Task 2 RRULE & Priority
      expect(lines).toContain('UID:task-202@moremela.property');
      expect(lines).toContain('PRIORITY:3');
      expect(lines).toContain('RRULE:FREQ=MONTHLY;INTERVAL=3;UNTIL=20271031T235959Z');

      // Check 9:00 AM VALARM block
      expect(lines).toContain('BEGIN:VALARM');
      expect(lines).toContain('ACTION:DISPLAY');
      expect(lines).toContain('TRIGGER:PT9H');
      expect(lines).toContain('DESCRIPTION:Reminder');
      expect(lines).toContain('END:VALARM');
    });
  });

  describe('Single-Task Deep Link Builders (Google Calendar & Outlook Web)', () => {
    it('builds a properly encoded Google Calendar template URL with exclusive end date and RRULE', () => {
      const taskWithRecurrence: TaskItem = {
        ...sampleTask,
        recurrence: 'Monthly',
        recurrenceEndDate: '2027-03-31',
      };

      const urlStr = buildGoogleCalendarUrl(taskWithRecurrence);
      expect(urlStr.startsWith('https://calendar.google.com/calendar/render?')).toBe(true);

      const parsed = new URL(urlStr);
      expect(parsed.searchParams.get('action')).toBe('TEMPLATE');
      expect(parsed.searchParams.get('text')).toBe(
        '[Urgent] Follow up with Bond Originator, SARS; & Attorneys\\Co'
      );
      expect(parsed.searchParams.get('dates')).toBe('20261031/20261101');
      expect(parsed.searchParams.get('details')).toContain('Linked Entity: 42 Maple Drive (flip)');
      expect(parsed.searchParams.get('recur')).toBe('RRULE:FREQ=MONTHLY;UNTIL=20270331T235959Z');
    });

    it('builds a properly encoded Microsoft Outlook Web / 365 deep link with exclusive enddt', () => {
      const urlStr = buildOutlookWebUrl(sampleTask);
      expect(urlStr.startsWith('https://outlook.office.com/calendar/0/deeplink/compose?')).toBe(
        true
      );

      const parsed = new URL(urlStr);
      expect(parsed.searchParams.get('path')).toBe('/calendar/action/compose');
      expect(parsed.searchParams.get('rru')).toBe('addevent');
      expect(parsed.searchParams.get('subject')).toBe(
        '[Urgent] Follow up with Bond Originator, SARS; & Attorneys\\Co'
      );
      expect(parsed.searchParams.get('startdt')).toBe('2026-10-31');
      expect(parsed.searchParams.get('enddt')).toBe('2026-11-01');
      expect(parsed.searchParams.get('allday')).toBe('true');
      expect(parsed.searchParams.get('body')).toContain('Status: Pending');
    });
  });

  describe('exportTasksToICS Browser Download Trigger', () => {
    it('returns 0 when passed an empty array and returns task count when tasks exist', () => {
      expect(exportTasksToICS([])).toBe(0);

      const createObjectURLMock = vi.fn(() => 'blob:mock-ics-url');
      const revokeObjectURLMock = vi.fn();
      vi.stubGlobal('URL', {
        ...URL,
        createObjectURL: createObjectURLMock,
        revokeObjectURL: revokeObjectURLMock,
      });

      const count = exportTasksToICS([sampleTask]);
      expect(count).toBe(1);
    });
  });
});
