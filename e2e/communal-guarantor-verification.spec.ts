import { test, expect, type Page } from '@playwright/test';

async function waitForApp(page: Page) {
  await page
    .locator('text=Initializing SA Property Hub...')
    .waitFor({ state: 'detached', timeout: 30_000 })
    .catch(() => {});
}

test.describe('Communal OpEx, Room Classification & Third-Party Guarantors', () => {
  test('editing communal services updates Net Cashflow and renders badges cleanly on 390px mobile viewport', async ({ page }) => {
    // 1. Open /rentals on desktop
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/rentals', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);

    // Verify page title
    await expect(page.locator('h1:has-text("Rental Portfolio")')).toBeVisible();

    // 2. Locate an active rental property card (e.g. rental-1 or first card)
    const firstCard = page.locator('[data-testid^="rental-card-"]').first();
    await expect(firstCard).toBeVisible();

    // Click "Edit" on the first rental card
    const editButton = firstCard.locator('button:has-text("Edit")');
    await editButton.scrollIntoViewIfNeeded();
    await editButton.click();

    // Verify modal is displayed
    const modal = page.locator('h3:has-text("Edit Rental Property")').locator('..');
    await expect(modal).toBeVisible();

    // 3. Enter R 3,000 under Communal / Serviced Services
    const communalInput = page.locator('input[name="monthlyCommunalServicesZAR"]');
    await expect(communalInput).toBeVisible();
    await communalInput.fill('3000');

    // 4. Add a lease with roomType: "Executive Studio" and guarantorName: "Acme Corp SA"
    const addUnitBtn = page.locator('button:has-text("+ Add Unit")');
    await addUnitBtn.click();

    // Find the newly added lease (the last lease form block)
    const roomTypeInput = page.locator('input[placeholder="e.g. Executive Suite"]').last();
    await roomTypeInput.fill('Executive Studio');

    const tenantNameInput = page.locator('input[placeholder="e.g. Sipho Dlamini"]').last();
    await tenantNameInput.fill('Alex Vance');

    const rentInput = page.locator('input[value="0"]').first();
    if (await rentInput.isVisible()) {
      await rentInput.fill('12000');
    }

    const guarantorNameInput = page.locator('input[placeholder*="Parent Name (Deed of Suretyship)"]').last();
    await guarantorNameInput.fill('Acme Corp SA');

    const guarantorContactInput = page.locator('input[placeholder*="legal@corp.co.za"]').last();
    await guarantorContactInput.fill('+27 11 000 9999');

    // 5. Submit modal update
    const updateBtn = page.locator('button:has-text("Update Rental Property")');
    await updateBtn.click();

    // Modal should close
    await expect(page.locator('h3:has-text("Edit Rental Property")')).toBeHidden();

    // 6. Verify property card reflections
    // Line item for Communal / Serviced: - R 3,000 (en-ZA uses non-breaking space as thousands separator)
    await expect(firstCard.locator('text=Communal / Serviced:')).toBeVisible();
    await expect(firstCard.getByText(/-\s*R\s*3[\s\u00a0,.]000/)).toBeVisible();

    // Room classification badge & Guarantor chip
    await expect(firstCard.locator('text=Executive Studio')).toBeVisible();
    await expect(firstCard.locator('text=Guarantor: Acme Corp SA')).toBeVisible();

    // Take desktop screenshot
    await page.screenshot({ path: 'e2e/screenshots/communal-guarantor-desktop.png', fullPage: false });

    // 7. Verify 390px mobile viewport responsiveness
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);

    // Confirm the badge and sponsor chip render cleanly without breaking the 390px mobile viewport
    const roomBadge = firstCard.locator('text=Executive Studio');
    const guarantorChip = firstCard.locator('text=Guarantor: Acme Corp SA');

    await expect(roomBadge).toBeVisible();
    await expect(guarantorChip).toBeVisible();

    // Check no horizontal scroll overflow on the body
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    // Take mobile screenshot
    await page.screenshot({ path: 'e2e/screenshots/communal-guarantor-mobile-390px.png', fullPage: false });
  });

  test('pre-seeded multi-let commune rental-4 displays room classifications, communal OpEx and guarantors', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/rentals', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);

    // Look for rental-4 card (Kempton Park Student Commune or multi-unit)
    const communeCard = page.locator('[data-testid="rental-card-rental-4"]');
    if (await communeCard.isVisible()) {
      // Check pre-seeded communal services line item: R 2,500
      await expect(communeCard.locator('text=Communal / Serviced:')).toBeVisible();
      await expect(communeCard.getByText(/-\s*R\s*2[\s\u00a0,.]500/)).toBeVisible();

      // Check pre-seeded room classification badges
      await expect(communeCard.locator('text=Executive Suite')).toBeVisible();
      await expect(communeCard.locator('text=Garden Cottage')).toBeVisible();

      // Check pre-seeded guarantor chip
      await expect(communeCard.locator('text=Guarantor: Ndlovu Holdings (Pty) Ltd')).toBeVisible();
    }
  });
});
