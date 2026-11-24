import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const fixtureRoot = join(root, 'benchmarks', 'fixtures');
const docs = ['README.md', 'CONTRIBUTING.md', 'test.md', ...['docs', 'benchmarks']
  .flatMap(folder => readdirSync(join(root, folder), { recursive: true })
    .filter(path => path.endsWith('.md')).map(path => join(folder, path)))];

function anchors(file) {
  return new Set(readFileSync(file, 'utf8').split(/\r?\n/).filter(line => /^#{1,6} /.test(line))
    .map(line => line.replace(/^#{1,6} /, '').trim().toLowerCase().replace(/[^\p{L}\p{N} _-]/gu, '').replaceAll(' ', '-')));
}

test('relative documentation links resolve to existing files and headings', () => {
  for (const name of docs) {
    const path = join(root, name);
    for (const [, target] of readFileSync(path, 'utf8').matchAll(/\[[^\]\n]*\]\(([^)\s]+)\)/g)) {
      if (/^[a-z]+:\/\//i.test(target)) continue;
      const [location, anchor] = target.split('#');
      const destination = location ? resolve(dirname(path), decodeURIComponent(location)) : path;
      assert.ok(existsSync(destination), name + ' links to missing ' + target);
      if (anchor && statSync(destination).isFile() && destination.endsWith('.md')) {
        assert.ok(anchors(destination).has(decodeURIComponent(anchor)), name + ' links to missing heading ' + target);
      }
    }
  }
});

test('every starting fixture has an evaluator test that catches the missing behavior', async t => {
  const tasks = readdirSync(fixtureRoot);
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT; // The verifier is a standalone CLI, not a test-runner subprocess.
  assert.deepEqual(tasks, ['ed-01', 'ed-02', 'ed-03', 'ed-04', 'ed-05', 'ed-06', 'ed-07', 'ed-08']);
  for (const task of tasks) {
    await t.test(task, () => {
      const args = ['--test-reporter=tap', join(root, 'benchmarks', 'verify.mjs'), task, join(fixtureRoot, task)];
      const result = spawnSync(process.execPath, args, {
        encoding: 'utf8', timeout: 15_000, env,
      });
      const output = result.stdout ?? '';
      const diagnostic = result.error?.message ?? (output + result.stderr).slice(0, 900);
      assert.equal(result.status, 1, diagnostic);
      assert.ok(output.includes('ERR_ASSERTION'), diagnostic);
      assert.ok(new RegExp('^not ok 1 - ' + task + '\\r?$', 'm').test(output), diagnostic);
    });
  }
});
