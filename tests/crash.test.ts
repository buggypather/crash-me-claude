import { describe, expect, it } from 'vitest';
import { incidentFrom } from '../src/hook';
import { redact } from '../src/redact';
import { issueUrl, summary } from '../src/report';
import { ideFolders } from '../src/sources';

describe('crash-me-claude', () => {
  it('takes secrets and personal details out', () => {
    const t = redact('key sk-ant-api03-abcdefghijklmnop and ghp_abcdefghijklmnopqrstuvwxyz1234 at C:\\Users\\aaron\\x for aaron@example.com password=hunter22', 'C:\\Users\\aaron', 'aaron');
    expect(t).not.toMatch(/sk-ant|ghp_|hunter22|example\.com|aaron/);
    expect(t).toContain('~\\x');
    expect(t).toContain('[anthropic-key]');
  });
  it('notes problems, not ordinary endings', () => {
    expect(incidentFrom({ hook_event_name: 'StopFailure', error_type: 'rate_limit', error: 'Too many requests' })?.detail).toBe('rate_limit: Too many requests');
    expect(incidentFrom({ hook_event_name: 'PostToolUseFailure', tool_name: 'Bash', error: 'Exit code 1', is_interrupt: false })?.detail).toBe('Bash failed: Exit code 1');
    expect(incidentFrom({ hook_event_name: 'SessionEnd', reason: 'logout' })).toBeNull();
    expect(incidentFrom({ hook_event_name: 'Stop' })).toBeNull();
  });
  it('finds the IDE logs on each system', () => {
    expect(ideFolders('win32', 'C:\\Users\\a', { APPDATA: 'C:\\Users\\a\\AppData\\Roaming' })[0]).toMatch(/AppData.Roaming.Code$/);
    expect(ideFolders('darwin', '/Users/a', {})[0]).toBe('/Users/a/Library/Application Support/Code');
    expect(ideFolders('linux', '/home/a', {})[0]).toBe('/home/a/.config/Code');
  });
  it('fills in an issue page', () => {
    const s = summary({ System: 'win32' }, [{ at: 't', event: 'StopFailure', detail: 'overloaded' }], 'It froze');
    const u = new URL(issueUrl(s));
    expect(u.pathname).toBe('/anthropics/claude-code/issues/new');
    expect(u.searchParams.get('title')).toBe('[crash report] StopFailure in Claude Code');
    expect(u.searchParams.get('body')).toContain('It froze');
  });
});
