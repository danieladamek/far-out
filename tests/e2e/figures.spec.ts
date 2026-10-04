import { expect, test } from '@playwright/test';

test('a chart tooltip appears on hover', async ({ page }) => {
  await page.goto('/figures/goals-vs-results');
  const bar = page.locator('.recharts-bar-rectangle').first();
  await bar.hover();
  await expect(page.getByTestId('chart-tooltip')).toBeVisible();
  await expect(page.getByTestId('chart-tooltip')).toContainText('ref');
});

test('every figure page offers SVG, PDF, data and the script, and names its references', async ({ page }) => {
  await page.goto('/figures/thresholds-2025');
  const dl = page.getByTestId('figure-downloads');
  for (const name of ['SVG', 'PDF']) await expect(dl.getByRole('button', { name })).toBeVisible();
  await expect(dl.locator('a[href$="thresholds-2025.csv"]')).toBeVisible();
  await expect(dl.locator('a[href$="thresholds-2025.py"]')).toBeVisible();
  const r = await page.request.get('/figures/thresholds-2025.py');
  expect(r.status()).toBe(200);
  await expect(page.getByTestId('figure-refs').locator('button.bx-cite').first()).toBeVisible();
  await expect(page.getByTestId('figure-synthesis')).toContainText('synthesised from data');
  const [pdf] = await Promise.all([page.waitForEvent('download'), dl.getByRole('button', { name: 'PDF' }).click()]);
  expect(pdf.suggestedFilename()).toBe('thresholds-2025.pdf');
});

test('the pathway figure: a node card links to its record', async ({ page }) => {
  await page.goto('/figures/route-decision');
  await page.getByTestId('node-gate-sam').focus();
  await expect(page.getByTestId('pathway-card')).toContainText('Register in SAM.gov');
  await page.getByTestId('pathway-card').getByRole('link').click();
  await expect(page).toHaveURL(/\/gates#sam-registration-uei/);
});
