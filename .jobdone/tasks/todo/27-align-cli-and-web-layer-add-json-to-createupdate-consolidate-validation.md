---
priority: medium
created: 04.03.2026
title: "Align CLI and web layer: add --json to create/update, consolidate validation"
---
## Why

The web server (`routes.ts`) and CLI commands duplicate the same validation logic —
priority value checks and non-empty title guards appear independently in both layers.
If a new config field gets added, both places need updating. Additionally, `create`
and `update` CLI commands produce only human-readable text output, making them
unusable for scripting: you can't retrieve the resulting filename or ID after creation
or a title-rename. The web API can do this; the CLI can't. This makes the CLI a
second-class citizen compared to the web API for programmatic use.

## Acceptance Criteria

- [ ] `jobdone create --json` outputs `{ id, filename, status, priority }` so scripts
      can get the new task's filename and ID
- [ ] `jobdone update <id> --json` outputs `{ id, filename, status }` including the
      renamed filename when title changes
- [ ] `jobdone move <filename> <status> --json` outputs `{ ok, filename, from, to }`
      for consistency with other mutating commands
- [ ] Field validation (priority against config values, non-empty title) is extracted
      from `routes.ts` into `lib/task.ts` (or a dedicated `lib/validate.ts`), so CLI
      commands and web routes share the same validation path — no duplication
- [ ] `routes.ts` contains no inline validation logic; it delegates to lib functions
      that enforce the same rules the CLI enforces
- [ ] `list --json` output shape is documented and stable; the web's `/api/tasks`
      response either reuses it directly or the divergence (description vs body) is
      a conscious, documented decision

## Out of Scope

- Switching web routes to subprocess CLI invocation
- Delete command or any new web UI features
- Changing the web UI's visual behaviour