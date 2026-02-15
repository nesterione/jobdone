import path from "node:path";

const JOBDONE_DIR = ".jobdone";

export function getJobdonePath(cwd: string = process.cwd()): string {
  return path.join(cwd, JOBDONE_DIR);
}

export function getTasksPath(cwd: string = process.cwd()): string {
  return path.join(cwd, JOBDONE_DIR, "tasks");
}

export function getConfigPath(cwd: string = process.cwd()): string {
  return path.join(cwd, JOBDONE_DIR, "config.yaml");
}
