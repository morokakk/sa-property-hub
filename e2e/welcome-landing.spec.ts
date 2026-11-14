import { test, expect } from '@playwright/test';

test.describe('Welcome Landing Page (/) & /welcome Redirect', () => {
  test('Welcome page (/) renders full-width marketing layout without workspace Sidebar', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Workspace Sidebar (<aside>) must not be mounted on /
    await expect(page.locator('aside')).toHaveCount(0);

    // Brand header & hero headline should be visible
    await expect(page.locator('header')).toContainText('Moremela Property Hub');
    await expect(page.locator('h1')).toContainText('Build Your Foundation. One Property at a Time.');
  });

  test('Interactive Life-Goal Switcher updates South African workflow summary and module CTA', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const switcher = page.getByTestId('life-goal-switcher');
    await expect(switcher).toBeVisible();

    const goals = [
      {
        tab: 'Monthly Cash Flow',
        goalText: 'Cover school or varsity fees, supplement household income, or replace your salary.',
        ctaText: 'Explore Rental Portfolio',
        ctaHref: '/rentals',
      },
      {
        tab: 'Build a Lump-Sum Cash War Chest',
        goalText: 'Generate lump-sum capital from renovations and flips to pay off debt or fund your next acquisition.',
        ctaText: 'Explore Buy-and-Flip Manager',
        ctaHref: '/flips',
      },
      {
        tab: 'Vet a Deal Before You Sign',
        goalText: "Know your true Day-1 cash requirement and net return before committing your family's capital.",
        ctaText: 'Open Opportunity Analyzer',
        ctaHref: '/analyzer',
      },
      {
        tab: 'Long-Term Wealth & Partners',
        goalText: 'Compound debt-free equity over 20 years, recycle capital via BRRRR, and raise private funding professionally.',
        ctaText: 'Open Proposal Generator',
        ctaHref: '/proposal',
      },
    ];

    for (const goal of goals) {
      await switcher.locator('button', { hasText: goal.tab }).click();
      await expect(switcher).toContainText(goal.goalText);
      const ctaLink = switcher.locator('a', { hasText: goal.ctaText });
      await expect(ctaLink).toBeVisible();
      await expect(ctaLink).toHaveAttribute('href', goal.ctaHref);
    }
  });

  test('Primary CTAs navigate cleanly to /dashboard and /get-started', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await page.locator('main a', { hasText: 'Open Portfolio Dashboard' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.locator('aside').first()).toBeVisible();

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('main a', { hasText: 'Follow Quick-Start Guide' }).click();
    await expect(page).toHaveURL(/\/get-started$/);
    await expect(page.locator('h1')).toContainText('Get Started');
  });

  test('Visiting /welcome redirects cleanly to /', async ({ page }) => {
    await page.goto('/welcome', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('h1')).toContainText('Build Your Foundation. One Property at a Time.');
    await expect(page.locator('aside')).toHaveCount(0);
  });
});
