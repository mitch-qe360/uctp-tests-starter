// Written once, used by every API test file: api(), check(), finish() and new test data.
const fs = require('fs');
const path = require('path');
const { BASE_URL, TENANT, ME } = require('../config/environment');

const HEADERS = { 'Content-Type': 'application/json', 'X-Tenant-ID': TENANT, 'X-User-ID': ME };
const AS_PROBE = { ...HEADERS, 'X-User-ID': `${ME}-probe` };   // my own second practice user
const NO_USER = { 'Content-Type': 'application/json', 'X-Tenant-ID': TENANT }; // no X-User-ID
const OTHER_CASE = ME === ME.toLowerCase() ? ME.toUpperCase() : ME.toLowerCase();
const AS_OTHER_CASE = { ...HEADERS, 'X-User-ID': OTHER_CASE };   // my name-tag in other letter case

// Call the API. Returns { status, body }. Never throws.
async function api(method, urlPath, body, headers = HEADERS) {
  try {
    const res = await fetch(BASE_URL + urlPath, {
      method, headers, body: body === undefined ? undefined : JSON.stringify(body),
    });
    let data = null;
    try { data = await res.json(); } catch (e) { /* no JSON body */ }
    return { status: res.status, body: data };
  } catch (e) {
    return { status: 0, body: String(e) };   // network error
  }
}

// One row in the results table per test.
const results = [];
function check(id, test, expected, actual, pass) {
  results.push({
    id, test, expected: String(expected),
    actual: typeof actual === 'string' ? actual : JSON.stringify(actual),
    result: pass ? 'PASS' : 'FAIL',
  });
}

// Print the table, save it in reports/, and make a FAIL stop the build (exit code 1).
function finish(name) {
  console.table(results);
  const failed = results.filter(r => r.result === 'FAIL').length;
  console.log(`${results.length - failed} passed, ${failed} failed`);
  const dir = path.join(__dirname, '..', 'reports');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify({ name, env: BASE_URL, ranAt: new Date().toISOString(), results }, null, 2));
  process.exitCode = failed ? 1 : 0;
}

// New data on every run, so you never clash with yourself or a classmate.
let counter = 0;
function newMobile() {                                   // 09 + 9 digits, never the same twice
  counter += 1;
  return `09${String(Date.now()).slice(-8)}${counter % 10}`;
}

function digits(n) {                                    // n new digits from the clock
  counter += 1;
  return (String(Date.now()) + String(counter % 10)).slice(-n);
}
const newPin = () => {                                   // property PIN NNN-NN-NNN-NNN-NNN
  const d = digits(13);
  return `7${d.slice(0, 2)}-${d.slice(2, 4)}-${d.slice(4, 7)}-${d.slice(7, 10)}-${d.slice(10, 13)}`;
};
const newReference = () => `A${digits(2)}-${digits(9)}`; // business or fee bill reference

module.exports = { api, check, finish, newMobile, newPin, newReference, HEADERS, AS_PROBE, NO_USER, AS_OTHER_CASE, ME };
