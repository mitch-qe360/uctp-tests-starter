// Runner tests: npm run test:runner (node --test). No browser, no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRunner, busyPortMessage } from './runner.mjs';
import { ROOT, pagesUrl, onlyGrep, splitTitle, rowsFromPlaywright, buildSummary, sutName, runPaths, writeRunsIndex, browserMissing, linkTo, charterIds, safeName, reportHtml, stripCredentials } from './lib.mjs';

const ORIGIN = 'https://qe-360-academy-staging.aiqe.pro';
const CODE = '123456';

async function withRunner(fn, start) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runner-test-'));
  fs.mkdirSync(path.join(root, 'config'));
  fs.copyFileSync(path.join(ROOT, 'config', 'environment.js'), path.join(root, 'config', 'environment.js'));
  const jobs = [];
  const runner = createRunner({ root, code: CODE, port: 0, start: start || (async job => { jobs.push(job); return { run_id: job.runId }; }) });
  const port = await runner.listen();
  const call = (method, p, { headers = {}, body } = {}) => fetch(`http://127.0.0.1:${port}${p}`, {
    method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  try { await fn({ call, root, jobs }); } finally { await runner.close(); fs.rmSync(root, { recursive: true, force: true }); }
}
const good = { Origin: ORIGIN, 'X-Runner-Code': CODE };

test('preflight from Charter360 gets the CORS and private-network headers', () => withRunner(async ({ call }) => {
  const res = await call('OPTIONS', '/run', { headers: { Origin: ORIGIN, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Private-Network': 'true' } });
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('access-control-allow-origin'), ORIGIN);
  assert.equal(res.headers.get('access-control-allow-methods'), 'GET, POST, OPTIONS');
  assert.equal(res.headers.get('access-control-allow-headers'), 'Content-Type, X-Runner-Code');
  assert.equal(res.headers.get('access-control-allow-private-network'), 'true');
  assert.equal(res.headers.get('vary'), 'Origin');
}));

test('a wrong Origin is rejected, with no CORS headers', () => withRunner(async ({ call, jobs }) => {
  for (const [m, p] of [['OPTIONS', '/run'], ['GET', '/status'], ['POST', '/run'], ['POST', '/files']]) {
    const res = await call(m, p, { headers: { Origin: 'https://evil.example', 'X-Runner-Code': CODE }, body: m === 'POST' ? {} : undefined });
    assert.equal(res.status, 403, `${m} ${p}`);
    assert.equal(res.headers.get('access-control-allow-origin'), null);
  }
  assert.equal(jobs.length, 0);
}));

test('a POST with no Origin is rejected', () => withRunner(async ({ call }) => {
  const res = await call('POST', '/run', { headers: { 'X-Runner-Code': CODE }, body: {} });
  assert.equal(res.status, 403);
}));

test('a wrong Host header is rejected', () => withRunner(async ({ call }) => {
  // fetch won't let us set Host, so use http directly
  const http = await import('node:http');
  const { port } = new URL((await call('GET', '/status')).url);
  const status = await new Promise(resolve => http.get({ host: '127.0.0.1', port, path: '/status', headers: { Host: 'evil.example' } }, r => resolve(r.statusCode)));
  assert.equal(status, 403);
}));

test('missing or wrong pairing code gets 401', () => withRunner(async ({ call, jobs }) => {
  for (const headers of [{ Origin: ORIGIN }, { Origin: ORIGIN, 'X-Runner-Code': '000000' }, { Origin: ORIGIN, 'X-Runner-Code': '1234567' }]) {
    for (const p of ['/run', '/files']) {
      const res = await call('POST', p, { headers, body: { files: [{ path: 'tests/web/a.spec.ts', content: 'x' }] } });
      assert.equal(res.status, 401, `${p} ${JSON.stringify(headers)}`);
      assert.equal(res.headers.get('access-control-allow-origin'), ORIGIN);
    }
    assert.equal((await call('GET', '/run/20261105-143000', { headers })).status, 401);
  }
  assert.equal(jobs.length, 0);
}));

test('/status has the contract shape, and paired says if the code is right', () => withRunner(async ({ call, root }) => {
  let res = await call('GET', '/status', { headers: { Origin: ORIGIN } });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('access-control-allow-origin'), ORIGIN);
  let s = await res.json();
  assert.deepEqual(Object.keys(s).sort(), ['branch', 'browsers', 'busy', 'ok', 'paired', 'remote', 'repo', 'version'].sort());
  assert.equal(s.ok, true);
  assert.equal(s.version, '1');
  assert.equal(s.paired, false);
  assert.equal(s.repo, path.basename(root));
  assert.deepEqual(s.browsers, ['chrome', 'firefox']);
  assert.equal(s.busy, false);
  s = await (await call('GET', '/status', { headers: good })).json();
  assert.equal(s.paired, true);
}));

test('/files writes allowed paths only', () => withRunner(async ({ call, root }) => {
  const res = await call('POST', '/files', { headers: good, body: { files: [
    { path: 'tests/web/w-card01.spec.ts', content: '// w' },
    { path: 'tests/api/a-card01.spec.js', content: '// a' },
    { path: 'charters/card-02.json', content: '{}' },
  ] } });
  assert.equal(res.status, 200);
  assert.deepEqual((await res.json()).written, ['tests/web/w-card01.spec.ts', 'tests/api/a-card01.spec.js', 'charters/card-02.json']);
  assert.equal(fs.readFileSync(path.join(root, 'tests', 'web', 'w-card01.spec.ts'), 'utf8'), '// w');
}));

test('a path outside the allowlist gets 400 and nothing is written', () => withRunner(async ({ call, root }) => {
  const bad = ['../evil.spec.ts', 'tests/web/../../evil.spec.ts', 'tests/web/sub/x.spec.ts', 'package.json', 'tests/web/x.ts',
    '/etc/passwd', 'tests\\web\\x.spec.ts', 'charters/x.js', '.github/workflows/x.yml', 'tests/helpers/x.spec.ts'];
  for (const p of bad) {
    const res = await call('POST', '/files', { headers: good, body: { files: [{ path: 'tests/web/ok.spec.ts', content: 'ok' }, { path: p, content: 'bad' }] } });
    assert.equal(res.status, 400, p);
  }
  assert.equal(fs.existsSync(path.join(root, 'tests')), false, 'nothing written, not even the good file');
  assert.equal(fs.existsSync(path.join(root, 'evil.spec.ts')), false);
  const big = await call('POST', '/files', { headers: good, body: { files: [{ path: 'tests/web/big.spec.ts', content: 'x'.repeat(200 * 1024 + 1) }] } });
  assert.equal(big.status, 400);
  const many = await call('POST', '/files', { headers: good, body: { files: Array.from({ length: 31 }, (_, i) => ({ path: `tests/web/f${i}.spec.ts`, content: '' })) } });
  assert.equal(many.status, 400);
  assert.equal(fs.existsSync(path.join(root, 'tests')), false);
}));

test('/run checks base_url and browsers, sanitizes name, and answers 409 while busy', async () => {
  let release;
  const gate = new Promise(r => { release = r; });
  const jobs = [];
  await withRunner(async ({ call }) => {
    const bad = [
      { base_url: 'http://city-treasurer-staging.aiqe.pro', browsers: ['chrome'] },
      { base_url: 'https://www.google.com', browsers: ['chrome'] },
      { base_url: 'https://city-treasurer-staging.aiqe.pro', browsers: ['webkit'] },
      { base_url: 'https://city-treasurer-staging.aiqe.pro', browsers: [] },
    ];
    for (const body of bad) assert.equal((await call('POST', '/run', { headers: good, body })).status, 400, JSON.stringify(body));
    const res = await call('POST', '/run', { headers: good, body: { charter: { root: { text: 'S' } }, name: '../../etc/pass wd;rm -rf', base_url: 'https://city-treasurer-staging.aiqe.pro/', browsers: ['firefox', 'chrome'] } });
    assert.equal(res.status, 200);
    const { run_id } = await res.json();
    assert.match(run_id, /^\d{8}-\d{6}(-\d+)?$/);
    await new Promise(r => setTimeout(r, 20));
    assert.equal(jobs[0].name, 'etc-pass-wd-rm--rf');
    assert.deepEqual(jobs[0].browsers, ['firefox', 'chrome']);
    assert.equal(jobs[0].baseUrl, 'https://city-treasurer-staging.aiqe.pro');
    assert.equal((await call('POST', '/run', { headers: good, body: { base_url: 'https://city-treasurer-staging.aiqe.pro' } })).status, 409);
    assert.equal((await (await call('GET', '/status', { headers: good })).json()).busy, true);
    assert.equal((await (await call('GET', `/run/${run_id}`, { headers: good })).json()).state, 'running');
    release();
    await new Promise(r => setTimeout(r, 20));
    const done = await (await call('GET', `/run/${run_id}`, { headers: good })).json();
    assert.equal(done.state, 'done');
  }, async job => { jobs.push(job); await gate; return { run_id: job.runId }; });
});

test('/report serves files from the run folder only', () => withRunner(async ({ call, root }) => {
  const dir = path.join(root, 'test-runs', '2026-11-05', 'Card 01 - 2026-11-05 143000');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'Card 01 - 2026-11-05 143000.html'), '<h1>hi</h1>');
  fs.writeFileSync(path.join(dir, '..', 'other.txt'), 'no');
  fs.writeFileSync(path.join(root, 'secret.txt'), 'no');
  const res = await call('GET', `/report/20261105-143000/${encodeURIComponent('Card 01 - 2026-11-05 143000.html')}`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/html/);
  assert.equal(await res.text(), '<h1>hi</h1>');
  for (const p of ['/report/20261105-143000/..%2F..%2Fsecret.txt', '/report/..%2Fsecret.txt/x', '/report/20261105-143000/%2e%2e/other.txt', '/report/20261105-143000/%2e%2e/%2e%2e/secret.txt', '/report/20261105-150000/x.html']) {
    assert.notEqual((await call('GET', p)).status, 200, p);
  }
}));

