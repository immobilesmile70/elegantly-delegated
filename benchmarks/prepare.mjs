import { cpSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const [task, destination, ...extra] = process.argv.slice(2);
if (!/^ed-0[1-8]$/.test(task ?? '') || !destination || extra.length) {
  console.error('Usage: node benchmarks/prepare.mjs ed-01 <new-directory>');
  process.exit(1);
}
const target = resolve(destination);
const source = fileURLToPath(new URL('fixtures/' + task + '/', import.meta.url));
mkdirSync(dirname(target), { recursive: true });
try {
  mkdirSync(target);
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
  console.error('Use a new directory for each run: ' + target);
  process.exit(1);
}
for (const entry of readdirSync(source)) {
  cpSync(join(source, entry), join(target, entry), { recursive: true, errorOnExist: true, force: false });
}
console.log(target);
