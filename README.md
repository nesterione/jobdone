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

## Contributing

**Branching:** Create feature branches off `main`. Open a pull request to merge back — CI will run lint, build, and tests automatically.

**Commit messages:** We use [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | Use for | Example |
|---|---|---|
| `feat:` | New feature | `feat: add list filtering` |
| `fix:` | Bug fix | `fix: resolve path on Windows` |
| `chore:` | Maintenance | `chore: update dependencies` |
| `docs:` | Documentation | `docs: update README examples` |
| `refactor:` | Code restructure | `refactor: extract task parser` |
| `test:` | Tests | `test: add create command tests` |

---

## Philosophy

`jobdone` follows the Unix mindset:

> Small tools. Plain text. Clear structure. No magic.

If your AI can read and write files — it can manage your project.

### A tool without a brain — by design

Every product wants to add AI these days. `jobdone` does not.

There is no embedded LLM. No "smart suggestions". No copilot mode. `jobdone` is deliberately, stubbornly dumb. It creates files and moves them between folders. That's the whole product.

What we do instead: we ship **skills for AI tools** — prompts that teach agents like Claude Code how to work with jobdone tasks. The intelligence lives in the AI you already have. `jobdone` just gives it a clean, predictable surface to work on.

This is not a limitation. It's the point.

---

## Claude Code Plugin

The jobdone repo ships as a **Claude Code plugin** — install it once and get AI skills for working with your task files in any project.

### What it does

The `refine-task` skill reviews a jobdone task file and helps you improve it:

- Validates YAML frontmatter (`priority`, `created` format, `title` quality)
- Checks that the body explains *why*, not just *what*
- Ensures acceptance criteria are concrete, testable, and in `- [ ]` format
- Shows a before/after review and rewrites the file on your confirmation

### Run locally (inside this repo)

```bash
claude --plugin-dir .
```

Then invoke the skill with a task file path:

```
/jobdone:refine-task .jobdone/tasks/todo/10-add-custom-skills-for-ai.md
```

### Install from GitHub (any project)

First, register the jobdone marketplace:

```
/plugin marketplace add nesterione/jobdone
```

Then install the plugin:

```
/plugin install jobdone@nesterione-jobdone
```

Then use it the same way:

```
/jobdone:refine-task .jobdone/tasks/todo/my-task.md
```

---

## License

MIT
