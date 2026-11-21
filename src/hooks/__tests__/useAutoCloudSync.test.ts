import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  useCloudSyncStore,
  hydrateNow,
  pushNow,
  schedulePush,
  retrySync,
  markSignedOut,
  cancelPendingPush,
  isHydratingFromCloud,
  isPushing,
  __resetAutoCloudSyncForTests,
  SYNC_DEBOUNCE_MS,
  VISIBILITY_HYDRATE_STALE_MS,
  startPortfolioMutationListener,
  startMultiTabSyncListeners,
} from '../useAutoCloudSync';
import { PORTFOLIO_STORAGE_KEY } from '@/lib/store/persistence/portfolioMigrations';
import { hydrateFromCloud } from '@/lib/db/hydrateFromCloud';
import { migrateToCloud } from '@/lib/db/migrateToCloud';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  },
}));

vi.mock('@/lib/db/hydrateFromCloud', () => ({
  hydrateFromCloud: vi.fn(),
}));

vi.mock('@/lib/db/migrateToCloud', () => ({
  migrateToCloud: vi.fn(),
}));

describe('useAutoCloudSync & useCloudSyncStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    __resetAutoCloudSyncForTests();
  });

  afterEach(() => {
    cancelPendingPush();
    vi.useRealTimers();
  });

  it('initializes in local_only status', () => {
    const state = useCloudSyncStore.getState();
    expect(state.status).toBe('local_only');
    expect(state.isAuthenticated).toBe(false);
    expect(state.lastSyncedAt).toBeNull();
  });

  it('hydrates from cloud and sets synced status with lastSyncedAt timestamp', async () => {
    vi.mocked(hydrateFromCloud).mockResolvedValueOnce({
      success: true,
      hydrated: true,
    });

    await hydrateNow();

    const state = useCloudSyncStore.getState();
    expect(state.status).toBe('synced');
    expect(state.isAuthenticated).toBe(true);
    expect(state.lastSyncedAt).not.toBeNull();
    expect(state.error).toBeNull();
    expect(isHydratingFromCloud.current).toBe(false);
  });

  it('transitions to error status if cloud hydration fails', async () => {
    vi.mocked(hydrateFromCloud).mockResolvedValueOnce({
      success: false,
      hydrated: false,
      error: 'Network timeout',
    });

    await hydrateNow();

    const state = useCloudSyncStore.getState();
    expect(state.status).toBe('error');
    expect(state.error).toBe('Network timeout');
  });

  it('debounces outbound migrateToCloud by 1500ms after user mutation', async () => {
    // 1. Initial hydration to authenticate and mark hydrated
    vi.mocked(hydrateFromCloud).mockResolvedValueOnce({
      success: true,
      hydrated: true,
    });
    await hydrateNow();

    vi.mocked(migrateToCloud).mockResolvedValueOnce({
      success: true,
      counts: {
        profile: 1,
        properties: 1,
        flips: 0,
        developments: 0,
        boqItems: 0,
        fundingSources: 0,
        opportunities: 0,
        tasks: 0,
        suppliers: 0,
      },
    });

    // 2. Schedule push
    schedulePush();
    expect(migrateToCloud).not.toHaveBeenCalled();

    // Advance by 1000ms - should not have fired yet
    vi.advanceTimersByTime(1000);
    expect(migrateToCloud).not.toHaveBeenCalled();

    // Advance the remaining 500ms (total 1500ms)
    await vi.advanceTimersByTimeAsync(500);
    expect(migrateToCloud).toHaveBeenCalledTimes(1);

    const state = useCloudSyncStore.getState();
    expect(state.status).toBe('synced');
  });

  it('prevents outbound push when isHydratingFromCloud is true', async () => {
    useCloudSyncStore.setState({ isAuthenticated: true });
    isHydratingFromCloud.current = true;

    schedulePush();
    vi.advanceTimersByTime(SYNC_DEBOUNCE_MS + 200);

    expect(migrateToCloud).not.toHaveBeenCalled();
    isHydratingFromCloud.current = false;
  });

  it('allows retrySync() when a push fails', async () => {
    vi.mocked(hydrateFromCloud).mockResolvedValueOnce({ success: true, hydrated: true });
    await hydrateNow();

    vi.mocked(migrateToCloud).mockResolvedValueOnce({
      success: false,
      counts: {} as any,
      error: 'Server unavailable',
    });

    await pushNow();
    expect(useCloudSyncStore.getState().status).toBe('error');

    // Retry push
    vi.mocked(migrateToCloud).mockResolvedValueOnce({
      success: true,
      counts: { profile: 1 } as any,
    });

    await retrySync();
    expect(useCloudSyncStore.getState().status).toBe('synced');
    expect(useCloudSyncStore.getState().error).toBeNull();
  });

  it('resets to local_only when markSignedOut is called', () => {
    useCloudSyncStore.setState({
      status: 'synced',
      isAuthenticated: true,
      lastSyncedAt: '2026-11-01T10:00:00Z',
    });

    markSignedOut();

    const state = useCloudSyncStore.getState();
    expect(state.status).toBe('local_only');
    expect(state.isAuthenticated).toBe(false);
    expect(state.lastSyncedAt).toBeNull();
  });

  it('coalesces overlapping pushNow() calls via single-flight mutex into at most 1 trailing push', async () => {
    vi.mocked(hydrateFromCloud).mockResolvedValueOnce({ success: true, hydrated: true });
    await hydrateNow();

    let resolveFirstPush!: (value: any) => void;
    const firstPushPromise = new Promise((resolve) => {
      resolveFirstPush = resolve;
    });

    vi.mocked(migrateToCloud)
      .mockImplementationOnce(() => firstPushPromise as any)
      .mockResolvedValueOnce({ success: true, counts: { profile: 1 } as any });

    const p1 = pushNow();
    expect(isPushing.current).toBe(true);
    expect(migrateToCloud).toHaveBeenCalledTimes(1);

    // Overlapping pushes while p1 is still in flight
    await pushNow();
    await pushNow();
    expect(migrateToCloud).toHaveBeenCalledTimes(1);

    resolveFirstPush({ success: true, counts: { profile: 1 } });
    await p1;

    expect(migrateToCloud).toHaveBeenCalledTimes(2);
    expect(isPushing.current).toBe(false);
    expect(useCloudSyncStore.getState().status).toBe('synced');
  });

  it('rehydrates on cross-tab storage events and only hydrates on visibilitychange after 30s idle', async () => {
    vi.mocked(hydrateFromCloud).mockResolvedValue({ success: true, hydrated: true });
    await hydrateNow();
    vi.mocked(hydrateFromCloud).mockClear();

    const windowListeners: Record<string, (e: any) => void> = {};
    const docListeners: Record<string, () => void> = {};
    const mockDoc = {
      visibilityState: 'visible',
      addEventListener: vi.fn((evt: string, fn: () => void) => {
        docListeners[evt] = fn;
      }),
      removeEventListener: vi.fn((evt: string) => {
        delete docListeners[evt];
      }),
    };

    vi.stubGlobal('window', {
      addEventListener: vi.fn((evt: string, fn: (e: any) => void) => {
        windowListeners[evt] = fn;
      }),
      removeEventListener: vi.fn((evt: string) => {
        delete windowListeners[evt];
      }),
    });
    vi.stubGlobal('document', mockDoc);

    const rehydrateSpy = vi
      .spyOn(usePortfolioStore.persist, 'rehydrate')
      .mockResolvedValue(undefined);

    const cleanup = startMultiTabSyncListeners();

    try {
      // Unrelated storage key ignored
      windowListeners.storage({ key: 'unrelated_key' });
      expect(rehydrateSpy).not.toHaveBeenCalled();

      // Portfolio storage key triggers rehydrate when idle
      windowListeners.storage({ key: PORTFOLIO_STORAGE_KEY });
      expect(rehydrateSpy).toHaveBeenCalledTimes(1);

      // Skips rehydrate while pushing
      isPushing.current = true;
      windowListeners.storage({ key: PORTFOLIO_STORAGE_KEY });
      expect(rehydrateSpy).toHaveBeenCalledTimes(1);
      isPushing.current = false;

      // Short tab switch (< 30s) does NOT hydrate
      mockDoc.visibilityState = 'hidden';
      docListeners.visibilitychange();
      vi.advanceTimersByTime(10_000);
      mockDoc.visibilityState = 'visible';
      docListeners.visibilitychange();
      expect(hydrateFromCloud).not.toHaveBeenCalled();

      // Pending debounce timer blocks visibility hydration
      mockDoc.visibilityState = 'hidden';
      docListeners.visibilitychange();
      vi.advanceTimersByTime(VISIBILITY_HYDRATE_STALE_MS);
      schedulePush();
      mockDoc.visibilityState = 'visible';
      docListeners.visibilitychange();
      expect(hydrateFromCloud).not.toHaveBeenCalled();
      cancelPendingPush();

      // Stale tab switch (>= 30s) when idle hydrates
      mockDoc.visibilityState = 'hidden';
      docListeners.visibilitychange();
      vi.advanceTimersByTime(VISIBILITY_HYDRATE_STALE_MS);
      mockDoc.visibilityState = 'visible';
      docListeners.visibilitychange();
      expect(hydrateFromCloud).toHaveBeenCalledTimes(1);
    } finally {
      cleanup();
      rehydrateSpy.mockRestore();
      vi.unstubAllGlobals();
    }
  });
});
