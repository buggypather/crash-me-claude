# crash-me-claude

Makes crash and error reports for Claude Code and its IDE extension (VS Code, Cursor, Windsurf, VSCodium). It runs on Windows, macOS and Linux. Everything is redacted and saved on your computer, and nothing is sent unless you choose to.

## Install (as a Claude Code plugin)

```
/plugin marketplace add buggypather/crash-me-claude
/plugin install crash-me-claude@crash-me-claude
```

From then on, the plugin quietly notes problems as they happen: Claude stopping on an error, tools failing, and sessions ending unusually. It writes them to `~/claude-crash-reports/incidents.jsonl` (on Windows, `C:\Users\<you>\claude-crash-reports`).

You need Node.js 18 or newer.

## Make a report

Inside Claude Code: `/crash-report it froze while editing`

From a terminal (`npm i -g github:buggypather/crash-me-claude`, or `node <plugin folder>/dist/cli.js`):

| Command | What it does |
|---|---|
| `crash-me-claude report "what happened"` | Makes `~/claude-crash-reports/report-<time>/` containing `report.md` (your system, versions and recent problems) and the redacted logs |
| `crash-me-claude send "what happened"` | Makes the report, then opens a new GitHub issue on anthropics/claude-code with the summary filled in. Nothing is sent until you press **Submit**, and you can drag the log files in to attach them. Use `--repo=owner/name` for another repo |
| `crash-me-claude list` | Shows the recent problems |
| `crash-me-claude where` | Shows where reports are kept |

To keep reports somewhere else, set `CRASH_ME_CLAUDE_DIR`. On Windows, run `setx CRASH_ME_CLAUDE_DIR D:\reports`. On macOS or Linux, add `export CRASH_ME_CLAUDE_DIR=~/reports` to your shell profile.

### What goes into a report

- **The newest Claude Code extension logs** from each IDE's `logs` folder:
  - Windows: `%APPDATA%\Code\logs`
  - macOS: `~/Library/Application Support/Code/logs`
  - Linux: `~/.config/Code/logs`
- **Claude Code's debug logs** from `~/.claude/debug`. These exist if you ran `claude --debug`.
- **The end of your two newest session transcripts.**
- **Versions:** the OS, Node, `claude`, `code` and the extension.

### What gets removed

API keys and tokens (Anthropic, GitHub, AWS, Google, Slack, JWTs, bearer tokens and private keys), `password=` and `token=` style values, emails, your user name and your home folder path are all removed. Please still look the files over before sharing them.

### A VS Code button

Add this to `.vscode/tasks.json` (or your user tasks), then run **Tasks: Run Task → Claude crash report**:

```json
{ "version": "2.0.0", "tasks": [{ "label": "Claude crash report", "type": "shell", "command": "crash-me-claude report \"${input:what}\"" }],
  "inputs": [{ "id": "what", "type": "promptString", "description": "What happened?" }] }
```

## Contributing

Updates are welcome: more log locations, better redaction rules and other IDEs. See CONTRIBUTING.md. Run `npm test` before opening a PR.

MIT licensed.
