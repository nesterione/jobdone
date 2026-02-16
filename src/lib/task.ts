import fs from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import type { JobdoneConfig } from "./config.js";
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

export function toKebabCase(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function getNextTaskIndex(
  cwd: string,
  statuses: string[],
): Promise<number> {
  const tasksPath = getTasksPath(cwd);
  let maxIndex = 0;

  for (const status of statuses) {
    const dirPath = path.join(tasksPath, status);
    let entries: string[];
    try {
      entries = await fs.readdir(dirPath);
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.endsWith(".md")) continue;
      const match = entry.match(/^(\d+)-/);
      if (match) {
        const index = Number.parseInt(match[1], 10);
        if (index > maxIndex) maxIndex = index;
      }
    }
  }

  return maxIndex + 1;
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

export interface CreateTaskResult {
  filename: string;
  relativePath: string;
}

export async function createTask(options: {
  cwd: string;
  title: string;
  priority?: string;
  config: JobdoneConfig;
}): Promise<CreateTaskResult> {
  const { cwd, title, config } = options;

  const slug = toKebabCase(title);
  if (!slug) {
    throw new Error("Title produces an empty slug.");
  }

  const nextIndex = await getNextTaskIndex(cwd, config.statuses);
  const filename = `${nextIndex}-${slug}.md`;

  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  const dateStr = `${dd}.${mm}.${yyyy}`;

  const priority = options.priority ?? config.defaults.priority;

  const content = config.defaults.template
    .replace("{{ title }}", title)
    .replace("{{ priority }}", priority)
    .replace("{{ date }}", dateStr);

  const initialStatus = config.statuses[0];
  const statusDir = path.join(getTasksPath(cwd), initialStatus);
  await fs.mkdir(statusDir, { recursive: true });

  const filePath = path.join(statusDir, filename);
  await fs.writeFile(filePath, content, "utf-8");

  const relativePath = `.jobdone/tasks/${initialStatus}/${filename}`;
  return { filename, relativePath };
}
