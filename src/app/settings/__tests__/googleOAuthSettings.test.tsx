import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import fs from 'fs';
import path from 'path';
import SettingsPage from '../page';

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(() => new URLSearchParams()),
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn() })),
  usePathname: vi.fn(() => '/settings'),
}));

describe('Google OAuth ("Continue with Google") in Settings Workspace (/settings)', () => {
  it('renders the quick Continue with Google button in the Cloud Sync header bar by default', () => {
    const html = renderToString(<SettingsPage />);
    expect(html).toContain('data-testid="cloud-sync-card"');
    expect(html).toContain('data-testid="google-oauth-header-btn"');
    expect(html).toContain('Continue with Google');
    expect(html).toContain('data-testid="toggle-cloud-auth-btn"');
  });

  it('implements handleGoogleSignIn with supabase.auth.signInWithOAuth, query string preservation, and automatic email pre-fill', () => {
    const settingsSource = fs.readFileSync(
      path.resolve(__dirname, '../page.tsx'),
      'utf-8'
    );

    // 1. OAuth state & handler
    expect(settingsSource).toContain('const [oauthSubmitting, setOauthSubmitting] = useState(false);');
    expect(settingsSource).toContain('const handleGoogleSignIn = async () =>');
    expect(settingsSource).toContain('supabase.auth.signInWithOAuth({');
    expect(settingsSource).toContain("provider: 'google',");
    expect(settingsSource).toContain('redirectTo: `${siteOrigin}/settings${searchSuffix}`');
    expect(settingsSource).toContain("access_type: 'offline'");
    expect(settingsSource).toContain("prompt: 'select_account'");

    // 2. Dual button placement (header quick-action + expanded full-width button)
    expect(settingsSource).toContain('data-testid="google-oauth-header-btn"');
    expect(settingsSource).toContain('data-testid="google-oauth-btn"');
    expect(settingsSource).toContain('or continue with email &amp; password');

    // 3. Auto-expand on publish_link action parameter
    expect(settingsSource).toContain("actionParam === 'publish_link'");

    // 4. Automatic email pre-fill when local profile email is empty or demo default
    expect(settingsSource).toContain("setEmail((prev) => (!prev || prev === 'invest@lmtrading.co.za' ? user.email! : prev));");
    expect(settingsSource).toContain("setEmail((prev) => (!prev || prev === 'invest@lmtrading.co.za' ? session.user.email! : prev));");
  });
});
