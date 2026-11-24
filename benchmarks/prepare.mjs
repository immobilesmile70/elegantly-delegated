import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const [task, destination, ...extra] = process.argv.slice(2);
if (!/^ed-0[1-8]$/.test(task ?? '') || !destination || extra.length) {
  console.error('Usage: node benchmarks/prepare.mjs ed-01 <new-directory>');
  process.exit(1);
}
const target = resolve(destination);
const source = fileURLToPath(new URL('fixtures/' + task + '/', import.meta.url));
if (existsSync(target)) {
  console.error('Use a new directory for each run: ' + target);
  process.exit(1);
}
mkdirSync(dirname(target), { recursive: true });
mkdirSync(target);
cpSync(source, target, { recursive: true, errorOnExist: true, force: false });
console.log(target);
