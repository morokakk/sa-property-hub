import { chromium } from '@playwright/test';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\morok\\.gemini\\antigravity\\brain\\c34608ee-c129-4651-837b-8704380c6a48';

async function main() {
  const browser = await chromium.launch({ headless: true });
  
  // 1. Desktop Screenshot of Statement Portal
  const desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 950 },
    deviceScaleFactor: 2,
  });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto('http://localhost:3000/statement/lease-1', { waitUntil: 'networkidle' });
  await desktopPage.waitForSelector('#tenant-statement-print-root');
  
  const desktopScreenshotPath = path.join(ARTIFACT_DIR, 'tenant_statement_portal_desktop.png');
  await desktopPage.screenshot({ path: desktopScreenshotPath, fullPage: true });
  console.log('Saved desktop screenshot:', desktopScreenshotPath);

  // 2. Mobile Screenshot of Statement Portal
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://localhost:3000/statement/lease-1', { waitUntil: 'networkidle' });
  await mobilePage.waitForSelector('#tenant-statement-print-root');
  
  const mobileScreenshotPath = path.join(ARTIFACT_DIR, 'tenant_statement_portal_mobile.png');
  await mobilePage.screenshot({ path: mobileScreenshotPath, fullPage: true });
  console.log('Saved mobile screenshot:', mobileScreenshotPath);

  // 3. Desktop Screenshot of Landlord Modal with Two-Tier Header & Link Copy Button
  const modalContext = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
  });
  const modalPage = await modalContext.newPage();
  await modalPage.goto('http://localhost:3000/rentals', { waitUntil: 'networkidle' });
  const statementBtn = modalPage.locator('button:has-text("Utilities & Statement")').first();
  await statementBtn.waitFor({ state: 'visible' });
  await statementBtn.click();
  await modalPage.waitForSelector('#tenant-statement-print-root');
  await modalPage.waitForTimeout(500); // allow transitions
  
  const modalScreenshotPath = path.join(ARTIFACT_DIR, 'landlord_statement_modal_header.png');
  await modalPage.screenshot({ path: modalScreenshotPath, fullPage: false });
  console.log('Saved landlord modal screenshot:', modalScreenshotPath);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
