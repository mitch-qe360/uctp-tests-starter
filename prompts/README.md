# Prompts: write your own

A prompt is part of the project, like a test. Keep it here, next to the tests it made, so the team can reuse it and improve it.

Every good testing prompt has the same 7 parts. The two templates in this folder have them with blanks `<<like this>>`:

| Part | What you write | At UCTP (this class) | At your company |
|---|---|---|---|
| 1 · Role | who the AI is and what it writes | "a tester who writes Playwright tests" | the same, with your team's tool (Cypress, Selenium, Postman, REST Assured…) |
| 2 · The system | the test site, how to sign in, the rules for test data | staging URL, the name-tag, made-up data | your test environment's URL, test accounts (never real passwords), which data is safe to make |
| 3 · The story | the user story and its acceptance criteria | your screen story | the story from your backlog (Jira, Azure DevOps…) |
| 4 · The charter | which charter nodes to automate | nodes with status UI journey or API test | the same: your charter JSON from Charter360 |
| 5 · What to give me | file name, folder, the start of the file | `tests/web/card-NN.web.spec.ts` | your project's folders and an existing test as the example to copy |
| 6 · Rules | how a good test looks in your team | getByRole, no fixed waits, exact texts | your team's coding rules, naming, review checklist |
| 7 · The charter JSON | paste it last | Download JSON in Charter360 | the same |

Steps:
1. Copy `web-tests-prompt.md` (or `api-tests-prompt.md`) to a new file `card-NN-web-prompt.md`.
2. Fill every `<<…>>`. Delete nothing else.
3. Paste it into a new AI chat, then your charter JSON at the end.
4. Read the code the AI gives: one test per charter node, expected texts only from the charter. Change the prompt (not just the code) when the AI gets something wrong, so the next run is better. Commit the prompt with the test.

`card-03-web-prompt.md` is the filled-in example.
