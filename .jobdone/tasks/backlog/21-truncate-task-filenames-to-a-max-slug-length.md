---
priority: low
created: 26.02.2026
position: 10
---

Task filenames are generated from the full title with no length limit, producing unwieldy paths that are hard to read and may hit OS or tool length constraints.

## Acceptance Criteria

- [ ] Filename slug is truncated to a max length (e.g. 50 chars) by default
- [ ] Truncation cuts at a word boundary, not mid-word
- [ ] Full title is always preserved in YAML front matter regardless of filename length
- [ ] Max slug length is configurable via `.jobdone/config.yml`
