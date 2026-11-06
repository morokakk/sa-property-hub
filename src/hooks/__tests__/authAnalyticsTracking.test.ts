import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAutoCloudSync } from '../useAutoCloudSync';
import { supabase } from '@/lib/supabaseClient';
import {
  identifyAnalyticsUser,
  syncAnalyticsStorageMode,
  trackPrivacySafeEvent,
  resetAnalyticsSession,
} from '@/lib/analytics/posthogClient';

let authCallback: ((event: string, session: any) => Promise<void>) | null = null;

const storageMap = new Map<string, string>();
const mockLocalStorage = {
  getItem: vi.fn((key: string) => storageMap.get(key) ?? null),
  setItem: vi.fn((key: string, val: string) => {
    storageMap.set(key, String(val));
  }),
  removeItem: vi.fn((key: string) => {
    storageMap.delete(key);
  }),
  clear: vi.fn(() => {
    storageMap.clear();
  }),
};
vi.stubGlobal('localStorage', mockLocalStorage);

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useEffect: vi.fn((fn: () => void | (() => void)) => {
      fn();
    }),
  };
});

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn((cb) => {
        authCallback = cb;
        return {
          data: { subscription: { unsubscribe: vi.fn() } },
        };
      }),
    },
  },
}));

vi.mock('@/lib/analytics/posthogClient', () => ({
  identifyAnalyticsUser: vi.fn(),
  syncAnalyticsStorageMode: vi.fn(),
  trackPrivacySafeEvent: vi.fn(),
  captureSanitizedError: vi.fn(),
  resetAnalyticsSession: vi.fn(),
}));

vi.mock('@/lib/db/hydrateFromCloud', () => ({
  hydrateFromCloud: vi.fn().mockResolvedValue({ success: true, hydrated: true }),
}));

vi.mock('@/lib/db/migrateToCloud', () => ({
  migrateToCloud: vi.fn().mockResolvedValue({ success: true, counts: {} }),
}));

describe('useAutoCloudSync Authentication Telemetry & OAuth Sign-Up Tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storageMap.clear();
    authCallback = null;
  });

  afterEach(() => {
    storageMap.clear();
  });

  it('identifies user pseudonymously and registers cloud_synced storage mode on SIGNED_IN', async () => {
    useAutoCloudSync();
    expect(authCallback).not.toBeNull();

    const mockSession = {
      user: {
        id: 'usr-oauth-uuid-999',
        email: 'investor@example.co.za',
        created_at: new Date(Date.now() - 120000).toISOString(), // 2 minutes ago (existing user)
        app_metadata: { provider: 'google' },
      },
    };

    await authCallback!('SIGNED_IN', mockSession);

    // Strictly UUID identifier with zero PII traits
    expect(identifyAnalyticsUser).toHaveBeenCalledWith('usr-oauth-uuid-999');
    expect(syncAnalyticsStorageMode).toHaveBeenCalledWith('cloud_synced');
    // Existing user should not fire account_created
    expect(trackPrivacySafeEvent).not.toHaveBeenCalledWith(
      'account_created',
      expect.anything()
    );
  });

  it('detects and fires account_created for new OAuth registrations created within 60s', async () => {
    useAutoCloudSync();
    expect(authCallback).not.toBeNull();

    const recentTimestamp = new Date(Date.now() - 15000).toISOString(); // 15 seconds ago
    const mockSession = {
      user: {
        id: 'usr-new-oauth-111',
        email: 'newinvestor@example.co.za',
        created_at: recentTimestamp,
        app_metadata: { provider: 'google' },
      },
    };

    await authCallback!('SIGNED_IN', mockSession);

    expect(identifyAnalyticsUser).toHaveBeenCalledWith('usr-new-oauth-111');
    expect(trackPrivacySafeEvent).toHaveBeenCalledWith('account_created', {
      method: 'google',
      requires_verification: false,
    });
    expect(mockLocalStorage.getItem('ph_signup_tracked_usr-new-oauth-111')).toBe('true');
  });

  it('deduplicates account_created when ph_signup_tracked flag exists in localStorage', async () => {
    storageMap.set('ph_signup_tracked_usr-already-tracked-222', 'true');

    useAutoCloudSync();
    expect(authCallback).not.toBeNull();

    const mockSession = {
      user: {
        id: 'usr-already-tracked-222',
        email: 'returning@example.co.za',
        created_at: new Date(Date.now() - 10000).toISOString(), // Created 10s ago, but flag set
        app_metadata: { provider: 'google' },
      },
    };

    await authCallback!('SIGNED_IN', mockSession);

    expect(identifyAnalyticsUser).toHaveBeenCalledWith('usr-already-tracked-222');
    expect(trackPrivacySafeEvent).not.toHaveBeenCalledWith(
      'account_created',
      expect.anything()
    );
  });

  it('calls resetAnalyticsSession() and sets local_only mode on SIGNED_OUT', async () => {
    useAutoCloudSync();
    expect(authCallback).not.toBeNull();

    await authCallback!('SIGNED_OUT', null);

    expect(resetAnalyticsSession).toHaveBeenCalledTimes(1);
    expect(syncAnalyticsStorageMode).toHaveBeenCalledWith('local_only');
  });
});
