import { test, expect } from '@playwright/test';
import * as XLSX from 'xlsx';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test.describe('Tier 1 Development Collaboration: Team Ledger, 5-Sheet Excel Export & External Deal Room', () => {
  test('full collaboration, triage, /tasks sync, real .xlsx download, and public /deal-room/[token] POPIA viewer flow', async ({ page }, testInfo) => {
    if (testInfo.project.name !== 'Desktop-1280x800') {
      test.skip();
      return;
    }

    test.setTimeout(120_000);
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // Reset localStorage for deterministic clean demo state
    await page.goto('/developments', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page
      .locator('text=Initializing Moremela Property Hub...')
      .waitFor({ state: 'detached', timeout: 30_000 })
      .catch(() => {});

    // 1. Header action bar buttons present & Share Deal Room replaces Read-Only View
    const teamLedgerBtn = page.getByTestId('open-team-ledger-btn');
    const exportExcelBtn = page.getByTestId('export-team-excel-btn');
    const shareDealRoomBtn = page.getByTestId('share-deal-room-btn');
    const shareMenuBtn = page.getByTestId('share-deal-room-menu-btn');

    await expect(teamLedgerBtn).toContainText('Team Ledger (2 Open)');
    await expect(exportExcelBtn).toBeVisible();
    await expect(shareDealRoomBtn).toBeVisible();
    await expect(shareMenuBtn).toBeVisible();
    await expect(page.getByTestId('toggle-readonly-btn')).toHaveCount(0);

    // Ensure action bar buttons stay within desktop viewport width (zero horizontal clipping)
    const box = await shareDealRoomBtn.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x + box!.width).toBeLessThanOrEqual(1280);

    // 2. Open Team Ledger Modal (dynamically imported chunk)
    await teamLedgerBtn.click();
    const modal = page.getByTestId('project-comments-ledger-modal');
    await expect(modal).toBeVisible({ timeout: 15_000 });

    await expect(page.getByTestId('ledger-filter-All')).toContainText('All (3)');
    await expect(page.getByTestId('ledger-filter-Pending')).toContainText('Pending (1)');
    await expect(page.getByTestId('ledger-filter-In Progress')).toContainText('In Progress (1)');
    await expect(page.getByTestId('ledger-filter-Resolved')).toContainText('Resolved (1)');

    // Test filter pills
    await page.getByTestId('ledger-filter-Pending').click();
    await expect(page.locator('[data-testid^="comment-card-"]')).toHaveCount(1);
    await page.getByTestId('ledger-filter-Resolved').click();
    await expect(page.locator('[data-testid^="comment-card-"]')).toHaveCount(1);
    await page.getByTestId('ledger-filter-All').click();
    await expect(page.locator('[data-testid^="comment-card-"]')).toHaveCount(3);

    // 3. Author Name clear & replacement + validation + new comment submission
    const authorInput = page.locator('#comment-author-name');
    await expect(authorInput).toHaveValue('L&M Property Investments (Pty) Ltd');
    await authorInput.fill('');
    await expect(authorInput).toHaveValue(''); // Regression guard: must stay empty while typing
    await authorInput.fill('K. Naidoo (QS)');

    // Validation check on empty message
    await page.getByTestId('submit-comment-btn').click();
    await expect(modal.getByRole('alert')).toContainText('Please enter a comment or action note');

    await page.locator('#comment-author-role').selectOption('Quantity Surveyor (QS)');
    await page.locator('#comment-section-tag').selectOption('BOQ & Cost Stack');
    await page.locator('#comment-initial-status').selectOption('Pending');
    await page
      .locator('#comment-message')
      .fill('Verify roof truss quotation against revised SG footprint.');
    await page.getByTestId('submit-comment-btn').click();

    await expect(page.getByTestId('ledger-filter-All')).toContainText('All (4)');
    await expect(page.getByTestId('ledger-filter-Pending')).toContainText('Pending (2)');
    await expect(teamLedgerBtn).toContainText('Team Ledger (3 Open)');
    await expect(authorInput).toHaveValue('K. Naidoo (QS)');

    // Identify the newly created comment card
    const newCard = modal
      .locator('article[data-testid^="comment-card-"]')
      .filter({ hasText: 'Verify roof truss quotation against revised SG footprint.' });
    await expect(newCard).toBeVisible();
    const cardTestId = await newCard.getAttribute('data-testid');
    const newCommentId = cardTestId!.replace('comment-card-', '');

    // 4. 1-click inline status triage: Pending -> In Progress -> Resolved -> Pending
    await page.getByTestId(`triage-btn-${newCommentId}-In Progress`).click();
    await expect(page.getByTestId(`comment-status-badge-${newCommentId}`)).toContainText('In Progress');

    await page.getByTestId(`triage-btn-${newCommentId}-Resolved`).click();
    await expect(page.getByTestId(`comment-status-badge-${newCommentId}`)).toContainText('Resolved');
    await expect(newCard).toContainText('Resolved on ');
    await expect(page.getByTestId(`sync-task-btn-${newCommentId}`)).toBeHidden();
    await expect(teamLedgerBtn).toContainText('Team Ledger (2 Open)');

    // Reopen back to Pending
    await page.getByTestId(`triage-btn-${newCommentId}-Pending`).click();
    await expect(page.getByTestId(`comment-status-badge-${newCommentId}`)).toContainText('Pending');
    await expect(newCard).not.toContainText('Resolved on ');
    await expect(teamLedgerBtn).toContainText('Team Ledger (3 Open)');

    // 5. Sync to /tasks
    const syncBtn = page.getByTestId(`sync-task-btn-${newCommentId}`);
    await syncBtn.click();
    await expect(syncBtn).toBeDisabled();
    await expect(syncBtn).toContainText('Synced to /tasks');

    // 6. Escape & backdrop close
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();

    await teamLedgerBtn.click();
    await expect(modal).toBeVisible();
    await modal.click({ position: { x: 10, y: 10 } });
    await expect(modal).toBeHidden();

    // 7. Real 5-Sheet Excel (.xlsx) browser download & SheetJS binary parse verification
    const downloadPromise = page.waitForEvent('download');
    await exportExcelBtn.click();
    const download = await downloadPromise;

    const suggestedFilename = download.suggestedFilename();
    expect(suggestedFilename).toMatch(
      /^moremela-dev-ferndale-6-unit-cluster-subdivision-team-pack-\d{4}-\d{2}-\d{2}\.xlsx$/
    );
    await expect(page.getByTestId('export-toast-banner')).toContainText(
      '5-Sheet External Team Workbook (.xlsx) exported!'
    );

    const tmpXlsxPath = path.join(os.tmpdir(), `e2e-${Date.now()}-${suggestedFilename}`);
    await download.saveAs(tmpXlsxPath);
    try {
      const wb = XLSX.readFile(tmpXlsxPath);
      expect(wb.SheetNames).toEqual([
        'Executive & Capital Stack',
        'Unit Inventory & Split-Exit',
        'Cost Stack & Hard Build BOQ',
        'Paper Rights & Approvals',
        'Team Comments & Action Ledger',
      ]);

      const ws5Rows = XLSX.utils.sheet_to_json<(string | number)[]>(
        wb.Sheets['Team Comments & Action Ledger'],
        { header: 1 }
      );
      expect(ws5Rows).toHaveLength(5); // header + 4 comments
      expect(
        ws5Rows.some((r) => String(r[5]).includes('Verify roof truss quotation against revised SG footprint.'))
      ).toBe(true);

      const ws1 = wb.Sheets['Executive & Capital Stack'];
      const ws1Rows = XLSX.utils.sheet_to_json<(string | number)[]>(ws1, { header: 1 });
      const tdcIdx = ws1Rows.findIndex((r) => r[0] === 'Total Development Cost / TDC (ZAR)');
      expect(tdcIdx).toBeGreaterThan(-1);
      const tdcCell = ws1[XLSX.utils.encode_cell({ r: tdcIdx, c: 1 })];
      expect(tdcCell?.t).toBe('n');
    } finally {
      if (fs.existsSync(tmpXlsxPath)) fs.unlinkSync(tmpXlsxPath);
    }

    // 8. Navigate to /tasks and filter by Developments
    await page.goto('/tasks', { waitUntil: 'domcontentloaded' });
    await page
      .locator('text=Initializing Moremela Property Hub...')
      .waitFor({ state: 'detached', timeout: 30_000 })
      .catch(() => {});
    await page.getByLabel('Filter by Linked Entity').selectOption('development');
    await expect(
      page.locator('[data-testid^="task-card-"]').filter({
        hasText: 'Verify roof truss quotation against revised SG footprint.',
      })
    ).toBeVisible();

    // 9. Navigate to standalone public /deal-room/dev-1 & verify POPIA privacy + rate-limited external comment intake + masked Excel export
    await page.goto('/deal-room/dev-1', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('public-deal-room-viewer')).toBeVisible();
    await expect(page.getByTestId('deal-room-popia-badge')).toContainText('POPIA Privacy Masked');
    await expect(page.getByTestId('deal-room-zoning-strip')).toBeVisible();

    // Standalone chrome: App Sidebar must NOT render on /deal-room/*
    await expect(page.locator('aside')).toHaveCount(0);

    // POPIA Privacy Masking: buyer names & conveyancer refs must never appear on public Deal Room
    const viewerText = await page.getByTestId('public-deal-room-viewer').innerText();
    expect(viewerText).not.toContain('Kagiso Sithole');
    expect(viewerText).not.toContain('Nadine van der Merwe');
    expect(viewerText).not.toContain('CV/2026/');
    expect(viewerText).toContain('Private Buyer (Masked)');

    // Tab 1: Units locked
    await expect(page.getByRole('button', { name: /\+ Add Unit/i })).toBeDisabled();
    await expect(page.getByRole('button', { name: /Mark Sold/i }).first()).toBeDisabled();

    // Tab 2: Cost Stack locked except CSV
    await page.getByTestId('deal-room-tab-costs').click();
    await expect(page.getByRole('button', { name: /Add BOQ Item/i })).toBeDisabled();
    await expect(page.getByRole('button', { name: /Export BOQ \(CSV\)/i })).toBeEnabled();

    // Tab 3: Paper Rights & Approvals (Simulate Objection Delay must stay enabled!)
    await page.getByTestId('deal-room-tab-approvals').click();
    const simBtn = page.getByRole('button', { name: /Simulate Objection Delay/i });
    await expect(simBtn).toBeEnabled();
    await simBtn.click();
    await expect(page.getByText('Municipal Objection & Carrying Burn Simulator')).toBeVisible();
    await page.getByRole('button', { name: /Close Simulator/i }).click();

    // Tab 4: Finance locked
    await page.getByTestId('deal-room-tab-finance').click();
    await expect(page.getByRole('button', { name: /\+ Record Drawdown/i })).toBeDisabled();
    await expect(page.getByRole('button', { name: /Record Repayment/i })).toBeDisabled();

    // Public Excel Export contains POPIA-masked buyers and zero conveyancer refs
    const [dealRoomDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('deal-room-export-excel-btn').click(),
    ]);
    const dealRoomTmpPath = path.join(os.tmpdir(), `e2e-dr-${Date.now()}.xlsx`);
    await dealRoomDownload.saveAs(dealRoomTmpPath);
    try {
      const drWb = XLSX.readFile(dealRoomTmpPath);
      expect(drWb.SheetNames).toHaveLength(5);
      const unitSheetRows = XLSX.utils.sheet_to_json<(string | number)[]>(
        drWb.Sheets['Unit Inventory & Split-Exit'],
        { header: 1 }
      );
      const flatSheetText = JSON.stringify(unitSheetRows);
      expect(flatSheetText).not.toContain('Kagiso Sithole');
      expect(flatSheetText).not.toContain('CV/2026/');
      expect(flatSheetText).toContain('Private Buyer (Masked)');
    } finally {
      if (fs.existsSync(dealRoomTmpPath)) fs.unlinkSync(dealRoomTmpPath);
    }

    // External comment intake: filter existing notes, submit new Pending comment, no edit/delete/triage
    await expect(page.locator('[data-testid^="triage-btn-"]')).toHaveCount(0);
    await expect(page.locator('[data-testid^="delete-comment-btn-"]')).toHaveCount(0);
    await expect(page.locator('[data-testid^="sync-task-btn-"]')).toHaveCount(0);

    await page.getByTestId('deal-room-author-input').fill('E2E External QS Practice');
    await page.getByTestId('deal-room-role-select').selectOption('Quantity Surveyor (QS)');
    await page.getByTestId('deal-room-section-select').selectOption('BOQ & Cost Stack');
    await page
      .getByTestId('deal-room-message-input')
      .fill('External QS check: verify provisional PC sums for external paving.');
    await page.getByTestId('deal-room-submit-comment-btn').click();

    await expect(page.getByTestId('deal-room-comment-success')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('deal-room-ledger-section')).toContainText(
      'External QS check: verify provisional PC sums for external paving.'
    );

    // 10. Developer opens Team Ledger on /developments -> auto-syncs external comment
    await page.goto('/developments', { waitUntil: 'domcontentloaded' });
    await page
      .locator('text=Initializing Moremela Property Hub...')
      .waitFor({ state: 'detached', timeout: 30_000 })
      .catch(() => {});
    await page.getByTestId('open-team-ledger-btn').click();
    await expect(page.getByTestId('project-comments-ledger-modal')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('project-comments-ledger-modal')).toContainText(
      'External QS check: verify provisional PC sums for external paving.'
    );

    // 11. Invalid Deal Room token returns 404
    const invalidRes = await page.goto('/deal-room/invalid-nonexistent-token-e2e', {
      waitUntil: 'domcontentloaded',
    });
    expect(invalidRes?.status()).toBe(404);

    expect(pageErrors).toEqual([]);
  });
});
