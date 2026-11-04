# Card 01 · web prompt (filled in)

Copy everything in the box, then paste your Card 01 charter JSON under the last line.

````
You are a tester on my team. Write web tests for the user story below.

1 · STORY
TRN-01 · Register a taxpayer
As a treasury clerk, I want to register a taxpayer with a mobile number, so that I can bill them later.
Acceptance criteria:
- AC-1 Register a taxpayer: the result says "<name> created — mobile <mobile>." and My data › My taxpayers shows the row
- AC-2 Spaces around the name are removed
- AC-3 A wrong mobile is refused: "must be a PH mobile 09XXXXXXXXX or +639XXXXXXXXX"
- AC-4 A wrong name is refused: "2-100 characters: letters, spaces, . - ' and Ñ only" (100 letters OK, 101 not)
- AC-5 The same mobile cannot be registered twice: "already registered for this tenant"
- AC-6 Only I can see my taxpayer: another user gets "Not Found"

2 · TESTS
Automate every node in my charter JSON (at the end) whose "statusId" is "st_ui".
One test per node. Use the node's id, request or steps, and expected result exactly.

3 · FILES
Give me tests/web/card-01.web.spec.ts.

4 · RULES
Follow our project rules:
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

MY CHARTER JSON:
````
