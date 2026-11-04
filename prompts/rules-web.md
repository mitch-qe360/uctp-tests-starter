# Our project rules: web tests

Paste this whole file into your prompt, under "4 · RULES". It tells the AI how tests look in this project, so you don't have to.

- Write Playwright tests in TypeScript. One file: `tests/web/<feature>.web.spec.ts` (`<feature>` is my card, for example `card-02`).
- Start the file like this:
  ```ts
  import { test, expect } from '@playwright/test';
  import { signIn, newMobile } from '../../helpers/web';
  ```
- Our helper does the rest. Never write the site address or the name-tag in a test.
  - `await signIn(page)` opens the site and signs in with my name-tag. Call it in `test.beforeEach`.
  - `newMobile()` makes a new mobile on every run.
- Open pages the way a clerk does: click the buttons and links. Only `signIn` uses a URL.
- One `test(...)` per charter node, named with the node's id: `test('W3 · Users + · ...', ...)`. Each test makes its own data.
- Find things the way a person sees them: `getByRole`, `getByLabel`, `getByText`, with the exact texts from the charter.
- Check with `expect(...)`. Never wait a fixed time (no `waitForTimeout`).
- Never change an expected text to match what you think the screen shows. If one looks wrong, say so after the code.
- Reply with the file in one code block, with the file name on the line above it. Then at most 3 short notes.

Example: one test from our project (`tests/web/taxpayer.web.spec.ts`):

```ts
test('W2 · Syntax − · a 10-digit mobile shows the message under Mobile', async ({ page }) => {
  await page.getByLabel('Full name').fill('Ana Dela Cruz');
  await page.getByLabel('Mobile (09XXXXXXXXX)').fill('0917123456');
  await page.getByRole('button', { name: 'Create taxpayer' }).click();
  await expect(page.getByText('must be a PH mobile 09XXXXXXXXX or +639XXXXXXXXX')).toBeVisible();
  await expect(page.getByText('created — mobile')).toBeHidden();
});
```
