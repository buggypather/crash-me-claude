#!/usr/bin/env node
// Notes problems as they happen (in the background): Claude stopping on an error (StopFailure),
// a tool failing or being cut off, and sessions ending unusually. They go in
// claude-crash-reports/incidents.jsonl, redacted, for the next report.
import { appendFileSync } from 'node:fs';
import { redact } from './redact.js';
import { ensureReports } from './report.js';
import { INCIDENTS } from './sources.js';
export function incidentFrom(e) {
    const base = { at: new Date().toISOString(), event: e.hook_event_name ?? 'event', session: e.session_id, cwd: e.cwd };
    const text = (x) => (typeof x === 'string' ? x : x === undefined ? '' : JSON.stringify(x));
    switch (e.hook_event_name) {
        case 'StopFailure':
            return { ...base, detail: [e.error_type, text(e.error), e.message].filter(Boolean).join(': ') || 'Claude stopped on an error' };
        case 'PostToolUseFailure':
            return { ...base, detail: `${e.tool_name ?? 'A tool'}${e.is_interrupt ? ' was cut off' : ' failed'}: ${text(e.error)}` };
        case 'SessionEnd':
            // Ordinary endings (you quit, cleared or logged out) aren't problems.
            return e.reason && !['clear', 'logout', 'prompt_input_exit', 'other', 'resume'].includes(e.reason) ? { ...base, detail: `Session ended: ${e.reason}` } : null;
        default:
            return null;
    }
}
async function main() {
    let raw = '';
    for await (const chunk of process.stdin)
        raw += chunk;
    const inc = incidentFrom(JSON.parse(raw || '{}'));
    if (!inc)
        return;
    ensureReports();
    appendFileSync(INCIDENTS(), redact(JSON.stringify(inc)) + '\n');
}
if (process.argv[1] && /hook\.js$/.test(process.argv[1]))
    main().catch(() => { });
