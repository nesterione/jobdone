---
priority: medium
created: 24.02.2026
title: Add export command for task reports
---

The project currently has no way to share task progress with stakeholders outside the CLI.
Adding an export command lets teams generate lightweight Markdown or JSON reports from the
current task state without requiring access to the raw `.jobdone` directory.

## Acceptance Criteria

- [ ] `jobdone export` outputs a Markdown summary of all tasks grouped by status (todo / doing / done)
- [ ] `--format json` flag produces machine-readable output with the same task data
- [ ] `--output <file>` flag writes output to a file instead of stdout
- [ ] Command is documented in the README with usage examples
- [ ] Unit tests cover Markdown and JSON output formats
