// Card 01 · TRN-01 · Register a taxpayer · web tests (the same story, on the screen)
// From charters/card-01-charter.json, nodes with status "UI journey".
import { test, expect } from '@playwright/test';
import { signIn, newMobile } from '../../helpers/web';

test.describe('TRN-01 Register a taxpayer (web)', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.getByRole('button', { name: 'Create my data' }).click();   // Home › Create my data
  });

  test('W1 · Core + · the form opens empty', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Training setup' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '1 — Create a taxpayer' })).toBeVisible();
    await expect(page.getByLabel('Full name')).toHaveValue('');
    await expect(page.getByLabel('Mobile (09XXXXXXXXX)')).toHaveValue('');
    await expect(page.getByLabel('Email (optional)')).toHaveValue('');
    await expect(page.getByRole('button', { name: 'Create taxpayer' })).toBeVisible();
  });

  test('W2 · Syntax − · a 10-digit mobile shows the message under Mobile', async ({ page }) => {
    await page.getByLabel('Full name').fill('Ana Dela Cruz');
    await page.getByLabel('Mobile (09XXXXXXXXX)').fill('0917123456');
    await page.getByRole('button', { name: 'Create taxpayer' }).click();
    await expect(page.getByText('must be a PH mobile 09XXXXXXXXX or +639XXXXXXXXX')).toBeVisible();
    await expect(page.getByText('created — mobile')).toBeHidden();      // no taxpayer made
  });

  test('W3 · Users + · create a taxpayer: the result box shows the name and mobile', async ({ page }) => {
    const mobile = newMobile();
    await page.getByLabel('Full name').fill('  Ana Dela Cruz  ');        // spaces are removed
    await page.getByLabel('Mobile (09XXXXXXXXX)').fill(mobile);
    await page.getByRole('button', { name: 'Create taxpayer' }).click();
    await expect(page.getByText('created — mobile')).toContainText(`Ana Dela Cruz created — mobile ${mobile}.`);
  });

  test('W4 · Core + · my new taxpayer is in My data › My taxpayers', async ({ page }) => {
    const mobile = newMobile();
    await page.getByLabel('Full name').fill('Ana Dela Cruz');
    await page.getByLabel('Mobile (09XXXXXXXXX)').fill(mobile);
    await page.getByRole('button', { name: 'Create taxpayer' }).click();
    await expect(page.getByText('created — mobile')).toBeVisible();

    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'My data' }).click();
    const row = page.getByRole('row', { name: new RegExp(mobile) });
    await expect(row).toContainText('Ana Dela Cruz');
    await expect(row).toContainText('—');                                // no email given
  });
});
