import { describe, it, expect } from 'vitest';
import {
  isTaskOverdue,
  sortTasksChronologically,
  buildCalendarMonthGrid,
  projectRecurringGhostTasks,
} from '../taskCalendar';
import { TaskItem } from '@/types';

describe('Task Calendar & Chronological Triage Engine', () => {
  const sampleTasks: TaskItem[] = [
    {
      id: 't-late-low',
      title: 'Future Low Task',
      dueDate: '2026-11-15',
      priority: 'Low',
      status: 'Pending',
      linkedEntity: { type: 'rental', name: 'Sandhurst' },
      createdAt: '2026-09-01',
    },
    {
      id: 't-completed-early',
      title: 'Completed Past Task',
      dueDate: '2026-09-10',
      priority: 'Urgent',
      status: 'Completed',
      linkedEntity: { type: 'flip', name: 'Kloof' },
      createdAt: '2026-09-01',
    },
    {
      id: 't-overdue-high',
      title: 'Overdue High Task',
      dueDate: '2026-09-25',
      priority: 'High',
      status: 'Pending',
      linkedEntity: { type: 'rental', name: 'Sandhurst' },
      createdAt: '2026-09-01',
    },
    {
      id: 't-overdue-urgent',
      title: 'Overdue Urgent Task',
      dueDate: '2026-09-25',
      priority: 'Urgent',
      status: 'In Progress',
      linkedEntity: { type: 'flip', name: 'Kloof' },
      createdAt: '2026-09-01',
    },
  ];

  describe('isTaskOverdue', () => {
    it('identifies active tasks with dueDate < todayISO as overdue', () => {
      expect(isTaskOverdue(sampleTasks[2], '2026-10-30')).toBe(true);
      expect(isTaskOverdue(sampleTasks[3], '2026-10-30')).toBe(true);
    });

    it('never marks Completed tasks or tasks due today/future as overdue', () => {
      expect(isTaskOverdue(sampleTasks[1], '2026-10-30')).toBe(false);
      expect(isTaskOverdue(sampleTasks[0], '2026-10-30')).toBe(false);
      expect(isTaskOverdue(sampleTasks[2], '2026-09-25')).toBe(false);
    });
  });

  describe('sortTasksChronologically', () => {
    it('sorts active tasks by dueDate ascending, breaks ties by priority, and places Completed tasks at the bottom', () => {
      const sorted = sortTasksChronologically(sampleTasks);
      expect(sorted.map((t) => t.id)).toEqual([
        't-overdue-urgent', // 2026-09-25 Urgent
        't-overdue-high',   // 2026-09-25 High
        't-late-low',       // 2026-11-15 Low
        't-completed-early', // Completed at bottom
      ]);
    });
  });

  describe('buildCalendarMonthGrid', () => {
    it('builds a Monday-first 7-column grid for October 2026', () => {
      // Oct 1, 2026 is a Thursday -> 3 leading days (Mon Sep 28, Tue Sep 29, Wed Sep 30)
      const grid = buildCalendarMonthGrid(2026, 10);
      expect(grid.length % 7).toBe(0);
      expect(grid[0].dateISO).toBe('2026-09-28');
      expect(grid[0].isCurrentMonth).toBe(false);
      expect(grid[3].dateISO).toBe('2026-10-01');
      expect(grid[3].isCurrentMonth).toBe(true);
      // Oct 31, 2026 is a Saturday -> 1 trailing day (Sun Nov 1)
      expect(grid[grid.length - 1].dateISO).toBe('2026-11-01');
      expect(grid[grid.length - 1].isCurrentMonth).toBe(false);
    });
  });

  describe('projectRecurringGhostTasks', () => {
    const recurringTasks: TaskItem[] = [
      {
        id: 'task-weekly',
        title: 'Weekly Site Snagging',
        dueDate: '2026-10-06',
        priority: 'High',
        status: 'Pending',
        recurrence: 'Weekly',
        recurrenceEndDate: '2026-10-25',
        linkedEntity: { type: 'flip', name: 'Kloof Street' },
        createdAt: '2026-09-20',
      },
      {
        id: 'task-monthly',
        title: 'Monthly Coupon Payout',
        dueDate: '2026-10-15',
        priority: 'High',
        status: 'Pending',
        recurrence: 'Monthly',
        linkedEntity: { type: 'funding', name: 'Johan Meyer' },
        createdAt: '2026-09-12',
      },
    ];

    it('projects future weekly occurrences within range and respects recurrenceEndDate', () => {
      const ghosts = projectRecurringGhostTasks(recurringTasks, '2026-10-01', '2026-10-31');
      // Weekly from Oct 6 until Oct 25 -> Oct 13, Oct 20 (Oct 27 exceeds Oct 25)
      expect(ghosts.map((g) => g.dueDate)).toEqual(['2026-10-13', '2026-10-20']);
      expect(ghosts[0].isGhost).toBe(true);
    });

    it('projects future monthly occurrences into subsequent months', () => {
      const novGhosts = projectRecurringGhostTasks(recurringTasks, '2026-11-01', '2026-11-30');
      expect(novGhosts.map((g) => g.dueDate)).toEqual(['2026-11-15']);
      expect(novGhosts[0].title).toBe('Monthly Coupon Payout');
    });
  });
});
