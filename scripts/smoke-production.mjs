import { chromium } from 'playwright';
import { mkdir, readFile } from 'node:fs/promises';

const url = process.env.PRODUCTION_URL || 'https://prime-lifting.yoshimura-yuki.workers.dev/';
// Match the news version in the checked-out source instead of a stale literal.
const sourceHtml = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const expected = sourceHtml.match(/id="update-news-dialog"[^>]*data-news-version="([^"]+)"/)?.[1];
if (!expected) throw new Error('Missing data-news-version in source index.html');
const artifacts = 'smoke-artifacts';
await mkdir(artifacts, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [];
let page;
try {
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  let ready = false;
  // Cloudflare deployments can lag the main-branch merge by a few minutes.
  for (let attempt = 1; attempt <= 8; attempt++) {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (response?.ok()) {
      const version = await page.locator('#update-news-dialog').getAttribute('data-news-version').catch(() => null);
      if (version === expected) { ready = true; break; }
    }
    console.log('Waiting for production deployment:', attempt);
    await page.waitForTimeout(30000);
  }
  if (!ready) throw new Error('Production does not serve the expected update version yet');
  const dialog = page.locator('#update-news-dialog');
  await page.waitForLoadState('load');
  await dialog.waitFor({ state: 'visible', timeout: 15000 });
  const bell = page.locator('[data-open-updates]').first();
  if (!(await bell.count())) throw new Error('Update bell missing');
  if (!(await bell.evaluate(el => el.classList.contains('news-unread')))) throw new Error('Unread badge missing');
  await page.locator('#update-news-close').click();
  await dialog.waitFor({ state: 'hidden' });
  if (await bell.evaluate(el => el.classList.contains('news-unread'))) throw new Error('Unread badge did not clear');
  await page.reload({ waitUntil: 'load' });
  if (await dialog.isVisible()) throw new Error('Popup reopened after being acknowledged');
  await page.locator('[data-open-updates]:visible').first().click();
  await dialog.waitFor({ state: 'visible' });
  if (errors.length) throw new Error('Browser errors: ' + errors.join(' | '));
  console.log('PASS: production HTML, unread badge, popup, acknowledgement, reload and bell reopening');
} catch (error) {
  console.error(error);
  if (page) await page.screenshot({ path: artifacts + '/failure.png', fullPage: true }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
}
