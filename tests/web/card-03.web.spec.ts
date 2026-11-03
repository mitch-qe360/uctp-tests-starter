// Card 03 · TRN-02 · Create an industrial property tax bill for this year (web)
// One test per "UI journey" node (W1–W6) of the Card 03 web charter.
// Only the start URL is typed; every other page is reached by clicking.
import { test, expect, type Page } from '@playwright/test';
import { ME, newMobile, newPin } from './me';

async function signInAs(page: Page, nameTag: string) {
  await page.goto('/');
  const dialog = page.getByRole('dialog', { name: 'Your name' });
  await dialog.getByRole('textbox').fill(nameTag);
  await Promise.all([page.waitForEvent('load'), dialog.getByRole('button', { name: 'Save' }).click()]);
  await expect(page.getByRole('navigation', { name: 'Main' })).toContainText(`You are: ${nameTag}`);
}

// Setup on the screen: section 1 makes my taxpayer, then its button opens section 2 with it picked.
async function openSection2WithNewTaxpayer(page: Page) {
  const mobile = newMobile();
  await page.getByRole('button', { name: 'Create my data' }).click();
  await page.getByLabel('Full name').fill('Ana Dela Cruz');
  await page.getByLabel('Mobile (09XXXXXXXXX)').fill(mobile);
  await page.getByRole('button', { name: 'Create taxpayer' }).click();
  await expect(page.getByText('created — mobile')).toContainText(mobile);
  await page.getByRole('button', { name: 'Create a property tax bill for this taxpayer' }).click();
}

async function fillBill(page: Page, pin: string, av: string) {
  await page.getByLabel('PIN (NNN-NN-NNN-NNN-NNN)').fill(pin);
  await page.getByLabel('Property class').selectOption('INDUSTRIAL');
  await page.getByLabel('Assessed value (₱)').fill(av);
  await page.getByLabel('Tax year').fill('2026');
  await page.getByRole('button', { name: 'Create property tax bill' }).click();
}

test.describe('Card 03 · TRN-02 (web) @web', () => {
  test.beforeEach(async ({ page }) => { await signInAs(page, ME); });

  test('W1 · Core + · section 2 opens with its fields', async ({ page }) => {
    await page.getByRole('button', { name: 'Create my data' }).click();
    await expect(page.getByRole('heading', { name: '2 — Create a property tax bill' })).toBeVisible();
    await expect(page.getByLabel('Taxpayer (only yours are listed)').first()).toBeVisible();
    await expect(page.getByLabel('Property class')).toHaveValue('RESIDENTIAL');
    await expect(page.getByLabel('Tax year')).toHaveValue('2026');
  });

  test('W2 · Numbers − · assessed value 0 shows the message under the field', async ({ page }) => {
    await openSection2WithNewTaxpayer(page);
    await fillBill(page, newPin(), '0');
    await expect(page.getByText('must be greater than 0')).toBeVisible();
    await expect(page.getByText(/^Bill .* created:/)).toBeHidden();
  });

  test('W3 · Syntax − · a PIN with 4 groups shows the PIN message', async ({ page }) => {
    await openSection2WithNewTaxpayer(page);
    await fillBill(page, '603-26-482-100', '1000.00');
    await expect(page.getByText('must match NNN-NN-NNN-NNN-NNN')).toBeVisible();
  });

  test('W4 · Core + · create the bill: Basic 20000.00 and SEF 10000.00, then W5 same PIN again, then W6 My bills row', async ({ page }) => {
    const pin = newPin();
    await openSection2WithNewTaxpayer(page);
    await fillBill(page, pin, '1000000.00');
    const result = page.locator('#rpt-result');   // the result box has no role or label
    await expect(result).toContainText(`Bill ${pin} created:`);
    await expect(result.getByRole('row', { name: /^RPT\s/ })).toContainText('20000.00');
    await expect(result.getByRole('row', { name: /RPT_SEF/ })).toContainText('10000.00');

    // W5 · Claims − · the same PIN a second time
    await page.getByRole('button', { name: 'Create property tax bill' }).click();
    await expect(page.getByText('already taken for this tenant')).toBeVisible();

    // W6 · Core + · top bar › My data › My bills shows the bill
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'My data' }).click();
    const row = page.getByRole('row', { name: new RegExp(pin) });
    await expect(row).toContainText('INDUSTRIAL 2026');
    await expect(row).toContainText('1000000.00');
    await expect(row).toContainText('OPEN');
  });
});
