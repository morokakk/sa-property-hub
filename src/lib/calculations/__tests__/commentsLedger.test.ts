import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildProjectCommentTaskId,
  buildTaskFromProjectComment,
  countOpenProjectComments,
  createProjectComment,
  filterProjectComments,
  getProjectCommentCounts,
  isDemoDevelopment,
  isValidProjectComment,
  maskDevelopmentForPublicDealRoom,
  mergeProjectComments,
  removeProjectComment,
  transitionProjectCommentStatus,
} from '@/lib/calculations/commentsLedger';
import { sanitizePersistedDevelopments } from '@/lib/store/hydrationHelpers';
import { INITIAL_DEVELOPMENTS, INITIAL_OPPORTUNITIES } from '@/lib/store/initialData';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';
import { ProjectComment } from '@/types';

describe('commentsLedger pure helpers', () => {
  const sampleComments: ProjectComment[] = [
    {
      id: 'c-1',
      authorName: 'K. Naidoo',
      authorRole: 'Quantity Surveyor (QS)',
      sectionTag: 'BOQ & Cost Stack',
      message: 'Verify raft foundation allowance against geotech report.',
      status: 'In Progress',
      createdAt: '2026-11-01T08:00:00.000Z',
    },
    {
      id: 'c-2',
      authorName: 'L. Mthembu',
      authorRole: 'Town Planner',
      sectionTag: 'Paper Rights & Approvals',
      message: 'SPLUMA Sec 42 conditions issued and cleared.',
      status: 'Resolved',
      createdAt: '2026-11-02T10:00:00.000Z',
      resolvedAt: '2026-11-03T14:00:00.000Z',
    },
    {
      id: 'c-3',
      authorName: 'T. Molefe',
      authorRole: 'Co-Developer / JV',
      sectionTag: 'Finance & Pre-Sales',
      message: 'Confirm Phase 1 retail price ceiling under bank threshold.',
      status: 'Pending',
      createdAt: '2026-11-05T12:00:00.000Z',
    },
  ];

  it('counts open items (Pending + In Progress) and returns safe zeros on empty/null input', () => {
    expect(countOpenProjectComments(null)).toBe(0);
    expect(countOpenProjectComments(undefined)).toBe(0);
    expect(countOpenProjectComments([])).toBe(0);
    expect(countOpenProjectComments(sampleComments)).toBe(2);
  });

  it('computes status summary counts across All, Pending, In Progress, and Resolved', () => {
    expect(getProjectCommentCounts(null)).toEqual({
      All: 0,
      Pending: 0,
      'In Progress': 0,
      Resolved: 0,
    });
    expect(getProjectCommentCounts(sampleComments)).toEqual({
      All: 3,
      Pending: 1,
      'In Progress': 1,
      Resolved: 1,
    });
  });

  it('filters comments without mutating input array and sorts newest-first', () => {
    const copyBefore = sampleComments.map((c) => c.id);
    const allSorted = filterProjectComments(sampleComments, 'All');
    expect(allSorted.map((c) => c.id)).toEqual(['c-3', 'c-2', 'c-1']);
    expect(sampleComments.map((c) => c.id)).toEqual(copyBefore);

    expect(filterProjectComments(sampleComments, 'Pending').map((c) => c.id)).toEqual(['c-3']);
    expect(filterProjectComments(sampleComments, 'In Progress').map((c) => c.id)).toEqual(['c-1']);
    expect(filterProjectComments(sampleComments, 'Resolved').map((c) => c.id)).toEqual(['c-2']);
    expect(filterProjectComments(undefined, 'All')).toEqual([]);
  });

  it('creates normalized comments with safe fallbacks and resolvedAt auto-stamp when Resolved', () => {
    const pending = createProjectComment(
      {
        id: 'custom-1',
        authorName: '  ',
        message: '  Check NHBRC certificate expiry  ',
      },
      '2026-11-10T09:00:00.000Z'
    );
    expect(pending).toEqual({
      id: 'custom-1',
      authorName: 'External Collaborator',
      authorRole: 'External Team',
      sectionTag: 'General',
      message: 'Check NHBRC certificate expiry',
      status: 'Pending',
      createdAt: '2026-11-10T09:00:00.000Z',
    });
    expect(pending.resolvedAt).toBeUndefined();

    const resolved = createProjectComment(
      {
        authorName: 'S. Pillay',
        authorRole: 'Architect / Engineer',
        sectionTag: 'Unit Schedule',
        message: 'SDP area schedule signed off.',
        status: 'Resolved',
      },
      '2026-11-10T11:30:00.000Z'
    );
    expect(resolved.resolvedAt).toBe('2026-11-10T11:30:00.000Z');
    expect(resolved.id.startsWith('comment-')).toBe(true);
  });

  it('transitions status through Pending -> In Progress -> Resolved and clears resolvedAt when reopened', () => {
    const step1 = transitionProjectCommentStatus(
      sampleComments,
      'c-3',
      'In Progress',
      '2026-11-06T08:00:00.000Z'
    );
    const updated1 = step1.find((c) => c.id === 'c-3')!;
    expect(updated1.status).toBe('In Progress');
    expect(updated1.resolvedAt).toBeUndefined();

    const step2 = transitionProjectCommentStatus(
      step1,
      'c-3',
      'Resolved',
      '2026-11-07T15:00:00.000Z'
    );
    const updated2 = step2.find((c) => c.id === 'c-3')!;
    expect(updated2.status).toBe('Resolved');
    expect(updated2.resolvedAt).toBe('2026-11-07T15:00:00.000Z');

    // Preserves original resolvedAt if already Resolved
    const step2Again = transitionProjectCommentStatus(
      step2,
      'c-3',
      'Resolved',
      '2026-11-09T12:00:00.000Z'
    );
    expect(step2Again.find((c) => c.id === 'c-3')?.resolvedAt).toBe('2026-11-07T15:00:00.000Z');

    // Reopening clears resolvedAt
    const reopened = transitionProjectCommentStatus(
      step2,
      'c-2',
      'Pending',
      '2026-11-08T10:00:00.000Z'
    );
    const reopenedCard = reopened.find((c) => c.id === 'c-2')!;
    expect(reopenedCard.status).toBe('Pending');
    expect(reopenedCard.resolvedAt).toBeUndefined();
  });

  it('removes comments immutably and builds deterministic development tasks', () => {
    const afterRemove = removeProjectComment(sampleComments, 'c-1');
    expect(afterRemove).toHaveLength(2);
    expect(sampleComments).toHaveLength(3);

    const task = buildTaskFromProjectComment(
      { id: 'dev-1', title: 'Ferndale 6-Unit Cluster Subdivision' },
      sampleComments[2],
      '2026-11-10'
    );
    expect(task.id).toBe(buildProjectCommentTaskId('dev-1', 'c-3'));
    expect(task.dueDate).toBe('2026-11-13');
    expect(task.priority).toBe('High');
    expect(task.linkedEntity).toEqual({
      type: 'development',
      id: 'dev-1',
      name: 'Ferndale 6-Unit Cluster Subdivision',
    });
    expect(task.title).toContain('[Finance & Pre-Sales] Co-Developer / JV:');

    const inProgressTask = buildTaskFromProjectComment(
      { id: 'dev-1', title: 'Ferndale 6-Unit Cluster Subdivision' },
      sampleComments[0],
      '2026-11-10'
    );
    expect(inProgressTask.priority).toBe('Medium');

    // Invalid todayIso falls back cleanly for both createdAt and dueDate
    const invalidDateTask = buildTaskFromProjectComment(
      { id: 'dev-1', title: 'Ferndale 6-Unit Cluster Subdivision' },
      sampleComments[2],
      'not-a-date'
    );
    expect(invalidDateTask.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(invalidDateTask.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('filters out malformed primitive/null/array entries safely in pure helpers and hydration', () => {
    const dirtyArray = [
      null,
      'invalid-string',
      123,
      ['nested-array'],
      { id: 'missing-message' },
      sampleComments[0],
    ] as unknown as ProjectComment[];

    expect(isValidProjectComment(sampleComments[0])).toBe(true);
    expect(isValidProjectComment('bad')).toBe(false);
    expect(isValidProjectComment(['nested'])).toBe(false);
    expect(countOpenProjectComments(dirtyArray)).toBe(1);
    expect(getProjectCommentCounts(dirtyArray)).toEqual({
      All: 1,
      Pending: 0,
      'In Progress': 1,
      Resolved: 0,
    });
    expect(filterProjectComments(dirtyArray, 'All')).toHaveLength(1);

    const sanitized = sanitizePersistedDevelopments([
      { id: 'dev-dirty', title: 'Dirty Dev', commentsLedger: dirtyArray },
    ]);
    expect(sanitized[0].commentsLedger).toHaveLength(1);
    expect(sanitized[0].commentsLedger![0].id).toBe('c-1');
  });
});

describe('Store collaboration ledger persistence, promotion, and task lifecycle', () => {
  beforeEach(() => {
    usePortfolioStore.setState({
      developments: structuredClone(INITIAL_DEVELOPMENTS),
      opportunities: structuredClone(INITIAL_OPPORTUNITIES),
      flips: [],
      tasks: [],
    });
  });

  it('seeds dev-1 with 3 realistic comments across In Progress, Resolved, and Pending (2 Open)', () => {
    const dev1 = usePortfolioStore.getState().developments.find((d) => d.id === 'dev-1')!;
    expect(dev1.commentsLedger).toHaveLength(3);
    expect(countOpenProjectComments(dev1.commentsLedger)).toBe(2);
    const statuses = dev1.commentsLedger!.map((c) => c.status).sort();
    expect(statuses).toEqual(['In Progress', 'Pending', 'Resolved']);
  });

  it('carries over commentsLedger across promoteOpportunityToDevelopment and promoteOpportunityToFlip, and regenerates IDs in duplicateOpportunity', () => {
    const baseOpp = usePortfolioStore.getState().opportunities[0];
    const seededComment: ProjectComment = {
      id: 'opp-orig-comment-1',
      authorName: 'D. Botha',
      authorRole: 'Quantity Surveyor (QS)',
      sectionTag: 'BOQ & Cost Stack',
      message: 'Check bulk services escalation.',
      status: 'Pending',
      createdAt: '2026-11-10T09:00:00.000Z',
    };

    usePortfolioStore.getState().updateOpportunity(baseOpp.id, {
      commentsLedger: [seededComment],
    });

    const countBeforeDup = usePortfolioStore.getState().opportunities.length;
    usePortfolioStore.getState().duplicateOpportunity(baseOpp.id);
    const oppsAfterDup = usePortfolioStore.getState().opportunities;
    expect(oppsAfterDup).toHaveLength(countBeforeDup + 1);
    const duplicatedOpp = oppsAfterDup[0];
    expect(duplicatedOpp.commentsLedger).toHaveLength(1);
    expect(duplicatedOpp.commentsLedger![0].id).not.toBe(seededComment.id);
    expect(duplicatedOpp.commentsLedger![0].message).toBe(seededComment.message);

    usePortfolioStore.getState().promoteOpportunityToDevelopment(baseOpp.id);
    const promotedDev = usePortfolioStore.getState().developments[0];
    expect(promotedDev.commentsLedger).toHaveLength(1);
    expect(promotedDev.commentsLedger![0].id).not.toBe(seededComment.id);
    expect(promotedDev.commentsLedger![0].message).toBe(seededComment.message);

    usePortfolioStore.getState().promoteOpportunityToFlip(baseOpp.id);
    const promotedFlip = usePortfolioStore.getState().flips[0];
    expect(promotedFlip.commentsLedger).toHaveLength(1);
    expect(promotedFlip.commentsLedger![0].id).not.toBe(seededComment.id);
    expect(promotedFlip.commentsLedger![0].message).toBe(seededComment.message);
  });

  it('deduplicates addTask by explicit comment task ID and cleans up synced comment tasks on deleteDevelopment', () => {
    const dev1 = usePortfolioStore.getState().developments.find((d) => d.id === 'dev-1')!;
    const pendingComment = dev1.commentsLedger!.find((c) => c.status === 'Pending')!;
    const task = buildTaskFromProjectComment(dev1, pendingComment, '2026-11-10');

    usePortfolioStore.getState().addTask(task);
    usePortfolioStore.getState().addTask(task);
    expect(usePortfolioStore.getState().tasks.filter((t) => t.id === task.id)).toHaveLength(1);

    usePortfolioStore.getState().deleteDevelopment('dev-1');
    expect(usePortfolioStore.getState().tasks.some((t) => t.id === task.id)).toBe(false);
  });

  it('masks unit buyerName & strips conveyancerRef/shareToken in maskDevelopmentForPublicDealRoom and merges comments deduplicating by id', () => {
    expect(isDemoDevelopment('dev-1')).toBe(true);
    expect(isDemoDevelopment('dev-2')).toBe(true);
    expect(isDemoDevelopment('demo-dev-9')).toBe(true);
    expect(isDemoDevelopment('custom-123')).toBe(false);

    const rawDev1 = structuredClone(INITIAL_DEVELOPMENTS[0]);
    rawDev1.shareToken = 'private-cap-token-xyz';
    const masked = maskDevelopmentForPublicDealRoom(rawDev1);

    expect(masked.shareToken).toBeUndefined();
    const soldUnits = masked.units.filter((u) => u.status === 'Sold & Transferred');
    expect(soldUnits.length).toBeGreaterThan(0);
    for (const u of soldUnits) {
      expect(u.buyerName).toBe('Private Buyer (Masked)');
      expect(u.conveyancerRef).toBeUndefined();
    }
    const availableUnits = masked.units.filter((u) => u.status === 'Available');
    for (const u of availableUnits) {
      expect(u.buyerName).toBeUndefined();
      expect(u.conveyancerRef).toBeUndefined();
    }

    // mergeProjectComments deduplicates by id and keeps existing status first
    const existing = [rawDev1.commentsLedger![0]];
    const incoming = [
      { ...rawDev1.commentsLedger![0], status: 'Pending' as const },
      {
        id: 'ext-new-1',
        authorName: 'External Engineer',
        authorRole: 'Architect / Engineer' as const,
        sectionTag: 'General' as const,
        message: 'Check foundation drainage.',
        status: 'Pending' as const,
        createdAt: '2026-11-10T12:00:00.000Z',
      },
    ];
    const merged = mergeProjectComments(existing, incoming);
    expect(merged).toHaveLength(2);
    expect(merged[0].status).toBe(rawDev1.commentsLedger![0].status);
    expect(merged[1].id).toBe('ext-new-1');
  });

  it('backfills seeded dev-1 commentsLedger in sanitizePersistedDevelopments only when undefined', () => {
    const legacyDev1 = { ...structuredClone(INITIAL_DEVELOPMENTS[0]) } as any;
    delete legacyDev1.commentsLedger;

    const backfilled = sanitizePersistedDevelopments([legacyDev1]);
    expect(backfilled[0].commentsLedger).toHaveLength(3);

    const emptied = sanitizePersistedDevelopments([{ ...legacyDev1, commentsLedger: [] }]);
    expect(emptied[0].commentsLedger).toEqual([]);
  });
});
