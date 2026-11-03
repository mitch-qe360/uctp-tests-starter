// Worked example, Session 5 web UI: TRN-01 Create a taxpayer on the screen,
// then TRN-01v see it in My data. Only the start URL is typed; the rest is clicks.
import { test, expect, type Page } from '@playwright/test';
import { ME, newMobile } from './me';

// The site asks "Your name" on the first visit. Typing your full name-tag
// (e.g. Ana-4821) continues your existing identity and data.
async function signInAs(page: Page, nameTag: string) {
  await page.goto('/');
  const dialog = page.getByRole('dialog', { name: 'Your name' });
  await dialog.getByRole('textbox').fill(nameTag);
  // Save reloads the page. Wait for the reload before the next click.
  await Promise.all([
    page.waitForEvent('load'),
    dialog.getByRole('button', { name: 'Save' }).click(),
  ]);
  await expect(page.getByRole('navigation', { name: 'Main' })).toContainText(`You are: ${nameTag}`);
}

test.describe('TRN-01 Create a taxpayer (web) @web', () => {
  test('creates a taxpayer on Training setup and sees it in My data', async ({ page }) => {
    const mobile = newMobile();
    await signInAs(page, ME);

    // Home > Create my data > section 1
    await page.getByRole('button', { name: 'Create my data' }).click();
    await expect(page.getByRole('heading', { name: '1 — Create a taxpayer' })).toBeVisible();
    await page.getByLabel('Full name').fill('Ana Dela Cruz');
    await page.getByLabel('Mobile (09XXXXXXXXX)').fill(mobile);
    await page.getByRole('button', { name: 'Create taxpayer' }).click();
    await expect(page.getByText('created — mobile')).toContainText(`Ana Dela Cruz created — mobile ${mobile}`);

    // Top bar > My data > My taxpayers
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'My data' }).click();
    const row = page.getByRole('row', { name: new RegExp(mobile) });
    await expect(row).toContainText('Ana Dela Cruz');
    await expect(row).toContainText('—');               // no email given
  });

  test('a 10-digit mobile shows the mobile error under the field', async ({ page }) => {
    await signInAs(page, ME);
    await page.getByRole('button', { name: 'Create my data' }).click();
    await page.getByLabel('Full name').fill('Ana Dela Cruz');
    await page.getByLabel('Mobile (09XXXXXXXXX)').fill('0917123456');
    await page.getByRole('button', { name: 'Create taxpayer' }).click();
    await expect(page.getByText('must be a PH mobile 09XXXXXXXXX or +639XXXXXXXXX')).toBeVisible();
    await expect(page.getByText('created — mobile')).toBeHidden();
  });
});