// ---------- summary building ----------
const charter = { root: { text: 'Card 99 · Story', children: [
  { text: 'A1 · + · ok' }, { text: 'A2 · − · flaky' }, { text: 'W1 · + · fails' }, { text: 'W2 · + · hook' },
  { text: 'W3 · + · skipped' }, { text: 'I1 · + · interrupted' }, { text: 'I2 · + · never written' },
  { text: 'AC-1 heading, not a test' }, { text: 'A10 · + · legacy' }, { text: 'Note about A3 inside text' },
] } };

const result = (status, extra = {}) => ({ status, retry: 0, errors: [], attachments: [], ...extra });
const pwReport = {
  suites: [{ title: 'x.spec.ts', file: 'web/x.spec.ts', specs: [], suites: [{ title: 'describe', file: 'web/x.spec.ts', specs: [
    { title: 'W1 · + · fails', file: 'web/x.spec.ts', line: 20, tests: [{ status: 'unexpected', results: [
      result('failed', { errors: [{ message: '\u001b[31mError: expected 1\u001b[39m\nline2' }] }),
      result('failed', { retry: 3, errors: [{ message: 'Error: expected 1\nline2' }], attachments: [{ name: 'screenshot', contentType: 'image/png', path: '/run/artifacts/chrome/w1/test-failed-1.png' }] }),
    ] }] },
    { title: 'W2 · + · hook', file: 'web/x.spec.ts', line: 30, tests: [{ status: 'unexpected', results: [
      result('failed', { errors: [{ message: 'Error: sign in failed' }], errorLocation: { file: '/abs/tests/web/x.spec.ts', line: 12, column: 5 } }),
    ] }] },
    { title: 'W3 · + · skipped', file: 'web/x.spec.ts', line: 40, tests: [{ status: 'skipped', results: [result('skipped')] }] },
    { title: 'I1 · + · interrupted', file: 'web/x.spec.ts', line: 50, tests: [{ status: 'unexpected', results: [result('interrupted')] }] },
    { title: 'no id here', file: 'web/x.spec.ts', line: 60, tests: [{ status: 'expected', results: [result('passed')] }] },
    { title: 'W4 · + · timed out in beforeEach', file: 'web/x.spec.ts', line: 70, tests: [{ status: 'unexpected', results: [
      result('timedOut', { errors: [{ message: 'Test timeout of 30000ms exceeded while running "beforeEach" hook.' }] }),
    ] }] },
    { title: 'W5 · + · browser did not start', file: 'web/x.spec.ts', line: 80, tests: [{ status: 'unexpected', results: [
      result('failed', { errors: [{ message: 'Error: browserType.launch: Failed to launch the browser process.' }] }),
    ] }] },
  ] }] }],
};
const apiReport = {
  suites: [{ title: 'a.spec.ts', file: 'a.spec.ts', specs: [
    { title: 'A1 · + · ok', file: 'a.spec.ts', line: 5, tests: [{ status: 'expected', results: [result('passed')] }] },
    { title: 'A2 · − · flaky', file: 'a.spec.ts', line: 9, tests: [{ status: 'flaky', results: [result('failed', { errors: [{ message: 'Error: 500' }] }), result('passed', { retry: 1 })] }] },
  ] }],
};

