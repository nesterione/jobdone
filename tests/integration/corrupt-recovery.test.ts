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

async function writeTask(
  dir: string,
  status: string,
  filename: string,
  content = "---\ntitle: Test\n---\n",
): Promise<void> {
  await fs.writeFile(
    path.join(getTasksPath(dir), status, filename),
    content,
    "utf-8",
  );
}

describe("corrupt workspace recovery", () => {
  test("duplicate ID: doctor reports, fix resolves, create continues with next ID", async () => {
    // Create task 1 normally
    runCli(["create", "Original task"], tmpDir);

    // Move it to done
    runCli(["move", "1-original-task.md", "done"], tmpDir);

    // Inject a duplicate ID 1 in todo
    await writeTask(tmpDir, "todo", "1-duplicate-task.md", "---\ntitle: Duplicate\n---\n");

    // Doctor should report the duplicate
    const doctorResult = runCli(["doctor"], tmpDir);
    expect(doctorResult.exitCode).toBe(1);
    expect(doctorResult.stdout.toString()).toContain("Duplicate ID 1");

    // Fix it
    const fixResult = runCli(["doctor", "--fix"], tmpDir);
    expect(fixResult.exitCode).toBe(0);
    expect(fixResult.stdout.toString()).toContain("issue(s) fixed");

    // Doctor should now be clean
    const doctorAfterFix = runCli(["doctor"], tmpDir);
    expect(doctorAfterFix.exitCode).toBe(0);
    expect(doctorAfterFix.stdout.toString()).toContain("No issues found");

    // New create should get ID ≥ 3 (not reuse 1 or 2)
    const createResult = runCli(["create", "New task after fix"], tmpDir);
    expect(createResult.exitCode).toBe(0);
    const stdout = createResult.stdout.toString();
    // Extract the task ID from the filename in the output
    const match = stdout.match(/(\d+)-new-task-after-fix\.md/);
    expect(match).not.toBeNull();
    const newId = Number.parseInt(match![1], 10);
    expect(newId).toBeGreaterThanOrEqual(3);
  });

  test("no-prefix file: fix gives it an ID, create continues after that", async () => {
    runCli(["create", "Task One"], tmpDir);
    runCli(["create", "Task Two"], tmpDir);

    // Inject a file without ID prefix
    await writeTask(tmpDir, "todo", "orphan.md", "---\ntitle: Orphan\n---\n");

    // Doctor reports no-prefix issue
    const doctorResult = runCli(["doctor"], tmpDir);
    expect(doctorResult.exitCode).toBe(1);
    expect(doctorResult.stdout.toString()).toContain("No-prefix file");
    expect(doctorResult.stdout.toString()).toContain("orphan.md");

    // Fix it
    const fixResult = runCli(["doctor", "--fix"], tmpDir);
    expect(fixResult.exitCode).toBe(0);

    // Orphan should now have a numeric prefix
    const todoFiles = await fs.readdir(
      path.join(getTasksPath(tmpDir), "todo"),
    );
    const renamedOrphan = todoFiles.find((f) => f.match(/^\d+-orphan\.md$/));
    expect(renamedOrphan).toBeDefined();
    expect(renamedOrphan).not.toBe("orphan.md");

    // New create gets ID higher than all existing ones
    const createResult = runCli(["create", "Task after repair"], tmpDir);
    expect(createResult.exitCode).toBe(0);
    const match = createResult.stdout
      .toString()
      .match(/(\d+)-task-after-repair\.md/);
    expect(match).not.toBeNull();
    const newId = Number.parseInt(match![1], 10);
    // orphan was assigned ID 3; next should be 4+
    expect(newId).toBeGreaterThanOrEqual(4);
  });

  test("multiple issues fixed, original tasks still accessible by ID after fix", async () => {
    runCli(["create", "Alpha"], tmpDir);
    runCli(["create", "Beta"], tmpDir);

    // Inject a duplicate of ID 1 in done, and a no-prefix file
    await writeTask(tmpDir, "done", "1-alpha-duplicate.md", "---\ntitle: Alpha Dup\n---\n");
    await writeTask(tmpDir, "todo", "noprefix.md", "---\ntitle: No Prefix\n---\n");

    // Doctor reports 2 issues
    const doctorResult = runCli(["doctor"], tmpDir);
    expect(doctorResult.exitCode).toBe(1);
    expect(doctorResult.stdout.toString()).toContain("2 issue(s) found");

    // Fix all
    const fixResult = runCli(["doctor", "--fix"], tmpDir);
    expect(fixResult.exitCode).toBe(0);
    expect(fixResult.stdout.toString()).toContain("2 issue(s) fixed");

    // Doctor is now clean
    const doctorAfterFix = runCli(["doctor"], tmpDir);
    expect(doctorAfterFix.exitCode).toBe(0);

    // Original tasks 1 and 2 should still be accessible
    const get1 = runCli(["get", "1"], tmpDir);
    expect(get1.exitCode).toBe(0);
    // The kept file (original task 1 in todo) should still be title Alpha
    const task1 = JSON.parse(get1.stdout.toString());
    expect(task1.title).toBe("Alpha");

    const get2 = runCli(["get", "2"], tmpDir);
    expect(get2.exitCode).toBe(0);
    const task2 = JSON.parse(get2.stdout.toString());
    expect(task2.title).toBe("Beta");

    // update and move still work after recovery
    const updateResult = runCli(
      ["update", "2", "--set", "priority=high"],
      tmpDir,
    );
    expect(updateResult.exitCode).toBe(0);

    const moveResult = runCli(["move", "2-beta.md", "doing"], tmpDir);
    expect(moveResult.exitCode).toBe(0);

    const listResult = runCli(["list", "--json"], tmpDir);
    const listData = JSON.parse(listResult.stdout.toString());
    expect(listData.tasks.doing).toHaveLength(1);
    expect(listData.tasks.doing[0].filename).toBe("2-beta.md");
  });
});
