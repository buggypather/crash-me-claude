---
description: Make a redacted crash report of recent Claude Code problems (and optionally open a GitHub issue)
argument-hint: "[what happened]"
allowed-tools: Bash(node:*)
---
Run `node "${CLAUDE_PLUGIN_ROOT}/dist/cli.js" report "$ARGUMENTS"` and tell me where the report folder is, and summarise the recent problems listed in its report.md in a few lines. Don't send anything anywhere. Then ask whether I'd like to open a GitHub issue page with the summary (that's `node "${CLAUDE_PLUGIN_ROOT}/dist/cli.js" send "$ARGUMENTS"`).