test('Playwright results map to passed, flaky, failed and blocked', () => {
  const rows = [...rowsFromPlaywright(apiReport, 'api', '/run'), ...rowsFromPlaywright(pwReport, 'chrome', '/run')];
  const by = Object.fromEntries(rows.map(r => [`${r.id}`, r]));
  assert.equal(by.A1.status, 'passed');
  assert.equal(by.A1.error, null);
  assert.equal(by.A2.status, 'flaky');
  assert.match(by.A2.error, /retry 1/);
  assert.equal(by.W1.status, 'failed');
  assert.equal(by.W1.error, 'Error: expected 1\nline2');            // ANSI colours removed
  assert.equal(by.W1.screenshot, 'artifacts/chrome/w1/test-failed-1.png');
  assert.equal(by.W2.status, 'blocked', 'error above the test line = hook');
  assert.equal(by.W3.status, 'blocked', 'skipped');
  assert.equal(by.I1.status, 'blocked', 'interrupted');
  assert.equal(by.W4.status, 'blocked', 'beforeEach timeout');
  assert.equal(by.W5.status, 'blocked', 'browser did not launch');
  assert.equal(by['?'].title, 'no id here');
  assert.equal(by.W1.browser, 'chrome');
  assert.equal(by.A1.browser, 'api');
});

