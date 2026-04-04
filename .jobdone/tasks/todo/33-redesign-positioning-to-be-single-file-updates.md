---
priority: medium
created: 12.03.2026
position: 0
---
## Problem

The current `position` field strategy causes N file writes whenever a single task is created or reordered:

- `createTask` iterates every existing task in the column and increments each task's `position` by 1 to make room at position 0.
- `reorderTasksInColumn` rewrites every task in the column after a splice, not just the one that moved.

This is noisy in git (every move/create touches many files) and expensive as columns grow.

## Goal

Move to a sparse / fractional-index approach so that inserting or moving a task only writes **one file**:

- Use large gaps between positions (e.g. 1000, 2000, 3000) so a new task can be inserted between two existing ones without renumbering neighbours.
- When inserting at the front: assign `position = first.position - 1000` (or any value less than the current minimum).
- When inserting between A and B: assign `position = (A.position + B.position) / 2`.
- When inserting at the end: assign `position = last.position + 1000`.
- Only rewrite all files (full renumber) when the gap between two adjacent tasks falls below a threshold (e.g. < 1), which should be extremely rare.

## Acceptance criteria

- Creating a task writes exactly 1 file (the new task).
- Moving a task to a new position (reorder within column) writes exactly 1 file (the moved task).
- Sort order is preserved correctly after create / reorder operations.
- Existing tests pass; new tests cover the single-write guarantee.