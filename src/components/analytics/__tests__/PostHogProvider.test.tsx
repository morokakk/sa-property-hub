import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { PostHogProvider } from '../PostHogProvider';
import fs from 'fs';
import path from 'path';

describe('PostHogProvider Client-Side Telemetry & Privacy Masking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('enforces POPIA compliant maskAllInputs and EU Cloud ingestion host configuration', () => {
    const providerSource = fs.readFileSync(
      path.resolve(__dirname, '../PostHogProvider.tsx'),
      'utf-8'
    );

    // Verify key references
    expect(providerSource).toContain('NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN');
    expect(providerSource).toContain('https://eu.i.posthog.com');

    // Verify POPIA statutory masking compliance
    expect(providerSource).toContain('maskAllInputs: true');
    expect(providerSource).toContain("maskTextSelector: '[data-sensitive=\"true\"]'");
    expect(providerSource).toContain('capture_pageview: true');
    expect(providerSource).toContain('capture_pageleave: true');
  });
});
