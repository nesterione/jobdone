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
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "jobdone-get-test-"));
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

describe("get command", () => {
  test("gets task by ID and outputs valid JSON", async () => {
    await fs.writeFile(
      path.join(getTasksPath(tmpDir), "todo", "5-my-task.md"),
      "---\ntitle: My Task\npriority: high\ncreated: 15.02.2026\n---\n\n## Description\n\nSome content here.\n",
    );

    const result = runCli(["get", "5"], tmpDir);
    expect(result.exitCode).toBe(0);

    const output = JSON.parse(result.stdout.toString());
    expect(output.id).toBe(5);
    expect(output.title).toBe("My Task");
    expect(output.priority).toBe("high");
    expect(output.status).toBe("todo");
    expect(output.filename).toBe("5-my-task.md");
    expect(output.body).toContain("Some content here.");
    expect(output.frontMatter.title).toBe("My Task");
  });

  test("returns error for non-existent task", () => {
    const result = runCli(["get", "999"], tmpDir);
    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain("not found");
  });

  test("returns error for non-numeric ID", () => {
    const result = runCli(["get", "abc"], tmpDir);
    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain("positive number");
  });

  test("finds task in different status folders", async () => {
    await fs.writeFile(
      path.join(getTasksPath(tmpDir), "doing", "3-in-progress.md"),
      "---\ntitle: In Progress\npriority: medium\n---\n",
    );

    const result = runCli(["get", "3"], tmpDir);
    expect(result.exitCode).toBe(0);

    const output = JSON.parse(result.stdout.toString());
    expect(output.status).toBe("doing");
    expect(output.title).toBe("In Progress");
  });
});
