import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { parse } from "yaml";
import { DEFAULT_CONFIG, serializeConfig } from "../../src/lib/config.js";
import { getConfigPath, getJobdonePath, getTasksPath } from "../../src/lib/paths.js";

const PROJECT_ROOT = path.resolve(import.meta.dir, "../..");
const ENTRY = path.join(PROJECT_ROOT, "src/index.ts");

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "jobdone-test-"));
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

describe("init command", () => {
  test("creates the expected folder structure", async () => {
    const result = runCli(["init"], tmpDir);

    expect(result.exitCode).toBe(0);

    const jobdonePath = getJobdonePath(tmpDir);
    const stat = await fs.stat(jobdonePath);
    expect(stat.isDirectory()).toBe(true);

    for (const status of DEFAULT_CONFIG.statuses) {
      const statusDir = path.join(getTasksPath(tmpDir), status);
      const statusStat = await fs.stat(statusDir);
      expect(statusStat.isDirectory()).toBe(true);
    }
  });

  test("writes valid YAML config", async () => {
    runCli(["init"], tmpDir);

    const configPath = getConfigPath(tmpDir);
    const content = await fs.readFile(configPath, "utf-8");
    const parsed = parse(content);

    expect(parsed.statuses).toEqual(DEFAULT_CONFIG.statuses);
    expect(parsed.defaults.priority).toBe(DEFAULT_CONFIG.defaults.priority);
    expect(parsed.defaults.template).toBe(DEFAULT_CONFIG.defaults.template);
  });

  test("fails gracefully if .jobdone/ already exists", async () => {
    const jobdonePath = getJobdonePath(tmpDir);
    await fs.mkdir(jobdonePath, { recursive: true });

    const result = runCli(["init"], tmpDir);

    expect(result.exitCode).toBe(1);
    const stderr = result.stderr.toString();
    expect(stderr).toContain("already exists");
  });
});

describe("config", () => {
  test("serializeConfig produces valid YAML", () => {
    const yaml = serializeConfig(DEFAULT_CONFIG);
    const parsed = parse(yaml);
    expect(parsed.statuses).toEqual(DEFAULT_CONFIG.statuses);
    expect(parsed.defaults.priority).toBe("medium");
  });
});

describe("paths", () => {
  test("getJobdonePath resolves correctly", () => {
    expect(getJobdonePath("/foo")).toBe("/foo/.jobdone");
  });

  test("getTasksPath resolves correctly", () => {
    expect(getTasksPath("/foo")).toBe("/foo/.jobdone/tasks");
  });

  test("getConfigPath resolves correctly", () => {
    expect(getConfigPath("/foo")).toBe("/foo/.jobdone/config.yaml");
  });
});
