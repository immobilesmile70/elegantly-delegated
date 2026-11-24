import { existsSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { capture } from './process.mjs';

export function pythonCandidates(env = process.env, platform = process.platform) {
  const result = [];
  if (env.ED_PYTHON) {
    if (!isAbsolute(env.ED_PYTHON)) throw new Error('ED_PYTHON must be an absolute executable path.');
    return [[env.ED_PYTHON]];
  }
  if (platform === 'win32') {
    const roots = [join(env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local'), 'Programs', 'Python'),
      env.ProgramFiles, env['ProgramFiles(x86)']].filter(Boolean);
    if (env.VIRTUAL_ENV) result.push([join(env.VIRTUAL_ENV, 'Scripts', 'python.exe')]);
    result.push(['py.exe', '-3'], ['python.exe'], ['python3.exe']);
    for (const root of roots) {
      let entries;
      try { entries = readdirSync(root, { withFileTypes: true }); } catch { continue; }
      for (const entry of entries.filter(entry => /^Python\d/i.test(entry.name)).reverse()) {
        const candidate = join(root, entry.name, 'python.exe');
        if (existsSync(candidate) && statSync(candidate).isFile()) result.push([candidate]);
      }
    }
  } else {
    if (env.VIRTUAL_ENV) result.push([join(env.VIRTUAL_ENV, 'bin', 'python')]);
    result.push(['python3'], ['python']);
  }
  return result;
}

async function registeredPython(env, run) {
  const root = env.SystemRoot || 'C:/Windows';
  const reg = [join(root, 'System32', 'reg.exe')];
  const views = ['HKCU', 'HKLM'].flatMap(hive => ['/reg:64', '/reg:32'].map(view => [hive, view]));
  const results = await Promise.all(views.map(([hive, view]) => run(reg,
    ['query', hive + '\\Software\\Python', '/s', view], { env, timeoutMs: 2000 })));
  return [...new Set(results.flatMap(result => result.stdout.split(/\r?\n/).flatMap(line => {
    const path = /^\s+ExecutablePath\s+REG_SZ\s+(.+\.exe)\s*$/i.exec(line)?.[1];
    return path && isAbsolute(path) && existsSync(path) ? [path] : [];
  })))].map(path => [path]);
}

export async function findPython({ env = process.env, commands, run = capture,
  modules = [] } = {}) {
  if (!modules.every(name => /^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(name))) throw new Error('Invalid Python module name.');
  let firstMissing;
  if (!commands) {
    commands = pythonCandidates(env);
    if (process.platform === 'win32' && !env.ED_PYTHON) commands.push(...await registeredPython(env, run));
  }
  for (const command of commands) {
    const checked = await run(command, ['-I', '-c',
      'import json,sys;print(json.dumps([list(sys.version_info[:3]),sys.executable]))'], { env, timeoutMs: 2000 });
    let version;
    let executable;
    try { [version, executable] = JSON.parse(checked.stdout); } catch { continue; }
    if (checked.code !== 0 || version?.[0] !== 3 || !Number.isInteger(version[1]) ||
        typeof executable !== 'string' || !isAbsolute(executable)) continue;
    const missing = [];
    for (const module of modules) {
      const probe = await run([executable], ['-I', '-c',
        'import importlib,sys;importlib.import_module(sys.argv[1])', module], { env, timeoutMs: 2000 });
      if (probe.code !== 0) missing.push(module);
    }
    if (!missing.length) return { status: 'ok', version: version.join('.'), executable, missing };
    firstMissing ??= { status: 'dependency_missing', version: version.join('.'), executable, missing };
  }
  return firstMissing ?? { status: 'python_unavailable' };
}
