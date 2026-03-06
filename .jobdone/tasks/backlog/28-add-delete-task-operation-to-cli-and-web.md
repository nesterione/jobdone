---
priority: medium
created: 06.03.2026
position: 1
---
Users need a way to permanently remove tasks that are no longer relevant.\n\n## Acceptance Criteria\n\n- [ ] CLI: `jobdone delete <id>` removes the task file and confirms deletion\n- [ ] CLI: command errors gracefully if task ID does not exist\n- [ ] Web: delete button on task detail or list view triggers permanent removal\n- [ ] Web: user is prompted to confirm before deletion