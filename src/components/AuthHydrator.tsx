'use client';

import { useAutoCloudSync } from '@/hooks/useAutoCloudSync';

/**
 * Background Session Hydrator.
 * Automatically synchronizes cloud portfolio into local Zustand state
 * whenever the user signs in or an initial authenticated session is loaded,
 * debounces outbound pushes of local mutations, and clears session state on
 * logout (DBSYNC-02). All logic lives in the global `useAutoCloudSync` hook.
 */
export default function AuthHydrator() {
  useAutoCloudSync();
  return null;
}
