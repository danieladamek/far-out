import { expect, test } from '@playwright/test';

test('/find: harvest date and counts; keyword; SBIR toggle; a route saved filter; results link out', async ({ page }) => {
  await page.goto('/find');
  await expect(page.getByTestId('harvest-date')).toBeVisible();
  await expect(page.getByTestId('count-sam')).not.toHaveText('0');
  await expect(page.getByTestId('count-grants')).not.toHaveText('0');
  await expect(page.getByTestId('find-status')).toContainText('result');
  const all = await page.getByTestId('find-result').count();
  expect(all).toBeGreaterThan(5);
  await page.getByTestId('find-q').fill('hyperspectral');
  await expect(page.getByTestId('find-result')).toHaveCount(1);
  await page.getByTestId('find-q').fill('');
  await page.getByTestId('find-sbir').check();
  const n = await page.getByTestId('find-result').count();
  expect(n).toBeGreaterThan(0);
  for (const t of await page.getByTestId('find-result').locator('a').allTextContents()) expect(t).toMatch(/\bS[BT]IR\b|\bSTTR\b|Small Business (Innovation|Technology)/i);
  await page.getByTestId('saved-sbir-phase-i-contract-agencies').click();
  await expect(page).toHaveURL(/saved=sbir-phase-i-contract-agencies/);
  await expect(page.getByTestId('find-status')).toContainText('saved search');
  const link = page.getByTestId('find-result').first().locator('a');
  await expect(link).toHaveAttribute('href', /^https:\/\/sam\.gov\/opp\//);
  await expect(link).toHaveAttribute('target', '_blank');
});

test('a route page opens /find with its saved filter applied', async ({ page }) => {
  await page.goto('/routes/sbir-phase-i-grant-agencies');
  await page.getByTestId('open-find').click();
  await expect(page).toHaveURL(/\/find\?.*feed=grants/);
  await expect(page.getByTestId('find-result').first().locator('a')).toHaveAttribute('href', /grants\.gov\/search-results-detail\//);
});

test('/find with the data folder missing shows the degrade message and the deep links, never an error', async ({ page }) => {
  await page.route('**/data/opportunities/**', (r) => r.fulfill({ status: 404, body: 'not found' }));
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/find');
  await expect(page.getByTestId('find-degraded')).toBeVisible();
  await expect(page.getByTestId('find-degraded').locator('a[href^="https://sam.gov"]')).toBeVisible();
  expect(errors).toEqual([]);
});
