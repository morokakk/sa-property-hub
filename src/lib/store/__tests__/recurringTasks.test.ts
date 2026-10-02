import { describe, it, expect, beforeEach } from 'vitest';
import { usePortfolioStore } from '../usePortfolioStore';

describe('usePortfolioStore Recurring Tasks Engine', () => {
  beforeEach(() => {
    usePortfolioStore.getState().clearAllData();
  });

  it('adds a recurring task and sets default recurrenceGroupId', () => {
    usePortfolioStore.getState().addTask({
      title: 'Weekly Contractor Site Inspection',
      dueDate: '2026-10-05',
      priority: 'High',
      status: 'Pending',
      recurrence: 'Weekly',
      linkedEntity: { type: 'flip', name: 'Bryanston Flip Project' },
    });

    const tasks = usePortfolioStore.getState().tasks;
    expect(tasks).toHaveLength(1);
    expect(tasks[0].recurrence).toBe('Weekly');
    expect(tasks[0].recurrenceGroupId).toBeDefined();
    expect(tasks[0].recurrenceGroupId).toMatch(/^series-task-/);
  });

  it('completing a recurring task creates the next cycle instance and preserves completed task', () => {
    usePortfolioStore.getState().addTask({
      title: 'Review Municipal Rates Statement',
      dueDate: '2026-10-01',
      priority: 'Urgent',
      status: 'Pending',
      recurrence: 'Monthly',
      linkedEntity: { type: 'rental', name: 'Parkhurst House' },
    });

    const initialTasks = usePortfolioStore.getState().tasks;
    const originalTaskId = initialTasks[0].id;

    // Toggle to completed
    usePortfolioStore.getState().toggleTaskStatus(originalTaskId);

    const updatedTasks = usePortfolioStore.getState().tasks;
    expect(updatedTasks).toHaveLength(2);

    const completedTask = updatedTasks.find((t) => t.id === originalTaskId);
    expect(completedTask?.status).toBe('Completed');
    expect(completedTask?.dueDate).toBe('2026-10-01');

    const nextTask = updatedTasks.find((t) => t.id !== originalTaskId);
    expect(nextTask?.status).toBe('Pending');
    expect(nextTask?.dueDate).toBe('2026-11-01');
    expect(nextTask?.title).toBe('Review Municipal Rates Statement');
    expect(nextTask?.recurrence).toBe('Monthly');
    expect(nextTask?.recurrenceGroupId).toBe(completedTask?.recurrenceGroupId);
  });

  it('does not duplicate next recurring task if user unchecks and re-checks completed task', () => {
    usePortfolioStore.getState().addTask({
      title: 'Quarterly Body Corporate Trustee Review',
      dueDate: '2026-10-15',
      priority: 'Medium',
      status: 'Pending',
      recurrence: 'Quarterly',
      linkedEntity: { type: 'rental', name: 'Sandton Executive Suite' },
    });

    const taskId = usePortfolioStore.getState().tasks[0].id;

    // Complete task -> spawns 2027-01-15
    usePortfolioStore.getState().toggleTaskStatus(taskId);
    expect(usePortfolioStore.getState().tasks).toHaveLength(2);

    // Reopen task (toggle back to Pending)
    usePortfolioStore.getState().toggleTaskStatus(taskId);
    expect(usePortfolioStore.getState().tasks).toHaveLength(2);

    // Re-complete task -> should NOT duplicate the 2027-01-15 task
    usePortfolioStore.getState().toggleTaskStatus(taskId);
    expect(usePortfolioStore.getState().tasks).toHaveLength(2);
  });

  it('stops recurring once next dueDate exceeds recurrenceEndDate', () => {
    usePortfolioStore.getState().addTask({
      title: 'Limited 3-Month Snagging Follow-up',
      dueDate: '2026-10-01',
      priority: 'Low',
      status: 'Pending',
      recurrence: 'Monthly',
      recurrenceEndDate: '2026-10-15', // End date is before next month (2026-11-01)
      linkedEntity: { type: 'flip', name: 'Bryanston Flip' },
    });

    const taskId = usePortfolioStore.getState().tasks[0].id;
    usePortfolioStore.getState().toggleTaskStatus(taskId);

    const tasks = usePortfolioStore.getState().tasks;
    // No new task should be spawned since 2026-11-01 > 2026-10-15
    expect(tasks).toHaveLength(1);
    expect(tasks[0].status).toBe('Completed');
  });

  it('updateTask with status Completed spawns next recurring task', () => {
    usePortfolioStore.getState().addTask({
      title: 'Annual Building Insurance Renewal',
      dueDate: '2026-05-01',
      priority: 'High',
      status: 'Pending',
      recurrence: 'Annually',
      linkedEntity: { type: 'rental', name: 'Camps Bay Villa' },
    });

    const taskId = usePortfolioStore.getState().tasks[0].id;
    usePortfolioStore.getState().updateTask(taskId, { status: 'Completed' });

    const tasks = usePortfolioStore.getState().tasks;
    expect(tasks).toHaveLength(2);

    const nextTask = tasks.find((t) => t.id !== taskId);
    expect(nextTask?.status).toBe('Pending');
    expect(nextTask?.dueDate).toBe('2027-05-01');
    expect(nextTask?.recurrence).toBe('Annually');
  });

  it('one-off tasks do not spawn subsequent tasks upon completion', () => {
    usePortfolioStore.getState().addTask({
      title: 'Single conveyancing attorney call',
      dueDate: '2026-10-02',
      priority: 'High',
      status: 'Pending',
      recurrence: 'None',
      linkedEntity: { type: 'general', name: 'General' },
    });

    const taskId = usePortfolioStore.getState().tasks[0].id;
    usePortfolioStore.getState().toggleTaskStatus(taskId);

    const tasks = usePortfolioStore.getState().tasks;
    expect(tasks).toHaveLength(1);
    expect(tasks[0].status).toBe('Completed');
  });
});
