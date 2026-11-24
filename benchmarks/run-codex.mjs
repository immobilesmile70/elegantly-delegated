import { performance } from 'node:perf_hooks';
import { codexClient, effortFor } from '../scripts/codex-route.mjs';
import { candidates, route, settings } from '../scripts/routing.mjs';

const cases = [
  { id: 'clamp', prompt: 'Return only a JSON array of results for clamp(value,min,max) applied to (-3,0,5), (8,0,5), (3,0,5), and (2,2,2). Clamp returns the value inside inclusive bounds or the nearest bound. No tools or explanation.', expected: [0, 5, 3, 2] },
  { id: 'sum', prompt: 'Return only a JSON object with the keys count and total. Count the numbers 2, -5, 8, 10 and compute their sum. No tools or explanation.', expected: { count: 4, total: 15 } },
];

function accurate(answer, expected) {
  try {
    const parsed = JSON.parse(answer);
    return parsed && Array.isArray(parsed) === Array.isArray(expected) &&
      Object.keys(parsed).length === Object.keys(expected).length &&
      Object.entries(expected).every(([key, value]) => Object.hasOwn(parsed, key) && parsed[key] === value);
  } catch { return false; }
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length || args[0] === '--help') {
    console.log('Usage: node benchmarks/run-codex.mjs --run [--reverse]');
    return;
  }
  if (args[0] !== '--run' || (args.length > 1 && (args[1] !== '--reverse' || args.length !== 2))) {
    throw new Error('invalid_arguments');
  }
  const client = codexClient();
  if (!await client.authenticate()) {
    console.log(JSON.stringify({ status: 'blocked', reason: 'cli_chatgpt_sign_in_unavailable',
      completedPairs: 0, modelAttempts: 0 }));
    process.exitCode = 1;
    return;
  }
  const catalog = await client.catalog();
  const config = settings({ maxAttempts: 1, maxParallel: 1 });
  const model = candidates(catalog, config, 'routine')[0];
  if (!model) throw new Error('no_compatible_model');
  const effort = effortFor(catalog, model, 'routine');
  const records = [];
  for (const [index, task] of cases.entries()) {
    const order = index % 2 === Number(args.includes('--reverse')) ? ['standard', 'routed'] : ['routed', 'standard'];
    for (const condition of order) {
      const start = performance.now();
      const result = await route({ prompt: task.prompt, config,
        models: [condition === 'standard' ? undefined : model],
        execute: (id, context, timeout) => client.execute(id, context, timeout,
          condition === 'standard' ? undefined : effort) });
      const record = { task: task.id, condition, wallMs: Math.round(performance.now() - start),
        status: result.status, accurate: accurate(result.answer, task.expected),
        cliAttempts: result.attempts.length, attempts: result.attempts, providerCalls: null, subscriptionQuota: null };
      records.push(record);
      console.log(JSON.stringify(record));
      if (['auth', 'quota', 'permission', 'rate_limit'].includes(result.status)) {
        console.log(JSON.stringify({ status: 'stopped', reason: result.status }));
        process.exitCode = 1;
        return;
      }
    }
  }
  if (records.some(record => record.status !== 'ok' || !record.accurate)) process.exitCode = 1;
}

try { await main(); }
catch {
  console.error(JSON.stringify({ status: 'blocked', reason: 'benchmark_preflight_failed' }));
  process.exitCode = 1;
}
