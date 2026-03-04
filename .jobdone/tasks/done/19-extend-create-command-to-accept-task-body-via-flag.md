---
priority: medium
created: 26.02.2026
title: Extend create command with --body and --set flags
---

The `create` command only sets title and priority today, so skills and automation that need to populate body content or custom front matter fields (e.g. `ticket`, `assignee`, `sprint`) must edit the file directly after creation — bypassing the CLI and creating inconsistency.

## Acceptance Criteria

- [ ] `create` accepts `--body <text>` / `-b <text>` to write markdown body content below the front matter
- [ ] `create` accepts `--set <key=value>` / `-s <key=value>` (repeatable) to inject arbitrary YAML front matter fields, using the same syntax as `update --set`
- [ ] `--set priority=high` overrides the `--priority` flag if both are given; `--priority` is kept as a convenience alias
- [ ] `createTask()` in `src/lib/task.ts` accepts optional `body` and `extraFields` parameters and applies them after template rendering
- [ ] The `new-task` skill (`skills/new-task/SKILL.md`) updates its suggested CLI command to use `--body` and `--set` for body/field injection instead of instructing manual file editing
- [ ] Tests cover: `--body` writes content, `--set` injects fields, combined `--body --set` works, unknown fields are passed through without error
