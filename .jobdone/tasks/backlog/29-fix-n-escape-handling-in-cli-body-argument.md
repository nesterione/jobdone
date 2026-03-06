---
priority: high
created: 06.03.2026
position: 2
---
The --body argument treats \n as a literal backslash-n instead of a newline, producing garbled formatting in task files.

## Acceptance Criteria

- [ ] \n in --body values is interpreted as a newline character
- [ ] Existing tasks created with literal \n are unaffected (migration not required)
- [ ] Multi-paragraph bodies render correctly in both CLI output and web view