# Card 01 · API prompt (filled in)

Copy everything in the box, then paste your Card 01 charter JSON under the last line.

````
You are a tester on my team. Write API tests for the user story below.

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
Example API responses:
POST /api/v1/training/taxpayers body {"full_name": "Ana Dela Cruz", "mobile": "09013724603"}
  -> 201 {"taxpayer_id": "d55f5627-8477-4a54-955c-42cb50e857b7", "full_name": "Ana Dela Cruz", "mobile": "09013724603", "email": null, "created_at": "2026-11-02T18:22:04.959Z"}
GET /api/v1/training/taxpayers/{taxpayer_id}
  -> 200 {"taxpayer_id": "d55f5627-8477-4a54-955c-42cb50e857b7", "full_name": "Ana Dela Cruz", "mobile": "09013724603", "email": null, "created_at": "2026-11-02T18:22:04.959Z"}

2 · TESTS
Automate every node in my charter JSON (at the end) whose "statusId" is "st_api".
One test per node. Use the node's id, request or steps, and expected result exactly.

3 · FILES
Give me tests/api/taxpayer-positive.test.js, tests/api/taxpayer-negative.test.js, tests/api/taxpayer-security.test.js.

4 · RULES
Follow our project rules:
- Write plain JavaScript for Node.js 22. No libraries, no imports other than our helper.
- Every file starts with this line and ends with `finish('<file name without .test.js>')`:
  `const { api, check, finish, newMobile, newPin, newReference, AS_PROBE, NO_USER } = require('../../helpers/api-client');`
- Put the tests inside `(async () => { ... })();`.
- Our helper does the rest. Never write the site address, the name-tag or the headers in a test.
  - `api(method, path, body, headers)` calls the API and returns `{ status, body }`. Leave out `headers` for my own user.
  - `AS_PROBE` = the headers of another user. `NO_USER` = the headers without `X-User-ID`.
  - `check(id, test, expected, actual, pass)` adds one row to the results table.
  - `newMobile()`, `newPin()`, `newReference()` make new data on every run. Never type a mobile, PIN or reference that must be new.
- Split the tests into 3 files:
  - `<feature>-positive.test.js`: the tests marked `+` that should work
  - `<feature>-negative.test.js`: the tests marked `−` with wrong input or a duplicate
  - `<feature>-security.test.js`: the tests about another user or a missing header
- Each file makes its own data first. If a setup call fails: `check('SETUP', ...)` as FAIL, then `return finish(...)`.
- One `check(...)` per charter node, with the node's id (T1, T2, ...). Check the status code **and** the body, exactly as the charter says.
- Never change an expected result to match what you think the system does. If one looks wrong, say so after the code.
- Use field names exactly as in the example responses in my story (`taxpayer_id`, `bill_id`, ...). No response has a plain `id`.
- Names (`full_name`) take only letters, spaces, `.` `-` `'` and Ñ. No digits in names.
- Reply with each file in its own code block, with the file name on the line above it. Then at most 3 short notes.

Example: one test from our project (`tests/api/taxpayer-positive.test.js`):

```js
// T1 · Users + · Create a taxpayer with a 09 mobile
const t1 = await api('POST', '/api/v1/training/taxpayers', { full_name: 'Ana Dela Cruz', mobile });
const b1 = t1.body || {};
check('T1', 'Create a taxpayer with a 09 mobile', `201, full_name "Ana Dela Cruz", mobile ${mobile}, email null`,
  t1, t1.status === 201 && b1.full_name === 'Ana Dela Cruz' && b1.mobile === mobile && b1.email === null && !!b1.taxpayer_id);
```

MY CHARTER JSON:
````
