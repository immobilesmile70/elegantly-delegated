import { createHash, randomUUID } from 'node:crypto';
import {
  closeSync, lstatSync, mkdirSync, openSync, readdirSync, readFileSync, realpathSync, renameSync, unlinkSync, writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { harnessPaths, renderWorker, targets, validateModel } from './harnesses.mjs';

const source = new URL('../skills/elegantly-delegated/SKILL.md', import.meta.url);
const usage = `Usage: install [--target NAME[,NAME...]] [--project PATH | --global]
               [--worker-model MODEL] [--dry-run]
       install --uninstall --target NAME[,NAME...] [--project PATH | --global]
               [--only-skill] [--dry-run]
       install --list | --help

Choose a target with --target. The default destination is the current project.
Re-run from an updated checkout to refresh the skill. Add --worker-model for
one worker-capable target to install or reconfigure its workers, using a native model
identifier. For evaluation, --uninstall --only-skill leaves the workers installed.`;

function parse(args) {
  const options = {};
  const valueFlags = new Set(['target', 'project', 'worker-model']);
  const flags = new Set(['help', 'list', 'global', 'dry-run', 'uninstall', 'only-skill']);
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    const name = flag.slice(2);
    if (!flag.startsWith('--') || (!valueFlags.has(name) && !flags.has(name))) {
      throw new Error('Unknown argument ' + flag + '. See --help.');
    }
    if (Object.hasOwn(options, name)) throw new Error('Duplicate option ' + flag);
    if (valueFlags.has(name)) {
      const value = args[++index];
      if (!value || value.startsWith('--')) throw new Error(flag + ' requires a value.');
      options[name] = value;
    } else {
      options[name] = true;
    }
  }
  if (options.global && options.project) throw new Error('Choose either --global or --project.');
  if (options['only-skill'] && !options.uninstall) throw new Error('--only-skill requires --uninstall.');
  if (options['worker-model'] && options.uninstall) throw new Error('--worker-model is an installation option.');
  return options;
}

function stat(path) {
  try {
    return lstatSync(path);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return null;
  }
}

function safeFile(path) {
  for (let parent = dirname(path); parent !== dirname(parent); parent = dirname(parent)) {
    const entry = stat(parent);
    if (entry && !entry.isDirectory()) throw new Error('Expected an ordinary directory at ' + parent);
  }
  const entry = stat(path);
  if (entry && !entry.isFile()) throw new Error('Expected an ordinary file at ' + path);
  return entry;
}

function physicalRoot(path) {
  const missing = [];
  while (!stat(path)) {
    const parent = dirname(path);
    if (parent === path) throw new Error('Cannot resolve installation root ' + path);
    missing.unshift(basename(path));
    path = parent;
  }
  return join(realpathSync(path), ...missing);
}

const hash = content => createHash('sha256').update(content).digest('hex');
const hashAt = path => safeFile(path) ? hash(readFileSync(path)) : null;
const pathKey = path => process.platform === 'win32' ? path.toLowerCase() : path;

function readReceipt(path) {
  if (!safeFile(path)) return {};
  const validHash = value => value === null || (typeof value === 'string' && /^[0-9a-f]{64}$/.test(value));
  try {
    const { version, files } = JSON.parse(readFileSync(path, 'utf8'));
    if (version === 1 && files && typeof files === 'object' && !Array.isArray(files) &&
        Object.entries(files).every(([key, entry]) => pathKey(resolve(key)) === key &&
          entry && validHash(entry.current) &&
          (!Object.hasOwn(entry, 'pending') || validHash(entry.pending)))) {
      return files;
    }
  } catch (error) {
    if (!(error instanceof SyntaxError || error instanceof TypeError)) throw error;
  }
  throw new Error('Invalid installer receipt at ' + path + '. Restore the receipt before changing this installation.');
}

function writeAtomic(path, content) {
  safeFile(path);
  mkdirSync(dirname(path), { recursive: true });
  const temporary = join(dirname(path), '.ed-' + randomUUID() + '.tmp');
  try {
    writeFileSync(temporary, content, { flag: 'wx' });
    renameSync(temporary, path);
  } finally {
    if (stat(temporary)) unlinkSync(temporary);
  }
}

function planChanges(resources, receipt, uninstall) {
  return resources.map(resource => {
    const { path, alternate, content, skill } = resource;
    const key = pathKey(path);
    const saved = receipt[key];
    if (uninstall && !saved) return { path, skip: 'unmanaged or absent' };
    const before = hashAt(path);
    const after = uninstall ? null : hash(content);
    const action = { path, key, before, after, content, saved };
    if (before !== null && before !== saved?.current && before !== saved?.pending) {
      throw new Error('File already exists with unmanaged or edited content at ' + path);
    }
    if (!uninstall && alternate && safeFile(alternate)) {
      throw new Error('A worker with the same native ID already exists at ' + alternate);
    }
    const folder = dirname(path);
    if (!uninstall && skill && !saved && before === null && stat(folder) && readdirSync(folder).length) {
      throw new Error('The skill folder contains unmanaged files at ' + folder);
    }
    return action;
  });
}

