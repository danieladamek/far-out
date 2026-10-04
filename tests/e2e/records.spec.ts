import { expect, test } from '@playwright/test';

test('a CMMC gate renders the rule and the suspension as two labelled blocks, secondary-only items marked', async ({ page }) => {
  await page.goto('/gates#cmmc');
  const gate = page.getByTestId('rec-cmmc');
  await expect(gate.getByTestId('gate-rule')).toBeVisible();
  await expect(gate.getByTestId('gate-suspension')).toBeVisible();
  await expect(gate.getByTestId('secondary-only').first()).toContainText('reported by secondary sources only');
});

test('a status: unconfirmed program shows its banner', async ({ page }) => {
  await page.goto('/programs');
  const card = page.locator('li', { hasText: 'not confirmed as live on' }).first();
  await expect(card).toBeVisible();
  await card.locator('a').first().click();
  await expect(page.getByTestId('unconfirmed-banner')).toContainText('Not confirmed as live on 2026-10-03');
});

test('a consortium page renders membership fees exactly as posted', async ({ page }) => {
  await page.goto('/programs/s2marts');
  await expect(page.getByTestId('membership')).toBeVisible();
  await expect(page.getByTestId('fees-table')).toContainText('$250');
});

test('a record conflicts block renders, and pending changes carry status and date', async ({ page }) => {
  await page.goto('/routes/sbir-phase-i-grant-agencies');
  await expect(page.getByTestId('pending-changes')).toContainText('pending implementation');
  await page.goto('/status#8a-business-development');
  await expect(page.getByTestId('cert-8a-business-development').getByTestId('conflicts')).toBeVisible();
  await expect(page.getByTestId('cert-8a-business-development').getByTestId('far-vs-cfr')).toBeVisible();
});

test('a route with feed: none says no public feed carries it', async ({ page }) => {
  await page.goto('/routes/transition-after-phase-ii');
  await expect(page.getByTestId('no-feed')).toContainText('No public feed carries this route');
});
