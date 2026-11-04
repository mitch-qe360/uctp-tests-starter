# UCTP tests starter

A small test project, set up the way a test team keeps one at work:

- the story, the charter, the prompt and the tests live together in Git
- a teammate reviews every change (a pull request)
- CI runs every test on every change and shows **green** (all passed) or **red** (a test failed)

Site under test: `https://city-treasurer-staging.aiqe.pro` (training copy, made-up data). Everything below is done on the GitHub website. You don't need to install anything.

## What is in this project

```
uctp-tests/
├── config/environment.js      the site and your name-tag, per environment (the only file you change)
├── helpers/api-client.js      api(), check(), finish() and new test data, written once
├── helpers/web.ts             signIn() for the web tests, written once
├── tests/
│   ├── api/                   API tests, split by type
│   │   ├── taxpayer-positive.test.js
│   │   ├── taxpayer-negative.test.js
│   │   └── taxpayer-security.test.js
│   └── web/
│       └── taxpayer.web.spec.ts   web tests (Playwright) for the same story
├── stories/                   the user stories and their acceptance criteria
├── charters/                  the test charters (JSON from Charter360)
├── prompts/                   your prompt (4 parts) and our project rules for the AI
├── reports/                   the results of each run (CI keeps them for you)
├── package.json               how to run them: npm run test:api, npm run test:web
└── .github/workflows/tests.yml   the CI: runs all tests on every change
```

The worked example is **Card 01 · Register a taxpayer**: 10 API tests and 4 web tests for the same story.

## 1 · Make your own copy

1. Sign in to GitHub (no account yet? https://github.com/signup, then confirm the email GitHub sends you).
2. On this page, at the top right, click the green button **Use this template**, then **Create a new repository**.
3. **Repository name:** `uctp-tests`. Choose **Public**. Click **Create repository**.

You are now on **your** copy: the address is `github.com/<your-username>/uctp-tests`. Do every next step there.

## 2 · Put in your name-tag (1 file)

Your name-tag is in the top bar of the UCTP site: `You are: Ana-4821` means `Ana-4821`.

1. Click the **`config`** folder › **`environment.js`**. At the top right of the file, click the **pencil icon** (Edit this file).
2. On the line `const ME = process.env.UCTP_NAME_TAG || 'Ana-4821';` change `Ana-4821` to your name-tag. Keep the quotes.
3. Click the green **Commit changes...** button (top right), then **Commit changes** in the box.

## 3 · Watch it run

1. At the top of your repository, click the **Actions** tab.
2. Click the newest run (top of the list). You see two jobs: **API tests (Node)** and **Web tests (Playwright)**.
3. Wait about 2 minutes. A **green check** means every test passed. A **red X** means a test failed: click the job, then the red step, to read which test and why.
4. The reports: on the run page, scroll down to **Artifacts**. **api-report** has one results file per test file. **web-report** has the Playwright report: download it, unzip it, open `index.html`.

## 4 · Add your tests the team way (a pull request)

At work nobody adds a test straight to the main branch: you propose it, a teammate reviews it, CI runs it, then it is merged.

1. Open the folder **`tests`** › **`api`** (or **`web`**). Click **Add file** (top right) › **Create new file**.
2. Type the file name the AI gave you, for example `card-02-positive.test.js`. API files must end in `.test.js`, web files in `.web.spec.ts`.
3. Paste the AI's code.
4. Click **Commit changes...**. In the box, choose **Create a new branch for this commit and start a pull request**. Name the branch, for example `card-02-api`. Click **Propose changes**.
5. On the next page click **Create pull request**.
6. Wait for the checks at the bottom of the pull request: green or red.
7. **Review:** send the pull request link to your seatmate. They open the **Files changed** tab and check:
   - one test per charter node, with the node's id (T1, W1, ...)
   - the expected results are the charter's, word for word
   - no site address and no name-tag inside a test
   - nothing missing: compare with the charter

   They click **Review changes**, write what they found, and click **Submit review**.
8. Fix what the review found (open the file in the pull request, pencil icon, commit to the same branch). When the checks are green, click **Merge pull request** › **Confirm merge**.

Keep the story, the charter and the prompt with the test: add them the same way to **`stories`**, **`charters`** (**Add file** › **Upload files**) and **`prompts`**.

## 5 · When it is red

- Read the failed test's name and message in the Actions log first.
- **Our test was wrong** (a typo, an expected value not from the charter): fix the test and commit again.
- **The app is wrong** (the charter says one thing, the site does another): don't change the test to match the bug. Log the bug.
- To run again without changing anything: **Actions** tab › **UCTP tests** (left) › **Run workflow** › **Run workflow**.

## Run it on your own computer (optional)

With Node.js 22: `npm ci`, then `npm run test:api`. For the web tests also run `npx playwright install chromium` once, then `npm run test:web`. To test another site: `BASE_URL=https://… npm run test:api`.
