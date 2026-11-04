import { test, expect } from '@playwright/test';
import { signIn, newMobile, messageUnder, api, AS_PROBE, ME } from '../../helpers/web';

const TAXPAYERS = '/api/v1/training/taxpayers';

test.beforeEach(async ({ page }) => {
  await signIn(page);
});

async function openCreateForm(page) {
  await page.getByRole('button', { name: 'Create my data' }).click();
  await expect(page.getByRole('heading', { name: '1 — Create a taxpayer' })).toBeVisible();
}

async function openMyData(page) {
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'My data' }).click();
}

test('I1 · + · AC-1, AC-2 · made by the API, shown on the screen', async ({ page, request }) => {
  const mobile = newMobile();
  const made = await api(request, 'POST', TAXPAYERS,
    { full_name: 'Ana Dela Cruz', mobile, email: 'rosa@example.com' });
  expect(made.status, JSON.stringify(made.body)).toBe(201);

  await openMyData(page);
  const row = page.getByRole('row', { name: new RegExp(mobile) });
  await expect(row.getByRole('cell')).toHaveText(['Ana Dela Cruz', mobile, 'rosa@example.com']);
});

test('I2 · + · AC-1, AC-3 · made on the screen, stored by the API', async ({ page, request }) => {
  const mobile = newMobile();
  await openCreateForm(page);
  await page.getByLabel('Full name', { exact: true }).fill('  Rosa Web  ');
  await page.getByLabel('Mobile (09XXXXXXXXX)').fill(mobile);
  await page.getByRole('button', { name: 'Create taxpayer' }).click();
  await expect(page.getByText(`Rosa Web created — mobile ${mobile}.`)).toBeVisible();

  const list = await api(request, 'GET', TAXPAYERS);
  expect(list.status, JSON.stringify(list.body)).toBe(200);
  const row = (list.body as any[]).find((r) => r.mobile === mobile);
  expect(row, 'a row with the new mobile').toBeTruthy();
  expect(row.full_name).toBe('Rosa Web');
  expect(row.mobile).toBe(mobile);
  expect(row.email).toBeNull();
  expect(row.created_by).toBe(ME);
});

test('I3 · − · AC-5, AC-6, AC-8 · the same message on both sides', async ({ page, request }) => {
  const cases = [
    { field: 'full_name', label: 'Full name', name: 'A', mobile: newMobile(), email: '' },
    { field: 'mobile', label: 'Mobile (09XXXXXXXXX)', name: 'Ana Dela Cruz', mobile: '0917-123-4567', email: '' },
    { field: 'email', label: 'Email (optional)', name: 'Ana Dela Cruz', mobile: newMobile(), email: 'rosa@examplecom' },
  ];

  for (const c of cases) {
    const payload: Record<string, string> = { full_name: c.name, mobile: c.mobile };
    if (c.email) payload.email = c.email;
    const res = await api(request, 'POST', TAXPAYERS, payload);
    expect(res.status, `${c.field}: ${JSON.stringify(res.body)}`).toBe(422);
    const apiMessage = (res.body as any).detail[c.field];
    expect(apiMessage, `${c.field}: API message`).toBeTruthy();

    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Home' }).click();
    await openCreateForm(page);
    await page.getByLabel('Full name', { exact: true }).fill(c.name);
    await page.getByLabel('Mobile (09XXXXXXXXX)').fill(c.mobile);
    if (c.email) await page.getByLabel('Email (optional)').fill(c.email);
    await page.getByRole('button', { name: 'Create taxpayer' }).click();

    await expect(messageUnder(page, c.label)).toHaveText(apiMessage);
  }
});

test('I4 · + · AC-5, AC-8 · what the API accepts, the screen accepts', async ({ page }) => {
  const digits = newMobile().slice(2);
  await openCreateForm(page);
  await page.getByLabel('Full name', { exact: true }).fill("Ñoño O'Brien-Cruz Jr.");
  await page.getByLabel('Mobile (09XXXXXXXXX)').fill('+639' + digits);
  await page.getByRole('button', { name: 'Create taxpayer' }).click();

  await expect(page.getByText(`Ñoño O'Brien-Cruz Jr. created — mobile 09${digits}.`)).toBeVisible();
});

test('I5 · − · AC-4 · a mobile the API registered is refused on the screen', async ({ page, request }) => {
  const mobile = newMobile();
  const made = await api(request, 'POST', TAXPAYERS, { full_name: 'Ana Dela Cruz', mobile });
  expect(made.status, JSON.stringify(made.body)).toBe(201);

  await openCreateForm(page);
  await page.getByLabel('Full name', { exact: true }).fill('Ben Dela Cruz');
  await page.getByLabel('Mobile (09XXXXXXXXX)').fill(mobile);
  await page.getByRole('button', { name: 'Create taxpayer' }).click();

  await expect(messageUnder(page, 'Mobile (09XXXXXXXXX)')).toHaveText('already registered for this tenant');
});

test('I6 · − · AC-7 · the screen and the API use the same name-tag', async ({ page, request }) => {
  const mobileA = newMobile();
  const mobileB = newMobile();

  const probe = await api(request, 'POST', TAXPAYERS,
    { full_name: 'Probe Person', mobile: mobileA }, AS_PROBE);
  expect(probe.status, JSON.stringify(probe.body)).toBe(201);
  const mine = await api(request, 'POST', TAXPAYERS,
    { full_name: 'Ana Dela Cruz', mobile: mobileB });
  expect(mine.status, JSON.stringify(mine.body)).toBe(201);

  await openMyData(page);
  await expect(page.getByRole('row', { name: new RegExp(mobileB) })).toBeVisible();
  await expect(page.getByRole('row', { name: new RegExp(mobileA) })).toHaveCount(0);
});
