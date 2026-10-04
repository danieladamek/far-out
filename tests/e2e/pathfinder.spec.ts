import { expect, test } from '@playwright/test';

test('answer "has a technology" → SBIR routes appear with a reason; "clear my answers" empties localStorage', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('always-show')).toBeVisible();
  await page.locator('label[for="opt-situation-have-technology"]').click();
  const sbir = page.getByTestId('pf-family-sbir-sttr');
  await expect(sbir).toBeVisible();
  const first = sbir.locator('li').first();
  await expect(first.getByTestId('pf-reason')).toContainText('Has a technology that needs funding');
  await expect(page.getByTestId('pf-route-sbir-phase-i-grant-agencies')).toBeVisible();
  expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.includes('pathfinder')).length)).toBe(1);
  await page.reload();
  await expect(page.getByTestId('pf-route-sbir-phase-i-grant-agencies')).toBeVisible();
  await page.getByTestId('clear-answers').click();
  expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.includes('pathfinder')).length)).toBe(0);
  await expect(page.getByTestId('pf-route-sbir-phase-i-grant-agencies')).toHaveCount(0);
  await expect(page.getByTestId('pf-rule')).toContainText('no route is ever recommended');
});
