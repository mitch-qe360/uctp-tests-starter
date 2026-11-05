// Shared by the runner (runner/runner.mjs) and npm run test:watch (scripts/test-watch.mjs):
// one test run = save the charter, API tests once, web + integration tests in each browser,
// then summary.json, index.html and report.pdf in test-runs/<run_id>/, open the report, commit and push.
//
// Only fixed commands run here (node + Playwright's CLI, git), always as argument arrays, never a shell.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const ALL_BROWSERS = ['chrome', 'firefox'];
export const STAGING_HOST = 'city-treasurer-staging.aiqe.pro';

const require = createRequire(import.meta.url);
export function loadEnvironment(root = ROOT) {
  return require(path.join(root, 'config', 'environment.js'));
}

// ---------- small helpers ----------
const ANSI = /\u001b\[[0-9;]*[A-Za-z]/g;
export const stripAnsi = s => String(s ?? '').replace(ANSI, '');
const ID_RE = /^([AWI]\d+)(?!\d)/;
export const idOf = title => (ID_RE.exec(String(title || '').trim()) || [])[1] || '?';

export function newRunId(date = new Date(), root = ROOT) {
  const p = n => String(n).padStart(2, '0');
  const base = `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}-${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`;
  let id = base;
  for (let n = 2; fs.existsSync(path.join(root, 'test-runs', id)); n++) id = `${base}-${n}`;
  return id;
}

// Charter name from the page -> a safe file name: only A-Z a-z 0-9 . _ -
export function safeName(name) {
  const s = String(name || '').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^[.-]+/, '').slice(0, 80);
  return s || 'charter';
}

// Every charter test line (a node text starting with "A1 ", "W2 ", "I3 "...), in charter order.
export function charterIds(charter) {
  const ids = [];
  const seen = new Set();
  (function walk(node) {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    if (typeof node.text === 'string') {
      const m = /^([AWI]\d+) /.exec(node.text.trim());
      if (m && !seen.has(m[1])) { seen.add(m[1]); ids.push(m[1]); }
    }
    for (const v of Object.values(node)) if (v && typeof v === 'object') walk(v);
  })(charter);
  return ids;
}

// "A12 · AC-5 · refuse the full name "A"" -> { ac: "AC-5", test: "refuse the full name "A"" }
export function splitTitle(title) {
  let rest = String(title || '').trim().replace(/^[AWI]\d+(?!\d)\s*(·|:|-)?\s*/, '');
  rest = rest.replace(/^[+−-]\s*·\s*/, '');                       // old style "+ ·" / "− ·"
  const m = /^(AC-\d+(?:\s*,\s*AC-\d+)*)\s*·\s*/.exec(rest);
  return m ? { ac: m[1].replace(/\s*,\s*/g, ', '), test: rest.slice(m[0].length) } : { ac: '', test: rest };
}

export function charterStory(charter) {
  if (!charter || typeof charter !== 'object') return '';
  return String(charter.root?.text || charter.title || '');
}

// ---------- Playwright JSON report -> result rows ----------
function firstLines(text, n = 8, max = 1500) {
  return stripAnsi(text).split('\n').slice(0, n).join('\n').trim().slice(0, max);
}

