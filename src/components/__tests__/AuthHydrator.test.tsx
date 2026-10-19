import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import AuthHydrator from '../AuthHydrator';
import { supabase } from '@/lib/supabaseClient';
import { hydrateFromCloud } from '@/lib/db/hydrateFromCloud';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';

let authCallback: any = null;
let lastEffectCleanup: any = null;

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    useRef: vi.fn((val) => ({ current: val })),
    useEffect: vi.fn((effect) => {
      lastEffectCleanup = effect();
      return lastEffectCleanup;
    }),
  };
});

vi.mock('@/lib/supabaseClient', () => {
  return {
    supabase: {
      auth: {
        onAuthStateChange: vi.fn((cb) => {
          authCallback = cb;
          return {
            data: {
              subscription: {
                unsubscribe: vi.fn(),
              },
            },
          };
        }),
      },
    },
  };
});

vi.mock('@/lib/db/hydrateFromCloud', () => ({
  hydrateFromCloud: vi.fn().mockResolvedValue({ success: true, hydrated: true }),
}));

describe('AuthHydrator Component (DBSYNC-02)', () => {
  let storage: Record<string, string> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    storage = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => storage[key] ?? null),
      setItem: vi.fn((key: string, val: string) => {
        storage[key] = val;
      }),
      removeItem: vi.fn((key: string) => {
        delete storage[key];
      }),
      clear: vi.fn(() => {
        storage = {};
      }),
    });
  });

  it('handles SIGNED_OUT event by resetting store to demo data and removing sync keys', async () => {
    const resetSpy = vi.spyOn(usePortfolioStore.getState(), 'resetToDemoData');
    localStorage.setItem('last_sync_user_id', 'user-123');
    localStorage.setItem('cloud_sync_completed', 'true');
    localStorage.setItem('cloud_sync_timestamp', '2026-10-19T12:00:00Z');

    AuthHydrator();

    expect(authCallback).toBeDefined();

    // Trigger SIGNED_OUT
    await authCallback('SIGNED_OUT', null);

    expect(resetSpy).toHaveBeenCalled();
    expect(localStorage.getItem('last_sync_user_id')).toBeNull();
    expect(localStorage.getItem('cloud_sync_completed')).toBeNull();
    expect(localStorage.getItem('cloud_sync_timestamp')).toBeNull();
  });

  it('handles SIGNED_IN event by triggering hydrateFromCloud', async () => {
    AuthHydrator();

    expect(authCallback).toBeDefined();

    const mockSession = {
      user: { id: 'usr-999', email: 'test@example.com' },
    };

    await authCallback('SIGNED_IN', mockSession);

    expect(hydrateFromCloud).toHaveBeenCalled();
  });

  it('handles PASSWORD_RECOVERY event by redirecting to settings with recovery hash if not already on settings', async () => {
    const mockWindow = {
      location: {
        pathname: '/rentals',
        hash: '#access_token=xyz&type=recovery',
        href: '',
      },
    };
    vi.stubGlobal('window', mockWindow);

    AuthHydrator();

    await authCallback('PASSWORD_RECOVERY', null);

    expect(mockWindow.location.href).toBe('/settings#access_token=xyz&type=recovery');
    vi.unstubAllGlobals();
  });

  it('does not redirect on PASSWORD_RECOVERY if already on /settings', async () => {
    const mockWindow = {
      location: {
        pathname: '/settings',
        hash: '#recovery',
        href: '',
      },
    };
    vi.stubGlobal('window', mockWindow);

    AuthHydrator();

    await authCallback('PASSWORD_RECOVERY', null);

    expect(mockWindow.location.href).toBe('');
    vi.unstubAllGlobals();
  });

  it('cleans up auth subscription on unmount', () => {
    const unsubscribeMock = vi.fn();
    (supabase.auth.onAuthStateChange as any).mockReturnValueOnce({
      data: {
        subscription: {
          unsubscribe: unsubscribeMock,
        },
      },
    });

    AuthHydrator();

    expect(typeof lastEffectCleanup).toBe('function');
    lastEffectCleanup();
    expect(unsubscribeMock).toHaveBeenCalled();
  });
});

