import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { parse, stringify } from "yaml";
import {
  CURRENT_CONFIG_VERSION,
  DEFAULT_CONFIG,
  migrateConfig,
} from "../../src/lib/config.js";
import {
  getConfigPath,
  getJobdonePath,
  getTasksPath,
} from "../../src/lib/paths.js";

const PROJECT_ROOT = path.resolve(import.meta.dir, "../..");
const ENTRY = path.join(PROJECT_ROOT, "src/index.ts");

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "jobdone-migrate-test-"));
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

async function initJobdone(
  dir: string,
  configContent: string,
  createFolders: string[] = [],
) {
  const jobdonePath = getJobdonePath(dir);
  await fs.mkdir(jobdonePath, { recursive: true });
  await fs.writeFile(getConfigPath(dir), configContent, "utf-8");
  for (const folder of createFolders) {
    await fs.mkdir(path.join(getTasksPath(dir), folder), { recursive: true });
  }
}

describe("migrate command", () => {
  test("fails without .jobdone/", async () => {
    const result = runCli(["migrate"], tmpDir);

    expect(result.exitCode).toBe(1);
    const stderr = result.stderr.toString();
    expect(stderr).toContain(".jobdone/ not found");
  });

  test("migrates v0 config with only statuses and defaults", async () => {
    const v0Config = stringify({
      statuses: ["todo", "doing", "done"],
      defaults: {
        priority: "medium",
        template: "custom template",
      },
    });
    await initJobdone(tmpDir, v0Config, ["todo", "doing", "done"]);

    const result = runCli(["migrate"], tmpDir);

    expect(result.exitCode).toBe(0);
    const stdout = result.stdout.toString();
    expect(stdout).toContain("Migration complete");
    expect(stdout).toContain("priorities");

    const configContent = await fs.readFile(getConfigPath(tmpDir), "utf-8");
    const config = parse(configContent);
    expect(config.version).toBe(1);
    expect(config.priorities).toEqual(["low", "medium", "high"]);
    expect(config.defaults.template).toBe("custom template");
  });

  test("migrates empty config — fills all fields from defaults", async () => {
    await initJobdone(tmpDir, "", ["todo", "doing", "done"]);

    const result = runCli(["migrate"], tmpDir);

    expect(result.exitCode).toBe(0);

    const configContent = await fs.readFile(getConfigPath(tmpDir), "utf-8");
    const config = parse(configContent);
    expect(config.version).toBe(1);
    expect(config.statuses).toEqual(DEFAULT_CONFIG.statuses);
    expect(config.priorities).toEqual(DEFAULT_CONFIG.priorities);
    expect(config.defaults.priority).toBe(DEFAULT_CONFIG.defaults.priority);
    expect(config.defaults.template).toBe(DEFAULT_CONFIG.defaults.template);
  });

  test("preserves custom statuses and priorities", async () => {
    const customConfig = stringify({
      statuses: ["backlog", "active", "shipped"],
      priorities: ["p0", "p1", "p2", "p3"],
      defaults: {
        priority: "p1",
        template: "my template",
      },
    });
    await initJobdone(tmpDir, customConfig, ["backlog", "active", "shipped"]);

    const result = runCli(["migrate"], tmpDir);

    expect(result.exitCode).toBe(0);

    const configContent = await fs.readFile(getConfigPath(tmpDir), "utf-8");
    const config = parse(configContent);
    expect(config.version).toBe(1);
    expect(config.statuses).toEqual(["backlog", "active", "shipped"]);
    expect(config.priorities).toEqual(["p0", "p1", "p2", "p3"]);
    expect(config.defaults.priority).toBe("p1");
    expect(config.defaults.template).toBe("my template");
  });

  test("preserves custom template", async () => {
    const customTemplate = "---\ntitle: {{ title }}\n---\nCustom body";
    const configYaml = stringify({
      statuses: ["todo", "doing", "done"],
      defaults: {
        priority: "high",
        template: customTemplate,
      },
    });
    await initJobdone(tmpDir, configYaml, ["todo", "doing", "done"]);

    const result = runCli(["migrate"], tmpDir);

    expect(result.exitCode).toBe(0);

    const configContent = await fs.readFile(getConfigPath(tmpDir), "utf-8");
    const config = parse(configContent);
    expect(config.defaults.template).toBe(customTemplate);
  });

  test("idempotent — v1 config shows nothing to migrate", async () => {
    const v1Config = stringify({
      version: 1,
      statuses: ["todo", "doing", "done"],
      priorities: ["low", "medium", "high"],
      defaults: {
        priority: "medium",
        template: "template",
      },
    });
    await initJobdone(tmpDir, v1Config, ["todo", "doing", "done"]);

    const configBefore = await fs.readFile(getConfigPath(tmpDir), "utf-8");
    const result = runCli(["migrate"], tmpDir);

    expect(result.exitCode).toBe(0);
    const stdout = result.stdout.toString();
    expect(stdout).toContain("Nothing to migrate");

    const configAfter = await fs.readFile(getConfigPath(tmpDir), "utf-8");
    expect(configAfter).toBe(configBefore);
  });

  test("creates missing status folders", async () => {
    const v0Config = stringify({
      statuses: ["todo", "doing", "done", "review"],
    });
    // Only create the .jobdone dir, no task folders
    await initJobdone(tmpDir, v0Config);

    const result = runCli(["migrate"], tmpDir);

    expect(result.exitCode).toBe(0);
    const stdout = result.stdout.toString();

    for (const status of ["todo", "doing", "done", "review"]) {
      const folderPath = path.join(getTasksPath(tmpDir), status);
      const stat = await fs.stat(folderPath);
      expect(stat.isDirectory()).toBe(true);
    }

    expect(stdout).toContain("Created folder");
  });

  test("reports changes in stdout", async () => {
    await initJobdone(tmpDir, "", ["todo", "doing", "done"]);

    const result = runCli(["migrate"], tmpDir);

    expect(result.exitCode).toBe(0);
    const stdout = result.stdout.toString();
    expect(stdout).toContain("Migration complete");
    expect(stdout).toContain("statuses");
    expect(stdout).toContain("priorities");
    expect(stdout).toContain("version");
  });
});

describe("migrateConfig unit tests", () => {
  test("migrates empty object", () => {
    const { config, changes } = migrateConfig({});

    expect(config.version).toBe(1);
    expect(config.statuses).toEqual(DEFAULT_CONFIG.statuses);
    expect(config.priorities).toEqual(DEFAULT_CONFIG.priorities);
    expect((config.defaults as Record<string, unknown>).priority).toBe(
      DEFAULT_CONFIG.defaults.priority,
    );
    expect(changes.length).toBeGreaterThan(0);
  });

  test("migrates partial config", () => {
    const { config, changes } = migrateConfig({
      statuses: ["a", "b"],
    });

    expect(config.version).toBe(1);
    expect(config.statuses).toEqual(["a", "b"]);
    expect(config.priorities).toEqual(DEFAULT_CONFIG.priorities);
    expect(changes.length).toBeGreaterThan(0);
  });

  test("returns no changes for current version", () => {
    const { config, changes } = migrateConfig({
      version: CURRENT_CONFIG_VERSION,
      statuses: ["x"],
      priorities: ["y"],
      defaults: { priority: "y", template: "t" },
    });

    expect(changes).toEqual([]);
    expect(config.version).toBe(CURRENT_CONFIG_VERSION);
  });
});
