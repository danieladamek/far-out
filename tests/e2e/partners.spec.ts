import { expect, test } from '@playwright/test';

const recipients = { results: [{ amount: 1234567.8, recipient_id: 'abc-C', name: 'EXAMPLE SMALL CO', uei: 'UEI000000001' }], messages: ['A note from the API.'] };
const counts = { results: { contracts: 42, idvs: 3 }, messages: [] };
const subs = { results: [{ 'Sub-Award ID': 'S1', 'Sub-Awardee Name': 'SUB CO', 'Sub-Award Date': '2026-01-06', 'Sub-Award Amount': 5000, 'Awarding Agency': 'Department of Example', 'Prime Award ID': 'P1', 'Prime Recipient Name': 'PRIME CO', prime_award_recipient_id: 'p-C', sub_award_recipient_id: 's-C' }], messages: ['Subaward data may be incomplete.'] };

test('/partners with the network mocked shows recipients, counts and the subaward table', async ({ page }) => {
  await page.route('https://api.usaspending.gov/**', (r) => {
    const u = r.request().url();
    const body = u.includes('spending_by_category') ? recipients : u.includes('award_count') ? counts : subs;
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body), headers: { 'access-control-allow-origin': '*' } });
  });
  await page.goto('/partners');
  await expect(page.getByTestId('partners-notice')).toContainText('api.usaspending.gov');
  await page.getByTestId('partners-naics').fill('541512');
  await page.getByTestId('partners-run').click();
  await expect(page.getByTestId('recipients-table')).toContainText('EXAMPLE SMALL CO');
  await expect(page.getByTestId('recipients-table').locator('a')).toHaveAttribute('href', 'https://www.usaspending.gov/recipient/abc-C/latest');
  await expect(page.getByTestId('subawards-table')).toContainText('PRIME CO');
  await expect(page.getByTestId('subawards-table')).toContainText('SUB CO');
  await expect(page.getByTestId('api-messages')).toContainText('Subaward data may be incomplete.');
  await expect(page.getByTestId('partners-results')).toContainText('contracts 42');
});

test('/partners with the request failing shows a plain message and the manual link', async ({ page }) => {
  await page.route('https://api.usaspending.gov/**', (r) => r.fulfill({ status: 500, body: 'boom', headers: { 'access-control-allow-origin': '*' } }));
  await page.goto('/partners');
  await page.getByTestId('partners-naics').fill('541512');
  await page.getByTestId('partners-run').click();
  await expect(page.getByTestId('partners-error')).toContainText('did not succeed');
  await expect(page.getByTestId('partners-error').locator('a')).toHaveAttribute('href', 'https://www.usaspending.gov/search');
});