test('a Playwright run that broke before any test shows one blocked row', () => {
  const rows = rowsFromPlaywright({ suites: [], errors: [{ message: 'SyntaxError: Unexpected token' }] }, 'firefox', '/run');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, 'blocked');
  assert.match(rows[0].error, /SyntaxError/);
});

test('summary has the contract shape, counts and not_tested from the charter', () => {
  assert.deepEqual(charterIds(charter), ['A1', 'A2', 'W1', 'W2', 'W3', 'I1', 'I2', 'A10']);
  const rows = [...rowsFromPlaywright(apiReport, 'api', '/run'), ...rowsFromPlaywright(pwReport, 'chrome', '/run'),
    { id: 'A10', title: 'A10 · legacy', browser: 'api', status: 'passed', error: null, screenshot: null }];
  const s = buildSummary({ runId: '20261105-143000', startedAt: 'a', finishedAt: 'b', baseUrl: 'https://x', browsers: ['chrome'], charter, rows });
  assert.deepEqual(Object.keys(s).filter(k => k !== 'not_tested'),
    ['run_id', 'started_at', 'finished_at', 'base_url', 'browsers', 'story', 'counts', 'results', 'report', 'messages', 'pushed', 'push_message']);
  assert.equal(s.story, 'Card 99 · Story');
  assert.deepEqual(s.counts, { passed: 3, flaky: 1, failed: 1, blocked: 5, not_tested: 1 });
  assert.deepEqual(s.not_tested, ['I2']);
  for (const r of s.results) assert.deepEqual(Object.keys(r), ['id', 'title', 'browser', 'status', 'error', 'screenshot']);
  const html = reportHtml(s);
  assert.match(html, /window\.print\(\)/);
  assert.equal('pdf' in s, false);
  assert.doesNotMatch(html, /<script src|<link /, 'no external assets');
  assert.match(html, /Not tested/);
});

