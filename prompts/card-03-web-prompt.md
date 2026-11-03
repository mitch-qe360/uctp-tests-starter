[PART 1 · ROLE]
You are a software tester. You write web UI tests with Playwright and TypeScript.

[PART 2 · THE SYSTEM]
System: UCTP, a training city treasury (made-up data) at https://city-treasurer-staging.aiqe.pro.
How a user gets in: no login. On the first visit a dialog "Your name" asks for a name; typing my full name-tag (like Ana-4821) continues my data.
Test data rules: training app for a testing class; all data is made up; make new data in every test.
My project already has: tests/web/me.ts exports ME (my name-tag), CARD, newMobile(), newPin(), newReference() (new data on every run); playwright.config.ts sets the baseURL.

[PART 3 · MY USER STORY]
TRN-02 · Create an industrial property tax bill for this year
As a treasury clerk, I want to create a real property tax bill for an industrial property this year so that the city can collect its Basic and SEF (Special Education Fund) tax.
(Then paste section 3 "What must happen" of the Card 03 screen story.)

[PART 4 · MY TEST CHARTER]
My test charter from Charter360 is the JSON in PART 7, at the end of this message.
- Automate every node whose "statusId" is "st_ui". Each one is one test: its "text" holds the test id, the Steps, and what must show on screen after the arrow.
- The node whose text starts with "Setup" says how to make my data first.
- Ignore every other node.

[PART 5 · WHAT TO GIVE ME]
ONE file named tests/web/card-03.web.spec.ts. Start it exactly like this example from my project:
import { test, expect, type Page } from '@playwright/test';
import { ME, newMobile, newPin, newReference } from './me';

async function signInAs(page: Page, nameTag: string) {
  await page.goto('/');
  const dialog = page.getByRole('dialog', { name: 'Your name' });
  await dialog.getByRole('textbox').fill(nameTag);
  await Promise.all([page.waitForEvent('load'), dialog.getByRole('button', { name: 'Save' }).click()]);
  await expect(page.getByRole('navigation', { name: 'Main' })).toContainText(`You are: ${nameTag}`);
}

Each test starts with signInAs(page, ME).
Then one test() per node, named "<id> · <heuristic> · <what it checks>".

[PART 6 · RULES]
- Type only the start URL: page.goto('/') once, inside signInAs. Reach every other page by clicking, like a clerk.
- Find elements like a person: getByRole, getByLabel, getByText with the exact labels from my charter. No XPath, no long CSS paths.
- Assert what the user sees: the exact message, row, amount or status from my charter. For a negative test also assert what must not show.
- No fixed waits. New data in every test.
- Use only what is in my charter. If something is missing, write a comment // ASK: <question> instead of guessing.
- Give the whole file in one code block, nothing else.

[PART 7 · MY CHARTER JSON]
Paste the JSON from Charter360 below this line:
