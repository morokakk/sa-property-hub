import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import ClientOnly from '../ClientOnly';
import Sidebar from '../navigation/Sidebar';

let mockPathname = '/';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

vi.mock('@/components/AuthHydrator', () => ({
  default: () => <div data-testid="mock-auth-hydrator" />,
}));

vi.mock('@/components/navigation/HashScroller', () => ({
  default: () => <div data-testid="mock-hash-scroller" />,
}));

describe('ClientOnly SSR & Sidebar Route Guard (SSR-01, SSR-02)', () => {
  beforeEach(() => {
    mockPathname = '/';
  });

  it('streams full SSR HTML on /, /about, and /privacy without spinner while keeping AuthHydrator mounted', () => {
    for (const route of ['/', '/about', '/privacy']) {
      mockPathname = route;
      const html = renderToString(
        <ClientOnly>
          <main data-testid={`ssr-content-${route}`}>Public SSR Content</main>
        </ClientOnly>
      );
      expect(html).toContain(`data-testid="ssr-content-${route}"`);
      expect(html).toContain('Public SSR Content');
      expect(html).toContain('data-testid="mock-auth-hydrator"');
      expect(html).toContain('data-testid="mock-hash-scroller"');
      expect(html).not.toContain('Initializing Moremela Property Hub...');
    }
  });

  it('bypasses AuthHydrator and HashScroller on standalone /statement and /deal-room portals', () => {
    for (const route of ['/statement/lease-1', '/deal-room/tok-123']) {
      mockPathname = route;
      const html = renderToString(
        <ClientOnly>
          <main>Portal Content</main>
        </ClientOnly>
      );
      expect(html).toContain('Portal Content');
      expect(html).not.toContain('data-testid="mock-auth-hydrator"');
      expect(html).not.toContain('data-testid="mock-hash-scroller"');
      expect(html).not.toContain('Initializing Moremela Property Hub...');
    }
  });

  it('keeps the client mount gate active on authenticated workspace routes like /dashboard', () => {
    mockPathname = '/dashboard';
    const html = renderToString(
      <ClientOnly>
        <main>Workspace Content</main>
      </ClientOnly>
    );
    expect(html).toContain('Initializing Moremela Property Hub...');
    expect(html).not.toContain('Workspace Content');
  });

  it('renders null on standalone public routes and delegates to SidebarContent on workspace routes', () => {
    mockPathname = '/';
    expect(renderToString(<Sidebar />)).toBe('');

    mockPathname = '/about';
    expect(renderToString(<Sidebar />)).toBe('');

    mockPathname = '/dashboard';
    const dashboardHtml = renderToString(<Sidebar />);
    expect(dashboardHtml).toContain('Global Portfolio');
    expect(dashboardHtml).toContain('Developments');
  });
});
