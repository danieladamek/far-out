import { expect, test } from '@playwright/test';

/** KICKOFF §5: no request leaves the page except to api.usaspending.gov on /partners. */
test('no request leaves this site except USAspending on /partners', async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const outside: string[] = [];
  page.on('request', (r) => { const u = r.url(); if (!u.startsWith(origin) && !u.startsWith('data:') && !u.startsWith('blob:')) outside.push(`${page.url()} → ${u}`); });
  await page.route('https://api.usaspending.gov/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"results":[],"messages":[]}', headers: { 'access-control-allow-origin': '*' } }));
  for (const p of ['/', '/read', '/routes/sbir-phase-i-grant-agencies', '/programs/s2marts', '/gates', '/find', '/figures/goals-vs-results', '/references', '/methods', '/glossary']) {
    await page.goto(p);
    await expect(page.locator('main h1').first()).toBeVisible();
    await page.waitForTimeout(300);
  }
  await page.goto('/partners');
  await page.getByTestId('partners-naics').fill('541512');
  await page.getByTestId('partners-run').click();
  await expect(page.getByTestId('partners-results')).toBeVisible();
  const notUsa = outside.filter((u) => !u.includes('→ https://api.usaspending.gov/'));
  expect(notUsa).toEqual([]);
  expect(outside.every((u) => u.includes('/partners'))).toBe(true);
  expect(outside.length).toBeGreaterThan(0);
});
