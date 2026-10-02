import { describe, it, expect } from 'vitest';
import {
  calculateNextDueDate,
  shouldSpawnNextRecurringTask,
  createNextRecurringTask,
  handleTaskCompletionRecurrence,
  daysInMonth,
} from '../recurrence';
import { TaskItem } from '@/types';

describe('Recurrence Calculations Engine', () => {
  describe('daysInMonth', () => {
    it('calculates correct days in regular and leap year months', () => {
      expect(daysInMonth(2026, 1)).toBe(31);
      expect(daysInMonth(2026, 2)).toBe(28); // 2026 non-leap
      expect(daysInMonth(2028, 2)).toBe(29); // 2028 leap year
      expect(daysInMonth(2026, 4)).toBe(30);
    });
  });

  describe('calculateNextDueDate', () => {
    it('calculates weekly recurrence accurately across month and year boundaries', () => {
      expect(calculateNextDueDate('2026-10-01', 'Weekly')).toBe('2026-10-08');
      expect(calculateNextDueDate('2026-10-28', 'Weekly')).toBe('2026-11-04');
      expect(calculateNextDueDate('2026-12-28', 'Weekly')).toBe('2027-01-04');
    });

    it('calculates monthly recurrence and clamps end-of-month dates properly', () => {
      expect(calculateNextDueDate('2026-01-15', 'Monthly')).toBe('2026-02-15');
      // Jan 31 -> Feb 28 in non-leap year
      expect(calculateNextDueDate('2026-01-31', 'Monthly')).toBe('2026-02-28');
      // Jan 31 -> Feb 29 in leap year 2028
      expect(calculateNextDueDate('2028-01-31', 'Monthly')).toBe('2028-02-29');
      // Aug 31 -> Sep 30
      expect(calculateNextDueDate('2026-08-31', 'Monthly')).toBe('2026-09-30');
      // Across year boundary Dec -> Jan
      expect(calculateNextDueDate('2026-12-15', 'Monthly')).toBe('2027-01-15');
      expect(calculateNextDueDate('2026-12-31', 'Monthly')).toBe('2027-01-31');
    });

    it('calculates quarterly recurrence (every 3 months) correctly', () => {
      expect(calculateNextDueDate('2026-01-15', 'Quarterly')).toBe('2026-04-15');
      expect(calculateNextDueDate('2026-08-31', 'Quarterly')).toBe('2026-11-30');
      // Across year boundary Nov -> Feb
      expect(calculateNextDueDate('2026-11-15', 'Quarterly')).toBe('2027-02-15');
    });

    it('calculates annual recurrence correctly including leap year adjustment', () => {
      expect(calculateNextDueDate('2026-06-01', 'Annually')).toBe('2027-06-01');
      // Leap day Feb 29 in 2024 -> Feb 28 in 2025
      expect(calculateNextDueDate('2024-02-29', 'Annually')).toBe('2025-02-28');
    });

    it('returns null for None or invalid inputs', () => {
      expect(calculateNextDueDate('2026-10-01', 'None')).toBeNull();
      expect(calculateNextDueDate('invalid-date', 'Monthly')).toBeNull();
    });
  });

  describe('shouldSpawnNextRecurringTask', () => {
    const baseTask: TaskItem = {
      id: 'task-1',
      title: 'Inspect Roof & Gutters',
      dueDate: '2026-10-01',
      priority: 'Medium',
      status: 'Pending',
      linkedEntity: { type: 'rental', name: 'Sandton Suite' },
      createdAt: '2026-10-01',
      recurrence: 'Monthly',
    };

    it('returns true when recurring indefinitely', () => {
      expect(shouldSpawnNextRecurringTask(baseTask, '2026-11-01')).toBe(true);
    });

    it('returns false when task is not recurring', () => {
      expect(shouldSpawnNextRecurringTask({ ...baseTask, recurrence: 'None' }, '2026-11-01')).toBe(false);
      expect(shouldSpawnNextRecurringTask({ ...baseTask, recurrence: undefined }, '2026-11-01')).toBe(false);
    });

    it('respects recurrenceEndDate cutoff', () => {
      const taskWithEnd: TaskItem = {
        ...baseTask,
        recurrenceEndDate: '2026-12-01',
      };

      // Before or on end date
      expect(shouldSpawnNextRecurringTask(taskWithEnd, '2026-11-01')).toBe(true);
      expect(shouldSpawnNextRecurringTask(taskWithEnd, '2026-12-01')).toBe(true);
      // Beyond end date
      expect(shouldSpawnNextRecurringTask(taskWithEnd, '2027-01-01')).toBe(false);
    });
  });

  describe('createNextRecurringTask and handleTaskCompletionRecurrence', () => {
    const originalTask: TaskItem = {
      id: 'task-100',
      title: 'Monthly Body Corporate Levy Reconciliation',
      dueDate: '2026-10-01',
      priority: 'High',
      status: 'Pending',
      linkedEntity: { type: 'rental', name: 'Sandton Suite' },
      createdAt: '2026-10-01',
      recurrence: 'Monthly',
      recurrenceGroupId: 'series-levy-100',
    };

    it('creates the next recurring task with status Pending and updated dueDate', () => {
      const nextTask = createNextRecurringTask(originalTask, '2026-11-01');
      expect(nextTask.status).toBe('Pending');
      expect(nextTask.dueDate).toBe('2026-11-01');
      expect(nextTask.title).toBe(originalTask.title);
      expect(nextTask.recurrenceGroupId).toBe(originalTask.recurrenceGroupId);
      expect(nextTask.id).not.toBe(originalTask.id);
    });

    it('deduplicates when next task already exists in existing tasks list', () => {
      const existingNextTask: TaskItem = {
        ...originalTask,
        id: 'task-101',
        dueDate: '2026-11-01',
      };

      const result = handleTaskCompletionRecurrence(originalTask, [originalTask, existingNextTask]);
      expect(result).toBeNull();
    });

    it('spawns next task when no existing next task is present', () => {
      const result = handleTaskCompletionRecurrence(originalTask, [originalTask]);
      expect(result).not.toBeNull();
      expect(result?.dueDate).toBe('2026-11-01');
      expect(result?.status).toBe('Pending');
    });
  });
});
