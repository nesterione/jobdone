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
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "jobdone-move-test-"));
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

describe("move command", () => {
  test("moves a task from todo to doing", async () => {
    await fs.writeFile(
      path.join(getTasksPath(tmpDir), "todo", "1-fix-bug.md"),
      "---\ntitle: Fix bug\npriority: high\ncreated: 15.02.2026\n---\n",
    );

    const result = runCli(["move", "1-fix-bug.md", "doing"], tmpDir);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toContain("todo → doing");

    // File should be in doing, not in todo
    const doingFile = path.join(getTasksPath(tmpDir), "doing", "1-fix-bug.md");
    const todoFile = path.join(getTasksPath(tmpDir), "todo", "1-fix-bug.md");
    expect(await fs.stat(doingFile).then(() => true)).toBe(true);
    await expect(fs.stat(todoFile)).rejects.toThrow();
  });

  test("moves a task from doing to done", async () => {
    await fs.writeFile(
      path.join(getTasksPath(tmpDir), "doing", "2-add-feature.md"),
      "---\ntitle: Add feature\npriority: medium\ncreated: 10.02.2026\n---\n",
    );

    const result = runCli(["move", "2-add-feature.md", "done"], tmpDir);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toContain("doing → done");
  });

  test("fails with invalid target status", async () => {
    await fs.writeFile(
      path.join(getTasksPath(tmpDir), "todo", "1-task.md"),
      "---\ntitle: Task\n---\n",
    );

    const result = runCli(["move", "1-task.md", "invalid"], tmpDir);
    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain("Invalid status");
  });

  test("fails when task is not found", async () => {
    const result = runCli(["move", "nonexistent.md", "doing"], tmpDir);
    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain("not found");
  });

  test("handles task already in target status", async () => {
    await fs.writeFile(
      path.join(getTasksPath(tmpDir), "doing", "1-task.md"),
      "---\ntitle: Task\n---\n",
    );

    const result = runCli(["move", "1-task.md", "doing"], tmpDir);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toContain("already in");
  });

  test("fails if .jobdone/ is missing", async () => {
    const emptyDir = path.join(tmpDir, "empty");
    await fs.mkdir(emptyDir, { recursive: true });

    const result = runCli(["move", "1-task.md", "doing"], emptyDir);
    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain(".jobdone/ not found");
  });

  test("fails with missing arguments", () => {
    const result = runCli(["move"], tmpDir);
    expect(result.exitCode).not.toBe(0);
  });
});
