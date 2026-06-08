/**
 * Browser test: admin login + applications table populated.
 * Run: node scripts/test-admin-browser.mjs [baseUrl]
 */
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://localhost:3456';
const url = base.replace(/\/$/, '') + '/admin/vendors/';
const password = "we'll-get-it-done";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const apiErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') apiErrors.push(msg.text());
  });
  page.on('pageerror', (err) => apiErrors.push(String(err)));

  await page.goto(url, { waitUntil: 'networkidle' });

  await page.fill('#admin-password', password);
  await page.click('#login-btn');

  await page.waitForSelector('#admin-app', { state: 'visible', timeout: 15000 });

  await page.click('.nav-item[data-page="applications"]');
  await page.waitForTimeout(3000);

  const appsHtml = await page.locator('#apps-table').innerHTML();
  const vendorsHtml = await page.locator('#vendors-table').innerHTML();
  const appsError = await page.locator('#apps-error').isVisible();
  const appsErrorText = appsError ? await page.locator('#apps-error').textContent() : '';

  const hasApps = !appsHtml.includes('No applications yet');
  const hasVendors = !vendorsHtml.includes('No vendors');

  console.log('URL:', url);
  console.log('apps table has data:', hasApps);
  console.log('vendors table has data:', hasVendors);
  if (appsErrorText) console.log('apps-error:', appsErrorText);
  if (apiErrors.length) console.log('console errors:', apiErrors.slice(0, 5));

  await browser.close();

  if (!hasApps || !hasVendors) {
    console.error('FAIL browser admin test');
    process.exit(1);
  }
  console.log('PASS browser admin test');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
