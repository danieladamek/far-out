import { expect, test } from '@playwright/test';

/** KICKOFF §5: every route answers 200 and renders its h1; the footer disclaimer is on every tested page. */
const ROUTES = [
  '/', '/routes', '/routes/sbir-phase-i-grant-agencies', '/routes/total-small-business-set-aside', '/routes/finding-subcontract-work', '/routes/prototype-ot',
  '/programs', '/programs/s2marts', '/status', '/gates', '/buyers', '/help', '/primes', '/how', '/changes', '/find', '/partners',
  '/read', '/glossary', '/concepts', '/concepts/sbir-phases-101', '/figures', '/figures/sbir-amounts-by-agency', '/references', '/methods', '/about', '/notes',
];

for (const route of ROUTES) {
  test(`${route} answers 200, renders its h1 and the footer disclaimer`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const res = await page.goto(route);
    expect(res?.status()).toBe(200);
    await expect(page.locator('main h1').first()).toBeVisible();
    await expect(page.getByTestId('footer-disclaimer')).toContainText('Not legal, financial or compliance advice');
    expect(errors).toEqual([]);
  });
}

test('every surface is linked from the header nav', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Primary', exact: true });
  for (const to of ['/routes', '/programs', '/status', '/gates', '/buyers', '/help', '/primes', '/how', '/changes', '/find', '/partners', '/read', '/glossary', '/concepts', '/figures', '/references', '/notes', '/methods', '/about']) {
    await expect(nav.locator(`a[href="${to}"]`)).toHaveCount(1);
  }
  await expect(page.locator('header a[href="/"]')).toContainText('FAR');
});

test('the wordmark is FAR Out; nothing implies peer review; as_of shows on /, /read and /about', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('FAR Out');
  await expect(page.getByTestId('home-asof')).toHaveText('Current as of 2026-10-03');
  await expect(page.getByText('COMMISSIONED GUIDE — NOT PEER REVIEWED · NOT ADVICE').first()).toBeVisible();
  await page.goto('/read');
  await expect(page.getByTestId('read-asof')).toHaveText('Current as of 2026-10-03');
  await expect(page.getByTestId('review-banner')).toContainText('not peer reviewed');
  await page.goto('/about');
  await expect(page.getByTestId('about-asof')).toBeVisible();
  await expect(page.getByTestId('disclaimer-full')).toContainText('Nothing here is tailored to any firm');
});

test('/methods publishes provenance, every query, the scope, the interview and every synthesis passage', async ({ page }) => {
  await page.goto('/methods');
  await expect(page.getByText('This is a scope-bounded commissioned review, not a systematic review.')).toBeVisible();
  await expect(page.getByTestId('queries-table').locator('tbody tr')).toHaveCount(674);
  await expect(page.getByTestId('uncited-count')).toContainText('0 in the guide');
  await expect(page.locator('#interview')).toBeVisible();
  await expect(page.getByTestId('known-gaps').locator('li').first()).toBeVisible();
  const syn = page.getByTestId('synthesis-list').locator('a');
  expect(await syn.count()).toBeGreaterThan(0);
  await syn.first().click();
  await expect(page).toHaveURL(/\/read#syn-/);
});
