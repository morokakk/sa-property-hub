import { test, expect } from '@playwright/test';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/morok/.gemini/antigravity/brain/123a6890-8593-4a34-b965-ab6016f1cafa';

test.describe('Moremela Platform Rebrand & Supplier Directory Enhancements', () => {
  test('verify rebranding and supplier directory editing and backdrop dismissal', async ({ page }) => {
    test.setTimeout(180_000);
    // 1. Visit Dashboard (Visible Desktop Viewport)
    await page.setViewportSize({ width: 1280, height: 850 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Wait for ClientOnly mount gate if present
    await page.locator('text=Initializing Moremela Property Hub...').waitFor({ state: 'detached', timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(1500);

    // Verify Title & Sidebar Brand
    await expect(page).toHaveTitle(/Moremela Property Investment Hub/);
    const sidebarBrand = page.locator('aside').getByText('Moremela Property Hub');
    await expect(sidebarBrand).toBeVisible();

    // Verify subtitle is removed
    const zarSubtitle = page.locator('aside').getByText('ZAR INSTITUTIONAL SUITE');
    await expect(zarSubtitle).toHaveCount(0);

    // Screenshot 1: Rebranded Dashboard
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screenshot_1_rebrand_dashboard.png'),
      fullPage: false,
    });
    await page.waitForTimeout(1000);

    // 2. Navigate to Flips module
    await page.goto('/flips', { waitUntil: 'domcontentloaded' });
    await page.locator('text=Initializing Moremela Property Hub...').waitFor({ state: 'detached', timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(1000);

    // Open Supplier Directory modal
    const supplierBtn = page.getByRole('button', { name: 'Supplier Directory' });
    await expect(supplierBtn).toBeVisible();
    await supplierBtn.click();
    await page.waitForTimeout(1200);

    // Verify modal header
    const modalHeader = page.getByRole('heading', { name: 'Local South African Supplier & Contractor Book' });
    await expect(modalHeader).toBeVisible();

    // Screenshot 2: Supplier Directory Modal with Edit buttons
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screenshot_2_supplier_modal_initial.png'),
      fullPage: false,
    });
    await page.waitForTimeout(1000);

    // 3. Click Edit on "Builders Warehouse Sandton"
    const editBtns = page.getByRole('button', { name: /Edit Builders Warehouse Sandton/i });
    await expect(editBtns).toBeVisible();
    await editBtns.click();
    await page.waitForTimeout(1200);

    // Verify Edit Mode activated
    await expect(page.getByText('Editing', { exact: true })).toBeVisible();
    await expect(page.getByText('Edit Local Supplier / Contractor')).toBeVisible();
    await expect(page.getByPlaceholder('e.g. David Khumalo')).toHaveValue('David Khumalo');

    // Screenshot 3: Supplier in Edit Mode
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screenshot_3_supplier_modal_editing_form.png'),
      fullPage: false,
    });
    await page.waitForTimeout(1000);

    // 4. Update the supplier contact and discount terms
    await page.getByPlaceholder('e.g. David Khumalo').fill('David Khumalo (Senior Account Mgr)');
    await page.waitForTimeout(400);
    await page.getByPlaceholder('e.g. 5% Cash Discount').fill('12.5% Trade Cash & Carry');
    await page.waitForTimeout(800);

    // Submit update
    const updateBtn = page.getByRole('button', { name: 'Update Supplier' });
    await updateBtn.click();
    await page.waitForTimeout(1200);

    // Verify updated values reflect on the card
    await expect(page.getByText('David Khumalo (Senior Account Mgr)')).toBeVisible();
    await expect(page.getByText('12.5% Trade Cash & Carry')).toBeVisible();

    // Screenshot 4: Updated Supplier Card
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screenshot_4_supplier_updated.png'),
      fullPage: false,
    });
    await page.waitForTimeout(1000);

    // 5. Test Backdrop Click Dismissal
    // Click outside the modal on top-left backdrop area (x: 20, y: 20)
    await page.mouse.click(20, 20);
    await page.waitForTimeout(1000);
    await expect(modalHeader).toBeHidden({ timeout: 5000 });

    // Screenshot 5: Modal closed via backdrop click
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screenshot_5_backdrop_closed.png'),
      fullPage: false,
    });
    await page.waitForTimeout(1000);

    // 6. Test Escape Key Dismissal
    await supplierBtn.click();
    await expect(modalHeader).toBeVisible();
    await page.waitForTimeout(1000);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
    await expect(modalHeader).toBeHidden({ timeout: 5000 });
  });
});
