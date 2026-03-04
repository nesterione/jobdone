import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DEFAULT_CONFIG, serializeConfig } from "../../src/lib/config.js";
import { getConfigPath, getTasksPath } from "../../src/lib/paths.js";

const PROJECT_ROOT = path.resolve(import.meta.dir, "../..");
export const ENTRY = path.join(PROJECT_ROOT, "src/index.ts");

export function runCli(args: string[], cwd: string) {
  return Bun.spawnSync(["bun", "run", ENTRY, ...args], {
    cwd,
    env: { ...process.env, PATH: process.env.PATH },
  });
}

// Programmatic setup (faster/deterministic) — init CLI is tested in fresh-setup.test.ts
export async function createInitializedWorkspace(): Promise<string> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "jobdone-int-"));
  await Promise.all(
    DEFAULT_CONFIG.fields.status.map((status) =>
      fs.mkdir(path.join(getTasksPath(tmpDir), status), { recursive: true }),
    ),
  );
  await fs.writeFile(getConfigPath(tmpDir), serializeConfig(DEFAULT_CONFIG), "utf-8");
  return tmpDir;
}

export async function cleanupWorkspace(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true });
}
