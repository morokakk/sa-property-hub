import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

// ─── Configuration ──────────────────────────────────────────────────────
const BASE_URL = 'http://localhost:3000';

const PAGES = [
  { name: 'Dashboard', path: '/' },
  { name: 'Analyzer', path: '/analyzer' },
  { name: 'Flips', path: '/flips' },
  { name: 'Funding', path: '/funding' },
  { name: 'Rentals', path: '/rentals' },
  { name: 'Tasks', path: '/tasks' },
  { name: 'Proposal', path: '/proposal' },
  { name: 'Settings', path: '/settings' },
];

// ─── Layout Check Helpers ───────────────────────────────────────────────

interface LayoutIssue {
  type: 'horizontal-overflow' | 'clipped-element' | 'small-touch-target' | 'text-overflow';
  selector: string;
  description: string;
  rect?: { x: number; y: number; width: number; height: number };
}

async function checkHorizontalOverflow(page: Page): Promise<LayoutIssue[]> {
  return page.evaluate(() => {
    const issues: any[] = [];
    const viewportWidth = document.documentElement.clientWidth;

    // Check if body/html has horizontal scroll
    if (document.body.scrollWidth > viewportWidth + 2) {
      issues.push({
        type: 'horizontal-overflow',
        selector: 'body',
        description: `Body scrollWidth (${document.body.scrollWidth}px) exceeds viewport (${viewportWidth}px) by ${document.body.scrollWidth - viewportWidth}px`,
      });
    }

    // Check elements for overflow
    const allElements = document.querySelectorAll('*');
    for (const el of allElements) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.right > viewportWidth + 5) {
        const tag = el.tagName.toLowerCase();
        const cls = el.className?.toString().slice(0, 80) || '';
        const id = el.id || '';
        issues.push({
          type: 'horizontal-overflow',
          selector: `${tag}${id ? '#' + id : ''}${cls ? '.' + cls.split(' ')[0] : ''}`,
          description: `Element extends ${Math.round(rect.right - viewportWidth)}px beyond viewport right edge`,
          rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
        });
      }
    }

    return issues.slice(0, 20);
  });
}

async function checkSmallTouchTargets(page: Page): Promise<LayoutIssue[]> {
  return page.evaluate(() => {
    const issues: any[] = [];
    const minSize = 44; // WCAG minimum touch target size
    const interactiveSelectors = 'a, button, [role="button"], input, select, textarea, label[for]';
    const elements = document.querySelectorAll(interactiveSelectors);

    for (const el of elements) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (rect.top > window.innerHeight + 100) continue;

      const styles = window.getComputedStyle(el);
      if (styles.display === 'none' || styles.visibility === 'hidden') continue;

      if (rect.width < minSize || rect.height < minSize) {
        const tag = el.tagName.toLowerCase();
        const text = (el.textContent || '').trim().slice(0, 40);
        const cls = el.className?.toString().slice(0, 60) || '';
        issues.push({
          type: 'small-touch-target',
          selector: `${tag}${cls ? '.' + cls.split(' ')[0] : ''}`,
          description: `Touch target ${Math.round(rect.width)}×${Math.round(rect.height)}px < ${minSize}×${minSize}px minimum. Text: "${text}"`,
          rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
        });
      }
    }

    return issues.slice(0, 30);
  });
}

async function checkTextOverflow(page: Page): Promise<LayoutIssue[]> {
  return page.evaluate(() => {
    const issues: any[] = [];
    const textElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div, td, th, label');

    for (const el of textElements) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (rect.top > window.innerHeight + 100) continue;

      const styles = window.getComputedStyle(el);
      if (styles.display === 'none' || styles.visibility === 'hidden') continue;

      if (el.scrollWidth > el.clientWidth + 2) {
        const overflow = styles.overflow || styles.overflowX;
        const textOverflow = styles.textOverflow;
        if (overflow !== 'hidden' || textOverflow !== 'ellipsis') {
          const tag = el.tagName.toLowerCase();
          const text = (el.textContent || '').trim().slice(0, 50);
          if (text.length > 5) {
            issues.push({
              type: 'text-overflow',
              selector: `${tag}`,
              description: `Text overflows container by ${Math.round(el.scrollWidth - el.clientWidth)}px without truncation. Text: "${text}"`,
              rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
            });
          }
        }
      }
    }

    return issues.slice(0, 20);
  });
}

