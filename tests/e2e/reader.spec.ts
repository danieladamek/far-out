import { expect, test } from '@playwright/test';

test('a term popover opens by keyboard and closes with Esc, returning focus', async ({ page }) => {
  await page.goto('/read');
  const term = page.locator('article button.bx-term').first();
  await term.focus();
  await page.keyboard.press('Enter');
  const pop = page.locator('[data-testid$="-popover"]').first();
  await expect(pop).toBeVisible();
  await expect(pop).toContainText('Full entry');
  await page.keyboard.press('Escape');
  await expect(pop).toBeHidden();
  await expect(term).toBeFocused();
});

test('a citation fold-out shows the card with “rechecked”', async ({ page }) => {
  await page.goto('/read');
  await page.getByTestId('cite-3').first().click();
  const fo = page.getByTestId('citation-foldout').first();
  await expect(fo).toBeVisible();
  await expect(fo.getByTestId('ref-card-3')).toBeVisible();
  await expect(fo.getByTestId('rechecked')).toContainText('rechecked 2026-10');
});

test('synthesis passages are visibly marked', async ({ page }) => {
  await page.goto('/read');
  const s = page.getByTestId('synthesis-block').first();
  await expect(s).toBeVisible();
  await expect(s).toContainText('synthesis');
});

test('dark mode toggles and persists across a reload', async ({ page }) => {
  await page.goto('/');
  const before = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  await page.getByTestId('theme-toggle').click();
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(!before);
  await page.reload();
  expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(!before);
});

for (const route of ['/', '/read', '/find', '/figures/goals-vs-results']) {
  test(`375 px: ${route} lays out without horizontal page scroll`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(route);
    await expect(page.locator('main h1').first()).toBeVisible();
    await page.waitForTimeout(400);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(over).toBeLessThanOrEqual(1);
  });
}
