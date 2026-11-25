import { readFileSync, realpathSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { codexExecutable, capture } from './process.mjs';
import { candidates, classify, decodeTurn, route, runBatch, settings, usageByRole } from './routing.mjs';
import { findPython } from './python.mjs';

const recursionGuard = 'ELEGANTLY_DELEGATED_RUNNING';

export function codexClient({ command = codexExecutable(), cwd = process.cwd(), run = capture } = {}) {
  if (process.env[recursionGuard]) throw new Error('Nested elegantly-delegated execution is disabled.');
  const env = { ...process.env, [recursionGuard]: '1' };
  for (const key of Object.keys(env)) {
    if (/^(OPENAI_API_KEY|CODEX_API_KEY|OPENAI_BASE_URL)$/i.test(key)) delete env[key];
  }
  const authConfig = ['-c', 'forced_login_method="chatgpt"', '-c', 'model_provider="openai"'];
  const invoke = (args, options) => run(command, args, { cwd, env, ...options });
  return {
    async authenticate() {
      const result = await invoke([...authConfig, 'login', 'status']);
      return result.code === 0 && /logged in (?:using|with) chatgpt/i.test(result.stdout + result.stderr);
    },
    async catalog({ bundled = false } = {}) {
      const args = [...authConfig, 'debug', 'models'];
      if (bundled) args.push('--bundled');
      const result = await invoke(args, { timeoutMs: 8000, maxBytes: 4_000_000 });
      if (result.code !== 0) throw new Error('Codex model catalog unavailable.');
      try {
        const catalog = JSON.parse(result.stdout);
        if (Array.isArray(catalog.models)) return catalog;
      } catch {}
      throw new Error('Codex returned an unsupported model catalog format.');
    },
    async execute(model, prompt, timeoutMs, effort) {
      const args = [...authConfig, 'exec', '--json', '--ephemeral', '--skip-git-repo-check',
        '--sandbox', 'read-only', '--disable', 'multi_agent', '--disable', 'multi_agent_v2',
        '--disable', 'hooks', '--disable', 'plugins', '--disable', 'apps',
        '--disable', 'skill_mcp_dependency_install', '-c', 'mcp_servers={}',
        '-c', 'approval_policy="never"'];
      if (model) args.push('--model', model);
      if (effort) args.push('-c', 'model_reasoning_effort=' + JSON.stringify(effort));
      return decodeTurn(await invoke([...args, '-'], { input: prompt, timeoutMs }));
    },
  };
}

function readJson(path) {
  if (!statSync(path).isFile() || statSync(path).size > 150_000) throw new Error('Expected a JSON file of at most 150 KB.');
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { throw new Error('Invalid JSON file.'); }
}

async function main(args) {
  const { values, positionals } = parseArgs({ args, allowPositionals: true, options: {
    config: { type: 'string' }, cwd: { type: 'string' }, tier: { type: 'string' },
    jsonl: { type: 'boolean' },
    help: { type: 'boolean' }, module: { type: 'string', multiple: true }, script: { type: 'string' },
  } });
  const [operation, ...rest] = positionals;
  if (values.help || !operation) {
    console.log('Usage: codex-route models | python [--module NAME] [--script PATH] | run "prompt" | batch prompts.json [--jsonl]');
    console.log('Options for routing: --cwd PATH --config PATH --tier routine|complex');
    console.log('Batch output: --jsonl prints one JSON record per prompt.');
    return;
  }
  if (values.jsonl && operation !== 'batch') {
    throw new Error('--jsonl is only supported for batch.');
  }
  if (operation === 'python' && !rest.length) {
    const result = await findPython({ modules: values.module ?? [] });
    if (!values.script || result.status !== 'ok') {
      console.log(JSON.stringify(result));
      if (result.status !== 'ok') process.exitCode = 1;
      return;
    }
    const script = realpathSync(resolve(values.script));
    if (!statSync(script).isFile() || !/\.py$/i.test(script)) throw new Error('Expected a Python script file.');
    const execution = await capture([result.executable], [script], { timeoutMs: 30_000 });
    process.stdout.write(execution.stdout);
    process.stderr.write(execution.stderr);
    if (execution.category) console.error(JSON.stringify({ status: execution.category }));
    process.exitCode = execution.code ?? 1;
    return;
  }
  const cwd = realpathSync(resolve(values.cwd || '.'));
  if (!statSync(cwd).isDirectory()) throw new Error('Expected a working directory.');
  const client = codexClient({ cwd });
  const config = settings(values.config ? readJson(values.config) : undefined);
  if (operation === 'models' && !rest.length) {
    const catalog = await client.catalog({ bundled: true });
    console.log(JSON.stringify({ source: 'bundled_catalog', routine: candidates(catalog, config, 'routine'),
      complex: candidates(catalog, config, 'complex') }));
    return;
  }
  if (!['run', 'batch'].includes(operation) || rest.length !== 1 ||
      (values.tier && !['routine', 'complex'].includes(values.tier))) throw new Error('Invalid routing command.');
  if (!await client.authenticate()) throw new Error('This runner requires an existing Codex CLI ChatGPT sign-in.');
  const catalog = await client.catalog();
  const execute = (prompt, deadline, budget) => {
    const tier = values.tier ?? classify(prompt);
    return route({ prompt, tier, role: operation === 'run' ? 'supervisor' : 'worker',
      deadline, budget, config, models: candidates(catalog, config, tier),
      execute: (model, context, timeout) => client.execute(model, context, timeout, effortFor(catalog, model, tier)) });
  };
  const results = await runBatch(operation === 'run' ? rest : readJson(rest[0]), config, execute);
  // Attempts contain fixed categories and counters only. The requested answer is written separately.
  for (const [taskIndex, { answer, ...diagnostics }] of results.entries()) {
    console.error(JSON.stringify(diagnostics));
    if (values.jsonl) {
      console.log(JSON.stringify({
        taskIndex,
        status: diagnostics.status,
        answer: answer ?? null,
        attempts: diagnostics.attempts,
      }));
    } else if (answer !== undefined) {
      console.log(answer);
    }
  }
  console.error(JSON.stringify({ type: 'usage_summary', roles: usageByRole(results) }));
  if (results.some(result => result.status !== 'ok')) process.exitCode = 1;
}

export function effortFor(catalog, model, tier) {
  const spec = catalog.models.find(entry => entry?.slug === model);
  const levels = Array.isArray(spec?.supported_reasoning_levels) ? spec.supported_reasoning_levels : [];
  const order = tier === 'complex' ? ['high', 'medium', 'low', 'minimal', 'none']
    : ['low', 'minimal', 'none', 'medium', 'high'];
  return order.find(effort => levels.some(level => level?.effort === effort)) ?? 'low';
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { await main(process.argv.slice(2)); }
  catch (error) {
    const message = error.code ? 'Could not access a required file or executable.' : error.message;
    console.error(JSON.stringify({ status: 'error', message }));
    process.exitCode = 1;
  }
}
