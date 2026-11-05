// npm run doctor -- checks this computer is ready for class. Prints ✅ / ❌, with the fix for each ❌.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, loadEnvironment, git } from '../runner/lib.mjs';

let bad = 0;
const ok = msg => console.log(`✅ ${msg}`);
const fail = (msg, fix) => { bad += 1; console.log(`❌ ${msg}\n   Fix: ${fix}`); };

console.log(`Checking ${ROOT}\n`);

// 1. Node 20 or newer
const major = Number(process.versions.node.split('.')[0]);
if (major >= 20) ok(`Node.js ${process.versions.node}`);
else fail(`Node.js ${process.versions.node} is too old (need 20 or newer)`, 'install Node.js LTS from https://nodejs.org, or run the setup script again (setup-mac.sh / setup-windows.ps1)');

// 2. Git
const gitV = spawnSync('git', ['--version'], { encoding: 'utf8' });
if (gitV.status === 0) ok(gitV.stdout.trim());
else fail('Git is not installed', 'Mac: run "xcode-select --install". Windows: run "winget install --id Git.Git -e". Then open a new terminal.');

// 3. A git remote
const remote = git(['remote', 'get-url', 'origin']);
if (remote.ok && remote.out) ok(`Git remote: ${remote.out.replace(/^(\w+:\/\/)[^@/]+@/, '$1')}`);
else fail('This folder has no git remote "origin"', 'git remote add origin https://github.com/<your-username>/uctp-tests.git');

// 4. git push works (dry run: nothing is sent)
if (remote.ok) {
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']).out;
  const push = git(['push', '--dry-run', 'origin', `HEAD:${branch}`]);
  if (push.ok) ok(`git push works (branch ${branch})`);
  else fail(`git push --dry-run failed: ${push.out.split('\n').slice(-1)[0]}`,
    'run "git push" once in this folder and sign in to GitHub when asked. The repo must be YOUR copy (github.com/<your-username>/uctp-tests), not the teacher\'s.');
}

// 5. Playwright browsers: Chrome and Firefox for the tests
let pw = null;
try { pw = await import('@playwright/test'); } catch { fail('Playwright is not installed', 'npm ci'); }
if (pw) {
  for (const [label, type, launch, fix] of [
    ['Google Chrome', pw.chromium, { channel: 'chrome' }, 'npx playwright install chrome (Mac and Windows may ask for your admin password)'],
    ['Firefox', pw.firefox, {}, 'npx playwright install firefox'],
  ]) {
    try {
      const b = await type.launch({ ...launch, timeout: 60000 });
      const v = b.version();
      await b.close();
      ok(`${label} ${v} opens`);
    } catch (e) {
      fail(`${label} does not open: ${String(e.message).split('\n')[0]}`, fix);
    }
  }
}

// 6. The test site answers
const { BASE_URL } = loadEnvironment();
try {
  const res = await fetch(BASE_URL, { signal: AbortSignal.timeout(20000) });
  if (res.status < 500) ok(`${BASE_URL} answers (${res.status})`);
  else fail(`${BASE_URL} answers ${res.status}`, 'the site may be down: wait a minute and try again, or tell your trainer');
} catch (e) {
  fail(`${BASE_URL} does not answer: ${e.cause?.code || e.message}`, 'check your internet (a company VPN or proxy can block it), then try again');
}

// 7. The QE skill
if (fs.existsSync(path.join(ROOT, '.claude', 'skills', 'qe', 'SKILL.md'))) ok('QE skill: .claude/skills/qe/SKILL.md');
else fail('The QE skill is missing (.claude/skills/qe/SKILL.md)', 'git pull, to get the latest starter files');

console.log(bad ? `\n${bad} thing(s) to fix. Fix each ❌ above, then run "npm run doctor" again.` : '\nAll ✅. You are ready for class.');
process.exitCode = bad ? 1 : 0;