// ─── Test: Screenshot all pages ─────────────────────────────────────────

test.describe('Responsive Audit - All Pages', () => {
  for (const pageConfig of PAGES) {
    test(`${pageConfig.name} page`, async ({ page }, testInfo) => {
      const projectName = testInfo.project.name;
      const screenshotDir = path.join('e2e', 'screenshots', projectName);
      fs.mkdirSync(screenshotDir, { recursive: true });

      // Navigate and wait for content
      await page.goto(pageConfig.path, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500); // Let animations & hydration settle

      // Take full-page screenshot
      await page.screenshot({
        path: path.join(screenshotDir, `${pageConfig.name}.png`),
        fullPage: true,
      });

      // Run layout checks
      const overflowIssues = await checkHorizontalOverflow(page);
      const touchIssues = await checkSmallTouchTargets(page);
      const textIssues = await checkTextOverflow(page);

      const allIssues = [...overflowIssues, ...touchIssues, ...textIssues];

      // Write issues to JSON
      if (allIssues.length > 0) {
        const issueFile = path.join(screenshotDir, `${pageConfig.name}-issues.json`);
        fs.writeFileSync(issueFile, JSON.stringify(allIssues, null, 2));
      }

      // Log summary
      console.log(
        `📊 ${pageConfig.name} @ ${projectName}: ` +
          `${overflowIssues.length} overflow, ${touchIssues.length} touch, ${textIssues.length} text issues`
      );
    });
  }
});

// ─── Test: Mobile Bottom Nav ────────────────────────────────────────────

test.describe('Mobile Navigation Audit', () => {
  test('Bottom nav is visible on mobile', async ({ page }, testInfo) => {
    if (!testInfo.project.name.includes('375')) {
      test.skip();
      return;
    }

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Check bottom nav exists
    const bottomNav = page.locator('nav[aria-label="Mobile bottom navigation"]');
    await expect(bottomNav).toBeVisible();

    // Screenshot with bottom nav
    await page.screenshot({
      path: 'e2e/screenshots/Mobile-375x667/BottomNav.png',
      fullPage: false,
    });
  });

  test('Sidebar is hidden on mobile', async ({ page }, testInfo) => {
    if (!testInfo.project.name.includes('375')) {
      test.skip();
      return;
    }

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Desktop sidebar should be hidden
    const sidebar = page.locator('aside').first();
    await expect(sidebar).toBeHidden();
  });

  test('More drawer opens on mobile', async ({ page }, testInfo) => {
    if (!testInfo.project.name.includes('375')) {
      test.skip();
      return;
    }

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Click the "More" button in bottom nav
    const moreBtn = page.locator('button[aria-label="Open more modules"]');
    await moreBtn.click();
    await page.waitForTimeout(500);

    // Take screenshot of drawer
    await page.screenshot({
      path: 'e2e/screenshots/Mobile-375x667/MoreDrawer.png',
      fullPage: false,
    });

    // Verify drawer content is visible
    const drawerNav = page.locator('text=Navigation').first();
    await expect(drawerNav).toBeVisible();
  });
});

// ─── Test: Desktop Sidebar ──────────────────────────────────────────────

test.describe('Desktop Navigation Audit', () => {
  test('Sidebar is visible on desktop', async ({ page }, testInfo) => {
    if (!testInfo.project.name.includes('1280')) {
      test.skip();
      return;
    }

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Desktop sidebar should be visible
    const sidebar = page.locator('aside').first();
    await expect(sidebar).toBeVisible();

    // Bottom nav should be hidden on desktop
    const bottomNav = page.locator('nav[aria-label="Mobile bottom navigation"]');
    await expect(bottomNav).toBeHidden();
  });
});

