import { test, expect } from '@playwright/test';

test.describe('Golden Thread Development Lifecycle: Analyzer -> Developments -> Rentals & Proposal', () => {
  test('Evaluates Split-Exit Scheme with Zoning, Promotes, Pays Down Debt, Graduates Rentals & Renders Tear-Sheet', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    // Accept both Save Pipeline alert() and Promote to Development confirm() dialogs
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    // ------------------------------------------------------------------
    // 1. /analyzer: Development Strategy, Zoning Envelope & Split-Exit
    // ------------------------------------------------------------------
    await page.goto('/analyzer', { waitUntil: 'domcontentloaded' });
    await page
      .locator('text=Initializing Moremela Property Hub...')
      .waitFor({ state: 'detached', timeout: 30_000 })
      .catch(() => {});

    const calcTab = page.locator('button:has-text("Deal Calculator")');
    if (await calcTab.isVisible()) {
      await calcTab.click();
    }

    await page.locator('input[name="opportunityTitle"]').fill('E2E Golden Thread Cluster Scheme');
    await page.locator('input[name="propertyAddress"]').fill('42 Sandton Drive');

    // Switch strategy to Development
    const devStrategyBtn = page.locator('button:has-text("Development")').first();
    await expect(devStrategyBtn).toBeVisible({ timeout: 15_000 });
    await devStrategyBtn.click();

    // Expand & interact with Municipal Zoning & Bulk Envelope
    await expect(page.locator('text=Municipal Zoning Rights & Bulk Envelope').first()).toBeVisible();
    const editParamsBtn = page.locator('button:has-text("Edit Parameters")').first();
    if (await editParamsBtn.isVisible()) {
      await editParamsBtn.click();
    }
    const res3PresetBtn = page.locator('button:has-text("Res 3 (40 du/ha / FAR 0.8)")').first();
    await expect(res3PresetBtn).toBeVisible();
    await res3PresetBtn.click();
    await expect(page.locator('text=Max Permitted Bulk:').first()).toBeVisible();
    await expect(page.locator('text=As-of-Right Statutory Rights').first()).toBeVisible();

    // Select Split-Exit Hybrid mode
    const splitExitBtn = page.locator('button:has-text("Split-Exit (Sell + Hold)")');
    await expect(splitExitBtn).toBeVisible();
    await splitExitBtn.click();
    await expect(page.locator('text=/Sell \\d+ Units.*Retain \\d+ Units/')).toBeVisible();

    // Save deal to sourcing pipeline
    const saveDealBtn = page.locator('button:has-text("Save Deal to Sourcing Pipeline")');
    await expect(saveDealBtn).toBeVisible();
    await saveDealBtn.click();

    // Switch to Sourcing Pipeline view and promote to Development
    const pipelineTab = page.locator('button:has-text("Deal Sourcing Pipeline")');
    if (await pipelineTab.isVisible()) {
      await pipelineTab.click();
    }

    const pipelineContainer = page.locator('#analyzer-pipeline');
    await expect(pipelineContainer).toBeVisible({ timeout: 15_000 });

    const savedDealCard = pipelineContainer
      .locator('div')
      .filter({ hasText: 'E2E Golden Thread Cluster Scheme' })
      .filter({ has: page.locator('button:has-text("Promote to Development")') })
      .last();
    await expect(savedDealCard).toBeVisible({ timeout: 15_000 });

    await savedDealCard.locator('button:has-text("Promote to Development")').click();

    // ------------------------------------------------------------------
    // 2. /developments: Drawdown, Unit Sale Debt Paydown & Rental Graduation
    // ------------------------------------------------------------------
    await expect(page).toHaveURL(/\/developments/, { timeout: 15_000 });
    await page
      .locator('text=Initializing Moremela Property Hub...')
      .waitFor({ state: 'detached', timeout: 30_000 })
      .catch(() => {});

    const toolbar = page.getByTestId('developments-header-toolbar');
    await expect(toolbar).toBeVisible({ timeout: 15_000 });
    await expect(toolbar).toContainText('E2E Golden Thread Cluster Scheme (Development)');

    // Record a senior facility drawdown first (step="any" + noValidate allows clean round ZAR amounts like 1500000)
    const financeTabBtn = page.locator('button:has-text("Finance & Pre-Sales Gate")');
    await expect(financeTabBtn).toBeVisible();
    await financeTabBtn.click();

    const financeTab = page.getByTestId('development-finance-tab');
    await expect(financeTab).toBeVisible();

    await financeTab.locator('button:has-text("+ Record Drawdown")').click();
    const drawdownModal = page.locator('[role="dialog"]');
    await expect(drawdownModal).toBeVisible();
    await drawdownModal.locator('input[type="number"]').fill('1500000');
    await drawdownModal.locator('button:has-text("Save Drawdown")').click();
    await expect(drawdownModal).toBeHidden();

    const totalDrawnRow = financeTab
      .locator('div', { has: page.locator('span:text-is("Total Drawn:")') })
      .last();
    await expect(totalDrawnRow).toContainText(/1[\s\u00a0]500[\s\u00a0]000/);

    // Mark first available unit as Sold & Transferred in Unit Inventory
    const inventoryTabBtn = page.locator('button:has-text("Unit Inventory & Split-Exit")');
    await inventoryTabBtn.click();

    const markSoldBtn = page.locator('button:has-text("Mark Sold")').first();
    await expect(markSoldBtn).toBeVisible({ timeout: 10_000 });
    await markSoldBtn.click();

    const saleModal = page.locator('[role="dialog"]');
    await expect(saleModal).toBeVisible();
    await saleModal.locator('input[type="text"]').first().fill('Test Buyer SPV');
    await saleModal.locator('button:has-text("Confirm Sale & Pay Down Debt")').click();
    await expect(saleModal).toBeHidden();

    await expect(page.locator('text=Sold & Transferred').first()).toBeVisible();

    // Verify senior debt paydown math on Finance tab
    await financeTabBtn.click();
    await expect(financeTab).toBeVisible();
    const totalRepaidRow = financeTab
      .locator('div', { has: page.locator('span:text-is("Total Repaid:")') })
      .last();
    await expect(totalRepaidRow).toContainText(/R[\s\u00a0]?[1-9]/);

    // Return to Unit Inventory and graduate retained units to /rentals
    await inventoryTabBtn.click();
    const graduateBtn = page.locator('button:has-text("Graduate Retained Units to Rentals")');
    await expect(graduateBtn).toBeVisible();
    await graduateBtn.click();

    await expect(page.locator('text=Graduated to /rentals').first()).toBeVisible({ timeout: 10_000 });

    // ------------------------------------------------------------------
    // 3. /rentals: Confirm Graduated Retained Rental Appears in Active Fleet
    // ------------------------------------------------------------------
    await page.goto('/rentals', { waitUntil: 'domcontentloaded' });
    await page
      .locator('text=Initializing Moremela Property Hub...')
      .waitFor({ state: 'detached', timeout: 30_000 })
      .catch(() => {});

    await expect(
      page.locator('text=E2E Golden Thread Cluster Scheme (Development) (Retained Rental)').first()
    ).toBeVisible({ timeout: 15_000 });

    // ------------------------------------------------------------------
    // 4. /proposal: Select Development & Verify Institutional Tear-Sheet
    // ------------------------------------------------------------------
    await page.goto('/proposal', { waitUntil: 'domcontentloaded' });
    await page
      .locator('text=Initializing Moremela Property Hub...')
      .waitFor({ state: 'detached', timeout: 30_000 })
      .catch(() => {});

    const dealSelector = page.locator('#proposal-deal-selector select').first();
    await expect(dealSelector).toBeVisible({ timeout: 15_000 });

    const devOptionValue = await dealSelector.evaluate((sel: HTMLSelectElement) => {
      const opt = Array.from(sel.options).find(
        (o) =>
          o.text.includes('[DEVELOPMENT FEASIBILITY]') &&
          o.text.includes('E2E Golden Thread Cluster Scheme')
      );
      return opt ? opt.value : '';
    });
    expect(devOptionValue).not.toBe('');
    await dealSelector.selectOption(devOptionValue);

    await expect(
      page.locator('text=Development Feasibility & Institutional Capital Stack').first()
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.locator('text=4-Pillar Commercial Bank Lending Readiness').first()
    ).toBeVisible();
    await expect(page.locator('text=1. Paper Rights').first()).toBeVisible();
    await expect(page.locator('text=3. Pre-Sales Gate').first()).toBeVisible();
    await expect(
      page.locator('text=Part 1: Institutional TDC vs GDV Capital Stack').first()
    ).toBeVisible();
    await expect(
      page.locator('text=Part 2: 2-Stage Risk Gate Callout (Senior Lender Tranche Controls)').first()
    ).toBeVisible();
    await expect(
      page.locator('text=Part 3: Debt Wipeout & Pre-Sales Breakeven Matrix').first()
    ).toBeVisible();
  });
});
