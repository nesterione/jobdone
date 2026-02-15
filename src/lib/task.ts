import fs from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { getTasksPath } from "./paths.js";

export interface Task {
  filename: string;
  status: string;
  title: string;
  priority: string;
  created: string;
  description: string;
  raw: string;
}

export interface GroupedTasks {
  [status: string]: Task[];
}

export function parseFrontMatter(content: string): {
  data: Record<string, unknown>;
  body: string;
} {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { data: {}, body: content };
  }
  const data = parseYaml(match[1]) ?? {};
  return { data, body: match[2] };
}

export function titleFromFilename(filename: string): string {
  return filename
    .replace(/\.md$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function extractDescription(body: string): string {
  const lines = body.split("\n");
  const textLines: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#") || trimmed.startsWith("<!--") || !trimmed) {
      continue;
    }
    if (trimmed.startsWith("- [ ]") || trimmed.startsWith("- [x]")) {
      continue;
    }
    textLines.push(trimmed);
    if (textLines.length >= 2) break;
  }
  return textLines.join(" ").slice(0, 120);
}

async function readTaskFile(
  filePath: string,
  filename: string,
  status: string,
): Promise<Task> {
  const raw = await fs.readFile(filePath, "utf-8");
  const { data, body } = parseFrontMatter(raw);

  return {
    filename,
    status,
    title: (data.title as string) || titleFromFilename(filename),
    priority: (data.priority as string) || "medium",
    created: (data.created as string) || "",
    description: extractDescription(body),
    raw,
  };
}

export async function readAllTasks(
  cwd: string,
  statuses: string[],
): Promise<GroupedTasks> {
  const tasksPath = getTasksPath(cwd);
  const result: GroupedTasks = {};

  for (const status of statuses) {
    result[status] = [];
    const dirPath = path.join(tasksPath, status);
    let entries: string[];
    try {
      entries = await fs.readdir(dirPath);
    } catch {
      continue;
    }

    const mdFiles = entries.filter((f) => f.endsWith(".md"));
    for (const filename of mdFiles) {
      const filePath = path.join(dirPath, filename);
      const task = await readTaskFile(filePath, filename, status);
      result[status].push(task);
    }
  }

  return result;
}

export async function moveTask(
  cwd: string,
  filename: string,
  from: string,
  to: string,
): Promise<void> {
  const tasksPath = getTasksPath(cwd);
  const srcPath = path.join(tasksPath, from, filename);
  const destPath = path.join(tasksPath, to, filename);

  await fs.mkdir(path.join(tasksPath, to), { recursive: true });
  await fs.rename(srcPath, destPath);
}
