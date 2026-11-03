[PART 1 · ROLE]
You are a software tester. You write web UI tests with <<Playwright and TypeScript>>.

[PART 2 · THE SYSTEM]
System: <<name and one line on what it does>> at <<test site URL>>.
How a user gets in: <<e.g. a dialog "Your name"; typing my full name-tag continues my data>>
Test data rules: <<e.g. all data is made up; make new data in every test>>
My project already has: <<e.g. tests/web/me.ts exports ME, CARD, newMobile(), newPin(), newReference(); playwright.config.ts sets the baseURL>>

[PART 3 · MY USER STORY]
<<paste the story and its acceptance criteria>>

[PART 4 · MY TEST CHARTER]
My test charter from Charter360 is the JSON in PART 7, at the end of this message.
- Automate every node whose "statusId" is "<<st_ui>>". Each one is one test: its "text" holds the test id, the Steps, and what must show on screen after the arrow.
- The node whose text starts with "Setup" says how to make my data first.
- Ignore every other node.

[PART 5 · WHAT TO GIVE ME]
ONE file named <<tests/web/card-NN.web.spec.ts>>. Start it exactly like this example from my project:
<<paste the first lines of an existing test from your project: imports and the sign-in helper>>
Then one test() per node, named "<id> · <heuristic> · <what it checks>".

[PART 6 · RULES]
- <<Type only the start URL; reach every other page by clicking, like a user.>>
- Find elements like a person: getByRole, getByLabel, getByText with the exact labels from my charter. No XPath, no long CSS paths.
- Assert what the user sees: the exact message, row, amount or status from my charter. For a negative test also assert what must not show.
- No fixed waits. New data in every test.
- Use only what is in my charter. If something is missing, write a comment // ASK: <question> instead of guessing.
- <<your team's own rules>>
- Give the whole file in one code block, nothing else.

[PART 7 · MY CHARTER JSON]
Paste the JSON from Charter360 below this line:
