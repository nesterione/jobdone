---
priority: medium
created: 26.02.2026
title: Extend create command to accept task body via flag
---

The `create` command only sets title and priority today, so skills that want to add body content must edit the file directly after creation — bypassing the CLI API and creating inconsistency.

## Acceptance Criteria

- [ ] `create` command accepts an optional `--body` / `-b` flag for task body content
- [ ] When `--body` is provided, the content is written to the task file below the front matter
- [ ] The `new-task` skill passes body via `--body` flag instead of direct file editing
- [ ] Tests cover `create --body` writes content correctly
