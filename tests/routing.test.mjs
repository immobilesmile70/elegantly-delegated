import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { codexClient, effortFor } from '../scripts/codex-route.mjs';
import { capture } from '../scripts/process.mjs';
import { candidates, classify, decodeTurn, route, runBatch, settings, usageByRole } from '../scripts/routing.mjs';
import { findPython, pythonCandidates } from '../scripts/python.mjs';

const model = (slug, description, visibility = 'list') => ({
  slug, description, visibility, supported_reasoning_levels: [{ effort: 'low' }, { effort: 'high' }],
});
const catalog = { models: [model('small-test', 'Affordable for easier tasks'),
  model('strong-test', 'Our most capable model for complex coding'),
  model('hidden-test', 'AffordABLE', 'hide'), model('special-test', 'Frontier coding for cyber')] };
const completed = [
  { type: 'item.completed', item: { type: 'agent_message', text: 'done' } },
  { type: 'turn.completed', usage: { input_tokens: 40, cached_input_tokens: 30, output_tokens: 10 } },
].map(JSON.stringify.bind(JSON)).join('\n');
const result = (stdout = '', code = 0, stderr = '') => ({ code, stdout, stderr });

test('classifies prompts, discovers visible models, validates config and adjusts supported effort', () => {
  assert.equal(classify('Design a scalable architecture'), 'complex');
  assert.equal(classify('Update README wording'), 'routine');
  assert.deepEqual(candidates(catalog, settings(), 'routine'), ['small-test']);
  assert.deepEqual(candidates(catalog, settings(), 'complex'), ['strong-test']);
  assert.deepEqual(candidates(catalog, settings({ routine: ['hidden-test', 'unknown', 'small-test', 'small-test'] }), 'routine'),
    ['small-test']);
  assert.equal(effortFor(catalog, 'strong-test', 'complex'), 'high');
  assert.equal(effortFor(catalog, 'small-test', 'routine'), 'low');
  for (const bad of [{ maxParallel: 0 }, { maxAttempts: 8 }, { extra: 1 }, { routine: ['a;b'] }, null]) {
    assert.throws(() => settings(bad));
  }
});

test('redacts raw worker failure and records cached and missing usage independently', () => {
  assert.deepEqual(decodeTurn(result(completed)), {
    answer: 'done', status: 'ok', usage: { input: 40, cachedInput: 30, output: 10, reasoning: null },
  });
  assert.deepEqual(decodeTurn(result('', 1, 'model not supported: private diagnostic')), {
    status: 'model_unavailable', usage: null,
  });
  assert.equal(decodeTurn(result('', 1, '429 subscription usage limit hit')).status, 'quota');
  assert.equal(decodeTurn(result('', 1, '429 Too Many Requests')).status, 'rate_limit');
  assert.equal(decodeTurn(result('', 1, '503 overloaded')).status, 'provider');
  assert.equal(decodeTurn(result('', 1, 'authentication failed')).status, 'auth');
});

test('fallback preserves exact context for model rejection, timeout, throttling and worker error', async () => {
  for (const failed of ['model_unavailable', 'timeout', 'rate_limit', 'provider', 'worker_failed']) {
    const calls = [];
    const outcome = await route({ prompt: 'original context', role: 'worker', config: settings(),
      models: ['m1', 'm1', 'm2', 'm3'], execute: async (id, prompt, ms) => {
        calls.push([id, prompt]);
        assert.ok(ms > 0 && ms <= 40_000);
        return id === 'm1' ? { status: failed } : { status: 'ok', answer: 'done' };
      } });
    assert.deepEqual(calls, [['m1', 'original context'], ['m2', 'original context']]);
    assert.equal(outcome.status, 'ok');
    assert.equal(outcome.attempts[0].role, 'worker');
  }
});

test('never retries auth, quota, permission, or exhausted observed-token budget', async () => {
  for (const status of ['auth', 'quota', 'permission', 'model_unavailable']) {
    const outcome = await route({ prompt: 'task', config: settings({ maxObservedTokens: 10 }),
      models: ['m1', 'm2'], execute: async () => ({ status, usage: { input: 10 } }) });
    assert.equal(outcome.attempts.length, 1);
  }
  assert.equal((await route({ prompt: 'task', config: settings(), models: [], execute: assert.fail })).status,
    'no_compatible_model');
});

test('batch limits parallel work, keeps order and shares observed budget', async () => {
  let active = 0;
  let peak = 0;
  const config = settings({ maxParallel: 2, maxObservedTokens: 20 });
  const results = await runBatch(['one', 'two', 'three'], config, (prompt, deadline, budget) =>
    route({ prompt, deadline, budget, config, models: ['m'], execute: async () => {
      peak = Math.max(peak, ++active);
      await new Promise(resolve => setTimeout(resolve, 20));
      active--;
      return { status: 'ok', answer: prompt, usage: { input: 10 } };
    } }));
  assert.equal(peak, 2);
  assert.deepEqual(results.map(x => x.answer ?? x.status), ['one', 'two', 'budget']);
  await assert.rejects(runBatch(['one', 2], config, assert.fail), /valid prompts/);
});

