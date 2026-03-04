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
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "jobdone-config-test-"));
  const tasksPath = getTasksPath(tmpDir);
  for (const status of DEFAULT_CONFIG.fields.status) {
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

describe("config command", () => {
  test("shows config as YAML by default", () => {
    const result = runCli(["config"], tmpDir);
    expect(result.exitCode).toBe(0);

    const stdout = result.stdout.toString();
    expect(stdout).toContain("version:");
    expect(stdout).toContain("fields:");
    expect(stdout).toContain("priority:");
    expect(stdout).toContain("defaults:");
  });

  test("--json outputs valid JSON with expected shape", () => {
    const result = runCli(["config", "--json"], tmpDir);
    expect(result.exitCode).toBe(0);

    const output = JSON.parse(result.stdout.toString());
    expect(output.version).toBe(DEFAULT_CONFIG.version);
    expect(output.fields).toBeDefined();
    expect(output.fields.priority).toEqual(DEFAULT_CONFIG.fields.priority);
    expect(output.fields.status).toEqual(DEFAULT_CONFIG.fields.status);
    expect(output.defaults).toBeDefined();
    expect(output.defaults.priority).toBe(DEFAULT_CONFIG.defaults.priority);
    expect(typeof output.defaults.template).toBe("string");
  });

  test("errors if .jobdone/ not initialized", async () => {
    const emptyDir = path.join(tmpDir, "empty");
    await fs.mkdir(emptyDir, { recursive: true });

    const result = runCli(["config"], emptyDir);
    expect(result.exitCode).toBe(1);
    expect(result.stderr.toString()).toContain(".jobdone/ not found");
  });
});
