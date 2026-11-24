import { performance } from 'node:perf_hooks';
import { setTimeout as delay } from 'node:timers/promises';

const modelId = /^[a-z0-9][a-z0-9_.-]{0,199}$/i;
const defaults = { maxAttempts: 2, timeoutMs: 60_000, attemptTimeoutMs: 40_000,
  maxObservedTokens: 35_000, maxParallel: 2, maxTasks: 4 };
const limits = { maxAttempts: [1, 3], timeoutMs: [100, 300_000],
  attemptTimeoutMs: [100, 180_000], maxObservedTokens: [1, 1_000_000],
  maxParallel: [1, 4], maxTasks: [1, 8] };
const tiers = ['routine', 'complex'];

export function settings(config = {}) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error('Config must be an object.');
  for (const key of Object.keys(config)) {
    if (!Object.hasOwn(defaults, key) && !tiers.includes(key)) throw new Error('Unknown routing setting.');
  }
  const result = { ...defaults, ...config };
  for (const [key, [min, max]] of Object.entries(limits)) {
    if (!Number.isInteger(result[key]) || result[key] < min || result[key] > max) {
      throw new Error(key + ' must be an integer between ' + min + ' and ' + max + '.');
    }
  }
  for (const tier of tiers) {
    if (Object.hasOwn(result, tier) && (!Array.isArray(result[tier]) ||
      !result[tier].length || result[tier].length > 8 ||
      !result[tier].every(id => typeof id === 'string' && modelId.test(id)))) {
      throw new Error(tier + ' must contain one to eight Codex model IDs.');
    }
  }
  return result;
}

export function classify(prompt) {
  return /\b(architect(?:ure|ural)?|scalab(?:le|ility)|system design|design a system|strategic|plan(?:ning)?|critical|root cause|deadlock|data loss|security|race condition|debug(?:ging)?)\b/i.test(prompt)
    ? 'complex' : 'routine';
}

export function candidates(catalog, config, tier) {
  const visible = (Array.isArray(catalog?.models) ? catalog.models : [])
    .filter(model => model && model.visibility === 'list' && typeof model.slug === 'string' &&
      modelId.test(model.slug));
  const known = new Set(visible.map(model => model.slug));
  if (config[tier]) return [...new Set(config[tier].filter(id => known.has(id)))];
  const specialized = /cyber|computer use|visual understanding|approval review/i;
  const signals = tier === 'complex' ? /most capable|complex coding|frontier coding/i
    : /affordable|simpler tasks|easier tasks|lightweight|low.cost/i;
  const preferred = visible.filter(model => !specialized.test(model.description) && signals.test(model.description));
  return [...new Set(preferred.map(model => model.slug))];
}

function failureCategory(message) {
  if (/quota|usage limit|billing|credit.balance|insufficient_quota/i.test(message)) return 'quota';
  if (/unauthorized|authentication|not logged in|invalid.api.key|\b401\b/i.test(message)) return 'auth';
  if (/rate.limit|too many requests|\b429\b/i.test(message)) return 'rate_limit';
  if (/model.{0,100}(?:not.found|unavailable|not supported|does not exist|access|not allowed)|unsupported.model/i.test(message)) return 'model_unavailable';
  if (/permission.denied|forbidden|\b403\b/i.test(message)) return 'permission';
  if (/timeout|timed.out/i.test(message)) return 'timeout';
  if (/overloaded|temporarily unavailable|\b50[0234]\b/i.test(message)) return 'provider';
  return 'worker_failed';
}

const count = value => Number.isSafeInteger(value) && value >= 0 ? value : null;

