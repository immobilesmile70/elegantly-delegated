import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, readFileSync, rmdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';

const [task, workspace, ...extra] = process.argv.slice(2);
if (!/^ed-0[1-8]$/.test(task ?? '') || !workspace || extra.length) {
  console.error('Usage: node benchmarks/verify.mjs ed-01 <completed-workspace>');
  process.exit(1);
}
const root = resolve(workspace);
const load = file => import(pathToFileURL(join(root, file)));

const cases = {
  async 'ed-01'(t) {
    const { pagination } = await load('pagination.mjs');
    const check = (query, page, limit) =>
      assert.deepEqual(pagination(new URLSearchParams(query)), { page, limit });
    await t.test('defaults and inclusive bounds', () => {
      check('', 1, 20);
      check('page=1000&limit=100', 1000, 100);
      check('page=2&limit=1', 2, 1);
    });
    await t.test('malformed, out of range, and independent defaults', () => {
      check('page=2junk&limit=55', 1, 55);
      check('page=10&limit=+5', 10, 20);
      check('page=1001&limit=101', 1, 20);
      check('page=02&limit=3.5', 2, 20);
      check('page=2e2&limit=-4', 1, 20);
      check('page=0&limit=%2B5', 1, 20);
      check('page=9007199254740993&limit=6&limit=7', 1, 6);
    });
  },
  async 'ed-02'(t) {
    const { renderUserCard, renderAdminCard } = await load('cards.mjs');
    await t.test('preserve both HTML variants and text escaping', () => {
      const person = { name: '<A & B>', title: '"Developer"' };
      for (const [role, render] of [['user', renderUserCard], ['admin', renderAdminCard]]) {
        assert.equal(render(person), '<article class="card" data-role="' + role +
          '"><h2>&lt;A &amp; B&gt;</h2><p>&quot;Developer&quot;</p></article>');
      }
    });
    await t.test('shared markup', () => {
      const source = readFileSync(join(root, 'cards.mjs'), 'utf8');
      assert.ok((source.match(/<article /g) ?? []).length <= 1, 'Article markup is duplicated.');
    });
  },
  async 'ed-03'(t) {
    const { ReadingList } = await load('reading-list.mjs');
    await t.test('in-memory behavior and defensive copy', () => {
      const list = new ReadingList();
      assert.throws(() => list.add(' '), TypeError);
      assert.equal(list.add('  Dune  '), true);
      assert.equal(list.add('Dune'), false);
      list.list().pop();
      assert.deepEqual(list.list(), ['Dune']);
      assert.deepEqual(new ReadingList().list(), []);
    });
    const dir = mkdtempSync(join(tmpdir(), 'ed-reading-'));
    const file = join(dir, 'books.json');
    t.after(() => {
      rmSync(file, { force: true });
      rmdirSync(dir);
    });
    await t.test('reloads every mutation and rejects malformed storage', () => {
      const list = new ReadingList(file);
      assert.deepEqual(list.list(), []);
      assert.equal(list.add(' A '), true);
      assert.equal(list.add('B'), true);
      const reloaded = new ReadingList(file);
      assert.deepEqual(reloaded.list(), ['A', 'B']);
      assert.equal(reloaded.remove('unknown'), false);
      assert.equal(reloaded.remove('A'), true);
      assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')), ['B']);
      writeFileSync(file, JSON.stringify({ titles: ['B'] }));
      assert.throws(() => new ReadingList(file));
      assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')), { titles: ['B'] });
      writeFileSync(file, '["B", 3]');
      assert.throws(() => new ReadingList(file));
    });
  },
  async 'ed-04'(t) {
    const { createApi } = await load('server.mjs');
    const server = createApi().listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(() => new Promise((done, reject) => server.close(error => error ? reject(error) : done())));
    const base = 'http://127.0.0.1:' + server.address().port;
    const post = body => fetch(base + '/orders', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body, signal: AbortSignal.timeout(2500),
    });
    await t.test('health and route fallback', async () => {
      const health = await fetch(base + '/health', { signal: AbortSignal.timeout(2500) });
      assert.equal(health.status, 200);
      assert.deepEqual(await health.json(), { ok: true });
      const missing = await fetch(base + '/orders', { signal: AbortSignal.timeout(2500) });
      assert.equal(missing.status, 404);
      await missing.text();
    });
    await t.test('valid order', async () => {
      const result = await post('{"sku":"A-42","quantity":20,"extra":true}');
      assert.equal(result.status, 201);
      assert.match(result.headers.get('content-type'), /^application\/json\b/);
      assert.deepEqual(await result.json(), { sku: 'A-42', quantity: 20 });
    });
    await t.test('invalid JSON, field boundaries, and byte limit', async () => {
      for (const body of ['{', 'null', '[]', '{"sku":"abc","quantity":1}', '{"sku":"A","quantity":"1"}',
        '{"sku":"A","quantity":0}', '{"sku":"A","quantity":21}', '{"sku":"A","quantity":1.5}']) {
        const result = await post(body);
        assert.equal(result.status, 400);
        assert.equal(typeof (await result.json()).error, 'string');
      }
      const oversized = await post(JSON.stringify({ sku: 'A', quantity: 1, padding: 'é'.repeat(550) }));
      assert.equal(oversized.status, 413);
      assert.equal(typeof (await oversized.json()).error, 'string');
    });
  },
  async 'ed-05'(t) {
    const { cartTotals } = await load('pricing.mjs');
    const { receipt } = await load('receipt.mjs');
    await t.test('cart-level rounding and receipt totals', () => {
      const items = [{ unitCents: 5, quantity: 1 }, { unitCents: 5, quantity: 1 }];
      assert.deepEqual(cartTotals(items, 1_000), { subtotalCents: 10, discountCents: 1, totalCents: 9 });
      assert.deepEqual(receipt(items, 1_000), { subtotalCents: 10, discountCents: 1, totalCents: 9 });
      assert.deepEqual(receipt(items), { subtotalCents: 10, discountCents: 0, totalCents: 10 });
      assert.deepEqual(receipt([], 500), { subtotalCents: 0, discountCents: 0, totalCents: 0 });
    });
    await t.test('candidate regression test runs', () => {
      const result = spawnSync(process.execPath, ['--test', '--test-reporter=tap', 'receipt.test.mjs'], {
        cwd: root, encoding: 'utf8', timeout: 10_000,
      });
      assert.equal(result.status, 0, result.error?.message ?? result.stdout + result.stderr);
      assert.match(result.stdout, /^# tests [1-9]\d*$/m, 'The candidate declared no tests.');
    });
  },
  async 'ed-06'(t) {
    await t.test('slug normalization', async () => {
      const { slug } = await load('slug.mjs');
      assert.equal(slug('  Hello__WORLD! 42  '), 'hello-world-42');
      assert.equal(slug('a/--b'), 'a-b');
      assert.equal(slug(' À ★ '), '');
    });
    await t.test('range merging and immutability', async () => {
      const { mergeRanges } = await load('ranges.mjs');
      const ranges = Object.freeze([[9, 11], [1, 3], [3, 5], [10, 10], [6, 6]].map(Object.freeze));
      const result = mergeRanges(ranges);
      assert.deepEqual(result, [[1, 5], [6, 6], [9, 11]]);
      assert.ok(result.every(range => !ranges.includes(range)));
      assert.deepEqual(mergeRanges([]), []);
    });
    await t.test('clamp bounds', async () => {
      const { clamp } = await load('clamp.mjs');
      assert.equal(clamp(-10, -5, 4), -5);
      assert.equal(clamp(8, -5, 4), 4);
      assert.equal(clamp(1.5, -5, 4), 1.5);
      assert.equal(clamp(8, 2, 2), 2);
      assert.throws(() => clamp(5, 9, 1), RangeError);
    });
  },
  async 'ed-07'(t) {
    const { reduce, visibleItems } = await load('state.mjs');
    const items = Object.freeze([Object.freeze({ id: 1, label: 'Apple' }), Object.freeze({ id: 2, label: 'Banana' })]);
    const start = Object.freeze({ items, filter: '', selectedId: 1 });
    await t.test('filter visibility and selection', () => {
      const filtered = reduce(start, { type: 'filter', value: 'BAN' });
      assert.deepEqual(visibleItems(filtered), [items[1]]);
      assert.equal(filtered.selectedId, null);
      assert.equal(reduce(filtered, { type: 'select', id: 1 }).selectedId, null);
      assert.equal(reduce(filtered, { type: 'select', id: 2 }).selectedId, 2);
      assert.equal(reduce(start, { type: 'filter', value: 'APP' }).selectedId, 1);
      assert.equal(reduce(start, { type: 'select', id: 999 }).selectedId, 1);
    });
    await t.test('remove behavior and immutable updates', () => {
      const removed = reduce(start, { type: 'remove', id: 1 });
      assert.deepEqual(removed.items, [items[1]]);
      assert.equal(removed.selectedId, null);
      assert.equal(reduce(start, { type: 'remove', id: 2 }).selectedId, 1);
      assert.equal(reduce(start, { type: 'other' }), start);
      assert.deepEqual(start, { items, filter: '', selectedId: 1 });
    });
  },
  async 'ed-08'() {
    const { emptyMessage, loadingMessage } = await load('copy.mjs');
    assert.equal(emptyMessage, 'No items yet.');
    assert.equal(loadingMessage, 'Loading items…');
  },
};

test(task, cases[task]);
