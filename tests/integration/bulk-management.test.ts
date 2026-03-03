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

describe("bulk task management", () => {
  test("create several tasks, list reflects all with correct priorities", () => {
    runCli(["create", "Low priority task", "--priority", "low"], tmpDir);
    runCli(["create", "Medium priority task"], tmpDir);
    runCli(["create", "High priority task", "--priority", "high"], tmpDir);

    const listResult = runCli(["list", "--json"], tmpDir);
    expect(listResult.exitCode).toBe(0);

    const data = JSON.parse(listResult.stdout.toString());
    expect(data.tasks.todo).toHaveLength(3);

    const titles = data.tasks.todo.map((t: { title: string }) => t.title);
    expect(titles).toContain("Low priority task");
    expect(titles).toContain("Medium priority task");
    expect(titles).toContain("High priority task");

    const priorities = Object.fromEntries(
      data.tasks.todo.map((t: { title: string; priority: string }) => [
        t.title,
        t.priority,
      ]),
    );
    expect(priorities["Low priority task"]).toBe("low");
    expect(priorities["Medium priority task"]).toBe("medium");
    expect(priorities["High priority task"]).toBe("high");
  });

  test("move tasks to different statuses, counts update correctly", () => {
    runCli(["create", "Task One"], tmpDir);
    runCli(["create", "Task Two"], tmpDir);
    runCli(["create", "Task Three"], tmpDir);
    runCli(["create", "Task Four"], tmpDir);

    runCli(["move", "1-task-one.md", "doing"], tmpDir);
    runCli(["move", "2-task-two.md", "doing"], tmpDir);
    runCli(["move", "3-task-three.md", "done"], tmpDir);
    // Task Four stays in todo

    const listResult = runCli(["list", "--json"], tmpDir);
    expect(listResult.exitCode).toBe(0);

    const data = JSON.parse(listResult.stdout.toString());
    expect(data.tasks.todo).toHaveLength(1);
    expect(data.tasks.doing).toHaveLength(2);
    expect(data.tasks.done).toHaveLength(1);

    expect(data.tasks.todo[0].filename).toBe("4-task-four.md");
  });

  test("IDs keep incrementing after tasks move to done (no ID reuse)", () => {
    // Create task 1, move it to done, then create two more
    runCli(["create", "First task"], tmpDir);
    runCli(["move", "1-first-task.md", "done"], tmpDir);

    runCli(["create", "Second task"], tmpDir);
    runCli(["create", "Third task"], tmpDir);

    const listResult = runCli(["list", "--json"], tmpDir);
    expect(listResult.exitCode).toBe(0);

    const data = JSON.parse(listResult.stdout.toString());

    // done has task 1
    expect(data.tasks.done).toHaveLength(1);
    expect(data.tasks.done[0].filename).toBe("1-first-task.md");

    // todo has tasks 2 and 3 (not 1 again)
    expect(data.tasks.todo).toHaveLength(2);
    const todoFilenames = data.tasks.todo.map((t: { filename: string }) => t.filename);
    expect(todoFilenames).toContain("2-second-task.md");
    expect(todoFilenames).toContain("3-third-task.md");

    // Verify by ID lookup
    const get2 = runCli(["get", "2"], tmpDir);
    expect(get2.exitCode).toBe(0);
    expect(JSON.parse(get2.stdout.toString()).title).toBe("Second task");

    const get3 = runCli(["get", "3"], tmpDir);
    expect(get3.exitCode).toBe(0);
    expect(JSON.parse(get3.stdout.toString()).title).toBe("Third task");
  });
});
