'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { hydrateFromCloud } from '@/lib/db/hydrateFromCloud';
import { usePortfolioStore } from '@/lib/store/usePortfolioStore';

/**
 * Background Session Hydrator.
 * Automatically synchronizes cloud portfolio into local Zustand state
 * whenever the user signs in or an initial authenticated session is loaded,
 * and clears session state on logout (DBSYNC-02).
 */
export default function AuthHydrator() {
  const isHydratingRef = useRef(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        try {
          usePortfolioStore.getState().resetToDemoData();
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('last_sync_user_id');
            localStorage.removeItem('cloud_sync_completed');
            localStorage.removeItem('cloud_sync_timestamp');
          }
        } catch (err) {
          console.error('AuthHydrator: Failed to reset state on sign out', err);
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
        if (isHydratingRef.current) return;
        isHydratingRef.current = true;
        try {
          await hydrateFromCloud();
        } catch (err) {
          console.error('AuthHydrator: Failed to hydrate cloud portfolio', err);
        } finally {
          isHydratingRef.current = false;
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