test('report escapes test titles and errors', () => {
  const s = buildSummary({ runId: 'r', startedAt: '', finishedAt: '', baseUrl: '', browsers: [], charter: null,
    rows: [{ id: 'W1', title: '<img src=x onerror=alert(1)>', browser: 'chrome', status: 'failed', error: '</pre><script>x</script>', screenshot: null }] });
  const html = reportHtml(s);
  assert.doesNotMatch(html, /<img src=x/);
  assert.doesNotMatch(html, /<script>x<\/script>/);
});

test('safeName keeps only A-Z a-z 0-9 . _ -', () => {
  assert.equal(safeName('Card 01: Register/taxpayer'), 'Card-01-Register-taxpayer');
  assert.equal(safeName('../..'), 'charter');
  assert.equal(safeName(''), 'charter');
  assert.equal(safeName('.hidden'), 'hidden');
});

test('remote URLs lose their credentials', () => {
  assert.equal(stripCredentials('https://user:ghp_secret@github.com/a/b.git'), 'https://github.com/a/b.git');
  assert.equal(stripCredentials('git@github.com:a/b.git'), 'git@github.com:a/b.git');
});

test('titles split into id, AC and test; old "+ ·" style too', () => {
  assert.deepEqual(splitTitle('A12 · AC-5 · refuse the full name "A" (1 letter)'), { ac: 'AC-5', test: 'refuse the full name "A" (1 letter)' });
  assert.deepEqual(splitTitle('I1 · AC-1, AC-2 · create it with the API'), { ac: 'AC-1, AC-2', test: 'create it with the API' });
  assert.deepEqual(splitTitle('W8 · − · AC-8 · dashes'), { ac: 'AC-8', test: 'dashes' });
  assert.deepEqual(splitTitle('W1 · + · the form opens empty'), { ac: '', test: 'the form opens empty' });
  assert.deepEqual(splitTitle('no id here'), { ac: '', test: 'no id here' });
});

