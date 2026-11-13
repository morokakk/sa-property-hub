import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  submitDevelopmentComment,
  getExternalDevelopmentComments,
} from '../submitDevelopmentComment';
import { INITIAL_DEVELOPMENTS } from '@/lib/store/initialData';

const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
const mockUpdate = vi.fn().mockReturnValue({
  eq: mockUpdateEq,
});

const cloudRowsByToken: Record<string, any[]> = {
  'cloud-share-token-abc': [
    {
      id: 'dev-cloud-shared-1',
      comments_ledger: [
        {
          id: 'existing-cloud-c-1',
          authorName: 'Architect Studio',
          authorRole: 'Architect / Engineer',
          sectionTag: 'General',
          message: 'Existing SDP note.',
          status: 'In Progress',
          createdAt: '2026-11-09T10:00:00.000Z',
        },
      ],
      share_token: 'cloud-share-token-abc',
    },
  ],
};

vi.mock('@supabase/supabase-js', () => {
  return {
    createClient: vi.fn(() => ({
      from: vi.fn((table: string) => {
        if (table === 'developments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn(async (col: string, val: string) => {
                if (col === 'share_token') {
                  return { data: cloudRowsByToken[val] || [], error: null };
                }
                if (col === 'id') {
                  const found = Object.values(cloudRowsByToken)
                    .flat()
                    .filter((r) => r.id === val);
                  return { data: found, error: null };
                }
                return { data: [], error: null };
              }),
            }),
            update: mockUpdate,
          };
        }
        return {};
      }),
    })),
  };
});

describe('submitDevelopmentComment & getExternalDevelopmentComments Server Actions', () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key-test';
  });

  it('rejects missing token, empty message, empty author name, and unknown capability tokens', async () => {
    const missingToken = await submitDevelopmentComment({
      token: '',
      authorName: 'K. Naidoo',
      message: 'Check raft slab thickness.',
    });
    expect(missingToken.success).toBe(false);

    const blankMsg = await submitDevelopmentComment({
      token: 'dev-1',
      authorName: 'K. Naidoo',
      message: '   ',
    });
    expect(blankMsg.success).toBe(false);

    const blankAuthor = await submitDevelopmentComment({
      token: 'dev-1',
      authorName: '  ',
      message: 'Valid note text',
    });
    expect(blankAuthor.success).toBe(false);

    const unknownToken = await submitDevelopmentComment({
      token: 'nonexistent-token-9999',
      authorName: 'External Reviewer',
      message: 'Trying unauthorized link',
    });
    expect(unknownToken.success).toBe(false);
    expect(unknownToken.error).toContain('Invalid or expired deal room link');
  });

  it('persists demo external comment without mutating INITIAL_DEVELOPMENTS and retrieves via getExternalDevelopmentComments', async () => {
    const initialDev1Count = INITIAL_DEVELOPMENTS[0].commentsLedger?.length || 0;

    const res = await submitDevelopmentComment({
      token: 'dev-1',
      authorName: '  Thabo Mokoena (QS)  ',
      authorRole: 'Quantity Surveyor (QS)',
      sectionTag: 'BOQ & Cost Stack',
      message: '  Confirm contingency cover for geotechnical rock excavation.  ',
    });

    expect(res.success).toBe(true);
    expect(res.comment).toBeDefined();
    expect(res.comment?.status).toBe('Pending');
    expect(res.comment?.authorName).toBe('Thabo Mokoena (QS)');
    expect(res.comment?.message).toBe('Confirm contingency cover for geotechnical rock excavation.');
    expect(res.comment?.resolvedAt).toBeUndefined();

    // Must never mutate stock INITIAL_DEVELOPMENTS singleton
    expect(INITIAL_DEVELOPMENTS[0].commentsLedger?.length || 0).toBe(initialDev1Count);

    const fetched = await getExternalDevelopmentComments({
      developmentId: 'dev-1',
      shareToken: 'dev-1',
    });
    expect(fetched.success).toBe(true);
    expect(fetched.comments.some((c) => c.id === res.comment?.id)).toBe(true);
  });

  it('persists cloud comment to Supabase developments.comments_ledger and forces Pending status', async () => {
    const res = await submitDevelopmentComment({
      token: 'cloud-share-token-abc',
      authorName: 'City Planner',
      authorRole: 'Town Planner',
      sectionTag: 'Paper Rights & Approvals',
      message: 'Bulk sewer clearance issued subject to boundary wall servitude.',
      // Attempting status override at runtime should be ignored
      ...({ status: 'Resolved' } as any),
    });

    expect(res.success).toBe(true);
    expect(res.comment?.status).toBe('Pending');
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    const updatePayload = mockUpdate.mock.calls[0][0];
    expect(Array.isArray(updatePayload.comments_ledger)).toBe(true);
    expect(updatePayload.comments_ledger.some((c: any) => c.status === 'Pending')).toBe(true);
    expect(mockUpdateEq).toHaveBeenCalledWith('share_token', 'cloud-share-token-abc');
  });

  it('never returns cloud ledger comments for a guessable development id without the share token', async () => {
    const byIdOnly = await getExternalDevelopmentComments({
      developmentId: 'dev-cloud-shared-1',
    });
    expect(byIdOnly.success).toBe(true);
    expect(byIdOnly.comments).toEqual([]);

    const byToken = await getExternalDevelopmentComments({
      developmentId: 'dev-cloud-shared-1',
      shareToken: 'cloud-share-token-abc',
    });
    expect(byToken.comments.some((c) => c.id === 'existing-cloud-c-1')).toBe(true);
  });

  it('enforces sliding-window rate limit after 3 submissions per token', async () => {
    // dev-2 used exclusively for rate-limit check in this suite
    for (let i = 1; i <= 3; i++) {
      const okRes = await submitDevelopmentComment({
        token: 'dev-2',
        authorName: `Reviewer ${i}`,
        message: `Review note #${i}`,
      });
      expect(okRes.success).toBe(true);
    }

    const fourthRes = await submitDevelopmentComment({
      token: 'dev-2',
      authorName: 'Reviewer 4',
      message: 'Should be rate-limited',
    });
    expect(fourthRes.success).toBe(false);
    expect(fourthRes.error).toContain('Too many team notes submitted recently');
  });

  it('sanitizes oversized strings cleanly', async () => {
    const longAuthor = 'A'.repeat(200);
    const longMsg = 'M'.repeat(1500);
    cloudRowsByToken['cloud-trunc-token'] = [
      { id: 'dev-trunc', comments_ledger: [], share_token: 'cloud-trunc-token' },
    ];

    const res = await submitDevelopmentComment({
      token: 'cloud-trunc-token',
      authorName: longAuthor,
      message: longMsg,
    });

    expect(res.success).toBe(true);
    expect(res.comment?.authorName.length).toBe(100);
    expect(res.comment?.message.length).toBe(1000);

    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalKey;
  });
});
