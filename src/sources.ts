// Where the clues are: the IDE extension's logs (VS Code and its cousins), Claude Code's own
// debug logs, recent session transcripts, and the problems the hook noted as they happened.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { homedir, platform, release, arch, totalmem } from 'node:os';
import { join } from 'node:path';

export const REPORTS = () => process.env.CRASH_ME_CLAUDE_DIR || join(homedir(), 'claude-crash-reports');
export const INCIDENTS = () => join(REPORTS(), 'incidents.jsonl');

/** Each IDE's settings folder ("logs" is inside), for this system. */
export function ideFolders(os = platform(), home = homedir(), env = process.env): string[] {
  const names = ['Code', 'Code - Insiders', 'Cursor', 'Windsurf', 'VSCodium'];
  const base = os === 'win32' ? env.APPDATA ?? join(home, 'AppData', 'Roaming') : os === 'darwin' ? join(home, 'Library', 'Application Support') : env.XDG_CONFIG_HOME ?? join(home, '.config');
  return names.map(n => join(base, n));
}

/** Files under a folder (a few levels), newest first. */
function walk(dir: string, depth = 5, out: { path: string; mtime: number; size: number }[] = []) {
  if (depth < 0 || !existsSync(dir)) return out;
  let entries: string[] = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = join(dir, e);
    try {
      const s = statSync(p);
      if (s.isDirectory()) walk(p, depth - 1, out);
      else out.push({ path: p, mtime: s.mtimeMs, size: s.size });
    } catch {
      // Gone or locked.
    }
  }
  return out;
}

/** The Claude Code extension's newest logs in each IDE (the folders the extension host writes). */
export function extensionLogs(max = 6) {
  const found = ideFolders()
    .flatMap(f => walk(join(f, 'logs'), 6))
    .filter(f => /claude/i.test(f.path) && /\.log$/i.test(f.path))
    .sort((a, b) => b.mtime - a.mtime);
  return found.slice(0, max);
}

/** Claude Code's own debug logs (written when started with --debug) and its newest transcripts. */
export function claudeFiles() {
  const root = join(homedir(), '.claude');
  const debug = walk(join(root, 'debug'), 1).sort((a, b) => b.mtime - a.mtime).slice(0, 3);
  const transcripts = walk(join(root, 'projects'), 2).filter(f => f.path.endsWith('.jsonl')).sort((a, b) => b.mtime - a.mtime).slice(0, 2);
  return { debug, transcripts };
}

/** The last part of a file (the end is where a crash shows). */
export function tail(path: string, bytes = 200_000): string {
  try {
    const all = readFileSync(path, 'utf8');
    return all.length > bytes ? `…(earlier part left out)…\n${all.slice(-bytes)}` : all;
  } catch {
    return '';
  }
}

function run(cmd: string, args: string[]): string {
  try {
    return execFileSync(cmd, args, { encoding: 'utf8', timeout: 8000, stdio: ['ignore', 'pipe', 'ignore'], shell: process.platform === 'win32' }).trim().split(/\r?\n/)[0] ?? '';
  } catch {
    return 'not found';
  }
}

/** The system and versions, for the top of a report. */
export function environment(): Record<string, string> {
  const ext = ['.vscode', '.vscode-insiders', '.cursor', '.windsurf']
    .flatMap(d => {
      const dir = join(homedir(), d, 'extensions');
      try {
        return readdirSync(dir).filter(n => /^anthropic\.claude-code-/i.test(n)).map(n => `${n.replace(/^anthropic\.claude-code-/i, '')} (${d.slice(1)})`);
      } catch {
        return [];
      }
    })
    .join(', ');
  return {
    System: `${platform()} ${release()} (${arch()})`,
    Memory: `${Math.round(totalmem() / 1024 ** 3)} GB`,
    Node: process.version,
    'Claude Code': run('claude', ['--version']),
    'VS Code': run('code', ['--version']),
    'Claude Code extension': ext || 'not found',
  };
}
