import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { codexClient } from './codex-route.mjs';
import { run } from './install.mjs';
import { capture, codexExecutable } from './process.mjs';
import { candidates, settings } from './routing.mjs';

const normalize = path => path.replaceAll('\\', '/').toLowerCase();
const canonical = fileURLToPath(new URL('../skills/elegantly-delegated/SKILL.md', import.meta.url));

async function verify() {
  const root = mkdtempSync(join(tmpdir(), 'ed fresh codex '));
  const project = join(root, 'project with spaces');
  const env = { ...process.env, CODEX_HOME: join(root, 'codex-home') };
  const command = codexExecutable();
  try {
    mkdirSync(env.CODEX_HOME);
    const catalog = await codexClient({ command }).catalog({ bundled: true });
    const model = candidates(catalog, settings(), 'routine')[0];
    assert.ok(model, 'No routine model was identifiable in the bundled catalog');
    run(['--target', 'codex', '--project', project, '--worker-model', model], { log() {} });
    const skill = join(project, '.agents', 'skills', 'elegantly-delegated', 'SKILL.md');
    assert.deepEqual(readFileSync(skill), readFileSync(canonical));
    for (const role of ['ed-recon', 'ed-implement']) {
      const toml = readFileSync(join(project, '.codex', 'agents', role + '.toml'), 'utf8');
      assert.ok(toml.includes('name = ' + JSON.stringify(role)) &&
        toml.includes('model = ' + JSON.stringify(model)) && toml.includes('Do not spawn workers'));
    }
    const probe = await capture(command, ['debug', 'prompt-input', 'Offline skill discovery check'],
      { cwd: project, env, timeoutMs: 12_000, maxBytes: 4_000_000 });
    assert.equal(probe.code, 0, 'Codex prompt-input probe failed');
    const payload = JSON.parse(probe.stdout);
    const flattened = normalize(JSON.stringify(payload).replaceAll('\\\\', '\\'));
    const skillRoot = normalize(dirname(dirname(skill)));
    const aliases = [...flattened.matchAll(/`(r\d+)` = `([^`]+)`/g)];
    const aliased = aliases.some(([, alias, path]) => path === skillRoot &&
      flattened.includes(alias + '/elegantly-delegated/skill.md'));
    assert.ok(aliased || flattened.includes(normalize(skill)), 'Project skill path missing from fresh CLI context');
    return { status: 'pass', projectSkillDiscovered: true, generatedWorkerProfilesValid: true,
      runtimeWorkerProfiles: 'UNVERIFIED', requestedModel: model };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

try { console.log(JSON.stringify(await verify())); }
catch (error) {
  console.error(JSON.stringify({ status: 'failed', reason: error.message }));
  process.exitCode = 1;
}
