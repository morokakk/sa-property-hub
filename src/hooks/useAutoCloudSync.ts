'use client';

import { useEffect } from 'react';
import { create } from 'zustand';
import { supabase } from '@/lib/supabaseClient';
import { hydrateFromCloud } from '@/lib/db/hydrateFromCloud';
import { migrateToCloud } from '@/lib/db/migrateToCloud';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';
import type { RootStoreState } from '@/lib/store/types';
import {
  resetAnalyticsSession,
  syncAnalyticsStorageMode,
  trackPrivacySafeEvent,
  captureSanitizedError,
  identifyAnalyticsUser,
} from '@/lib/analytics/posthogClient';

export type CloudSyncStatus = 'local_only' | 'syncing' | 'synced' | 'error';

export interface CloudSyncState {
  status: CloudSyncStatus;
  lastSyncedAt: string | null;
  error: string | null;
  isAuthenticated: boolean;
}

export const SYNC_DEBOUNCE_MS = 1500;

/** Persisted portfolio slices whose mutation triggers an outbound push. */
export const SYNCED_SLICE_KEYS = [
  'rentals',
  'flips',
  'developments',
  'opportunities',
  'funding',
  'suppliers',
  'tasks',
  'liquidCapitalReserve',
  'investorProfile',
  'rentalForecastView',
  'aiSettings',
  'analyzerDraft',
] as const satisfies readonly (keyof RootStoreState)[];

/** Shared (non-persisted) sync status consumed by the TopHeader pill. */
export const useCloudSyncStore = create<CloudSyncState>(() => ({
  status: 'local_only',
  lastSyncedAt: null,
  error: null,
  isAuthenticated: false,
}));

// Module-level singletons: one listener / one debounce timer globally.
export const isHydratingFromCloud = { current: false };
let hasHydratedThisSession = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let lastFailedOp: 'hydrate' | 'push' | null = null;

function setSync(patch: Partial<CloudSyncState>) {
  useCloudSyncStore.setState(patch);
}

function recordSyncedNow() {
  const ts = new Date().toISOString();
  lastFailedOp = null;
  setSync({ status: 'synced', lastSyncedAt: ts, error: null });
}

export function cancelPendingPush() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}

/** Inbound: pull cloud portfolio into Zustand without triggering an outbound push. */
export async function hydrateNow(): Promise<void> {
  cancelPendingPush();
  setSync({ isAuthenticated: true, status: 'syncing', error: null });
  isHydratingFromCloud.current = true;
  try {
    const res = await hydrateFromCloud();
    if (res.success) {
      hasHydratedThisSession = true;
      recordSyncedNow();
      syncAnalyticsStorageMode('cloud_synced');
      trackPrivacySafeEvent('cloud_sync_triggered', { status: 'synced' });
    } else if (res.error === 'NO_AUTH') {
      hasHydratedThisSession = false;
      setSync({ isAuthenticated: false, status: 'local_only', error: null });
      syncAnalyticsStorageMode('local_only');
    } else {
      lastFailedOp = 'hydrate';
      setSync({ status: 'error', error: res.error || 'Cloud hydration failed' });
      trackPrivacySafeEvent('cloud_sync_triggered', { status: 'error' });
      captureSanitizedError('CLOUD_HYDRATE_FAILED', { operation: 'hydrate' });
    }
  } catch (err: any) {
    lastFailedOp = 'hydrate';
    setSync({ status: 'error', error: err?.message || 'Cloud hydration failed' });
    trackPrivacySafeEvent('cloud_sync_triggered', { status: 'error' });
    captureSanitizedError('CLOUD_HYDRATE_EXCEPTION', { operation: 'hydrate' });
  } finally {
    isHydratingFromCloud.current = false;
  }
}

/** Outbound: push current portfolio state to Supabase immediately. */
export async function pushNow(): Promise<void> {
  cancelPendingPush();
  const { isAuthenticated } = useCloudSyncStore.getState();
  if (!isAuthenticated || !hasHydratedThisSession) return;
  setSync({ status: 'syncing', error: null });
  try {
    const res = await migrateToCloud({ state: usePortfolioStore.getState() });
    if (res.success) {
      recordSyncedNow();
      syncAnalyticsStorageMode('cloud_synced');
      trackPrivacySafeEvent('cloud_sync_triggered', { status: 'synced' });
    } else if (res.error === 'NO_AUTH') {
      setSync({ isAuthenticated: false, status: 'local_only', error: null });
      syncAnalyticsStorageMode('local_only');
    } else {
      lastFailedOp = 'push';
      setSync({ status: 'error', error: res.error || 'Cloud sync failed' });
      trackPrivacySafeEvent('cloud_sync_triggered', { status: 'error' });
      captureSanitizedError('CLOUD_SYNC_FAILED', { operation: 'push' });
    }
  } catch (err: any) {
    lastFailedOp = 'push';
    setSync({ status: 'error', error: err?.message || 'Cloud sync failed' });
    trackPrivacySafeEvent('cloud_sync_triggered', { status: 'error' });
    captureSanitizedError('CLOUD_SYNC_EXCEPTION', { operation: 'push' });
  }
}

