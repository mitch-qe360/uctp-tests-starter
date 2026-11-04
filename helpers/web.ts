// Written once, used by every web test: sign in to UCTP with your name-tag.
import { expect, type Page } from '@playwright/test';
import { ME } from '../config/environment';

export { ME };

// The site asks "Your name" on the first visit. Typing your full name-tag
// (e.g. Ana-4821) continues your existing identity and data.
export async function signIn(page: Page) {
  await page.goto('/');
  const dialog = page.getByRole('dialog', { name: 'Your name' });
  await dialog.getByRole('textbox').fill(ME);
  await Promise.all([                                   // Save reloads the page
    page.waitForEvent('load'),
    dialog.getByRole('button', { name: 'Save' }).click(),
  ]);
  await expect(page.getByRole('navigation', { name: 'Main' })).toContainText(`You are: ${ME}`);
}

// 09 + 9 digits, never the same twice.
let counter = 0;
export function newMobile(): string {
  counter += 1;
  return `09${String(Date.now()).slice(-8)}${counter % 10}`;
}
