# UCTP tests starter

Your own copy of this project holds your UCTP tests on GitHub. Every time you save (commit) a change, GitHub runs all your tests for you and shows **green** (all passed) or **red** (a test failed). This is called **CI** (continuous integration).

- Site under test: `https://city-treasurer-staging.aiqe.pro` (training copy, made-up data)
- What runs: the API tests in the `api` folder (Node) and the web tests named `*.web.spec.ts` (Playwright)
- Everything below is done on the GitHub website. You don't need to install anything.

## 1 · Make your own copy

1. Sign in to GitHub (no account yet? https://github.com/signup, then confirm the email GitHub sends you).
2. On this page, at the top right, click the green button **Use this template**, then **Create a new repository**.
3. **Repository name:** `uctp-tests`. Choose **Public**. Click **Create repository**.

You are now on **your** copy: the address is `github.com/<your-username>/uctp-tests`. Do every next step there, not on the starter.

## 2 · Put in your name-tag (2 files)

Your name-tag is in the top bar of the UCTP site: `You are: Ana-4821` means `Ana-4821`.

1. In the file list, click **`me.ts`**. At the top right of the file, click the **pencil icon** (Edit this file).
2. Change `'Ana-4821'` to your name-tag and `'01'` to your card number. Keep the quotes.
3. Click the green **Commit changes...** button (top right), then **Commit changes** in the box.
4. Open the **`api`** folder › **`card-03.test.js`** › pencil icon. On the line `const ME = 'Ana-4821';` change `Ana-4821` to your name-tag. Click **Commit changes...** › **Commit changes**.

## 3 · Watch it run

1. At the top of your repository, click the **Actions** tab.
2. Click the newest run (top of the list, named after your last change). You see two jobs: **API tests (Node)** and **Web tests (Playwright)**.
3. Wait about 2 minutes. A **green check** means every test passed. A **red X** means a test failed: click the job, then the red step, to read which test and why.
4. The web test report: on the run page, scroll down to **Artifacts**, click **playwright-report** to download it, unzip it, open `index.html`.

## 4 · Add your own tests

**Your API test from Session 5** (the code the AI wrote and you ran in the Console):

1. Click into the **`api`** folder. Click **Add file** (top right) › **Create new file**.
2. Name it `card-NN.test.js` (your card number, for example `card-07.test.js`).
3. Paste the AI's code exactly as you ran it in the Console. Click **Commit changes...** › **Commit changes**.
4. Open the **Actions** tab and watch it run. Nothing to change in the code: the runner reads the `N passed, M failed` line and turns red when M is more than 0.

**Your web test** (Playwright):

1. Go back to the main page of your repository (click `uctp-tests` at the top). Click **Add file** › **Create new file**.
2. Name it `card-NN.web.spec.ts` (it must end in `.web.spec.ts`, or it won't run).
3. Paste your test. Start it like the example `trn01-taxpayer.web.spec.ts`: `import { ME, newMobile } from './me';` and `signInAs(page, ME)`. Click **Commit changes...** › **Commit changes**.

## 5 · When it is red

- Read the failed test's name and message in the Actions log first.
- **Our test was wrong** (a typo in a label, an expected value not from the charter): fix the test, commit again.
- **The app is wrong** (the charter says one thing, the site does another): don't change the test to match the bug. Log the bug.
- To run again without changing anything: Actions tab › **UCTP tests** (left) › **Run workflow** › **Run workflow**.

## What is in this project

| File | What it is |
|---|---|
| `me.ts` | Your name-tag and card number for the web tests, plus new data for every run |
| `playwright.config.ts` | The site address, one test at a time, screenshot and trace on failure |
| `trn01-taxpayer.web.spec.ts` | Worked example: create a taxpayer on the screen and see it in My data |
| `api/card-03.test.js` | Worked example: Card 03 API tests (runs in the Console and in Node) |
| `scripts/run-api-tests.js` | Runs every file in `api/` and fails the job if any test fails |
| `.github/workflows/tests.yml` | The CI: tells GitHub to run both kinds of tests on every commit |

## Safety

- Only test `city-treasurer-staging.aiqe.pro`, with your own name-tag.
- Your repository is public: never put a real password, API key or personal data in it.
