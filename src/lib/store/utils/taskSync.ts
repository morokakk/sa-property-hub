import { TaskItem, Lease } from '@/types';
import { parseDateParts } from '@/lib/calculations/arrears';

export function syncAgmReminderTask(
  tasks: TaskItem[],
  entityType: 'rental' | 'flip' | 'opportunity',
  entityId: string,
  entityTitle: string,
  agmDate?: string
): TaskItem[] {
  const existingIdx = tasks.findIndex(
    (t) =>
      t.id === `task-agm-${entityId}` ||
      (t.linkedEntity?.id === entityId && t.title.startsWith('Attend Body Corporate AGM'))
  );

  if (!agmDate) {
    if (existingIdx >= 0) {
      return tasks.filter((_, idx) => idx !== existingIdx);
    }
    return tasks;
  }

  const agmTime = new Date(agmDate).getTime();
  const reminderDate = isNaN(agmTime)
    ? agmDate
    : new Date(agmTime - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const agmTask: TaskItem = {
    id: `task-agm-${entityId}`,
    title: `Attend Body Corporate AGM & Review Budget: ${entityTitle}`,
    description: `Scheduled Body Corporate AGM on ${agmDate}. Review financials, trustee election, and proposed levy increases.`,
    dueDate: reminderDate,
    priority: 'High',
    status: 'Pending',
    linkedEntity: {
      type: entityType,
      id: entityId,
      name: entityTitle,
    },
    createdAt: new Date().toISOString().split('T')[0],
  };

  if (existingIdx >= 0) {
    const nextTasks = [...tasks];
    nextTasks[existingIdx] = { ...nextTasks[existingIdx], ...agmTask };
    return nextTasks;
  }

  return [agmTask, ...tasks];
}

export function syncLeaseExpiryTasks(
  tasks: TaskItem[],
  propertyId: string,
  propertyTitle: string,
  leases?: Lease[]
): TaskItem[] {
  let nextTasks = [...tasks];
  const today = new Date().toISOString().split('T')[0];

  const currentLeaseIds = new Set((leases || []).map((l) => l?.id).filter(Boolean));

  // Clean up any pending expiry tasks for this property that are no longer in active leases
  nextTasks = nextTasks.filter((t) => {
    if (t.id.startsWith('task-lease-expiry-') && t.linkedEntity?.id === propertyId && t.status === 'Pending') {
      const leaseIdFromTask = t.id.replace('task-lease-expiry-', '');
      if (!currentLeaseIds.has(leaseIdFromTask)) {
        return false;
      }
    }
    return true;
  });

  if (!leases || leases.length === 0) {
    return nextTasks;
  }

  for (const lease of leases) {
    if (!lease || !lease.id) continue;
    const taskId = `task-lease-expiry-${lease.id}`;
    const existingIdx = nextTasks.findIndex(
      (t) =>
        t.id === taskId ||
        (t.linkedEntity?.id === lease.id && t.title.startsWith('Lease Expiry:')) ||
        (t.linkedEntity?.id === propertyId && t.id === taskId)
    );

    const leaseEndParts = parseDateParts(lease.leaseEndDate);

    // If lease has no end date or is already expired (< today)
    if (!leaseEndParts || leaseEndParts.isoDate < today) {
      if (existingIdx >= 0 && nextTasks[existingIdx].status === 'Pending') {
        nextTasks.splice(existingIdx, 1);
      }
      continue;
    }

    // Reminder date 60 days prior to leaseEndDate
    const reminderDate = new Date(leaseEndParts.timestamp - 60 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    const dueDate = reminderDate > today ? reminderDate : today;

    const tenantName = lease.tenantName || 'Tenant';
    const unitPart = lease.unitName || 'Unit';
    const title = `Lease Expiry: ${tenantName} at ${propertyTitle} - ${unitPart}`;
    const description = `Lease expires on ${lease.leaseEndDate}. Initiate renewal discussions or begin marketing for a new tenant.`;

    if (existingIdx >= 0) {
      const existing = nextTasks[existingIdx];
      // If leaseEndDate changed, re-open task to Pending; otherwise preserve existing status (e.g., Completed)
      const dateChanged = existing.description ? !existing.description.includes(lease.leaseEndDate) : true;
      nextTasks[existingIdx] = {
        ...existing,
        id: taskId,
        title,
        description,
        dueDate,
        priority: 'High',
        status: dateChanged ? 'Pending' : existing.status,
        linkedEntity: {
          type: 'rental',
          id: propertyId,
          name: propertyTitle,
        },
      };
    } else {
      const newTask: TaskItem = {
        id: taskId,
        title,
        description,
        dueDate,
        priority: 'High',
        status: 'Pending',
        linkedEntity: {
          type: 'rental',
          id: propertyId,
          name: propertyTitle,
        },
        createdAt: today,
      };
      nextTasks = [newTask, ...nextTasks];
    }
  }

  return nextTasks;
}
