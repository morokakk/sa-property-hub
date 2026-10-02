'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { hydrateFromCloud } from '@/lib/db/hydrateFromCloud';

/**
 * Background Session Hydrator.
 * Automatically synchronizes cloud portfolio into local Zustand state
 * whenever the user signs in or an initial authenticated session is loaded.
 */
export default function AuthHydrator() {
  const isHydratingRef = useRef(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
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
