import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { getTasksPath } from "../../src/lib/paths.js";
import {
  cleanupWorkspace,
  createInitializedWorkspace,
  runCli,
} from "./helpers.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await createInitializedWorkspace();
});

afterEach(async () => {
  await cleanupWorkspace(tmpDir);
});

describe("title rename continuity", () => {
  test("rename → get by ID returns new title, old filename absent", async () => {
    runCli(["create", "Original title"], tmpDir);

    const updateResult = runCli(
      ["update", "1", "--set", "title=Renamed title"],
      tmpDir,
    );
    expect(updateResult.exitCode).toBe(0);

    // Old filename should not exist
    const oldPath = path.join(
      getTasksPath(tmpDir),
      "todo",
      "1-original-title.md",
    );
    const oldExists = await fs
      .access(oldPath)
      .then(() => true)
      .catch(() => false);
    expect(oldExists).toBe(false);

    // Get by ID should still work and return new title
    const getResult = runCli(["get", "1"], tmpDir);
    expect(getResult.exitCode).toBe(0);
    const task = JSON.parse(getResult.stdout.toString());
    expect(task.title).toBe("Renamed title");
    expect(task.filename).toBe("1-renamed-title.md");

    // List shows new filename
    const listResult = runCli(["list", "--json"], tmpDir);
    const listData = JSON.parse(listResult.stdout.toString());
    expect(listData.tasks.todo[0].filename).toBe("1-renamed-title.md");
  });

  test("rename → move with new filename succeeds", () => {
    runCli(["create", "Before rename"], tmpDir);

    runCli(["update", "1", "--set", "title=After rename"], tmpDir);

    // Move using the new filename
    const moveResult = runCli(
      ["move", "1-after-rename.md", "doing"],
      tmpDir,
    );
    expect(moveResult.exitCode).toBe(0);
    expect(moveResult.stdout.toString()).toContain("todo → doing");

    // Get by ID confirms new status
    const getResult = runCli(["get", "1"], tmpDir);
    expect(getResult.exitCode).toBe(0);
    const task = JSON.parse(getResult.stdout.toString());
    expect(task.status).toBe("doing");
    expect(task.title).toBe("After rename");
  });

  test("move with stale (old) filename fails with not found", () => {
    runCli(["create", "Stale test task"], tmpDir);

    // Rename the task
    runCli(["update", "1", "--set", "title=New stale test task"], tmpDir);

    // Attempt to move using the old filename
    const moveResult = runCli(
      ["move", "1-stale-test-task.md", "doing"],
      tmpDir,
    );
    expect(moveResult.exitCode).toBe(1);
    expect(moveResult.stderr.toString()).toContain("not found");
  });
});
