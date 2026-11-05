// Written once, used by every web and integration test: sign in, read a field's message, call the API.
import { expect, type Page, type Locator, type APIRequestContext } from '@playwright/test';
import { ME, TENANT } from '../config/environment';

export { ME };

// The site asks "Your name" on the first visit. Typing your full name-tag
// (e.g. Ana-4821) continues your existing identity and data.
export async function signIn(page: Page, tag: string = ME) {
  await page.goto('/');
  const dialog = page.getByRole('dialog', { name: 'Your name' });
  await dialog.getByRole('textbox').fill(tag);
  await Promise.all([                                   // Save reloads the page
    page.waitForEvent('load'),
    dialog.getByRole('button', { name: 'Save' }).click(),
  ]);
  await expect(page.getByRole('navigation', { name: 'Main' })).toContainText(`You are: ${tag}`);
}

// The message the screen shows under a field, found by the field's label:
// messageUnder(page, 'Mobile (09XXXXXXXXX)')
export function messageUnder(page: Page, label: string): Locator {
  return page.locator('.field', { has: page.getByLabel(label, { exact: true }) }).locator('.error');
}

// 09 + 9 digits, never the same twice.
let counter = 0;
export function newMobile(): string {
  counter += 1;
  return `09${String(Date.now()).slice(-8)}${counter % 10}`;
}

// For integration tests: call the API as me (or as another user) from inside a Playwright test.
export const HEADERS = { 'Content-Type': 'application/json', 'X-Tenant-ID': TENANT, 'X-User-ID': ME };
export const AS_PROBE = { ...HEADERS, 'X-User-ID': `${ME}-probe` };   // my own second practice user

export async function api(request: APIRequestContext, method: string, path: string, body?: unknown,
  headers: Record<string, string> = HEADERS): Promise<{ status: number; body: any }> {
  const res = await request.fetch(path, { method, headers, data: body === undefined ? undefined : body });
  let data: any = null;
  try { data = await res.json(); } catch { /* no JSON body */ }
  return { status: res.status(), body: data };
}
