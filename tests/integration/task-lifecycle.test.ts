import { afterEach, beforeEach, describe, expect, test } from "bun:test";
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

describe("task lifecycle", () => {
  test("create → get → update priority → move to doing → move to done", () => {
    // Create
    const createResult = runCli(["create", "Ship the feature"], tmpDir);
    expect(createResult.exitCode).toBe(0);
    expect(createResult.stdout.toString()).toContain("1-ship-the-feature.md");

    // Get verifies state written by create
    const getResult = runCli(["get", "1"], tmpDir);
    expect(getResult.exitCode).toBe(0);
    const task = JSON.parse(getResult.stdout.toString());
    expect(task.id).toBe(1);
    expect(task.title).toBe("Ship the feature");
    expect(task.status).toBe("todo");
    expect(task.priority).toBe("medium");

    // Update priority
    const updateResult = runCli(
      ["update", "1", "--set", "priority=high"],
      tmpDir,
    );
    expect(updateResult.exitCode).toBe(0);

    // Get verifies update was persisted
    const getAfterUpdate = runCli(["get", "1"], tmpDir);
    expect(getAfterUpdate.exitCode).toBe(0);
    const updated = JSON.parse(getAfterUpdate.stdout.toString());
    expect(updated.priority).toBe("high");
    expect(updated.status).toBe("todo");

    // Move to doing
    const moveDoing = runCli(
      ["move", "1-ship-the-feature.md", "doing"],
      tmpDir,
    );
    expect(moveDoing.exitCode).toBe(0);
    expect(moveDoing.stdout.toString()).toContain("todo → doing");

    // List reflects doing status
    const listAfterDoing = runCli(["list", "--json"], tmpDir);
    const listData = JSON.parse(listAfterDoing.stdout.toString());
    expect(listData.tasks.doing).toHaveLength(1);
    expect(listData.tasks.todo).toHaveLength(0);

    // Move to done
    const moveDone = runCli(
      ["move", "1-ship-the-feature.md", "done"],
      tmpDir,
    );
    expect(moveDone.exitCode).toBe(0);
    expect(moveDone.stdout.toString()).toContain("doing → done");

    // List reflects done status
    const listAfterDone = runCli(["list", "--json"], tmpDir);
    const finalList = JSON.parse(listAfterDone.stdout.toString());
    expect(finalList.tasks.done).toHaveLength(1);
    expect(finalList.tasks.doing).toHaveLength(0);
  });

  test("body content is preserved through move", async () => {
    // Create then update body
    runCli(["create", "Body task"], tmpDir);
    const updateResult = runCli(
      ["update", "1", "--body", "## Notes\n\nImportant detail here.\n"],
      tmpDir,
    );
    expect(updateResult.exitCode).toBe(0);

    // Move to doing
    runCli(["move", "1-body-task.md", "doing"], tmpDir);

    // Get after move — body should survive rename
    const getResult = runCli(["get", "1"], tmpDir);
    expect(getResult.exitCode).toBe(0);
    const task = JSON.parse(getResult.stdout.toString());
    expect(task.status).toBe("doing");
    expect(task.body).toContain("Important detail here.");
  });

  test("moving one task does not affect other tasks' lookupability", () => {
    runCli(["create", "Task Alpha"], tmpDir);
    runCli(["create", "Task Beta"], tmpDir);
    runCli(["create", "Task Gamma"], tmpDir);

    // Move task 2 to done
    const moveResult = runCli(["move", "2-task-beta.md", "done"], tmpDir);
    expect(moveResult.exitCode).toBe(0);

    // Tasks 1 and 3 are still accessible by ID
    const get1 = runCli(["get", "1"], tmpDir);
    expect(get1.exitCode).toBe(0);
    const task1 = JSON.parse(get1.stdout.toString());
    expect(task1.title).toBe("Task Alpha");
    expect(task1.status).toBe("todo");

    const get3 = runCli(["get", "3"], tmpDir);
    expect(get3.exitCode).toBe(0);
    const task3 = JSON.parse(get3.stdout.toString());
    expect(task3.title).toBe("Task Gamma");
    expect(task3.status).toBe("todo");
  });
});
