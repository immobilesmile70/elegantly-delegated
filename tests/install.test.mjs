import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { run } from '../scripts/install.mjs';

const project = fileURLToPath(new URL('../', import.meta.url));
const skill = readFileSync(join(project, 'skills', 'elegantly-delegated', 'SKILL.md'));
const scratch = realpathSync(tmpdir());
const skillAt = prefix => join(prefix, 'skills', 'elegantly-delegated', 'SKILL.md');
const workerTargets = {
  'claude-code': ['.claude', '.claude', 'haiku', 'md'],
  antigravity: ['.agents', '.gemini/config', 'flash', 'md'],
  codex: ['.codex', '.codex', 'account-mini', 'toml'],
  opencode: ['.opencode', '.config/opencode', 'local/test-mini#low', 'md'],
  cursor: ['.cursor', '.cursor', 'account-mini', 'md'],
  'copilot-cli': ['.github', '.copilot', 'local/test-mini', 'agent.md'],
};

function isolated(t) {
  const root = mkdtempSync(join(scratch, 'ed test '));
  t.after(() => {
    const actual = realpathSync(root);
    assert.equal(dirname(actual), scratch);
    rmSync(actual, { recursive: true, force: true });
  });
  return root;
}

function write(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

const install = (root, ...args) => run(args, { cwd: root, home: root, env: {}, log() {} });

test('all supported targets install identical skill bytes in both scopes', t => {
  const root = isolated(t);
  const paths = {
    'claude-code': ['.claude', '.claude'],
    antigravity: ['.agents', '.gemini/config'],
    codex: ['.agents', '.agents'],
    opencode: ['.opencode', '.config/opencode'],
    cursor: ['.cursor', '.cursor'],
    'copilot-cli': ['.github', '.copilot'],
    'gemini-cli': ['.gemini', '.gemini'],
    pi: ['.agents', '.agents'],
    cline: ['.cline', '.cline'],
    kilo: ['.kilo', '.kilo'],
    augment: ['.augment', '.augment'],
    amp: ['.agents', '.agents'],
    'qwen-code': ['.qwen', '.qwen'],
  };
  for (const [target, [projectPath, homePath]] of Object.entries(paths)) {
    const workspace = join(root, target, 'workspace folder');
    const home = join(root, target, 'home folder');
    install(root, '--target', target, '--project', workspace);
    install(home, '--target', target, '--global');
    assert.deepEqual(readFileSync(skillAt(join(workspace, projectPath))), skill);
    assert.deepEqual(readFileSync(skillAt(join(home, homePath))), skill);
    assert.equal(existsSync(join(workspace, projectPath, 'agents')), false);
  }
});

test('worker installation uses standalone files and preserves unrelated settings', t => {
  const root = isolated(t);
  for (const [target, [projectPath, homePath, model, extension]] of Object.entries(workerTargets)) {
    for (const [scope, prefix] of [[[], projectPath], [['--global'], homePath]]) {
      const destination = join(root, target, scope.length ? 'global' : 'project');
      const unrelated = join(destination, prefix, 'agents', 'my-worker.' + extension);
      const config = join(destination, prefix, 'settings.json');
      write(unrelated, 'unrelated worker\n');
      write(config, '{ broken or JSONC configuration belongs to the harness\n');
      install(destination, '--target', target, '--worker-model', model, ...scope);
      for (const name of ['ed-recon', 'ed-implement']) {
        assert.ok(readFileSync(join(destination, prefix, 'agents', name + '.' + extension), 'utf8')
          .includes(JSON.stringify(model)));
      }
      install(destination, '--target', target, '--uninstall', ...scope);
      assert.equal(existsSync(join(destination, prefix, 'agents', 'ed-implement.' + extension)), false);
      assert.equal(readFileSync(unrelated, 'utf8'), 'unrelated worker\n');
      assert.equal(readFileSync(config, 'utf8'), '{ broken or JSONC configuration belongs to the harness\n');
    }
  }
});

test('resolves configured user-level paths for Claude Code and Codex', t => {
  const root = isolated(t);
  const cloud = join(root, 'personal Claude');
  const codex = join(root, 'personal Codex');
  const home = join(root, 'home');
  const env = { CLAUDE_CONFIG_DIR: cloud, CODEX_HOME: codex };
  run(['--target', 'claude-code', '--global', '--worker-model', 'haiku'], { home, env, log() {} });
  run(['--target', 'codex', '--global', '--worker-model', 'account-mini'], { home, env, log() {} });
  assert.ok(existsSync(join(cloud, 'agents', 'ed-recon.md')));
  assert.ok(existsSync(skillAt(cloud)));
  assert.ok(existsSync(join(codex, 'agents', 'ed-recon.toml')));
  assert.ok(existsSync(skillAt(join(home, '.agents'))));
});

test('supports multiple targets, including a shared path and repeated selection', t => {
  const root = isolated(t);
  install(root, '--target', 'codex,antigravity,codex,cline');
  assert.deepEqual(readFileSync(skillAt(join(root, '.agents'))), skill);
  assert.deepEqual(readFileSync(skillAt(join(root, '.cline'))), skill);
  const receipt = JSON.parse(readFileSync(join(root, '.elegantly-delegated', 'install.json')));
  assert.equal(Object.keys(receipt.files).length, 2);
});

test('updates from a new checkout and keeps installed worker model on skill-only reruns', t => {
  const root = isolated(t);
  const destination = join(root, 'test project');
  const checkout = join(root, 'next version');
  const args = ['--target', 'codex', '--project', destination];
  install(root, ...args, '--worker-model', 'small-one');
  const worker = join(destination, '.codex', 'agents', 'ed-recon.toml');
  const original = readFileSync(worker, 'utf8');
  cpSync(join(project, 'scripts'), join(checkout, 'scripts'), { recursive: true });
  const next = join(checkout, 'skills/elegantly-delegated/SKILL.md');
  write(next, Buffer.concat([skill, Buffer.from('\nUpdated policy.\n')]));
  const cli = join(checkout, 'scripts/install.mjs');
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, attempt === 0 ? /Update .*SKILL\.md/ : /Unchanged .*SKILL\.md/);
    assert.deepEqual(readFileSync(skillAt(join(destination, '.agents'))), readFileSync(next));
    assert.equal(readFileSync(worker, 'utf8'), original);
  }
  const result = spawnSync(process.execPath, [cli, ...args, '--worker-model', 'small-two'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(readFileSync(worker, 'utf8'), /model = "small-two"/);
  const backup = (text, filename) => join(destination, '.elegantly-delegated', 'backups',
    createHash('sha256').update(text).digest('hex') + '-' + filename);
  assert.deepEqual(readFileSync(backup(skill, 'SKILL.md')), skill);
  assert.equal(readFileSync(backup(original, 'ed-recon.toml'), 'utf8'), original);
});

test('partial skill removal preserves workers and reinstall restores the skill', t => {
  const root = isolated(t);
  const target = ['--target', 'claude-code'];
  const worker = join(root, '.claude', 'agents', 'ed-recon.md');
  install(root, ...target, '--worker-model', 'haiku');
  const original = readFileSync(worker);
  install(root, ...target, '--uninstall', '--only-skill');
  assert.equal(existsSync(skillAt(join(root, '.claude'))), false);
  assert.deepEqual(readFileSync(worker), original);
  install(root, ...target);
  assert.deepEqual(readFileSync(skillAt(join(root, '.claude'))), skill);
  assert.deepEqual(readFileSync(worker), original);
});

test('handles missing files and resumes an interrupted recorded installation', t => {
  const root = isolated(t);
  const path = skillAt(join(root, '.claude'));
  const receiptPath = join(root, '.elegantly-delegated', 'install.json');
  const key = process.platform === 'win32' ? path.toLowerCase() : path;
  const digest = createHash('sha256').update(skill).digest('hex');
  write(receiptPath, JSON.stringify({ version: 1, files: { [key]: { current: null, pending: digest } } }));
  write(path, skill);
  install(root, '--target', 'claude-code');
  assert.deepEqual(JSON.parse(readFileSync(receiptPath)).files[key], { current: digest });
  rmSync(path);
  install(root, '--target', 'claude-code');
  assert.deepEqual(readFileSync(path), skill);
  rmSync(path);
  install(root, '--target', 'claude-code', '--uninstall');
  assert.deepEqual(JSON.parse(readFileSync(receiptPath)).files, {});
});

test('refuses collisions and preserves local edits from update or uninstall', t => {
  const root = isolated(t);
  const args = ['--target', 'antigravity', '--worker-model', 'flash'];
  const skillPath = skillAt(join(root, '.agents'));
  const alternate = join(root, '.agents', 'agents', 'ed-recon', 'agent.md');
  write(alternate, 'unmanaged worker');
  assert.throws(() => install(root, ...args), /same native ID/);
  assert.equal(existsSync(skillPath), false);
  rmSync(alternate);
  write(skillPath, skill);
  assert.throws(() => install(root, ...args), /unmanaged or edited/);
  install(root, '--target', 'antigravity', '--uninstall');
  assert.deepEqual(readFileSync(skillPath), skill);
  rmSync(skillPath);
  install(root, ...args);
  const worker = join(root, '.agents', 'agents', 'ed-recon.md');
  write(worker, 'locally edited model');
  assert.throws(() => install(root, ...args), /unmanaged or edited/);
  assert.throws(() => install(root, '--target', 'antigravity', '--uninstall'), /unmanaged or edited/);
  assert.equal(readFileSync(worker, 'utf8'), 'locally edited model');
  assert.deepEqual(readFileSync(skillPath), skill);
});

test('rejects linked destinations before writing', t => {
  const root = isolated(t);
  const outside = join(root, 'other');
  const linked = join(root, 'ws', '.agents');
  mkdirSync(outside);
  mkdirSync(dirname(linked));
  symlinkSync(outside, linked, 'junction');
  assert.throws(() => install(dirname(linked), '--target', 'codex'), /ordinary directory/);
  assert.equal(existsSync(skillAt(outside)), false);
});

test('rejects unsupported arguments and invalid receipts without side effects', t => {
  const root = isolated(t);
  assert.throws(() => install(root, '--target', '__proto__'), /Unsupported target/);
  assert.throws(() => install(root, '--target', 'cline', '--worker-model', 'small'), /packaged native workers/);
  assert.throws(() => install(root, '--target', 'claude-code', '--worker-model', 'inherit'), /explicit native model/);
  assert.throws(() => install(root, '--target', 'antigravity', '--worker-model', 'other/model'), /explicit tiers/);
  assert.throws(() => install(root, '--target', 'opencode', '--worker-model', 'small'), /provider\/model/);
  const receipt = join(root, '.elegantly-delegated', 'install.json');
  write(receipt, '{ invalid');
  assert.throws(() => install(root, '--target', 'claude-code'), /Invalid installer receipt/);
  assert.equal(readFileSync(receipt, 'utf8'), '{ invalid');
  assert.equal(existsSync(skillAt(join(root, '.claude'))), false);
});

test('dry run and uninstall without owned resources leave a missing path untouched', t => {
  const root = isolated(t);
  const missing = join(root, 'not created');
  const args = ['--target', 'codex', '--project', missing];
  const messages = [];
  run([...args, '--dry-run', '--worker-model', 'small'], { log: message => messages.push(message) });
  assert.equal(messages.filter(message => message.startsWith('Install ')).length, 3);
  install(root, ...args, '--uninstall');
  assert.equal(existsSync(missing), false);
});

test('an active lock prevents a second write and allows a later retry', t => {
  const root = isolated(t);
  const lock = join(root, '.elegantly-delegated', 'install.lock');
  const path = skillAt(join(root, '.agents'));
  write(lock, 'another process\n');
  assert.throws(() => install(root, '--target', 'codex'), /Another installation/);
  assert.equal(existsSync(path), false);
  rmSync(lock);
  install(root, '--target', 'codex');
  assert.deepEqual(readFileSync(path), skill);
});

test('preparation creates isolated byte-identical copies and rejects an existing destination', t => {
  const root = isolated(t);
  const prepare = join(project, 'benchmarks', 'prepare.mjs');
  const workspace = join(root, 'ED-01 condition C');
  const args = [prepare, 'ed-01', workspace];
  const first = spawnSync(process.execPath, args, { encoding: 'utf8' });
  assert.equal(first.status, 0, first.stderr);
  assert.deepEqual(readFileSync(join(workspace, 'pagination.mjs')),
    readFileSync(join(project, 'benchmarks', 'fixtures', 'ed-01', 'pagination.mjs')));
  const second = spawnSync(process.execPath, args, { encoding: 'utf8' });
  assert.equal(second.status, 1);
  assert.match(second.stderr, /new directory/);
});

test('preparation copies every file and preserves a pre-existing destination', t => {
  const root = isolated(t);
  const prepare = join(project, 'benchmarks', 'prepare.mjs');
  const workspace = join(root, 'new parent', 'ED-06 condition D');
  const args = [prepare, 'ed-06', workspace];
  const first = spawnSync(process.execPath, args, { encoding: 'utf8' });
  assert.equal(first.status, 0, first.stderr);
  for (const name of ['clamp.mjs', 'ranges.mjs', 'slug.mjs']) {
    const path = join(workspace, name);
    assert.deepEqual(readFileSync(path),
      readFileSync(join(project, 'benchmarks', 'fixtures', 'ed-06', name)));
  }
  const local = join(workspace, 'local.txt');
  write(local, 'keep this');
  const second = spawnSync(process.execPath, args, { encoding: 'utf8' });
  assert.equal(second.status, 1);
  assert.match(second.stderr, /new directory/);
  assert.equal(readFileSync(local, 'utf8'), 'keep this');
});