test('summarizes usage separately by role with coverage and no double counting', () => {
  const totals = usageByRole([{ attempts: [
    { role: 'worker', usage: { input: 30, cachedInput: 25, output: 5, reasoning: 3 } },
    { role: 'worker', usage: null },
    { role: 'supervisor', usage: { input: 50, cachedInput: 0, output: 1, reasoning: null } },
  ] }]);
  assert.deepEqual(totals.worker.input, { count: 30, observedAttempts: 1 });
  assert.deepEqual(totals.worker.reasoning, { count: 3, observedAttempts: 1 });
  assert.deepEqual(totals.supervisor.cachedInput, { count: 0, observedAttempts: 1 });
  assert.deepEqual(totals.supervisor.reasoning, { count: null, observedAttempts: 0 });
  assert.equal(totals.worker.cliAttempts, 2);
});

test('an exhausted subscription stops later batches without scheduling another attempt', async () => {
  const config = settings({ maxParallel: 1 });
  const calls = [];
  const outcomes = await runBatch(['one', 'two'], config, (prompt, deadline, budget) =>
    route({ prompt, deadline, budget, config, models: ['one', 'two'], execute: async () => {
      calls.push(prompt);
      return { status: 'quota' };
    } }));
  assert.deepEqual(calls, ['one']);
  assert.deepEqual(outcomes.map(outcome => outcome.status), ['quota', 'quota']);
  assert.equal(outcomes[1].attempts.length, 0);
});

test('Codex subprocess receives read-only, no-recursion, ChatGPT-only settings and stdin', async t => {
  const folder = mkdtempSync(join(tmpdir(), 'ed mock cli '));
  t.after(() => rmSync(folder, { recursive: true, force: true }));
  const mock = join(folder, 'mock.mjs');
  writeFileSync(mock, [
    "import assert from 'node:assert/strict';",
    "const args = process.argv.slice(2);",
    "assert.match(args.join(' '), /forced_login_method=\"chatgpt\"/);",
    "assert.equal(process.env.ELEGANTLY_DELEGATED_RUNNING, '1');",
    "assert.equal(process.env.OPENAI_API_KEY, undefined);",
    "if (args.includes('login')) { console.log('Logged in using ChatGPT'); }",
    "else if (args.includes('models')) { console.log(" + JSON.stringify(JSON.stringify(catalog)) + "); }",
    "else {",
    "  assert.match(args.join(' '), /--sandbox read-only --disable multi_agent --disable multi_agent_v2/);",
    "  assert.equal(args.at(-1), '-');",
    "  let stdin = ''; for await (const chunk of process.stdin) stdin += chunk;",
    "  assert.equal(stdin, 'literal & | \"context\"');",
    "  console.log(" + JSON.stringify(completed) + ");",
    "}",
  ].join('\n'));
  const client = codexClient({ command: [process.execPath, mock] });
  assert.equal(await client.authenticate(), true);
  assert.deepEqual(await client.catalog(), catalog);
  assert.equal((await client.execute('small-test', 'literal & | "context"', 5000, 'low')).status, 'ok');
  assert.equal((await capture([process.execPath], ['-e', 'setInterval(() => {}, 1000)'],
    { timeoutMs: 100 })).category, 'timeout');
});

test('Python discovery handles Windows paths, aliases, missing dependencies and fallback', async t => {
  const root = mkdtempSync(join(tmpdir(), 'ed python '));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const folder = join(root, 'Programs', 'Python', 'Python313');
  mkdirSync(folder, { recursive: true });
  const exe = join(folder, 'python.exe');
  writeFileSync(exe, '');
  assert.ok(pythonCandidates({ LOCALAPPDATA: root }, 'win32').some(command => command[0] === exe));
  assert.throws(() => pythonCandidates({ ED_PYTHON: 'relative.exe' }), /absolute/);
  const run = async (command, args) => {
    if (command[0] === 'alias') return result('Store alias', 1);
    return args.includes('yaml') ? result('', 1) : result(JSON.stringify([[3, 13, 1], exe]));
  };
  const commands = [['alias'], [exe]];
  const found = await findPython({ commands, run });
  assert.equal(found.executable, exe);
  assert.equal(found.version, '3.13.1');
  assert.deepEqual((await findPython({ commands, run, modules: ['yaml'] })).missing, ['yaml']);
  assert.equal((await findPython({ commands: [['alias']], run })).status, 'python_unavailable');
  await assert.rejects(findPython({ commands, run, modules: ['x;bad'] }), /Invalid/);
});
