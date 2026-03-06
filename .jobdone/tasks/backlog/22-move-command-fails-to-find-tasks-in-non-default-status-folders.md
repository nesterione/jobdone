---
priority: high
created: 04.03.2026
type: bug
position: 11
---
The move command returns 'Task not found' for tasks that exist on disk. Reproducible when the project config has custom statuses (e.g. backlog, todo, done) different from the defaults (todo, doing, done). The list command shows the task correctly but move cannot locate it by ID.