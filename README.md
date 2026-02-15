# jobdone

**Simple text-based task manager. Built for AI agents. Comfortable for humans.**

`jobdone` is a lightweight, file-system–first task management approach.
No database. No SaaS. No UI lock-in. Just structured text files inside a `.jobdone/` folder in your project.

It treats your project folder as the source of truth — so your tasks live where your code lives.

---

## Why

Modern AI agents can read, write, classify, and refactor text — but most task managers hide everything behind APIs and proprietary UIs.

`jobdone` flips that.

```
Tasks are just files.
Status is just structure.
Git is your audit log.
AI is your operator.
```

---

## Principles

* **Filesystem first** — text is the database.
* **Git-native** — versioned, reviewable, branchable.
* **AI-friendly** — predictable structure, easy to parse.
* **Composable** — works with scripts, agents, CI.
* **Minimal** — no dependencies, zero ceremony.

---

## Folder Structure

```
project/
  .jobdone/
    config.yaml
    tasks/
      todo/
        3-implement-parser.md
      doing/
        2-add-cli.md
      done/
        1-initial-design.md
```

Move file → change status.
Edit file → update task.
Commit → track history.

That's it.

---

## Configuration

The optional `.jobdone/config.yaml` file lets you customize statuses, defaults, and task templates.

```yaml
statuses:
  - todo
  - doing
  - done

defaults:
  priority: medium
  template: |
    ---
    priority: {{ priority }}
    created: {{ date }}
    ---

    ## Description

    <!-- What needs to be done? -->

    ## Acceptance Criteria

    - [ ] ...
```

| Field | Description |
|---|---|
| `statuses` | Ordered list of status folders inside `.jobdone/tasks/`. The first is the default for new tasks. |
| `defaults.priority` | Default priority for new tasks. |
| `defaults.template` | Mustache-style template used when creating a new task file. Available variables: `priority`, `date`. |

If no `config.yaml` is present, the defaults above are assumed.

---

## Task Format

Tasks are Markdown files with YAML front matter.

```md
---
priority: medium
created: 2026-02-15
---

## Description

Implement token validation logic.

## Acceptance Criteria

- Validate JWT signature
- Handle expiration
- Add tests
```

---

## Example AI Flow

An agent can:

1. Read `.jobdone/tasks/todo/`
2. Pick highest priority
3. Move to `.jobdone/tasks/doing/`
4. Work on implementation
5. Append progress notes
6. Move to `.jobdone/tasks/done/`

No special API required. Just file operations.

---

## When to Use

* You want Git-based task tracking.
* You build with AI agents.
* You dislike heavyweight SaaS tools.
* You prefer transparent workflows.
* You want something scriptable and hackable.

---

## When Not to Use

* You need enterprise reporting dashboards.
* You want advanced PM features.
* You prefer GUI-first systems.

---

## Philosophy

`jobdone` follows the Unix mindset:

> Small tools. Plain text. Clear structure. No magic.

If your AI can read and write files — it can manage your project.

---

## License

MIT
