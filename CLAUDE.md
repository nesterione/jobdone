# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is jobdone

A text-based task manager where tasks are Markdown files with YAML front matter, status is determined by folder location (`.jobdone/tasks/{todo,doing,done}/`), and git is the audit log. Designed for AI agents and scriptable workflows.

## Commands

```bash
bun run dev -- <args>   # Run CLI directly (no build needed)
bun run build           # Bundle to dist/ via tsup
bun test                # Run all tests
bun test tests/commands/init.test.ts  # Run a single test file
bun run lint            # Check with Biome
bun run format          # Auto-format with Biome
```

## Architecture

**CLI entry** (`src/index.ts`) creates a Commander program and registers commands.

**Commands** live in `src/commands/`. Each file exports a `register<Name>Command(program: Command): void` function that is imported and called in `index.ts`.

**Shared utilities** live in `src/lib/`:
- `paths.ts` — resolves `.jobdone/` paths (accepts optional `cwd` parameter)
- `config.ts` — `JobdoneConfig` type, `DEFAULT_CONFIG`, YAML serialization

## Adding a new command

1. Create `src/commands/<name>.ts` exporting `register<Name>Command(program)`
2. Import and register it in `src/index.ts`
3. Add tests in `tests/commands/<name>.test.ts`

## Testing patterns

- Tests use `Bun.spawnSync()` to run the actual CLI as a subprocess
- Temp directories via `os.tmpdir()` for filesystem isolation (created in `beforeEach`, cleaned in `afterEach`)
- The `runCli()` helper takes args and cwd, uses an absolute path to `src/index.ts`

### Two test layers

**`tests/commands/`** — per-command unit-style tests. Each file tests one command in isolation against a pre-seeded workspace. Add a file here when adding a new command.

**`tests/integration/`** — multi-command journey tests. Each file simulates a real user workflow spanning several commands in sequence to verify cross-command state propagation. Shared helpers (`runCli`, `createInitializedWorkspace`, `cleanupWorkspace`) live in `tests/integration/helpers.ts`.

| Journey file | What it covers |
|---|---|
| `task-lifecycle.test.ts` | Single task from create through update, move, and done |
| `bulk-management.test.ts` | Multiple tasks, ID continuity, aggregate list state |
| `title-rename-continuity.test.ts` | `update --set title=` renames the file; subsequent get/move/list adapt |
| `corrupt-recovery.test.ts` | Doctor detects and fixes bad state; workflow resumes after fix |
| `fresh-setup.test.ts` | `init` as a real CLI call; migrate flow; pre-init error consistency |

Run integration tests in isolation:

```bash
bun test tests/integration/
bun test tests/integration/task-lifecycle.test.ts
```

## Stack

- **Runtime/package manager**: bun (ESM-only, Node 22+ target)
- **CLI framework**: Commander.js
- **YAML**: `yaml` package
- **Colors**: picocolors
- **Build**: tsup (adds shebang, outputs ESM to `dist/`)
- **Lint/format**: Biome (2-space indent, recommended rules)

## Process 
Do not add `.jobdone` folder to `.gitignore`, as these files should be tracked.