test('report links are relative, so it works from file:// and from the runner', () => {
  const s = buildSummary({ runId: 'r', startedAt: '', finishedAt: '', baseUrl: 'https://x', browsers: ['chrome'], charter: null,
    rows: [{ id: 'W1', title: 'W1 · AC-1 · open the form', browser: 'chrome', status: 'failed', error: 'e', screenshot: 'artifacts/chrome/w1/test-failed-1.png' }] });
  const html = reportHtml(s);
  const links = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(links, ['artifacts/chrome/w1/test-failed-1.png']);
  s.results[0].screenshot = 'Card 01 - 2026-11-05 143000/artifacts/chrome/x.png';
  const links2 = [...reportHtml(s).matchAll(/(?:href|src)="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(links2, ['Card%2001%20-%202026-11-05%20143000/artifacts/chrome/x.png']);
  assert.match(html, /<th>Id<\/th><th>AC<\/th><th>Test<\/th><th>Browser<\/th><th>Result<\/th>/);
  assert.match(html, /<td>W1<\/td><td>AC-1<\/td><td>open the form<\/td>/);
});

test('file names: one folder per run, test-runs/<day>/<SUT> - <day> <time>/', () => {
  assert.equal(sutName({ root: { text: 'Card 01 · TRN-01 · Register a taxpayer' } }), 'Card 01 · TRN-01 · Register a taxpayer');
  assert.equal(sutName({ root: { text: 'A/B: "C"?\nsecond line' } }), 'A-B- -C');
  assert.equal(sutName(null), 'Tests');
  assert.equal(sutName({ root: { text: '  ...  ' } }), 'Tests');
  const p = runPaths('/r', '20261105-143000', 'Card 01');
  assert.equal(p.dayDir, path.join('/r', 'test-runs', '2026-11-05'));
  assert.equal(p.html, 'Card 01 - 2026-11-05 143000.html');
  assert.equal(p.json, 'Card 01 - 2026-11-05 143000.json');
  assert.equal(p.runDir, path.join('/r', 'test-runs', '2026-11-05', 'Card 01 - 2026-11-05 143000'));
  assert.equal(p.assetsDir, p.runDir);
  assert.equal(linkTo('a b/c#d.png'), 'a%20b/c%23d.png');
});

test('test-runs/index.html lists runs newest first, linking each report', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runs-'));
  const put = (day, id, name) => {
    fs.mkdirSync(path.join(root, 'test-runs', day, name), { recursive: true });
    fs.writeFileSync(path.join(root, 'test-runs', day, name, `${name}.json`), JSON.stringify({ run_id: id, report: `${name}.html`,
      counts: { passed: 1, flaky: 0, failed: 0, blocked: 0, not_tested: 0 } }));
  };
  put('2026-11-04', '20261104-090000', 'Card 01 - 2026-11-04 090000');
  put('2026-11-05', '20261105-143000', 'Card 01 - 2026-11-05 143000');
  writeRunsIndex(root);
  const html = fs.readFileSync(path.join(root, 'test-runs', 'index.html'), 'utf8');
  assert.ok(html.indexOf('2026-11-05') < html.indexOf('2026-11-04'), 'newest day first');
  assert.match(html, /href="2026-11-05\/Card%2001%20-%202026-11-05%20143000\/Card%2001%20-%202026-11-05%20143000\.html"/);
  fs.rmSync(root, { recursive: true, force: true });
});

test('browser check looks for the file only, and names the fix', async () => {
  const none = () => false;
  assert.equal(await browserMissing('firefox', { exists: none }), "Firefox isn't installed: run npx playwright install firefox");
  assert.equal(await browserMissing('chrome', { exists: none, platform: 'darwin', env: {} }), "Google Chrome isn't installed: run npx playwright install chrome");
  assert.equal(await browserMissing('chrome', { exists: p => p === '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', platform: 'darwin', env: {} }), null);
  assert.equal(await browserMissing('firefox', { exists: () => true }), null);
});

test('a browser that is not installed: its tests count as not tested, with the message', () => {
  const msg = "Firefox isn't installed: run npx playwright install firefox";
  const s = buildSummary({ runId: 'r', startedAt: '', finishedAt: '', baseUrl: '', browsers: ['firefox'], charter: null,
    rows: [{ id: 'W1', title: 'W1 · AC-1 · x', browser: 'firefox', status: 'not_tested', error: msg, screenshot: null }] });
  assert.equal(s.counts.not_tested, 1);
  s.messages = [msg];
  assert.match(reportHtml(s), /Firefox isn&#39;t installed/);
});

test('port busy: our runner gets its folder, code and how to stop it; another program gets a clear message', () => {
  const ours = busyPortMessage({ status: { ok: true, version: '1', repo: 'uctp-tests', paired: true }, paired: true, code: '123456', pid: '4242' });
  assert.match(ours, /Your runner is already running \(folder: uctp-tests, started earlier\)\. Use it: pairing code 123456\./);
  assert.match(ours, /To restart it, stop it with: kill 4242/);
  const other = busyPortMessage({ status: { ok: true, version: '1', repo: 'other-repo', paired: false }, paired: false, code: '123456', pid: '' });
  assert.match(other, /another folder \(other-repo\)/);
  assert.doesNotMatch(other, /123456/);
  assert.match(other, /find its PID/);
  assert.match(busyPortMessage({ status: null, pid: '99' }), /^Another program uses port 7357.*kill 99/);
});

test('POST /stop: 409 when idle, 401 without code, and a running job ends as stopped', () => withRunner(async ({ call }) => {
  assert.equal((await call('POST', '/stop', { headers: good, body: {} })).status, 409);
  assert.equal((await call('POST', '/stop', { headers: { Origin: ORIGIN }, body: {} })).status, 401);
  const { run_id } = await (await call('POST', '/run', { headers: good, body: { base_url: 'https://city-treasurer-staging.aiqe.pro', browsers: ['chrome'] } })).json();
  const stop = await call('POST', '/stop', { headers: good, body: {} });
  assert.equal(stop.status, 200);
  assert.deepEqual(await stop.json(), { stopping: true, run_id });
  let r;
  for (let i = 0; i < 50; i++) { r = await (await call('GET', `/run/${run_id}`, { headers: good })).json(); if (r.state !== 'running') break; await new Promise(x => setTimeout(x, 10)); }
  assert.equal(r.state, 'stopped');
  assert.equal(r.message, 'Stopped by you');
  assert.equal(r.summary.stopped, true);
  assert.equal((await call('POST', '/stop', { headers: good, body: {} })).status, 409);
}, async job => { while (!job.control.stopped) await new Promise(x => setTimeout(x, 5)); return { run_id: job.runId, stopped: true }; }));

test('POST /run: only and headed are checked and passed on', async () => {
  const jobs = [];
  await withRunner(async ({ call }) => {
    const base = { base_url: 'https://city-treasurer-staging.aiqe.pro', browsers: ['chrome'] };
    for (const only of [[], ['T1'], ['A1; rm'], ['a1'], ['A1234'], 'A1', Array.from({ length: 51 }, (_, i) => `A${i + 1}`)]) {
      assert.equal((await call('POST', '/run', { headers: good, body: { ...base, only } })).status, 400, JSON.stringify(only));
    }
    assert.equal((await call('POST', '/run', { headers: good, body: { ...base, headed: 'no' } })).status, 400);
    assert.equal((await call('POST', '/run', { headers: good, body: { ...base, only: ['A1', 'W3', 'A1'], headed: false } })).status, 200);
    await new Promise(x => setTimeout(x, 20));
    assert.deepEqual(jobs[0].only, ['A1', 'W3']);
    assert.equal(jobs[0].headed, false);
  }, async job => { jobs.push(job); return { run_id: job.runId }; });
});

test('only: the grep picks exactly those ids, and Not tested counts only them', () => {
  const re = new RegExp(onlyGrep(['A1', 'W3']));
  assert.ok(re.test('TRN-01 Register a taxpayer (API) A1 · AC-1 · create'));
  assert.ok(re.test('W3 · AC-2 · see it'));
  assert.ok(!re.test('TRN-01 (API) A10 · AC-6 · email'));
  assert.ok(!re.test('TRN-01 (web) W33 · x'));
  assert.ok(!re.test('TRN-01 (API) A2 · AC-2 · read back the taxpayer from A1 by its taxpayer_id'));
  const charter = { root: { text: 'S', children: [{ text: 'A1 · x' }, { text: 'A2 · y' }, { text: 'W3 · z' }] } };
  const s = buildSummary({ runId: 'r', startedAt: '', finishedAt: '', baseUrl: '', browsers: [], charter, only: ['A1', 'W3'],
    rows: [{ id: 'A1', title: 'A1 · x', browser: 'api', status: 'passed', error: null, screenshot: null }] });
  assert.deepEqual(s.not_tested, ['W3']);
});

test('pages_url comes from the git remote, and the report shows it', () => {
  const f = 'Card 01 · TRN-01 - 2026-11-05 143000.html';
  const want = 'https://ana.github.io/uctp-tests/2026-11-05/Card%2001%20%C2%B7%20TRN-01%20-%202026-11-05%20143000.html';
  assert.equal(pagesUrl('https://github.com/Ana/uctp-tests.git', '2026-11-05', f), want);
  assert.equal(pagesUrl('git@github.com:Ana/uctp-tests.git', '2026-11-05', f), want);
  assert.equal(pagesUrl('https://github.com/Ana/uctp-tests', '2026-11-05', f), want);
  assert.equal(pagesUrl('https://gitlab.com/ana/uctp-tests.git', '2026-11-05', f), null);
  assert.equal(pagesUrl('', '2026-11-05', f), null);
  const s = buildSummary({ runId: 'r', startedAt: '', finishedAt: '', baseUrl: '', browsers: [], charter: null, rows: [] });
  s.pages_url = want;
  assert.match(reportHtml(s), /On GitHub Pages about a minute after the push: <a href="https:\/\/ana\.github\.io\/uctp-tests\/2026-11-05\//);
});
