import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { delimiter, join } from 'node:path';

export function codexExecutable(env = process.env) {
  for (const directory of (env.PATH ?? env.Path ?? '').split(delimiter).filter(Boolean)) {
    if (process.platform !== 'win32') {
      const cli = join(directory, 'codex');
      if (existsSync(cli)) return [cli];
      continue;
    }
    const native = join(directory, 'codex.exe');
    if (existsSync(native)) return [native];
    const npm = join(directory, 'node_modules', '@openai', 'codex', 'bin', 'codex.js');
    if (existsSync(npm)) return [process.execPath, npm];
  }
  throw new Error('Codex executable not found. Put Codex or its npm installation on PATH.');
}

export function capture(command, args, { cwd, env = process.env, input = '', timeoutMs = 5000,
  maxBytes = 2_000_000 } = {}) {
  return new Promise(resolve => {
    const [file, ...prefix] = command;
    const child = spawn(file, [...prefix, ...args], { cwd, env, windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'], detached: process.platform !== 'win32' });
    const out = [];
    const err = [];
    let size = 0;
    let failure;
    function stop(reason) {
      if (failure) return;
      failure = reason;
      if (!child.pid) return;
      if (process.platform === 'win32') {
        const killer = spawn(join(process.env.SystemRoot || 'C:/Windows', 'System32', 'taskkill.exe'),
          ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore', windowsHide: true });
        killer.on('error', () => child.kill());
        killer.on('exit', code => { if (code !== 0) child.kill(); });
      } else {
        try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); }
      }
    }
    const timer = setTimeout(() => stop('timeout'), timeoutMs);
    // Bound the parent even if a descendant keeps inherited pipes open.
    const watchdog = setTimeout(() => {
      child.stdout.destroy();
      child.stderr.destroy();
      child.unref();
      finish(null, failure ?? 'timeout');
    }, timeoutMs + 1500);
    function finish(code, category) {
      clearTimeout(timer);
      clearTimeout(watchdog);
      resolve({ code, category, stdout: Buffer.concat(out).toString('utf8'),
        stderr: Buffer.concat(err).toString('utf8') });
    }
    function collect(target, chunk) {
      size += chunk.length;
      if (size > maxBytes) stop('output_limit');
      else target.push(chunk);
    }
    child.stdout.on('data', buffer => collect(out, buffer));
    child.stderr.on('data', buffer => collect(err, buffer));
    child.stdin.on('error', () => {});
    child.on('error', () => finish(null, 'launch_failed'));
    child.on('close', code => finish(code, failure));
    child.stdin.end(input);
  });
}