/** Debounced outbound push (1500ms). */
export function schedulePush() {
  const { isAuthenticated } = useCloudSyncStore.getState();
  if (!isAuthenticated || !hasHydratedThisSession || isHydratingFromCloud.current) return;
  cancelPendingPush();
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void pushNow();
  }, SYNC_DEBOUNCE_MS);
}

/** Retries whichever operation failed last (hydration is retried before any push). */
export async function retrySync(): Promise<void> {
  if (lastFailedOp === 'hydrate' || !hasHydratedThisSession) {
    await hydrateNow();
  } else {
    await pushNow();
  }
}

export function markSignedOut() {
  cancelPendingPush();
  hasHydratedThisSession = false;
  lastFailedOp = null;
  setSync({ isAuthenticated: false, status: 'local_only', error: null, lastSyncedAt: null });
}

/** Subscribes to portfolio data slice mutations; returns unsubscribe. */
export function startPortfolioMutationListener(): () => void {
  return usePortfolioStore.subscribe((state, prev) => {
    if (isHydratingFromCloud.current) return;
    const changed = SYNCED_SLICE_KEYS.some((k) => state[k] !== prev[k]);
    if (changed) schedulePush();
  });
}

/** Test helper: reset module singletons. */
export function __resetAutoCloudSyncForTests() {
  cancelPendingPush();
  isHydratingFromCloud.current = false;
  hasHydratedThisSession = false;
  lastFailedOp = null;
  useCloudSyncStore.setState({ status: 'local_only', lastSyncedAt: null, error: null, isAuthenticated: false });
}

/**
 * Global automatic cross-device cloud sync. Mount exactly once (AuthHydrator).
 * - INITIAL_SESSION / SIGNED_IN: hydrate Zustand from Supabase, record lastSyncedAt.
 * - Portfolio mutations (when authenticated): debounced 1500ms migrateToCloud.
 * - SIGNED_OUT: reset to demo data and clear sync keys (DBSYNC-02 contamination guard).
 */
export function useAutoCloudSync() {
  // 1. Outbound mutation listener
  useEffect(() => {
    const unsubscribe = startPortfolioMutationListener();
    return () => {
      unsubscribe();
      cancelPendingPush();
    };
  }, []);

  // 2. Auth lifecycle (kept last so its cleanup is the final effect cleanup)
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        markSignedOut();
        resetAnalyticsSession();
        syncAnalyticsStorageMode('local_only');
        try {
          usePortfolioStore.getState().resetToDemoData();
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('last_sync_user_id');
            localStorage.removeItem('cloud_sync_completed');
            localStorage.removeItem('cloud_sync_timestamp');
          }
        } catch (err) {
          console.error('useAutoCloudSync: Failed to reset state on sign out', err);
        }
        return;
      }

      if (event === 'PASSWORD_RECOVERY') {
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/settings')) {
          window.location.href = `/settings${window.location.hash || '#recovery'}`;
        }
        return;
      }

      if (session?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        identifyAnalyticsUser(session.user.id);
        syncAnalyticsStorageMode('cloud_synced');

        if (typeof localStorage !== 'undefined') {
          const signupKey = `ph_signup_tracked_${session.user.id}`;
          const isAlreadyTracked = localStorage.getItem(signupKey);
          const userCreatedAtMs = session.user.created_at
            ? new Date(session.user.created_at).getTime()
            : 0;
          const isRecentCreation =
            userCreatedAtMs > 0 && Date.now() - userCreatedAtMs < 60000;

          if (!isAlreadyTracked && isRecentCreation) {
            const provider =
              session.user.app_metadata?.provider ||
              session.user.app_metadata?.providers?.[0] ||
              'google';
            trackPrivacySafeEvent('account_created', {
              method: provider,
              requires_verification: false,
            });
            localStorage.setItem(signupKey, 'true');
          }
        }

        if (isHydratingFromCloud.current) return;
        await hydrateNow();
        return;
      }

      if (event === 'INITIAL_SESSION' && !session?.user) {
        markSignedOut();
        syncAnalyticsStorageMode('local_only');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);
}

export default useAutoCloudSync;
