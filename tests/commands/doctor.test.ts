import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { DEFAULT_CONFIG, serializeConfig } from "../../src/lib/config.js";
import {
  getConfigPath,
  getTasksPath,
  getJobdonePath,
} from "../../src/lib/paths.js";

const PROJECT_ROOT = path.resolve(import.meta.dir, "../..");
const ENTRY = path.join(PROJECT_ROOT, "src/index.ts");

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "jobdone-doctor-test-"));
  const tasksPath = getTasksPath(tmpDir);
  for (const status of DEFAULT_CONFIG.fields.status) {
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

async function writeTask(status: string, filename: string, content = "---\ntitle: Test\n---\n") {
  const filePath = path.join(getTasksPath(tmpDir), status, filename);
  await fs.writeFile(filePath, content, "utf-8");
  return filePath;
}

describe("doctor command", () => {
  test("clean repo exits 0 and reports no issues", () => {
    const result = runCli(["doctor"], tmpDir);

    expect(result.exitCode).toBe(0);
    const stdout = result.stdout.toString();
    expect(stdout).toContain("No issues found");
  });

  test("clean repo with tasks exits 0", async () => {
    await writeTask("todo", "1-task-a.md");
    await writeTask("doing", "2-task-b.md");
    await writeTask("done", "3-task-c.md");

    const result = runCli(["doctor"], tmpDir);

    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toContain("No issues found");
  });

  test("duplicate ID exits 1 and reports both files", async () => {
    await writeTask("todo", "5-old-task.md");
    await writeTask("done", "5-newer-task.md");

    const result = runCli(["doctor"], tmpDir);

    expect(result.exitCode).toBe(1);
    const stdout = result.stdout.toString();
    expect(stdout).toContain("Duplicate ID 5");
    expect(stdout).toContain("todo/5-old-task.md");
    expect(stdout).toContain("done/5-newer-task.md");
    expect(stdout).toContain("jobdone doctor --fix");
  });

  test("no-prefix file exits 1 and reports the file", async () => {
    await writeTask("todo", "untitled-task.md");

    const result = runCli(["doctor"], tmpDir);

    expect(result.exitCode).toBe(1);
    const stdout = result.stdout.toString();
    expect(stdout).toContain("No-prefix file");
    expect(stdout).toContain("todo/untitled-task.md");
  });

  test("doctor --fix on duplicate: renames newer file, exits 0", async () => {
    const olderPath = await writeTask("todo", "5-old-task.md");
    // ensure mtime difference
    await new Promise((r) => setTimeout(r, 10));
    const newerPath = await writeTask("done", "5-newer-task.md");

    // Touch older file to make sure it has earlier mtime
    const oldStat = await fs.stat(olderPath);
    const newStat = await fs.stat(newerPath);
    // The newer file should have a later mtime; if not, adjust
    if (oldStat.mtime >= newStat.mtime) {
      // Force mtime by rewriting
      await fs.writeFile(newerPath, "---\ntitle: Test\n---\n", "utf-8");
    }

    const result = runCli(["doctor", "--fix"], tmpDir);

    expect(result.exitCode).toBe(0);
    const stdout = result.stdout.toString();
    expect(stdout).toContain("issue(s) fixed");

    // Original file (older) should still exist
    const oldExists = await fs
      .access(olderPath)
      .then(() => true)
      .catch(() => false);
    expect(oldExists).toBe(true);

    // Newer file should have been renamed (original path gone)
    const newerExists = await fs
      .access(newerPath)
      .then(() => true)
      .catch(() => false);
    expect(newerExists).toBe(false);

    // A new file with a different ID should exist in done/
    const doneDir = path.join(getTasksPath(tmpDir), "done");
    const files = await fs.readdir(doneDir);
    const renamed = files.find((f) => f !== "5-newer-task.md" && f.endsWith(".md"));
    expect(renamed).toBeDefined();
    expect(renamed).toMatch(/^\d+-newer-task\.md$/);
  });

  test("doctor --fix on no-prefix file: file gets renamed with next ID, exits 0", async () => {
    await writeTask("todo", "1-existing.md");
    const noPrefix = await writeTask("todo", "untitled-task.md");

    const result = runCli(["doctor", "--fix"], tmpDir);

    expect(result.exitCode).toBe(0);
    const stdout = result.stdout.toString();
    expect(stdout).toContain("issue(s) fixed");
    expect(stdout).toContain("untitled-task.md");

    // Original no-prefix file should be gone
    const stillExists = await fs
      .access(noPrefix)
      .then(() => true)
      .catch(() => false);
    expect(stillExists).toBe(false);

    // A prefixed file should now exist in todo/
    const todoDir = path.join(getTasksPath(tmpDir), "todo");
    const files = await fs.readdir(todoDir);
    const renamed = files.find((f) => f.match(/^\d+-untitled-task\.md$/));
    expect(renamed).toBeDefined();
  });

  test("multiple issues: all reported without --fix", async () => {
    await writeTask("todo", "3-task-a.md");
    await writeTask("done", "3-task-b.md");
    await writeTask("todo", "no-prefix.md");

    const result = runCli(["doctor"], tmpDir);

    expect(result.exitCode).toBe(1);
    const stdout = result.stdout.toString();
    expect(stdout).toContain("Duplicate ID 3");
    expect(stdout).toContain("No-prefix file");
    expect(stdout).toContain("2 issue(s) found");
  });

  test("multiple issues: all fixed with --fix", async () => {
    await writeTask("todo", "3-task-a.md");
    await new Promise((r) => setTimeout(r, 10));
    await writeTask("done", "3-task-b.md");
    await writeTask("todo", "no-prefix.md");

    const result = runCli(["doctor", "--fix"], tmpDir);

    expect(result.exitCode).toBe(0);
    const stdout = result.stdout.toString();
    expect(stdout).toContain("2 issue(s) fixed");

    // Run doctor again — should be clean
    const secondResult = runCli(["doctor"], tmpDir);
    expect(secondResult.exitCode).toBe(0);
    expect(secondResult.stdout.toString()).toContain("No issues found");
  });

  test("fails if .jobdone/ is missing", async () => {
    const emptyDir = path.join(tmpDir, "empty");
    await fs.mkdir(emptyDir, { recursive: true });

    const result = runCli(["doctor"], emptyDir);

    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain(".jobdone/ not found");
  });
});