// ─── Test: Modal Responsiveness ─────────────────────────────────────────

test.describe('Modal Responsiveness Audit', () => {
  test('Seed Capital modal on Dashboard', async ({ page }, testInfo) => {
    const projectName = testInfo.project.name;
    const screenshotDir = path.join('e2e', 'screenshots', projectName);
    fs.mkdirSync(screenshotDir, { recursive: true });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Try to find and click the Edit icon for seed capital
    const editBtn = page.locator('button[title="Edit Seed Capital Reserve"]').first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await page.waitForTimeout(500);

      await page.screenshot({
        path: path.join(screenshotDir, 'Modal-SeedCapital.png'),
        fullPage: false,
      });

      const overflowIssues = await checkHorizontalOverflow(page);
      if (overflowIssues.length > 0) {
        console.log(`⚠️  Seed Capital Modal overflow at ${projectName}:`);
        overflowIssues.forEach((i) => console.log(`   → ${i.description}`));
      }
    }
  });

  test('Add Rental modal', async ({ page }, testInfo) => {
    const projectName = testInfo.project.name;
    const screenshotDir = path.join('e2e', 'screenshots', projectName);
    fs.mkdirSync(screenshotDir, { recursive: true });

    await page.goto('/rentals', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Click "Add Rental Property" button
    const addBtn = page.locator('text=Add Rental Property').first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(800);

      await page.screenshot({
        path: path.join(screenshotDir, 'Modal-AddRental.png'),
        fullPage: false,
      });

      const overflowIssues = await checkHorizontalOverflow(page);
      if (overflowIssues.length > 0) {
        console.log(`⚠️  Add Rental Modal overflow at ${projectName}:`);
        overflowIssues.forEach((i) => console.log(`   → ${i.description}`));
      }
    }
  });

  test('Add Task modal', async ({ page }, testInfo) => {
    const projectName = testInfo.project.name;
    const screenshotDir = path.join('e2e', 'screenshots', projectName);
    fs.mkdirSync(screenshotDir, { recursive: true });

    await page.goto('/tasks', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const addBtn = page.locator('text=New Task').first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(800);

      await page.screenshot({
        path: path.join(screenshotDir, 'Modal-AddTask.png'),
        fullPage: false,
      });
    }
  });

  test('Add Funding modal', async ({ page }, testInfo) => {
    const projectName = testInfo.project.name;
    const screenshotDir = path.join('e2e', 'screenshots', projectName);
    fs.mkdirSync(screenshotDir, { recursive: true });

    await page.goto('/funding', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const addBtn = page.locator('text=Add Capital Source').first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(800);

      await page.screenshot({
        path: path.join(screenshotDir, 'Modal-AddFunding.png'),
        fullPage: false,
      });

      const overflowIssues = await checkHorizontalOverflow(page);
      if (overflowIssues.length > 0) {
        console.log(`⚠️  Add Funding Modal overflow at ${projectName}:`);
        overflowIssues.forEach((i) => console.log(`   → ${i.description}`));
      }
    }
  });

  test('MAO Quick Solver modal on Analyzer', async ({ page }, testInfo) => {
    const projectName = testInfo.project.name;
    const screenshotDir = path.join('e2e', 'screenshots', projectName);
    fs.mkdirSync(screenshotDir, { recursive: true });

    await page.goto('/analyzer', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    const solveBidBtn = page.locator('button:has-text("Solve Max Bid")').first();
    await solveBidBtn.scrollIntoViewIfNeeded();
    await solveBidBtn.click();
    await page.waitForTimeout(600);

    await page.screenshot({
      path: path.join(screenshotDir, 'Modal-MaoSolver.png'),
      fullPage: false,
    });

    const overflowIssues = await checkHorizontalOverflow(page);
    expect(overflowIssues).toHaveLength(0);
  });
});
