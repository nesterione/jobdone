---
priority: medium
created: 18.02.2026
title: Persist ticket ordering within a column
---
Drag-and-drop within a column currently has no backing storage — same-column reordering is silently ignored and lost on reload. Position must be persisted in each task's file (consistent with jobdone's file-based, git-trackable architecture) so column order survives page reloads, syncs correctly via git, and is respected by the CLI.

## Acceptance Criteria

- [ ] A `position` integer field (0 = top) is added to task frontmatter; the field is optional for backwards compatibility
- [ ] `readAllTasks()` sorts tasks within each status group by `position` ascending; tasks without a `position` field sort after positioned ones, using filename as tiebreaker
- [ ] `jobdone list` respects the new position-based order
- [ ] `jobdone create` assigns `position: 0` to the new task and increments `position` by 1 on all existing tasks in the same column
- [ ] Web UI: same-column drag-and-drop is no longer ignored; on drop it calls `POST /api/tasks/reorder` with `{ filename, status, newIndex }`
- [ ] `POST /api/tasks/reorder` reads the current ordered task list for the column, applies the move, then writes updated `position` values to every affected file
- [ ] macOS: within-column drops trigger position updates using the same underlying mechanism (CLI `update` calls)
- [ ] `jobdone get <id>` shows the `position` field when set

## Out of Scope

- Fractional/sparse indexing to avoid rewriting sibling files (backlog)
- In-memory caching or index files for position lookup (backlog)
- Backfilling `position` on existing tasks (initial order for pre-existing tasks is unspecified)
