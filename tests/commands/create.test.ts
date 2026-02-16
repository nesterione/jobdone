import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { DEFAULT_CONFIG, serializeConfig } from "../../src/lib/config.js";
import {
  getConfigPath,
  getJobdonePath,
  getTasksPath,
} from "../../src/lib/paths.js";
import { parseFrontMatter } from "../../src/lib/task.js";

const PROJECT_ROOT = path.resolve(import.meta.dir, "../..");
const ENTRY = path.join(PROJECT_ROOT, "src/index.ts");

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "jobdone-create-test-"));
  // Initialize .jobdone structure
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

describe("create command", () => {
  test("creates a task file in todo/ with correct filename", async () => {
    const result = runCli(["create", "My new task"], tmpDir);

    expect(result.exitCode).toBe(0);
    const stdout = result.stdout.toString();
    expect(stdout).toContain("Created task:");
    expect(stdout).toContain(".jobdone/tasks/todo/1-my-new-task.md");

    const filePath = path.join(
      getTasksPath(tmpDir),
      "todo",
      "1-my-new-task.md",
    );
    const stat = await fs.stat(filePath);
    expect(stat.isFile()).toBe(true);
  });

  test("front matter has correct priority and date format", async () => {
    runCli(["create", "Test task"], tmpDir);

    const filePath = path.join(
      getTasksPath(tmpDir),
      "todo",
      "1-test-task.md",
    );
    const content = await fs.readFile(filePath, "utf-8");
    const { data } = parseFrontMatter(content);

    expect(data.title).toBe("Test task");
    expect(data.priority).toBe("medium");
    expect(data.created).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
  });

  test("index increments across all status folders", async () => {
    // Place existing tasks in different folders
    await fs.writeFile(
      path.join(getTasksPath(tmpDir), "done", "3-old-task.md"),
      "---\ntitle: Old\n---\n",
    );
    await fs.writeFile(
      path.join(getTasksPath(tmpDir), "doing", "5-active-task.md"),
      "---\ntitle: Active\n---\n",
    );

    const result = runCli(["create", "Next task"], tmpDir);

    expect(result.exitCode).toBe(0);
    const stdout = result.stdout.toString();
    expect(stdout).toContain("6-next-task.md");
  });

  test("--priority flag overrides default", async () => {
    runCli(["create", "Urgent fix", "--priority", "high"], tmpDir);

    const filePath = path.join(
      getTasksPath(tmpDir),
      "todo",
      "1-urgent-fix.md",
    );
    const content = await fs.readFile(filePath, "utf-8");
    const { data } = parseFrontMatter(content);

    expect(data.priority).toBe("high");
  });

  test("fails if .jobdone/ is missing", async () => {
    const emptyDir = path.join(tmpDir, "empty");
    await fs.mkdir(emptyDir, { recursive: true });

    const result = runCli(["create", "Some task"], emptyDir);

    expect(result.exitCode).toBe(1);
    const stderr = result.stderr.toString();
    expect(stderr).toContain(".jobdone/ not found");
  });

  test("handles special characters in title", async () => {
    const result = runCli(["create", "Fix bug #123 (urgent!)"], tmpDir);

    expect(result.exitCode).toBe(0);
    const stdout = result.stdout.toString();
    expect(stdout).toContain("1-fix-bug-123-urgent.md");
  });

  test("fails with missing title argument", () => {
    const result = runCli(["create"], tmpDir);

    expect(result.exitCode).not.toBe(0);
  });
});
