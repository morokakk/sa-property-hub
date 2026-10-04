import { test, expect, type Page } from '@playwright/test';

async function waitForApp(page: Page) {
  await page
    .locator('text=Initializing SA Property Hub...')
    .waitFor({ state: 'detached', timeout: 30_000 })
    .catch(() => {});
}

function isMobile(page: Page) {
  return (page.viewportSize()?.width ?? 1280) < 768;
}

test.describe('Get Started Reference & Quick-Start Hub', () => {
  test('sidebar has a permanent Get Started entry that opens the hub', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);

    if (isMobile(page)) {
      await page.locator('button[aria-label="Open more modules"]').click();
      // getByRole skips the display:none desktop <aside> copy of the same link
      await page.getByRole('link', { name: 'Get Started Guide' }).click();
    } else {
      await page.locator('aside a[href="/get-started"]').click();
    }

    await expect(page).toHaveURL(/\/get-started$/);
    await expect(page.locator('h1:has-text("Get Started")')).toBeVisible();
  });

  test('renders Step 0 – Foundation through Step 5 plus Go Live', async ({ page }) => {
    await page.goto('/get-started', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);

    for (const n of [0, 1, 2, 3, 4, 5]) {
      await expect(page.getByTestId(`guide-stage-${n}`)).toBeAttached();
    }
    await expect(page.getByTestId('guide-stage-0')).toContainText('Settings');
    await expect(page.getByTestId('guide-stage-0')).toContainText('0a · Entity & Branding');
    await expect(page.getByTestId('guide-stage-0')).toContainText('0b · Finance Defaults');
    await expect(page.getByTestId('guide-stage-0')).toContainText('0c · Buy Box Hurdles');
    await expect(page.getByTestId('guide-go-live')).toContainText('Clear Demo');
    await expect(page.getByTestId('guide-progress-text')).toContainText(/^0 of \d+ steps complete$/);
  });

  test('expanding a guide shows How to, SA Pro Tip and Go to feature', async ({ page }) => {
    await page.goto('/get-started', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);

    const item = page.getByTestId('guide-step-settings-finance-defaults');
    await item.locator('button[aria-expanded]').click();
    await expect(item.locator('button[aria-expanded]')).toHaveAttribute('aria-expanded', 'true');
    await expect(item).toContainText('How to');
    await expect(item).toContainText('SA Pro Tip');
    await expect(item.locator('ol > li')).toHaveCount(3);
    await expect(item.locator('a:has-text("Go to feature")')).toHaveAttribute('href', '/settings#settings-finance');
  });

  test('manual checkbox persists across reload', async ({ page }) => {
    await page.goto('/get-started', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);

    const checkbox = page.getByTestId('guide-step-settings-entity-branding').locator('input[type="checkbox"]');
    await expect(checkbox).not.toBeChecked();
    await checkbox.check();
    await expect(checkbox).toBeChecked();
    await expect(page.getByTestId('guide-progress-text')).toContainText(/^1 of \d+ steps complete$/);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForApp(page);

    const reloaded = page.getByTestId('guide-step-settings-entity-branding').locator('input[type="checkbox"]');
    await expect(reloaded).toBeChecked();
    await expect(page.getByTestId('guide-progress-text')).toContainText(/^1 of \d+ steps complete$/);

    await reloaded.uncheck();
    await expect(page.getByTestId('guide-progress-text')).toContainText(/^0 of \d+ steps complete$/);
  });

  test('"Go to feature" deep link navigates to the anchored section', async ({ page }) => {
    await page.goto('/get-started', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);

    const item = page.getByTestId('guide-step-settings-buy-box');
    await item.locator('button[aria-expanded]').click();
    await item.locator('a:has-text("Go to feature")').click();

    await expect(page).toHaveURL(/\/settings#settings-buybox$/);
    await expect(page.locator('#settings-buybox')).toBeInViewport();
  });

  test('hard-loading a deep link scrolls to the anchor', async ({ page }) => {
    await page.goto('/analyzer#analyzer-pipeline', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await expect(page.locator('#analyzer-pipeline')).toBeInViewport({ timeout: 15_000 });
  });

  test('hard-loading a Settings deep link (behind Suspense) scrolls to the anchor', async ({ page }) => {
    await page.goto('/settings#settings-buybox', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await expect(page.locator('#settings-buybox')).toBeInViewport({ timeout: 15_000 });
  });

  test('guide progress survives Clear Demo (progress is not portfolio data)', async ({ page }) => {
    page.on('dialog', (dialog) => dialog.accept());
    await page.goto('/get-started', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);

    await page.getByTestId('guide-go-live').locator('input[type="checkbox"]').check();
    await expect(page.getByTestId('guide-progress-text')).toContainText(/^1 of \d+ steps complete$/);

    const width = page.viewportSize()?.width ?? 1280;
    if (width >= 1280) {
      await page.locator('header button:has-text("Clear Demo")').click();
    } else if (width >= 768) {
      await page.locator('header button[title="Clear Demo Data"]').click();
    } else {
      await page.locator('button[aria-label="Open more modules"]').click();
      await page.locator('button:has-text("Clear All Portfolio Data")').click();
    }

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await expect(page.getByTestId('guide-go-live').locator('input[type="checkbox"]')).toBeChecked();
    await expect(page.getByTestId('guide-progress-text')).toContainText(/^1 of \d+ steps complete$/);
  });

  test('Clean Slate card shows the Quick Start link after Clear Demo', async ({ page }) => {
    page.on('dialog', (dialog) => dialog.accept());
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);

    // Demo data present: no Clean Slate link yet
    await expect(page.getByTestId('clean-slate-quick-start-link')).toHaveCount(0);

    const width = page.viewportSize()?.width ?? 1280;
    if (width >= 1280) {
      await page.locator('header button:has-text("Clear Demo")').click();
    } else if (width >= 768) {
      await page.locator('header button[title="Clear Demo Data"]').click();
    } else {
      await page.locator('button[aria-label="Open more modules"]').click();
      await page.locator('button:has-text("Clear All Portfolio Data")').click();
    }

    const link = page.getByTestId('clean-slate-quick-start-link');
    await expect(page.locator('text=Clean Slate: Ready to Model Your Real Portfolio')).toBeVisible();
    await expect(link).toBeVisible();
    await expect(link).toContainText('New here? Follow the 5-minute Quick Start Guide');
    await link.click();
    await expect(page).toHaveURL(/\/get-started$/);
  });
});
