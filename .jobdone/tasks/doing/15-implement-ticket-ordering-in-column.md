---
priority: medium
created: 18.02.2026
title: Implement ticket ordering in column
---

Users expect newly created tickets to appear at the top of a column so they are immediately visible. Additionally, when a ticket is manually reordered (moved up or down), that position should be persisted so the order survives page reloads and syncs correctly.

## Acceptance Criteria

- [ ] A newly created ticket appears at the top of its column
- [ ] Moving a ticket up or down updates its stored position
- [ ] Column order is preserved after a page reload
- [ ] Order changes are reflected consistently across all views that display the column