const settled = ({ before, after, saved, skip }) =>
  Boolean(skip || (saved && before === after && saved.current === after && !Object.hasOwn(saved, 'pending')));

function applyChanges(changes, receipt, receiptPath, log, dryRun) {
  const save = () => writeAtomic(receiptPath, JSON.stringify({ version: 1, files: receipt }, null, 2) + '\n');
  for (const change of changes) {
    const { path, key, before, after, content, skip } = change;
    const verb = skip ? 'Skip (' + skip + ')' : before === after ? 'Unchanged' :
      after === null ? 'Remove' : before === null ? 'Install' : 'Update';
    log(verb + ' ' + path);
    if (dryRun || settled(change)) continue;

    // Record both valid states before a mutation so an interrupted operation can be retried.
    if (before !== after) {
      if (hashAt(path) !== before) throw new Error('File changed during installation at ' + path);
      if (before !== null && after !== null) {
        // Preserve the previous managed skill or profile before replacing it.
        const backup = join(dirname(receiptPath), 'backups', before + '-' + basename(path));
        if (!safeFile(backup)) writeAtomic(backup, readFileSync(path));
        if (hashAt(backup) !== before) throw new Error('Installer backup verification failed at ' + backup);
      }
      receipt[key] = { current: before, pending: after };
      save();
      if (after === null) unlinkSync(path);
      else writeAtomic(path, content);
    }
    if (hashAt(path) !== after) throw new Error('Verification failed for ' + path);
    if (after === null) delete receipt[key];
    else receipt[key] = { current: after };
    save();
  }
}

export function run(args, {
  cwd = process.cwd(), home = homedir(), env = process.env, log = console.log,
} = {}) {
  if (Number(process.versions.node.split('.')[0]) < 22) throw new Error('Node.js 22 or newer is required.');
  const options = parse(args);
  if (options.help) return log(usage);
  if (options.list) {
    for (const [target, entry] of Object.entries(targets)) {
      log(target + (entry.workers ? ' (skill + optional native workers)' : ' (skill only)'));
    }
    return;
  }
  const names = [...new Set((options.target || '').split(','))];
  if (!options.target) throw new Error('Select a target with --target. See --list.');
  for (const name of names) {
    if (!Object.hasOwn(targets, name)) throw new Error('Unsupported target ' + name + '. See --list.');
  }

  const model = options['worker-model'];
  if (model) {
    if (names.length !== 1 || !targets[names[0]].workers) {
      throw new Error('--worker-model requires exactly one target with packaged native workers.');
    }
    validateModel(names[0], model);
  }
  const scope = options.global ? 'global' : 'project';
  const root = physicalRoot(scope === 'global' ? resolve(home) : resolve(cwd, options.project || '.'));
  const skillContent = options.uninstall ? undefined : readFileSync(source);
  const resources = new Map();
  for (const name of names) {
    const paths = harnessPaths(name, scope, root, env);
    log(name + (stat(paths.config) ? ' (existing configuration directory)' : ' (new configuration directory)'));
    resources.set(pathKey(paths.skill), { path: paths.skill, content: skillContent, skill: true });
    if (model || (options.uninstall && !options['only-skill'])) {
      for (const { path, role, alternate } of paths.workers) {
        resources.set(pathKey(path), { path, alternate, content: model && renderWorker(name, role, model) });
      }
    }
  }

  const stateDir = join(root, '.elegantly-delegated');
  const receiptPath = join(stateDir, 'install.json');
  const change = () => {
    const receipt = readReceipt(receiptPath);
    const changes = planChanges([...resources.values()], receipt, options.uninstall);
    applyChanges(changes, receipt, receiptPath, log, options['dry-run']);
  };

  if (options['dry-run']) change();
  else {
    // Preflight before creating directories when the proposed operation conflicts or is empty.
    const changes = planChanges([...resources.values()], readReceipt(receiptPath), options.uninstall);
    if (changes.every(settled)) {
      applyChanges(changes, {}, receiptPath, log, true);
    } else {
      const lock = join(stateDir, 'install.lock');
      safeFile(lock);
      mkdirSync(stateDir, { recursive: true });
      let handle;
      try {
        handle = openSync(lock, 'wx');
      } catch (error) {
        if (error.code !== 'EEXIST') throw error;
        throw new Error('Another installation may be running. If it has exited, remove ' + lock + ' and retry.');
      }
      try {
        writeFileSync(handle, String(process.pid) + '\n');
        change();
      } finally {
        closeSync(handle);
        unlinkSync(lock);
      }
    }
  }

  if (!options.uninstall) {
    for (const name of names) log(name + ' activation: ' + targets[name].activation);
    if (model) {
      log('Worker model requested: ' + model + '. Confirm actual execution in the harness.');
      if (options.global && names[0] === 'cursor') {
        log('Cursor global workers load in the editor and on self-hosted workers. Use project scope for the CLI.');
      }
    }
    else log('Skill only. See docs/configuration.md for worker setup and capability limits.');
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    run(process.argv.slice(2));
  } catch (error) {
    console.error('elegantly-delegated: ' + error.message);
    process.exitCode = 1;
  }
}
