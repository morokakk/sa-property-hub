import { test, expect } from '@playwright/test';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/morok/.gemini/antigravity/brain/9b547924-7ecf-4414-bf91-f685579f406d';

test.describe('Deal Fixer Intelligence & Repair Verification', () => {
  test('demonstrate deal fixer prompting to fix and 1-click applied fix', async ({ page }) => {
    test.setTimeout(180_000);

    // 1. Open Opportunity Analyzer
    await page.setViewportSize({ width: 1280, height: 950 });
    await page.goto('/analyzer', { waitUntil: 'domcontentloaded' });
    await page.locator('text=Initializing Moremela Property Hub...').waitFor({ state: 'detached', timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(1500);

    // 2. Set an underperforming rent (R 8,500/m against R 1,250,000 purchase price) to trip the Buy-Box hurdles
    const rentInput = page.locator('input[name="monthlyRentZAR"]');
    await expect(rentInput).toBeVisible();
    await rentInput.fill('8500');
    await page.waitForTimeout(1000);

    // 3. Scroll to the Deterministic Strategy Verdict & Deal-Repair Engine Panel
    const dealIntelPanel = page.locator('[data-testid="deal-intelligence-panel"]');
    await expect(dealIntelPanel).toBeVisible();
    await dealIntelPanel.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);

    // Verify Deal Repair Diagnostic & Levers are visible
    const repairSection = page.locator('[data-testid="deal-repair-levers-section"]');
    await expect(repairSection).toBeVisible();
    const applyRentBtn = page.locator('[data-testid="apply-repair-lever-rent"]');
    await expect(applyRentBtn).toBeVisible();

    // Screenshot 1A: Focused screenshot of Deal Fixer prompting to fix (Diagnostic & Actionable Levers)
    await dealIntelPanel.screenshot({
      path: path.join(ARTIFACT_DIR, 'deal_fixer_prompting_to_fix.png'),
    });

    // Screenshot 1B: Viewport context showing the inputs and the Deal Fixer prompt
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'deal_fixer_prompting_to_fix_viewport.png'),
    });

    // 4. Click the "Apply Target Rent" Deal-Repair Lever
    await applyRentBtn.click();
    await page.waitForTimeout(1200);

    // 5. Verify the Buy-Box is immediately repaired (All Hurdles Passed banner appears)
    const passedBanner = page.locator('[data-testid="buy-box-all-passed-banner"]');
    await expect(passedBanner).toBeVisible();
    await expect(passedBanner).toContainText('Buy-Box Verified');

    // Screenshot 2A: Focused screenshot showing the applied fix (Buy-Box Verified in emerald green)
    await dealIntelPanel.screenshot({
      path: path.join(ARTIFACT_DIR, 'deal_fixer_applied_fix.png'),
    });

    // Screenshot 2B: Viewport context showing updated rent input and green Buy-Box verdict
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'deal_fixer_applied_fix_viewport.png'),
    });
  });
});
