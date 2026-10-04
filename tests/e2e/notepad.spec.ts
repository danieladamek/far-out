import fs from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const SENTENCE = 'The Phase I ceiling on the agency page differs from the directive, so check both before applying.';

async function typeIntoNewNote(page: Page) {
  const drawer = page.getByTestId('notepad-drawer');
  await expect(drawer).toBeVisible();
  await drawer.getByTestId('new-note').click();
  const body = drawer.getByTestId('note-body').first();
  await expect(body).toBeFocused();
  await page.keyboard.type(SENTENCE, { delay: 10 });
  await expect(body).toHaveValue(SENTENCE);
  await expect(body).toBeFocused();
}

test('drawer on a page other than /read: a full sentence arrives whole and the textarea keeps focus', async ({ page }) => {
  await page.goto('/gates');
  await page.getByTestId('notepad-toggle').click();
  await typeIntoNewNote(page);
});

test('drawer on /read at 375 px: a full sentence arrives whole and keeps focus', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/read');
  await page.getByRole('button', { name: 'Open notepad' }).click();
  await typeIntoNewNote(page);
});

test('served here (notes_storage: browser) the panel and /notes say "Saved in this browser only — export to keep a copy."', async ({ page }) => {
  await page.goto('/routes');
  await page.getByTestId('notepad-toggle').click();
  await expect(page.getByTestId('notepad-drawer').getByTestId('save-status')).toHaveText('Saved in this browser only — export to keep a copy.');
  await page.goto('/notes');
  await expect(page.getByTestId('save-status')).toHaveText('Saved in this browser only — export to keep a copy.');
});

test('notepad: a record note → reload → persists → export is section-ordered .md → import reads it back', async ({ page }) => {
  await page.goto('/routes/prototype-ot');
  await page.getByTestId('note-on-routes-prototype-ot').click();
  const body = page.getByTestId('notepad-drawer').getByTestId('note-body').first();
  await body.fill('Route note.');
  await page.goto('/notes');
  await page.getByTestId('anchor-type').selectOption('section');
  await page.getByTestId('anchor-id').selectOption('2-how-the-government-buys');
  await page.getByTestId('add-anchored-note').click();
  await expect(page.locator('textarea:focus')).toHaveCount(1);
  await page.locator('textarea:focus').fill('Section note.');
  await page.reload();
  await expect(page.getByTestId('note')).toHaveCount(2);
  await expect(page.getByRole('link', { name: /route “Prototype other transaction/ })).toBeVisible();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-notes').click()]);
  const md = fs.readFileSync((await dl.path())!, 'utf8');
  expect(md).toContain('# Notes — FAR Out');
  expect(md.indexOf('Section note.')).toBeLessThan(md.indexOf('## Routes'));
  expect(md).toContain('Route note.');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByTestId('note')).toHaveCount(0);
  await page.getByTestId('import-notes').setInputFiles({ name: 'notes.md', mimeType: 'text/markdown', buffer: Buffer.from(md) });
  await expect(page.getByTestId('note')).toHaveCount(2);
});
