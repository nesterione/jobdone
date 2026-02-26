---
priority: medium
created: 26.02.2026
---

Task IDs are derived by scanning existing filenames sequentially, so tasks created directly (by copying or writing files manually) can produce ID conflicts and corrupt the numbering scheme.

## Acceptance Criteria

- [ ] ID generation scans all status folders to find the true max ID
- [ ] IDs are stored in filename to simplify find pattern in claude @<task_id>- . [to refine if that is good way]
- [ ] `create` command detects any ID conflict before writing and resolves it automatically [negotible, we should not create extra compute]
- [ ] A `jobdone doctor` (or similar) command reports any duplicate or missing IDs in the repo


## Test scenario 

- Added task manually without ID
- Created ID conflict manually [should be updated newest task]
-
