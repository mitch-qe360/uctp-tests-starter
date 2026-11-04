import { test, expect } from '@playwright/test';
import { signIn, newMobile, messageUnder, api, AS_PROBE, ME } from '../../helpers/web';

test.beforeEach(async ({ page }) => {
  await signIn(page);
});

test('I1 · + · AC-1, AC-2 · made by the API, shown on the screen', async ({ page, request }) => {
  const mobile = newMobile();
  const made = await api(request, 'POST', '/api/v1/training/taxpayers',
    { full_name: 'Ana Dela Cruz', mobile, email: 'rosa@example.com' });
  expect(made.status, JSON.stringify(made.body)).toBe(201);

  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'My data' }).click();
  const row = page.getByRole('row', { name: new RegExp(mobile) });
  await expect(row.getByRole('cell')).toHaveText(['Ana Dela Cruz', mobile, 'rosa@example.com']);
});

test('I2 · + · AC-1, AC-3 · made on the screen, stored by the API', async ({ page, request }) => {
  const mobile = newMobile();
  await page.getByRole('button', { name: 'Create my data' }).click();
  await page.getByLabel('Full name').fill('  Rosa Web  ');
  await page.getByLabel('Mobile').fill(mobile);
  await page.getByRole('button', { name: 'Create taxpayer' }).click();
  await expect(page.getByText(`Rosa Web created — mobile ${mobile}.`)).toBeVisible();

  const list = await api(request, 'GET', '/api/v1/training/taxpayers');
  expect(list.status, JSON.stringify(list.body)).toBe(200);
  const rows = (list.body as any[]).filter((t) => t.mobile === mobile);
  expect(rows).toHaveLength(1);
  expect(rows[0].full_name).toBe('Rosa Web');
  expect(rows[0].mobile).toBe(mobile);
  expect(rows[0].email).toBeNull();
  expect(rows[0].created_by).toBe(ME);
});

test('I3 · − · AC-5, AC-6, AC-8 · the same message on both sides', async ({ page, request }) => {
  const cases = [
    { field: 'full_name', label: 'Full name', name: 'A', mobile: newMobile(), email: '' },
    { field: 'mobile', label: 'Mobile', name: 'Ana Dela Cruz', mobile: '0917-123-4567', email: '' },
    { field: 'email', label: 'Email (optional)', name: 'Ana Dela Cruz', mobile: newMobile(), email: 'rosa@examplecom' },
  ];

  await page.getByRole('button', { name: 'Create my data' }).click();
  for (const c of cases) {
    const payload: Record<string, string> = { full_name: c.name, mobile: c.mobile };
    if (c.email) payload.email = c.email;
    const res = await api(request, 'POST', '/api/v1/training/taxpayers', payload);
    expect(res.status, JSON.stringify(res.body)).toBe(422);
    const apiMessage = res.body.detail[c.field];
    expect(apiMessage).toBeTruthy();

    await page.getByLabel('Full name').fill(c.name);
    await page.getByLabel('Mobile').fill(c.mobile);
    await page.getByLabel('Email (optional)').fill(c.email);
    await page.getByRole('button', { name: 'Create taxpayer' }).click();
    await expect(messageUnder(page, c.label)).toHaveText(apiMessage);
  }
});

test('I4 · + · AC-5, AC-8 · what the API accepts, the screen accepts', async ({ page }) => {
  const nine = newMobile().slice(2);
  await page.getByRole('button', { name: 'Create my data' }).click();
  await page.getByLabel('Full name').fill("Ñoño O'Brien-Cruz Jr.");
  await page.getByLabel('Mobile').fill(`+639${nine}`);
  await page.getByRole('button', { name: 'Create taxpayer' }).click();
  await expect(page.getByText(`Ñoño O'Brien-Cruz Jr. created — mobile 09${nine}.`)).toBeVisible();
});

test('I5 · − · AC-4 · a mobile the API registered is refused on the screen', async ({ page, request }) => {
  const mobile = newMobile();
  const made = await api(request, 'POST', '/api/v1/training/taxpayers',
    { full_name: 'Ana Dela Cruz', mobile });
  expect(made.status, JSON.stringify(made.body)).toBe(201);

  await page.getByRole('button', { name: 'Create my data' }).click();
  await page.getByLabel('Full name').fill('Ben Dela Cruz');
  await page.getByLabel('Mobile').fill(mobile);
  await page.getByRole('button', { name: 'Create taxpayer' }).click();
  await expect(messageUnder(page, 'Mobile')).toHaveText('already registered for this tenant');
});

test('I6 · − · AC-7 · the screen and the API use the same name-tag', async ({ page, request }) => {
  const mobileA = newMobile();
  const mobileB = newMobile();
  const asProbe = await api(request, 'POST', '/api/v1/training/taxpayers',
    { full_name: 'Probe Person', mobile: mobileA }, AS_PROBE);
  expect(asProbe.status, JSON.stringify(asProbe.body)).toBe(201);
  const asMe = await api(request, 'POST', '/api/v1/training/taxpayers',
    { full_name: 'Ana Dela Cruz', mobile: mobileB });
  expect(asMe.status, JSON.stringify(asMe.body)).toBe(201);

  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'My data' }).click();
  await expect(page.getByRole('row', { name: new RegExp(mobileB) })).toBeVisible();
  await expect(page.getByRole('row', { name: new RegExp(mobileA) })).toHaveCount(0);
});
