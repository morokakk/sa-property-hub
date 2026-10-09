import { StateCreator } from 'zustand';
import { TaskItem, TaskStatus } from '@/types';
import { RootStoreState, TaskSlice } from '../types';
import { INITIAL_TASKS } from '../initialData';
import { handleTaskCompletionRecurrence } from '@/lib/calculations/recurrence';

export const createTaskSlice: StateCreator<
  RootStoreState,
  [['zustand/persist', unknown]],
  [],
  TaskSlice
> = (set) => ({
  tasks: INITIAL_TASKS,

  addTask: (task) =>
    set((state) => {
      const taskId = `task-${Date.now()}`;
      const isRecurring = task.recurrence && task.recurrence !== 'None';
      const recurrenceGroupId = task.recurrenceGroupId || (isRecurring ? `series-${taskId}` : undefined);
      return {
        tasks: [
          {
            ...task,
            id: taskId,
            recurrenceGroupId,
            createdAt: new Date().toISOString(),
          },
          ...state.tasks,
        ],
      };
    }),

  toggleTaskStatus: (taskId) =>
    set((state) => {
      const targetTask = state.tasks.find((t) => t.id === taskId);
      if (!targetTask) return state;

      const willBeCompleted = targetTask.status !== 'Completed';
      let spawnedTask: TaskItem | null = null;

      if (willBeCompleted) {
        spawnedTask = handleTaskCompletionRecurrence(targetTask, state.tasks);
      }

      const updatedTasks = state.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const nextStatus: TaskStatus = willBeCompleted ? 'Completed' : 'Pending';
        return {
          ...t,
          status: nextStatus,
          recurrenceGroupId:
            t.recurrenceGroupId ||
            (t.recurrence && t.recurrence !== 'None' ? `series-${t.id}` : undefined),
        };
      });

      return {
        tasks: spawnedTask ? [spawnedTask, ...updatedTasks] : updatedTasks,
      };
    }),

  updateTask: (taskId, updates) =>
    set((state) => {
      const targetTask = state.tasks.find((t) => t.id === taskId);
      if (!targetTask) return state;

      const willBeCompleted =
        updates.status === 'Completed' && targetTask.status !== 'Completed';
      let spawnedTask: TaskItem | null = null;

      if (willBeCompleted) {
        const merged = { ...targetTask, ...updates };
        spawnedTask = handleTaskCompletionRecurrence(merged, state.tasks);
      }

      const updatedTasks = state.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const updated = { ...t, ...updates };
        if (
          updated.recurrence &&
          updated.recurrence !== 'None' &&
          !updated.recurrenceGroupId
        ) {
          updated.recurrenceGroupId = `series-${t.id}`;
        }
        return updated;
      });

      return {
        tasks: spawnedTask ? [spawnedTask, ...updatedTasks] : updatedTasks,
      };
    }),

  deleteTask: (taskId) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== taskId),
    })),
});
