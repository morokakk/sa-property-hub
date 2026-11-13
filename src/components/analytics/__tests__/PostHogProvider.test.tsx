import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import posthog, { type CaptureResult } from 'posthog-js';
import {
  PostHogProvider,
  initializePostHogClient,
  posthogBeforeSend,
  trackPrivacySafeEvent,
  captureSanitizedError,
  syncAnalyticsStorageMode,
  resetAnalyticsSession,
  identifyAnalyticsUser,
} from '../PostHogProvider';
import fs from 'fs';
import path from 'path';

vi.mock('posthog-js', () => ({
  default: {
    __loaded: true,
    init: vi.fn(),
    capture: vi.fn(),
    register: vi.fn(),
    reset: vi.fn(),
    identify: vi.fn(),
  },
}));

vi.mock('posthog-js/react', () => ({
  PostHogProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('PostHogProvider Client-Side Telemetry & POPIA Privacy Masking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (posthog as unknown as { __loaded?: boolean }).__loaded = true;
  });

  it('renders children cleanly without server-side crashes', () => {
    const html = renderToString(
      <PostHogProvider>
        <div data-testid="test-child">Moremela Analytics Child</div>
      </PostHogProvider>
    );

    expect(html).toContain('data-testid="test-child"');
    expect(html).toContain('Moremela Analytics Child');
  });

  it('enforces POPIA compliant maskAllInputs, DNT, SPA pageviews, exceptions, and first-party /ingest reverse proxy configuration', () => {
    const providerSource = fs.readFileSync(
      path.resolve(__dirname, '../PostHogProvider.tsx'),
      'utf-8'
    );

    // Verify key & first-party EU Cloud proxy references
    expect(providerSource).toContain('NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN');
    expect(providerSource).toContain("api_host: '/ingest'");
    expect(providerSource).toContain("ui_host: 'https://eu.posthog.com'");

    // Verify POPIA statutory masking & telemetry alignment flags
    expect(providerSource).toContain('respect_dnt: true');
    expect(providerSource).toContain("capture_pageview: 'history_change'");
    expect(providerSource).toContain('capture_pageleave: true');
    expect(providerSource).toContain('capture_exceptions: true');
    expect(providerSource).toContain("person_profiles: 'identified_only'");
    expect(providerSource).toContain("persistence: 'localStorage'");
    expect(providerSource).toContain('maskAllInputs: true');
    expect(providerSource).toContain(
      'maskTextSelector: \'[data-sensitive="true"], .ph-no-capture\''
    );
    expect(providerSource).toContain('before_send: posthogBeforeSend');
  });

  it('configures next.config.mjs with skipTrailingSlashRedirect and /ingest rewrites to PostHog EU Cloud', () => {
    const nextConfigSource = fs.readFileSync(
      path.resolve(__dirname, '../../../../next.config.mjs'),
      'utf-8'
    );

    expect(nextConfigSource).toContain('skipTrailingSlashRedirect: true');
    expect(nextConfigSource).toContain("source: '/ingest/static/:path*'");
    expect(nextConfigSource).toContain(
      "destination: 'https://eu-assets.i.posthog.com/static/:path*'"
    );
    expect(nextConfigSource).toContain("source: '/ingest/:path*'");
    expect(nextConfigSource).toContain(
      "destination: 'https://eu.i.posthog.com/:path*'"
    );
  });

  it('calls posthog.init with api_host: /ingest, ui_host: https://eu.posthog.com, respect_dnt, capture_pageview: history_change, capture_exceptions, and before_send', () => {
    const originalToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
    const originalWindow = (globalThis as any).window;
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN = 'phc_test_token_123';
    (globalThis as any).window = {};

    try {
      initializePostHogClient();

      expect(posthog.init).toHaveBeenCalledTimes(1);
      expect(posthog.init).toHaveBeenCalledWith(
        'phc_test_token_123',
        expect.objectContaining({
          api_host: '/ingest',
          ui_host: 'https://eu.posthog.com',
          respect_dnt: true,
          capture_pageview: 'history_change',
          capture_pageleave: true,
          capture_exceptions: true,
          person_profiles: 'identified_only',
          persistence: 'localStorage',
          session_recording: {
            maskAllInputs: true,
            maskTextSelector: '[data-sensitive="true"], .ph-no-capture',
          },
          before_send: posthogBeforeSend,
        })
      );
    } finally {
      process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN = originalToken;
      (globalThis as any).window = originalWindow;
    }
  });

  it('scrubs capability tokens on /statement/<uuid> routes and genericizes $title via before_send', () => {
    const rawEvent = {
      uuid: 'evt-1',
      event: '$pageview',
      properties: {
        $current_url: 'https://moremela.co.za/statement/abc-123-uuid?month=2026-09',
        $pathname: '/statement/abc-123-uuid',
        $prev_pageview_pathname: '/statement/prev-999-token',
        $referrer: 'https://moremela.co.za/statement/abc-123-uuid',
        $title: 'Thabo Mokoena - Unit 4B Statement',
      },
    } as unknown as CaptureResult;

    const scrubbed = posthogBeforeSend(rawEvent);

    expect(scrubbed).not.toBeNull();
    expect(scrubbed?.properties.$current_url).toBe(
      'https://moremela.co.za/statement/[redacted_token]?month=2026-09'
    );
    expect(scrubbed?.properties.$pathname).toBe('/statement/[redacted_token]');
    expect(scrubbed?.properties.$prev_pageview_pathname).toBe(
      '/statement/[redacted_token]'
    );
    expect(scrubbed?.properties.$referrer).toBe(
      'https://moremela.co.za/statement/[redacted_token]'
    );
    expect(scrubbed?.properties.$title).toBe('Tenant Statement Portal (Redacted)');
  });

  it('scrubs capability tokens on /deal-room/<uuid> routes and genericizes $title via before_send', () => {
    const rawEvent = {
      uuid: 'evt-deal-room-1',
      event: '$pageview',
      properties: {
        $current_url: 'https://moremela.co.za/deal-room/f3b1e9c0-token-99?tab=units',
        $pathname: '/deal-room/f3b1e9c0-token-99',
        $prev_pageview_pathname: '/deal-room/dev-1',
        $referrer: 'https://moremela.co.za/deal-room/f3b1e9c0-token-99',
        $title: 'Ferndale 6-Unit Cluster - Private Deal Room',
      },
    } as unknown as CaptureResult;

    const scrubbed = posthogBeforeSend(rawEvent);

    expect(scrubbed).not.toBeNull();
    expect(scrubbed?.properties.$current_url).toBe(
      'https://moremela.co.za/deal-room/[redacted_token]?tab=units'
    );
    expect(scrubbed?.properties.$pathname).toBe('/deal-room/[redacted_token]');
    expect(scrubbed?.properties.$prev_pageview_pathname).toBe(
      '/deal-room/[redacted_token]'
    );
    expect(scrubbed?.properties.$referrer).toBe(
      'https://moremela.co.za/deal-room/[redacted_token]'
    );
    expect(scrubbed?.properties.$title).toBe('Development Deal Room Portal (Redacted)');
  });

  it('strips $el_text from $autocapture events and $elements while preserving data-testid attributes', () => {
    const autocaptureEvent = {
      uuid: 'evt-2',
      event: '$autocapture',
      properties: {
        $current_url: 'https://moremela.co.za/rentals',
        $pathname: '/rentals',
        $el_text: 'Thabo Mokoena — Arrears R 14,500.00',
        $elements: [
          {
            tag_name: 'button',
            $el_text: 'Thabo Mokoena — Arrears R 14,500.00',
            text: 'Thabo Mokoena — Arrears R 14,500.00',
            'attr__data-testid': 'tab-payments-rental-1',
          },
        ],
      },
    } as unknown as CaptureResult;

    const scrubbed = posthogBeforeSend(autocaptureEvent);

    expect(scrubbed?.properties.$el_text).toBeUndefined();
    expect(scrubbed?.properties.$elements[0].$el_text).toBeUndefined();
    expect(scrubbed?.properties.$elements[0].text).toBeUndefined();
    expect(scrubbed?.properties.$elements[0]['attr__data-testid']).toBe(
      'tab-payments-rental-1'
    );
  });

  it('calls posthog.reset(true) on resetAnalyticsSession() and registers storage_mode via syncAnalyticsStorageMode()', () => {
    resetAnalyticsSession();
    expect(posthog.reset).toHaveBeenCalledWith(true);

    syncAnalyticsStorageMode('cloud_synced');
    expect(posthog.register).toHaveBeenCalledWith({ storage_mode: 'cloud_synced' });

    syncAnalyticsStorageMode('local_only');
    expect(posthog.register).toHaveBeenCalledWith({ storage_mode: 'local_only' });
  });

  it('strips accidental sensitive keys in trackPrivacySafeEvent and emits structured errors via captureSanitizedError', () => {
    trackPrivacySafeEvent('deal_saved_to_pipeline', {
      strategy: 'BRRRR',
      meetsBuyBox: true,
      tenantName: 'Should Be Stripped',
      purchasePrice: 1500000,
      bankAccount: '62000000000',
    });

    expect(posthog.capture).toHaveBeenCalledWith('deal_saved_to_pipeline', {
      strategy: 'BRRRR',
      meetsBuyBox: true,
    });

    captureSanitizedError('PDF_BYOK_PARSE_FAILED', {
      provider: 'anthropic',
      documentType: 'municipal_utility',
    });

    expect(posthog.capture).toHaveBeenCalledWith('sanitized_diagnostic_error', {
      error_code: 'PDF_BYOK_PARSE_FAILED',
      provider: 'anthropic',
      documentType: 'municipal_utility',
    });
  });

  it('identifies users pseudonymously with raw Supabase UUID and zero PII traits', () => {
    identifyAnalyticsUser('usr-uuid-1234-abcd');
    expect(posthog.identify).toHaveBeenCalledWith('usr-uuid-1234-abcd');
    expect(posthog.identify).toHaveBeenCalledTimes(1);

    // Should no-op safely on empty or whitespace strings
    identifyAnalyticsUser('');
    expect(posthog.identify).toHaveBeenCalledTimes(1);
  });

  it('emits POPIA-safe account_created and user_signed_in conversion events', () => {
    trackPrivacySafeEvent('account_created', {
      method: 'email',
      requires_verification: true,
      email: 'investor@example.co.za', // Should be stripped by privacy scrubber
    });

    expect(posthog.capture).toHaveBeenCalledWith('account_created', {
      method: 'email',
      requires_verification: true,
    });

    trackPrivacySafeEvent('user_signed_in', {
      method: 'email',
    });

    expect(posthog.capture).toHaveBeenCalledWith('user_signed_in', {
      method: 'email',
    });
  });
});