function inHook(result, spec) {
  const msg = stripAnsi((result.errors || []).map(e => e.message || '').join('\n') + (result.error?.message || ''));
  if (/"(beforeAll|beforeEach)" hook/.test(msg)) return true;
  // The browser itself would not start: an environment problem, not a test result.
  if (/browserType\.launch|Executable doesn't exist/.test(msg)) return true;
  const loc = result.errorLocation;
  // The error happened in the same file, above the test itself: a beforeAll / beforeEach hook.
  if (loc && spec.file && loc.file && loc.file.replace(/\\/g, '/').endsWith(spec.file.replace(/\\/g, '/'))
      && typeof spec.line === 'number' && loc.line < spec.line) return true;
  return false;
}

// One row per test in a Playwright JSON report.
//   passed  = passed on the first try
//   flaky   = failed, then passed on a retry
//   failed  = failed every try
//   blocked = skipped, interrupted, or failed in a beforeAll / beforeEach hook
export function rowsFromPlaywright(report, browser, runDir) {
  const rows = [];
  const walk = suite => {
    for (const spec of suite.specs || []) {
      for (const t of spec.tests || []) {
        const results = t.results || [];
        const last = results[results.length - 1] || {};
        let status;
        if (t.status === 'flaky') status = 'flaky';
        else if (t.status === 'skipped' || results.some(r => r.status === 'interrupted')) status = 'blocked';
        else if (t.status === 'expected') status = last.status === 'skipped' ? 'blocked' : 'passed';
        else status = results.length && inHook(last, spec) ? 'blocked' : 'failed';

        let error = null;
        let screenshot = null;
        if (status !== 'passed') {
          const bad = [...results].reverse().find(r => r.status !== 'passed' && r.status !== 'skipped') || last;
          const msg = (bad.errors || []).map(e => e.message || '').join('\n') || bad.error?.message || '';
          error = msg ? firstLines(msg) : (status === 'blocked' ? 'Did not run (skipped or stopped)' : null);
          if (status === 'flaky' && error) error = `Passed on retry ${last.retry}. First failure:\n${error}`;
          const shot = (bad.attachments || []).find(a => a.name === 'screenshot' && a.path);
          if (shot && runDir) screenshot = path.relative(runDir, shot.path).split(path.sep).join('/');
        }
        rows.push({ id: idOf(spec.title), title: spec.title, browser, status, error, screenshot });
      }
    }
    for (const s of suite.suites || []) walk(s);
  };
  for (const s of report?.suites || []) walk(s);
  // A run that broke before any test (syntax error in a spec, bad config) has errors but no suites.
  if (!rows.length && report?.errors?.length) {
    rows.push({ id: '?', title: `${browser}: the run stopped before any test`, browser, status: 'blocked',
      error: firstLines(report.errors.map(e => e.message || '').join('\n')), screenshot: null });
  }
  return rows;
}

// Rows from the plain-Node API tests (tests/api/*.test.js, reports/<file>.json written by finish()).
export function rowsFromApiReports(reports) {
  const rows = [];
  for (const rep of reports) {
    for (const r of rep.results || []) {
      const id = idOf(r.id);
      const failed = r.result !== 'PASS';
      rows.push({
        id,
        title: `${r.id} · ${r.test}`,
        browser: 'api',
        status: failed ? (id === '?' ? 'blocked' : 'failed') : 'passed',
        error: failed ? `expected ${r.expected}\ngot ${String(r.actual).slice(0, 600)}` : null,
        screenshot: null,
      });
    }
  }
  return rows;
}

export function buildSummary({ runId, startedAt, finishedAt, baseUrl, browsers, charter, rows }) {
  const counts = { passed: 0, flaky: 0, failed: 0, blocked: 0, not_tested: 0 };
  for (const r of rows) counts[r.status] = (counts[r.status] || 0) + 1;
  const have = new Set(rows.map(r => r.id));
  const notTested = charterIds(charter).filter(id => !have.has(id));
  counts.not_tested = notTested.length;
  return {
    run_id: runId,
    started_at: startedAt,
    finished_at: finishedAt,
    base_url: baseUrl,
    browsers,
    story: charterStory(charter),
    counts,
    results: rows,
    not_tested: notTested,
    report: 'index.html',
    pdf: 'report.pdf',
    pushed: false,
    push_message: '',
  };
}

// ---------- our own report: index.html, nothing external ----------
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function reportHtml(summary) {
  const c = summary.counts;
  const label = { passed: 'Passed', flaky: 'Flaky', failed: 'Failed', blocked: 'Blocked', not_tested: 'Not tested' };
  const order = r => {
    const b = ['api', 'chrome', 'firefox'].indexOf(r.browser);
    const m = /^([AWI])(\d+)/.exec(r.id) || [];
    return [b < 0 ? 9 : b, m[1] ? 'AWI'.indexOf(m[1]) : 9, m[2] ? Number(m[2]) : 1e9];
  };
  const byOrder = (x, y) => { const a = order(x), b = order(y); return a[0] - b[0] || a[1] - b[1] || a[2] - b[2]; };
  const rows = [...[...summary.results].sort(byOrder), ...summary.not_tested.map(id => ({ id, title: `${id} · (no test ran for this charter line)`, browser: '-', status: 'not_tested' }))];
  const body = rows.map((r, i) => {
    const hasDetail = r.status !== 'passed' && r.status !== 'not_tested' && (r.error || r.screenshot);
    const main = `<tr class="row ${r.status}${hasDetail ? ' click' : ''}" data-i="${i}"${hasDetail ? ' tabindex="0"' : ''}>
<td>${esc(r.id)}</td><td>${esc(splitTitle(r.title).ac)}</td><td>${esc(splitTitle(r.title).test)}</td><td>${esc(r.browser)}</td><td><span class="pill ${r.status}">${label[r.status] || esc(r.status)}</span></td></tr>`;
    if (!hasDetail) return main;
    return main + `<tr class="detail" id="d${i}"><td colspan="5">${r.error ? `<pre>${esc(r.error)}</pre>` : ''}${r.screenshot ? `<img src="${esc(r.screenshot)}" alt="Screenshot of ${esc(r.id)} in ${esc(r.browser)}">` : ''}</td></tr>`;
  }).join('\n');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Test run ${esc(summary.run_id)}</title>
<style>
:root{--ok:#15803d;--flaky:#b45309;--bad:#b91c1c;--blocked:#d97706;--grey:#6b7280;--line:#e5e7eb}
body{font:15px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;margin:24px;color:#111827;background:#fff}
h1{font-size:22px;margin:0 0 4px} .meta{color:var(--grey);margin:0 0 16px}
.story{white-space:pre-wrap;background:#f9fafb;border:1px solid var(--line);border-radius:8px;padding:10px 12px;margin:0 0 16px}
.counts{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 18px}
.count{border:1px solid var(--line);border-radius:8px;padding:8px 14px;min-width:90px}
.count b{display:block;font-size:24px}
table{border-collapse:collapse;width:100%} th,td{text-align:left;padding:7px 8px;border-bottom:1px solid var(--line);vertical-align:top}
th{background:#f3f4f6} tr.click{cursor:pointer} tr.click:hover{background:#f9fafb}
tr.detail{display:none} tr.detail.open{display:table-row} tr.detail td{background:#fafafa}
pre{white-space:pre-wrap;word-break:break-word;margin:0 0 8px;font-size:13px}
img{max-width:100%;border:1px solid var(--line)}
.pill{display:inline-block;padding:1px 8px;border-radius:99px;color:#fff;font-size:13px;white-space:nowrap}
.pill.passed{background:var(--ok)}.pill.flaky{background:var(--flaky)}.pill.failed{background:var(--bad)}
.pill.blocked{background:var(--blocked)}.pill.not_tested{background:var(--grey)}
.hint{color:var(--grey);font-size:13px}
@media print{tr.detail{display:table-row} .hint,.pdf{display:none} body{margin:0}}
</style></head><body>
<h1>Test run ${esc(summary.run_id)}</h1>
<p class="meta">${esc(summary.base_url)} · browsers: ${esc((summary.browsers || []).join(', '))} · ${esc(summary.started_at)} to ${esc(summary.finished_at)}</p>
${summary.story ? `<div class="story">${esc(summary.story)}</div>` : ''}
<div class="counts">${Object.keys(label).map(k => `<div class="count"><b>${c[k] || 0}</b>${label[k]}</div>`).join('')}</div>
<p class="pdf">${summary.pdf ? '<a href="report.pdf">Open report.pdf</a>' : esc(summary.pdf_message || '')} <span class="hint">· Click a red or amber row to see why.</span></p>
<table><thead><tr><th>Id</th><th>AC</th><th>Test</th><th>Browser</th><th>Result</th></tr></thead><tbody>
${body}
</tbody></table>
<script>
document.querySelectorAll('tr.click').forEach(function (tr) {
  function toggle() { var d = document.getElementById('d' + tr.dataset.i); if (d) d.classList.toggle('open'); }
  tr.addEventListener('click', toggle);
  tr.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
});
</script>
</body></html>
`;
}

// ---------- processes ----------
const PW_CLI = path.join(ROOT, 'node_modules', '@playwright', 'test', 'cli.js');

// Run node with fixed arguments. onLine gets each stdout line. Never uses a shell.
function runNode(args, { env, cwd = ROOT, onLine, timeoutMs = 45 * 60 * 1000 } = {}) {
  return new Promise(resolve => {
    const child = spawn(process.execPath, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let buf = '';
    const timer = setTimeout(() => child.kill(), timeoutMs);
    child.stdout.on('data', d => {
      const s = d.toString();
      process.stdout.write(s);
      out += s;
      buf += s;
      const lines = buf.split('\n');
      buf = lines.pop();
      if (onLine) lines.forEach(onLine);
    });
    child.stderr.on('data', d => process.stderr.write(d));
    child.on('error', e => { clearTimeout(timer); resolve({ code: -1, out: out + String(e) }); });
    child.on('close', code => { clearTimeout(timer); resolve({ code, out }); });
  });
}

export function git(args, root = ROOT) {
  const r = spawnSync('git', args, { cwd: root, encoding: 'utf8', timeout: 120000 });
  return { ok: r.status === 0, out: `${r.stdout || ''}${r.stderr || ''}`.trim() };
}

export function stripCredentials(url) {
  return String(url || '').replace(/^(\w+:\/\/)[^@/]+@/, '$1');
}

export function repoInfo(root = ROOT) {
  return {
    repo: path.basename(root),
    remote: stripCredentials(git(['remote', 'get-url', 'origin'], root).out.split('\n')[0] || ''),
    branch: git(['rev-parse', '--abbrev-ref', 'HEAD'], root).out.split('\n')[0] || '',
  };
}

// Open a URL (or a file) in Google Chrome, else in the default browser.
export function openInChrome(url) {
  const tryRun = (cmd, args) => spawnSync(cmd, args, { stdio: 'ignore', timeout: 15000 }).status === 0;
  if (process.platform === 'darwin') return tryRun('open', ['-a', 'Google Chrome', url]) || tryRun('open', [url]);
  if (process.platform === 'win32') return tryRun('cmd', ['/c', 'start', 'chrome', url]) || tryRun('cmd', ['/c', 'start', '""', url]);
  return tryRun('xdg-open', [url]);
}

// Print index.html to report.pdf with Playwright's Chromium.
async function printPdf(runDir) {
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(path.join(runDir, 'index.html')).href);
    await page.pdf({ path: path.join(runDir, 'report.pdf'), format: 'A4', printBackground: true,
      margin: { top: '12mm', bottom: '12mm', left: '10mm', right: '10mm' } });
  } finally {
    await browser.close();
  }
}

// Count the tests a step will run (for the progress bar). 0 if unknown.
async function countTests(args, env) {
  const r = spawnSync(process.execPath, [PW_CLI, 'test', ...args, '--list', '--reporter=json'],
    { cwd: ROOT, env, encoding: 'utf8', timeout: 120000, maxBuffer: 64 * 1024 * 1024 });
  try {
    let n = 0;
    const walk = s => { for (const sp of s.specs || []) n += (sp.tests || []).length; (s.suites || []).forEach(walk); };
    (JSON.parse(r.stdout).suites || []).forEach(walk);
    return n;
  } catch { return 0; }
}

function legacyApiFiles(root = ROOT) {
  const dir = path.join(root, 'tests', 'api');
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.test.js')).sort() : [];
}

// ---------- the whole run ----------
// opts: { charter, name, baseUrl, browsers, headed, push, open, reportUrl(runId), onProgress(p) }
export async function runAll(opts) {
  const root = ROOT;
  const runId = opts.runId || newRunId();
  const startedAt = new Date().toISOString();
  const runDir = path.join(root, 'test-runs', runId);
  fs.mkdirSync(path.join(root, 'test-runs'), { recursive: true });
  fs.mkdirSync(runDir, { recursive: true });
  const rawDir = path.join(runDir, 'raw');
  fs.mkdirSync(rawDir, { recursive: true });

  const browsers = opts.browsers;
  const progress = { state: 'running', step: 'saving', done: 0, total: 0, message: 'Saving the charter' };
  const tell = patch => { Object.assign(progress, patch); opts.onProgress?.({ ...progress }); };
  tell({});

  const baseEnv = { ...process.env, BASE_URL: opts.baseUrl, FORCE_COLOR: '0' };
  delete baseEnv.PW_JSON_FILE;
  delete baseEnv.PW_OUTPUT_DIR;
  const common = ['--workers=1', '--retries=3'];
  const rows = [];

  // 1. Save the charter.
  if (opts.saveCharter !== false && opts.charter && typeof opts.charter === 'object') {
    fs.mkdirSync(path.join(root, 'charters'), { recursive: true });
    fs.writeFileSync(path.join(root, 'charters', `${safeName(opts.name)}.json`), JSON.stringify(opts.charter, null, 1));
  }

  // Progress total: the Playwright tests per project + the plain-Node API checks.
  let total = await countTests(['tests/api', '--project=api', '--pass-with-no-tests'], baseEnv);
  for (const b of browsers) total += await countTests(['tests/web', 'tests/integration', `--project=${b}`, '--pass-with-no-tests'], baseEnv);
  for (const f of legacyApiFiles(root)) {
    total += (fs.readFileSync(path.join(root, 'tests', 'api', f), 'utf8').match(/\(\s*['"`][AWI]\d+['"`]/g) || []).length;
  }
  tell({ total });

  const countLine = line => {
    if (/^\s*(✓|✘|ok|x|-)\s+\d+\s+(\[|›)/.test(line) && !/retry #/.test(line)) {
      tell({ done: Math.min(progress.done + 1, progress.total || Infinity) });
    }
  };

  // 2. API tests, once: the plain-Node files (tests/api/*.test.js), then Playwright API specs.
  tell({ step: 'api', message: 'API tests' });
  const legacy = legacyApiFiles(root);
  if (legacy.length) {
    const reportsDir = path.join(root, 'reports');
    const reports = [];
    for (const f of legacy) {
      const name = f.replace(/\.test\.js$/, '');
      const out = path.join(reportsDir, `${name}.json`);
      fs.rmSync(out, { force: true });
      await runNode([path.join(root, 'tests', 'api', f)], { env: baseEnv, timeoutMs: 5 * 60 * 1000 });
      if (fs.existsSync(out)) {
        try {
          const rep = JSON.parse(fs.readFileSync(out, 'utf8'));
          reports.push(rep);
          fs.copyFileSync(out, path.join(rawDir, `api-${name}.json`));
        } catch { /* unreadable report: its tests show as not tested */ }
      }
    }
    const legacyRows = rowsFromApiReports(reports);
    rows.push(...legacyRows);
    tell({ done: Math.min(progress.done + legacyRows.length, progress.total || Infinity) });
  }
  {
    const jsonFile = path.join(rawDir, 'api.json');
    const env = { ...baseEnv, PW_JSON_FILE: jsonFile, PW_OUTPUT_DIR: path.join(runDir, 'artifacts', 'api') };
    await runNode([PW_CLI, 'test', 'tests/api', '--project=api', '--pass-with-no-tests', ...common], { env, onLine: countLine });
    rows.push(...readPwRows(jsonFile, 'api', runDir));
  }

  // 3. Web + integration tests in each browser, one browser at a time.
  for (const b of browsers) {
    tell({ step: b, message: `Web and integration tests in ${b === 'chrome' ? 'Chrome' : 'Firefox'} (browser ${browsers.indexOf(b) + 1} of ${browsers.length})` });
    const jsonFile = path.join(rawDir, `${b}.json`);
    const env = { ...baseEnv, PW_JSON_FILE: jsonFile, PW_OUTPUT_DIR: path.join(runDir, 'artifacts', b) };
    const args = [PW_CLI, 'test', 'tests/web', 'tests/integration', `--project=${b}`, '--pass-with-no-tests', ...common];
    if (opts.headed) args.push('--headed');
    await runNode(args, { env, onLine: countLine });
    rows.push(...readPwRows(jsonFile, b, runDir));
  }

  // 4. summary.json, index.html, report.pdf
  tell({ step: 'report', message: 'Writing the report' });
  const summary = buildSummary({ runId, startedAt, finishedAt: new Date().toISOString(), baseUrl: opts.baseUrl,
    browsers, charter: opts.charter, rows });
  const writeOut = () => fs.writeFileSync(path.join(runDir, 'summary.json'), JSON.stringify(summary, null, 2));
  writeOut();
  fs.writeFileSync(path.join(runDir, 'index.html'), reportHtml(summary));
  try {
    await printPdf(runDir);
  } catch (e) {
    summary.pdf = null;
    summary.pdf_message = `PDF not made: ${stripAnsi(e.message).split('\n')[0]}. Fix: npx playwright install chromium`;
    fs.writeFileSync(path.join(runDir, 'index.html'), reportHtml(summary));
    writeOut();
  }

  // 5. Open the report in Chrome.
  if (opts.open !== false) {
    const url = opts.reportUrl ? opts.reportUrl(runId) : pathToFileURL(path.join(runDir, 'index.html')).href;
    openInChrome(url);
  }

  // 6. Commit and push, so CI runs too. A failed push doesn't fail the run.
  tell({ step: 'push', message: 'Saving to GitHub' });
  if (opts.push === false) {
    summary.push_message = 'Not pushed: NO_PUSH=1 is set.';
  } else {
    git(['add', 'charters', 'tests', 'test-runs'], root);
    const commit = git(['commit', '-m', `Test run ${runId}`], root);
    if (!commit.ok && !/nothing to commit|no changes added/.test(commit.out)) {
      summary.push_message = `Commit failed: ${commit.out.split('\n').slice(-2).join(' ')}`;
    } else {
      const push = git(['push'], root);
      summary.pushed = push.ok;
      summary.push_message = push.ok ? 'Pushed. CI runs on GitHub too.'
        : `Push failed: ${push.out.split('\n').slice(-3).join(' ')}. Fix: run "git push" in this folder and sign in to GitHub, then RUN again.`;
    }
  }
  writeOut();   // keeps the push result locally (it goes up with the next run)

  tell({ state: 'done', step: 'push', done: progress.total || rows.length, message: summary.push_message, summary });
  return summary;
}

function readPwRows(jsonFile, browser, runDir) {
  if (!fs.existsSync(jsonFile)) return [];
  try {
    return rowsFromPlaywright(JSON.parse(fs.readFileSync(jsonFile, 'utf8')), browser, runDir);
  } catch {
    return [{ id: '?', title: `${browser}: the results file could not be read`, browser, status: 'blocked', error: jsonFile, screenshot: null }];
  }
}
