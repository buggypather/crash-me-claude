#!/usr/bin/env node
// crash-me-claude report ["what happened"]   make a report folder (redacted logs and a summary)
// crash-me-claude send ["what happened"]     make one, then open a GitHub issue page with the summary filled in
// crash-me-claude list                       recent problems the hook noted
// crash-me-claude where                      where reports are kept
import { spawn } from 'node:child_process';
import { issueUrl, makeReport, recentIncidents } from './report.js';
import { REPORTS } from './sources.js';

const [cmd, ...rest] = process.argv.slice(2);
const note = rest.filter(a => !a.startsWith('--')).join(' ');
const repo = rest.find(a => a.startsWith('--repo='))?.slice(7);

function open(url: string) {
  const [c, a] = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url.replace(/&/g, '^&')]] : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  spawn(c as string, a as string[], { stdio: 'ignore', detached: true, windowsHide: true }).unref();
}

if (cmd === 'report' || cmd === 'send') {
  const r = makeReport(note);
  console.log(`Report made: ${r.folder}\nOpen report.md there to read it; look the files over before sharing.`);
  if (cmd === 'send') {
    open(issueUrl(r.summary, repo));
    console.log(`Opened a new issue page${repo ? ` on ${repo}` : ' on anthropics/claude-code'} with the summary filled in. Nothing is sent until you press Submit there; drag the files from the report folder in to attach them.`);
  }
} else if (cmd === 'list') {
  const list = recentIncidents();
  console.log(list.length ? list.map(i => `${i.at}  ${i.event}  ${i.detail.split('\n')[0]!.slice(0, 160)}`).join('\n') : 'No problems noted yet.');
} else if (cmd === 'where') console.log(REPORTS());
else console.log('crash-me-claude report ["what happened"] | send ["what happened"] [--repo=owner/name] | list | where');
