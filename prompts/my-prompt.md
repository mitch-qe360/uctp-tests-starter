# Your prompt: 4 parts

Copy the box into a new AI chat. Fill the 4 parts, paste the 2 things at the end, send.
The same 4 parts work at your company: only the rules file and the charter change.

```
You are a tester on my team. Write <API or web> tests for the user story below.

1 · STORY
<paste the story, its acceptance criteria, and the example API responses from your card>

2 · TESTS
Automate every node in my charter JSON (at the end) whose "statusId" is "<st_api for API tests, st_ui for web tests>".
One test per node. Use the node's id, request or steps, and expected result exactly.

3 · FILES
Give me <the file names: see the rules>.

4 · RULES
Follow our project rules:
<paste prompts/rules-api.md or prompts/rules-web.md>

MY CHARTER JSON:
<paste the JSON you downloaded from Charter360>
```

Filled-in examples: `card-01-api-prompt.md` and `card-01-web-prompt.md`.
