import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { stringify } from "yaml";
import { getConfigPath, getJobdonePath } from "../../src/lib/paths.js";
import { cleanupWorkspace, runCli } from "./helpers.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "jobdone-int-fresh-"));
});

afterEach(async () => {
  await cleanupWorkspace(tmpDir);
});

describe("fresh workspace setup", () => {
  test("cold start: init → create → list → get all work in sequence", () => {
    // Blank directory — no .jobdone yet
    const initResult = runCli(["init"], tmpDir);
    expect(initResult.exitCode).toBe(0);

    // Create a task in the freshly initialised workspace
    const createResult = runCli(["create", "First ever task"], tmpDir);
    expect(createResult.exitCode).toBe(0);
    expect(createResult.stdout.toString()).toContain("1-first-ever-task.md");

    // List should include it
    const listResult = runCli(["list", "--json"], tmpDir);
    expect(listResult.exitCode).toBe(0);
    const listData = JSON.parse(listResult.stdout.toString());
    expect(listData.tasks.todo).toHaveLength(1);
    expect(listData.tasks.todo[0].title).toBe("First ever task");

    // Get by ID works
    const getResult = runCli(["get", "1"], tmpDir);
    expect(getResult.exitCode).toBe(0);
    const task = JSON.parse(getResult.stdout.toString());
    expect(task.id).toBe(1);
    expect(task.title).toBe("First ever task");
    expect(task.status).toBe("todo");
  });

  test("init → overwrite config as v0 → migrate → create → get works", async () => {
    // Init to get the folder structure
    const initResult = runCli(["init"], tmpDir);
    expect(initResult.exitCode).toBe(0);

    // Overwrite config with v0 (no version field, no priorities)
    const v0Config = stringify({
      statuses: ["todo", "doing", "done"],
      defaults: {
        priority: "medium",
        template:
          "---\ntitle: {{ title }}\npriority: {{ priority }}\ncreated: {{ date }}\n---\n",
      },
    });
    await fs.writeFile(getConfigPath(tmpDir), v0Config, "utf-8");

    // Migrate
    const migrateResult = runCli(["migrate"], tmpDir);
    expect(migrateResult.exitCode).toBe(0);
    expect(migrateResult.stdout.toString()).toContain("Migration complete");

    // Create a task — migrated config should still support this
    const createResult = runCli(["create", "Post migration task"], tmpDir);
    expect(createResult.exitCode).toBe(0);

    // Get should work
    const getResult = runCli(["get", "1"], tmpDir);
    expect(getResult.exitCode).toBe(0);
    const task = JSON.parse(getResult.stdout.toString());
    expect(task.title).toBe("Post migration task");
    expect(task.priority).toBe("medium");
  });

  test("all commands fail consistently with .jobdone/ not found message when workspace is absent", () => {
    const blankDir = path.join(tmpDir, "blank");
    // Create the directory but do NOT init
    fs.mkdir(blankDir, { recursive: true });

    const commands: [string, string[]][] = [
      ["create", ["create", "Some task"]],
      ["list", ["list", "--json"]],
      ["get", ["get", "1"]],
      ["doctor", ["doctor"]],
    ];

    for (const [name, args] of commands) {
      const result = runCli(args, blankDir);
      expect(result.exitCode, `${name} should exit 1`).toBe(1);
      expect(
        result.stderr.toString(),
        `${name} should report .jobdone/ not found`,
      ).toContain(".jobdone/ not found");
    }
  });

  test("init fails when .jobdone/ already exists", async () => {
    // First init
    runCli(["init"], tmpDir);

    // Second init on same directory
    const secondInit = runCli(["init"], tmpDir);
    expect(secondInit.exitCode).toBe(1);
    expect(secondInit.stderr.toString()).toContain("already exists");
  });
});
