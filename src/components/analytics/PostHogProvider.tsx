'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect } from 'react';
import {
  posthogBeforeSend,
  trackPrivacySafeEvent,
  captureSanitizedError,
  syncAnalyticsStorageMode,
  resetAnalyticsSession,
} from '@/lib/analytics/posthogClient';

export {
  posthogBeforeSend,
  trackPrivacySafeEvent,
  captureSanitizedError,
  syncAnalyticsStorageMode,
  resetAnalyticsSession,
};

export function initializePostHogClient(): void {
  const posthogKey =
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN ||
    process.env.NEXT_PUBLIC_POSTHOG_KEY;

  if (posthogKey && typeof window !== 'undefined') {
    posthog.init(posthogKey, {
      api_host: '/ingest',
      ui_host: 'https://eu.posthog.com',
      respect_dnt: true,
      capture_pageview: 'history_change',
      capture_pageleave: true,
      capture_exceptions: true,
      autocapture: true,
      person_profiles: 'identified_only',
      persistence: 'localStorage',
      session_recording: {
        // Mandatory POPIA Statutory Masking:
        // Strictly redacts all keystrokes, personal details, landlord banking,
        // and financial numbers before telemetry is dispatched to EU Cloud.
        maskAllInputs: true,
        maskTextSelector: '[data-sensitive="true"], .ph-no-capture',
      },
      before_send: posthogBeforeSend,
    });
  }
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initializePostHogClient();
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
