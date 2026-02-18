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
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "jobdone-update-test-"));
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

const TASK_CONTENT =
  "---\ntitle: Fix Bug\npriority: medium\ncreated: 15.02.2026\n---\n\n## Description\n\nOriginal content.\n";

describe("update command", () => {
  test("updates title and renames file", async () => {
    await fs.writeFile(
      path.join(getTasksPath(tmpDir), "todo", "1-fix-bug.md"),
      TASK_CONTENT,
    );

    const result = runCli(["update", "1", "--set", "title=New Title"], tmpDir);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toContain("Updated task 1");

    // Old file should be gone, new file should exist
    await expect(
      fs.stat(path.join(getTasksPath(tmpDir), "todo", "1-fix-bug.md")),
    ).rejects.toThrow();
    const newFile = path.join(
      getTasksPath(tmpDir),
      "todo",
      "1-new-title.md",
    );
    const content = await fs.readFile(newFile, "utf-8");
    expect(content).toContain("title: New Title");
  });

  test("updates priority", async () => {
    await fs.writeFile(
      path.join(getTasksPath(tmpDir), "todo", "1-fix-bug.md"),
      TASK_CONTENT,
    );

    const result = runCli(
      ["update", "1", "--set", "priority=high"],
      tmpDir,
    );
    expect(result.exitCode).toBe(0);

    const content = await fs.readFile(
      path.join(getTasksPath(tmpDir), "todo", "1-fix-bug.md"),
      "utf-8",
    );
    expect(content).toContain("priority: high");
  });

  test("updates body content", async () => {
    await fs.writeFile(
      path.join(getTasksPath(tmpDir), "todo", "1-fix-bug.md"),
      TASK_CONTENT,
    );

    const result = runCli(
      ["update", "1", "--body", "New body content."],
      tmpDir,
    );
    expect(result.exitCode).toBe(0);

    const content = await fs.readFile(
      path.join(getTasksPath(tmpDir), "todo", "1-fix-bug.md"),
      "utf-8",
    );
    expect(content).toContain("New body content.");
    expect(content).not.toContain("Original content.");
  });

  test("rejects invalid priority", async () => {
    await fs.writeFile(
      path.join(getTasksPath(tmpDir), "todo", "1-fix-bug.md"),
      TASK_CONTENT,
    );

    const result = runCli(
      ["update", "1", "--set", "priority=invalid"],
      tmpDir,
    );
    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain("Invalid priority");
  });

  test("stores custom field in front matter", async () => {
    await fs.writeFile(
      path.join(getTasksPath(tmpDir), "todo", "1-fix-bug.md"),
      TASK_CONTENT,
    );

    const result = runCli(["update", "1", "--set", "type=bug"], tmpDir);
    expect(result.exitCode).toBe(0);

    const content = await fs.readFile(
      path.join(getTasksPath(tmpDir), "todo", "1-fix-bug.md"),
      "utf-8",
    );
    expect(content).toContain("type: bug");
  });

  test("fails with no updates provided", () => {
    const result = runCli(["update", "1"], tmpDir);
    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain("at least one update");
  });

  test("fails when task not found", () => {
    const result = runCli(
      ["update", "999", "--set", "priority=high"],
      tmpDir,
    );
    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain("not found");
  });
});
