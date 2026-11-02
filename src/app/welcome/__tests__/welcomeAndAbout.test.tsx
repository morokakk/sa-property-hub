import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import fs from 'fs';
import path from 'path';
import WelcomePage from '../page';
import AboutPage, { metadata as aboutMetadata } from '../../about/page';
import Sidebar, { SHOW_ABOUT_PAGE_IN_NAV } from '@/components/navigation/Sidebar';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn() })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

describe('Welcome Landing Page (/welcome)', () => {
  it('renders brand header, hero copy, interactive life goal switcher, and module links', () => {
    const html = renderToString(<WelcomePage />);

    // Brand and Top Bar
    expect(html).toContain('Moremela Property Hub');
    expect(html).toContain('Get Started Guide');
    expect(html).toContain('Open Dashboard ➔');

    // Hero Section
    expect(html).toContain('MOREMELA — “THE ONE WHO CLEARS THE WAY”');
    expect(html).toContain('Build Your Foundation. One Property at a Time.');
    expect(html).toContain(
      'We give solo South African property entrepreneurs the speed and simplicity to vet profitable deals'
    );
    expect(html).toContain('Open Portfolio Dashboard ➔');
    expect(html).toContain('Follow Quick-Start Guide');

    // Interactive Life Goal Switcher
    expect(html).toContain('data-testid="life-goal-switcher"');
    expect(html).toContain('“What is your next property meant to do for your life?”');
    expect(html).toContain('Monthly Cash Flow');
    expect(html).toContain('Build a Lump-Sum Cash War Chest');
    expect(html).toContain('Vet a Deal Before You Sign');
    expect(html).toContain('Long-Term Wealth &amp; Partners');

    // Default active goal (Monthly Cash Flow)
    expect(html).toContain('Cover school or varsity fees, supplement household income, or replace your salary.');
    expect(html).toContain('Explore Rental Portfolio ➔');
    expect(html).toContain('href="/rentals"');

    // Section 2: 3-Column Card Grid
    expect(html).toContain('Guard the Kraal. Grow the Baobab.');
    expect(html).toContain('Guard Your Day-1 Cash (The Kraal)');
    expect(html).toContain('Run Operations From Your Phone');
    expect(html).toContain('Pitch Lenders &amp; Partners Instantly (The Baobab)');

    // Section 3: Dark Institutional CTA Banner & Footer
    expect(html).toContain('Clear the complicated math and admin out of your way.');
    expect(html).toContain('Go to Global Portfolio ➔');
    expect(html).toContain('Global Portfolio');
    expect(html).toContain('Privacy &amp; POPIA');

    // STRICT GUARD: Must NOT link to /about in footer or page
    expect(html).not.toContain('href="/about"');
  });
});

describe('Hidden About Us & Founder Story Page (/about)', () => {
  it('exports strict no-index robots metadata for stealth GTM protection', () => {
    expect(aboutMetadata.robots).toEqual({
      index: false,
      follow: false,
      nocache: true,
    });
    expect(aboutMetadata.title).toContain('About Us & Founder Story');
  });

  it('renders private GTM draft notice pill, complete founder story, and legacy tribute', () => {
    const html = renderToString(<AboutPage />);

    // Private Draft Notice Pill
    expect(html).toContain(
      'Private GTM Draft — This page (/about) is currently hidden from public navigation and search engines.'
    );

    // Header Back Link
    expect(html).toContain('Back to Workspace');

    // Founder Story Container
    expect(html).toContain('data-testid="about-founder-story"');
    expect(html).toContain('Build Your Family. Build South Africa. One Property at a Time.');

    // Historical & Cultural Narrative Details
    expect(html).toContain('Nobody buys a property because they are in love with spreadsheets or tax brackets');
    expect(html).toContain('How This Started');
    expect(html).toContain('Why We Are Called ‘Moremela’');
    expect(html).toContain('go remela');
    expect(html).toContain('lesaka');
    expect(html).toContain('Sally Motlana');
    expect(html).toContain('Order of the Baobab');
    expect(html).toContain('Our Vision');
    expect(html).toContain('The Stepped Kraal at the base is protection');
    expect(html).toContain('The Baobab rising from the center is why you do the work');

    // Bottom CTA
    expect(html).toContain('Open Portfolio Workspace ➔');
    expect(html).toContain('href="/"');
  });
});

describe('Sidebar Navigation Route Guard & GTM Feature Flag', () => {
  it('renders Welcome & Overview link to /welcome in Help & Reference', () => {
    const html = renderToString(<Sidebar />);
    expect(html).toContain('Welcome &amp; Overview');
    expect(html).toContain('href="/welcome"');
  });

  it('keeps SHOW_ABOUT_PAGE_IN_NAV false and omits /about links while in draft mode', () => {
    expect(SHOW_ABOUT_PAGE_IN_NAV).toBe(false);

    const html = renderToString(<Sidebar />);
    expect(html).not.toContain('href="/about"');
    expect(html).not.toContain('About &amp; Founder Story');
  });

  it('declares standalone route exclusions for /welcome and /about in Sidebar source code', () => {
    const sidebarSource = fs.readFileSync(
      path.resolve(__dirname, '../../../components/navigation/Sidebar.tsx'),
      'utf-8'
    );
    expect(sidebarSource).toContain("pathname.startsWith('/welcome')");
    expect(sidebarSource).toContain("pathname.startsWith('/about')");
    expect(sidebarSource).toContain('export const SHOW_ABOUT_PAGE_IN_NAV = false;');
  });
});
