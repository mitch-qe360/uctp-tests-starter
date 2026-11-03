[PART 1 · ROLE]
You are a software tester. You write API tests in <<plain JavaScript for Node.js 18+ (no libraries)>>.

[PART 2 · THE SYSTEM]
System: <<name and one line on what it does>> at <<test API base URL>>.
Every API call sends these headers: <<e.g. X-Tenant-ID: TAGAYTAY, X-User-ID: my name-tag, Content-Type: application/json>>
Test data rules: <<e.g. made-up data; make new data in every run; "<name-tag>-probe" is my own second user for "another user" checks>>

[PART 3 · MY USER STORY]
<<paste the story and its acceptance criteria>>

[PART 4 · MY TEST CHARTER]
My test charter from Charter360 is the JSON in PART 7, at the end of this message.
- Automate every node whose "statusId" is "<<st_api>>". Each one is one test: its "text" holds the test id, the request, and the expected status and body after the arrow.
- The node whose text starts with "Setup" lists the setup calls. Make that data first.
- Ignore every other node.
Real example responses from this system (use these field names):
<<paste 1 to 3 real requests and responses, from the API docs or your own try>>

[PART 5 · WHAT TO GIVE ME]
ONE file named <<tests/api/card-NN.test.js>>. It prints a table with id, test, expected, actual, result (PASS or FAIL) and a last line "N passed, M failed", and sets process.exitCode = 1 when M is above 0.
<<or: copy the frame of an existing test file from your project here>>

[PART 6 · RULES]
- Check the status AND the body: the exact field values and messages from my charter.
- New data on every run. Never use another person's records.
- Use only what is in my charter. If something is missing, write a comment // ASK: <question> instead of guessing.
- <<your team's own rules>>
- Give the whole file in one code block, nothing else.

[PART 7 · MY CHARTER JSON]
Paste the JSON from Charter360 below this line:
