// Runs every tests/api/*.test.js file, one after another, with Node.
// The run fails (red in CI) if any file has a FAIL or stops early.
const { readdirSync } = require('fs');
const { spawnSync } = require('child_process');
const path = require('path');

const dir = path.join(__dirname, '..', 'tests', 'api');
const files = readdirSync(dir).filter(f => f.endsWith('.test.js')).sort();
let failed = 0;
for (const f of files) {
  console.log(`\n=== ${f} ===`);
  const run = spawnSync(process.execPath, [path.join(dir, f)], { encoding: 'utf8', timeout: 120000 });
  process.stdout.write(run.stdout || '');
  process.stderr.write(run.stderr || '');
  const summary = /(\d+) passed, (\d+) failed/.exec(run.stdout || '');
  if (run.status !== 0 || !summary || Number(summary[2]) > 0) {
    failed += 1;
    console.log(summary ? `FAILED: ${f}` : `FAILED: ${f} (no "passed, failed" line: the code stopped early)`);
  }
}
console.log(`\n${files.length - failed} of ${files.length} API test files passed`);
if (!files.length) console.log('No files in tests/api yet.');
process.exitCode = failed ? 1 : 0;
