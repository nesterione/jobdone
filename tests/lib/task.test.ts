import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  extractDescription,
  getNextTaskIndex,
  moveTask,
  parseFrontMatter,
  readAllTasks,
  titleFromFilename,
  toKebabCase,
} from "../../src/lib/task.js";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "jobdone-task-test-"));
  // Create .jobdone/tasks/{todo,doing,done}
  for (const status of ["todo", "doing", "done"]) {
    await fs.mkdir(path.join(tmpDir, ".jobdone", "tasks", status), {
      recursive: true,
    });
  }
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("parseFrontMatter", () => {
  test("parses YAML front matter and body", () => {
    const content = `---
title: My Task
priority: high
created: 2026-01-15
---

## Description

Some text here.
`;
    const result = parseFrontMatter(content);
    expect(result.data.title).toBe("My Task");
    expect(result.data.priority).toBe("high");
    expect(result.body).toContain("Some text here.");
  });

  test("returns empty data when no front matter", () => {
    const content = "Just some markdown text.";
    const result = parseFrontMatter(content);
    expect(result.data).toEqual({});
    expect(result.body).toBe("Just some markdown text.");
  });
});

describe("titleFromFilename", () => {
  test("converts kebab-case to title case", () => {
    expect(titleFromFilename("my-cool-task.md")).toBe("My Cool Task");
  });

  test("converts snake_case to title case", () => {
    expect(titleFromFilename("fix_login_bug.md")).toBe("Fix Login Bug");
  });

  test("handles mixed separators", () => {
    expect(titleFromFilename("add-new_feature.md")).toBe("Add New Feature");
  });
});

describe("extractDescription", () => {
  test("extracts text lines, skipping headers and checkboxes", () => {
    const body = `
## Description

This is a task description.

## Acceptance Criteria

- [ ] First thing
`;
    expect(extractDescription(body)).toBe("This is a task description.");
  });

  test("returns empty string for header-only content", () => {
    const body = `## Description\n\n<!-- comment -->\n`;
    expect(extractDescription(body)).toBe("");
  });
});

describe("readAllTasks", () => {
  test("reads tasks from status directories", async () => {
    const taskContent = `---
title: Test Task
priority: high
created: 2026-01-15
---

## Description

Do the thing.
`;
    await fs.writeFile(
      path.join(tmpDir, ".jobdone", "tasks", "todo", "test-task.md"),
      taskContent,
    );

    const grouped = await readAllTasks(tmpDir, ["todo", "doing", "done"]);

    expect(grouped.todo).toHaveLength(1);
    expect(grouped.todo[0].title).toBe("Test Task");
    expect(grouped.todo[0].priority).toBe("high");
    expect(grouped.todo[0].filename).toBe("test-task.md");
    expect(grouped.doing).toHaveLength(0);
    expect(grouped.done).toHaveLength(0);
  });

  test("derives title from filename when not in front matter", async () => {
    await fs.writeFile(
      path.join(tmpDir, ".jobdone", "tasks", "doing", "setup-ci.md"),
      "---\npriority: low\n---\n\nSome content.",
    );

    const grouped = await readAllTasks(tmpDir, ["todo", "doing", "done"]);
    expect(grouped.doing[0].title).toBe("Setup Ci");
  });

  test("skips non-md files", async () => {
    await fs.writeFile(
      path.join(tmpDir, ".jobdone", "tasks", "todo", "notes.txt"),
      "not a task",
    );

    const grouped = await readAllTasks(tmpDir, ["todo", "doing", "done"]);
    expect(grouped.todo).toHaveLength(0);
  });
});

describe("toKebabCase", () => {
  test("converts simple title", () => {
    expect(toKebabCase("My New Task")).toBe("my-new-task");
  });

  test("handles special characters", () => {
    expect(toKebabCase("Fix bug #123 (urgent!)")).toBe("fix-bug-123-urgent");
  });

  test("collapses multiple spaces and hyphens", () => {
    expect(toKebabCase("too   many   spaces")).toBe("too-many-spaces");
  });

  test("returns empty string for non-alphanumeric input", () => {
    expect(toKebabCase("!!!")).toBe("");
  });
});

describe("getNextTaskIndex", () => {
  test("returns 1 when no tasks exist", async () => {
    const index = await getNextTaskIndex(tmpDir, ["todo", "doing", "done"]);
    expect(index).toBe(1);
  });

  test("finds max index across all directories", async () => {
    await fs.writeFile(
      path.join(tmpDir, ".jobdone", "tasks", "todo", "2-task-a.md"),
      "---\ntitle: A\n---\n",
    );
    await fs.writeFile(
      path.join(tmpDir, ".jobdone", "tasks", "done", "7-task-b.md"),
      "---\ntitle: B\n---\n",
    );

    const index = await getNextTaskIndex(tmpDir, ["todo", "doing", "done"]);
    expect(index).toBe(8);
  });

  test("ignores non-md and non-numeric files", async () => {
    await fs.writeFile(
      path.join(tmpDir, ".jobdone", "tasks", "todo", "notes.txt"),
      "not a task",
    );
    await fs.writeFile(
      path.join(tmpDir, ".jobdone", "tasks", "todo", "no-number.md"),
      "---\ntitle: X\n---\n",
    );

    const index = await getNextTaskIndex(tmpDir, ["todo", "doing", "done"]);
    expect(index).toBe(1);
  });
});

describe("moveTask", () => {
  test("moves a file between status directories", async () => {
    const taskPath = path.join(
      tmpDir,
      ".jobdone",
      "tasks",
      "todo",
      "my-task.md",
    );
    await fs.writeFile(taskPath, "---\ntitle: Move me\n---\n");

    await moveTask(tmpDir, "my-task.md", "todo", "doing");

    const srcExists = await fs
      .access(taskPath)
      .then(() => true)
      .catch(() => false);
    expect(srcExists).toBe(false);

    const destPath = path.join(
      tmpDir,
      ".jobdone",
      "tasks",
      "doing",
      "my-task.md",
    );
    const destExists = await fs
      .access(destPath)
      .then(() => true)
      .catch(() => false);
    expect(destExists).toBe(true);
  });
});