export function decodeTurn(result) {
  let answer;
  let totals;
  let error;
  for (const line of result.stdout.split(/\r?\n/)) {
    let event;
    try { event = JSON.parse(line); } catch { continue; }
    if (event?.type === 'item.completed' && event.item?.type === 'agent_message') answer = event.item.text;
    if (event?.type === 'turn.completed') totals = event.usage ?? {};
    if (event?.type === 'turn.failed') error = event.error?.message ?? 'worker failed';
    if (event?.type === 'error') error = event.message ?? error;
  }
  const usage = totals ? {
    input: count(totals.input_tokens), cachedInput: count(totals.cached_input_tokens),
    output: count(totals.output_tokens), reasoning: count(totals.reasoning_output_tokens ?? totals.reasoning_tokens),
  } : null;
  if (!result.category && result.code === 0 && totals && typeof answer === 'string' && answer.trim()) {
    return { answer, usage, status: 'ok' };
  }
  const message = [error, result.stderr].filter(value => typeof value === 'string').join('\n');
  return { usage, status: result.category ?? failureCategory(message) };
}

export async function route({ prompt, role = 'supervisor', tier = classify(prompt), config, models, execute,
  deadline = performance.now() + config.timeoutMs, budget = { observed: 0 } }) {
  if (!['supervisor', 'worker'].includes(role) || !tiers.includes(tier) ||
      typeof prompt !== 'string' || !prompt.trim() || Buffer.byteLength(prompt) > 16_000) {
    throw new Error('Provide a nonempty prompt of at most 16 KB, valid role and valid complexity.');
  }
  const attempts = [];
  const retryable = new Set(['model_unavailable', 'rate_limit', 'timeout', 'provider', 'worker_failed']);
  const choices = [...new Set(models)].slice(0, config.maxAttempts);
  for (const model of choices) {
    const start = performance.now();
    const remaining = Math.floor(deadline - start);
    if (budget.blocked || remaining < 1 || budget.observed >= config.maxObservedTokens) break;
    const run = await execute(model, prompt, Math.min(remaining, config.attemptTimeoutMs));
    attempts.push({ role, requestedModel: model ?? null, actualModel: null, status: run.status,
      durationMs: Math.round(performance.now() - start), usage: run.usage ?? null });
    budget.observed += (run.usage?.input ?? 0) + (run.usage?.output ?? 0);
    if (run.status === 'ok') return { tier, role, status: 'ok', answer: run.answer, attempts };
    if (['auth', 'quota', 'permission'].includes(run.status)) budget.blocked = run.status;
    if (!retryable.has(run.status)) break;
    if (run.status === 'rate_limit' && attempts.length < choices.length) {
      // Never retry an account/quota limit. Briefly back off for transient throttling.
      await delay(Math.min(1000, Math.max(0, deadline - performance.now())));
    }
  }
  return { tier, role, status: attempts.at(-1)?.status ?? budget.blocked ??
    (models.length ? 'budget' : 'no_compatible_model'), attempts };
}

export async function runBatch(tasks, config, execute) {
  if (!Array.isArray(tasks) || !tasks.length || tasks.length > config.maxTasks ||
      tasks.some(prompt => typeof prompt !== 'string' || !prompt.trim() || Buffer.byteLength(prompt) > 16_000)) {
    throw new Error('Batch must contain one to maxTasks valid prompts of at most 16 KB each.');
  }
  const results = [];
  const deadline = performance.now() + config.timeoutMs;
  const budget = { observed: 0 };
  // In-flight turns may exceed the observed-token target. Bound each launch group.
  for (let index = 0; index < tasks.length; index += config.maxParallel) {
    results.push(...await Promise.all(tasks.slice(index, index + config.maxParallel)
      .map(prompt => execute(prompt, deadline, budget))));
  }
  return results;
}

export function usageByRole(results) {
  const all = results.flatMap(result => result.attempts);
  return Object.fromEntries(['supervisor', 'worker'].map(role => {
    const attempts = all.filter(attempt => attempt.role === role);
    const counters = Object.fromEntries(['input', 'cachedInput', 'output', 'reasoning'].map(key => {
      const known = attempts.map(attempt => attempt.usage?.[key]).filter(Number.isSafeInteger);
      return [key, { count: known.length ? known.reduce((sum, value) => sum + value, 0) : null,
        observedAttempts: known.length }];
    }));
    return [role, { cliAttempts: attempts.length, ...counters }];
  }));
}
