// Taking secrets and personal details out before anything is saved in a report or sent.
import { homedir, userInfo } from 'node:os';

const RULES: [RegExp, string][] = [
  [/sk-ant-[A-Za-z0-9_-]{10,}/g, '[anthropic-key]'],
  [/sk-[A-Za-z0-9_-]{20,}/g, '[api-key]'],
  [/gh[pousr]_[A-Za-z0-9]{20,}/g, '[github-token]'],
  [/github_pat_[A-Za-z0-9_]{20,}/g, '[github-token]'],
  [/AKIA[0-9A-Z]{16}/g, '[aws-key]'],
  [/xox[abprs]-[A-Za-z0-9-]{10,}/g, '[slack-token]'],
  [/AIza[0-9A-Za-z_-]{35}/g, '[google-key]'],
  [/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, '[jwt]'],
  [/(authorization|bearer|api[_-]?key|token|secret|password|passwd)(["']?\s*[:=]\s*["']?)([^\s"',;]{6,})/gi, '$1$2[hidden]'],
  [/Bearer\s+[A-Za-z0-9._~+/-]{10,}=*/g, 'Bearer [hidden]'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, '[private-key]'],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email]'],
];

export function redact(text: string, home = homedir(), user = safeUser()): string {
  let out = text;
  for (const [re, to] of RULES) out = out.replace(re, to);
  // Your home folder and user name become ~ and <user>, both slash styles.
  if (home) {
    for (const h of new Set([home, home.replace(/\\/g, '/'), home.replace(/\//g, '\\'), home.replace(/\\/g, '\\\\')])) out = out.split(h).join('~');
  }
  if (user && user.length > 2) out = out.replace(new RegExp(`\\b${user.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), '<user>');
  return out;
}
function safeUser(): string {
  try {
    return userInfo().username;
  } catch {
    return '';
  }
}
