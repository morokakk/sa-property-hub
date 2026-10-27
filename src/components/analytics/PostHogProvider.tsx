'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect } from 'react';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const posthogKey =
      process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN ||
      process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const posthogHost =
      process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

    if (posthogKey && typeof window !== 'undefined') {
      posthog.init(posthogKey, {
        api_host: posthogHost,
        capture_pageview: true,
        capture_pageleave: true,
        autocapture: true,
        session_recording: {
          // Mandatory POPIA Statutory Masking:
          // Strictly redacts all keystrokes, personal details, landlord banking,
          // and financial numbers before telemetry is dispatched to EU Cloud.
          maskAllInputs: true,
          maskTextSelector: '[data-sensitive="true"]',
        },
      });
    }
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
