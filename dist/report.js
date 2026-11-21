// Making a report: a folder with report.md (what happened, the system, recent problems) and the
// logs beside it, everything redacted. Optionally, a GitHub issue page filled in with the summary.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { redact } from './redact.js';
import { claudeFiles, environment, extensionLogs, INCIDENTS, REPORTS, tail } from './sources.js';
/** The last problems the hook noted, newest last. */
export function recentIncidents(max = 30) {
    try {
        return readFileSync(INCIDENTS(), 'utf8')
            .split(/\r?\n/)
            .filter(Boolean)
            .map(l => JSON.parse(l))
            .slice(-max);
    }
    catch {
        return [];
    }
}
const stamp = (d = new Date()) => d.toISOString().slice(0, 19).replace(/[:T]/g, '-');
export function summary(env, incidents, note) {
    return [
        '## What happened',
        '',
        note || '_(Describe what you were doing and what went wrong.)_',
        '',
        '## System',
        '',
        ...Object.entries(env).map(([k, v]) => `- **${k}:** ${v}`),
        '',
        '## Recent problems',
        '',
        incidents.length ? incidents.map(i => `- ${i.at} **${i.event}**${i.cwd ? ` in \`${basename(i.cwd)}\`` : ''}: ${i.detail.split('\n')[0].slice(0, 300)}`).join('\n') : '_None noted by the hook._',
    ].join('\n');
}
/** Makes the report folder; returns where it is and the summary (already redacted). */
export function makeReport(note = '') {
    const folder = join(REPORTS(), `report-${stamp()}`);
    mkdirSync(folder, { recursive: true });
    const env = environment();
    const incidents = recentIncidents();
    const text = redact(summary(env, incidents, note));
    const logs = extensionLogs();
    const { debug, transcripts } = claudeFiles();
    const copies = [];
    const copy = (path, prefix, bytes) => {
        const name = `${prefix} ${basename(path)}`.replace(/[\\/:*?"<>|]/g, '_');
        writeFileSync(join(folder, name), redact(tail(path, bytes)));
        copies.push(name);
    };
    logs.forEach(f => copy(f.path, 'extension'));
    debug.forEach(f => copy(f.path, 'debug'));
    // Only the end of the newest transcripts: what was going on when it broke.
    transcripts.forEach(f => copy(f.path, 'session-end', 60_000));
    const body = `# Claude Code problem report · ${new Date().toLocaleString()}\n\n${text}\n\n## Files in this report\n\n${copies.length ? copies.map(c => `- ${c}`).join('\n') : '_No logs found._'}\n\nSecrets (keys, tokens, passwords), emails, your user name and home folder were taken out. Look the files over before sharing them.\n`;
    writeFileSync(join(folder, 'report.md'), body);
    return { folder, summary: text };
}
/** A GitHub "new issue" page with the summary filled in (kept short enough for a link). */
export function issueUrl(summaryText, repo = 'anthropics/claude-code') {
    const body = `${summaryText.slice(0, 5000)}\n\n_Made with crash-me-claude; the full redacted logs can be attached from the report folder._`;
    const firstProblem = /\*\*(\w+)\*\*/.exec(summaryText.split('## Recent problems')[1] ?? '')?.[1];
    const title = `[crash report] ${firstProblem ?? 'Problem'} in Claude Code`;
    return `https://github.com/${repo}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
}
export function ensureReports() {
    if (!existsSync(REPORTS()))
        mkdirSync(REPORTS(), { recursive: true });
}
