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
  __resetAutoCloudSyncForTests,
  SYNC_DEBOUNCE_MS,
  startPortfolioMutationListener,
} from '../useAutoCloudSync';
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
});
