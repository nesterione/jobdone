---
priority: medium
created: 06.03.2026
position: 0
---
The move command requires a full filename (e.g. 1-fix-bug.md) which is cumbersome — users should be able to use the numeric task ID like other commands.

## Acceptance Criteria

- [ ] `jobdone move <id> <status>` works the same as passing the full filename
- [ ] Full filename still works for backwards compatibility
- [ ] Error message is clear when ID does not match any task