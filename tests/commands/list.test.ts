import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { DEFAULT_CONFIG, serializeConfig } from "../../src/lib/config.js";
import { getConfigPath, getTasksPath } from "../../src/lib/paths.js";

const PROJECT_ROOT = path.resolve(import.meta.dir, "../..");
const ENTRY = path.join(PROJECT_ROOT, "src/index.ts");

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "jobdone-list-test-"));
  const tasksPath = getTasksPath(tmpDir);
  for (const status of DEFAULT_CONFIG.statuses) {
    await fs.mkdir(path.join(tasksPath, status), { recursive: true });
  }
  const configPath = getConfigPath(tmpDir);
  await fs.writeFile(configPath, serializeConfig(DEFAULT_CONFIG), "utf-8");
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

function runCli(args: string[], cwd: string) {
  return Bun.spawnSync(["bun", "run", ENTRY, ...args], {
    cwd,
    env: { ...process.env, PATH: process.env.PATH },
  });
}

describe("list command", () => {
  test("outputs valid JSON with --json flag", async () => {
    await fs.writeFile(
      path.join(getTasksPath(tmpDir), "todo", "1-fix-bug.md"),
      "---\ntitle: Fix bug\npriority: high\ncreated: 15.02.2026\n---\n\n## Description\n\nSome bug details\n",
    );

    const result = runCli(["list", "--json"], tmpDir);
    expect(result.exitCode).toBe(0);

    const output = JSON.parse(result.stdout.toString());
    expect(output.statuses).toEqual(["todo", "doing", "done"]);
    expect(output.tasks.todo).toHaveLength(1);
    expect(output.tasks.todo[0].filename).toBe("1-fix-bug.md");
    expect(output.tasks.todo[0].title).toBe("Fix bug");
    expect(output.tasks.todo[0].priority).toBe("high");
    expect(output.tasks.todo[0].created).toBe("15.02.2026");
    expect(output.tasks.todo[0].body).toContain("## Description");
    expect(output.tasks.todo[0].status).toBe("todo");
    expect(output.tasks.doing).toHaveLength(0);
    expect(output.tasks.done).toHaveLength(0);
  });

  test("lists tasks across all statuses in JSON", async () => {
    await fs.writeFile(
      path.join(getTasksPath(tmpDir), "todo", "1-task-a.md"),
      "---\ntitle: Task A\npriority: low\ncreated: 01.01.2026\n---\n",
    );
    await fs.writeFile(
      path.join(getTasksPath(tmpDir), "doing", "2-task-b.md"),
      "---\ntitle: Task B\npriority: medium\ncreated: 02.01.2026\n---\n",
    );
    await fs.writeFile(
      path.join(getTasksPath(tmpDir), "done", "3-task-c.md"),
      "---\ntitle: Task C\npriority: high\ncreated: 03.01.2026\n---\n",
    );

    const result = runCli(["list", "--json"], tmpDir);
    expect(result.exitCode).toBe(0);

    const output = JSON.parse(result.stdout.toString());
    expect(output.tasks.todo).toHaveLength(1);
    expect(output.tasks.doing).toHaveLength(1);
    expect(output.tasks.done).toHaveLength(1);
  });

  test("outputs empty tasks when no tasks exist", async () => {
    const result = runCli(["list", "--json"], tmpDir);
    expect(result.exitCode).toBe(0);

    const output = JSON.parse(result.stdout.toString());
    expect(output.tasks.todo).toHaveLength(0);
    expect(output.tasks.doing).toHaveLength(0);
    expect(output.tasks.done).toHaveLength(0);
  });

  test("human-readable output without --json", async () => {
    await fs.writeFile(
      path.join(getTasksPath(tmpDir), "todo", "1-my-task.md"),
      "---\ntitle: My task\npriority: medium\ncreated: 10.02.2026\n---\n",
    );

    const result = runCli(["list"], tmpDir);
    expect(result.exitCode).toBe(0);

    const stdout = result.stdout.toString();
    expect(stdout).toContain("TODO");
    expect(stdout).toContain("1-my-task.md");
    expect(stdout).toContain("My task");
  });

  test("fails if .jobdone/ is missing", async () => {
    const emptyDir = path.join(tmpDir, "empty");
    await fs.mkdir(emptyDir, { recursive: true });

    const result = runCli(["list", "--json"], emptyDir);
    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain(".jobdone/ not found");
  });
});
