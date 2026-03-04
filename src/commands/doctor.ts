import fs from "node:fs/promises";
import path from "node:path";
import type { Command } from "commander";
import pc from "picocolors";
import { loadConfig } from "../lib/config.js";
import { getJobdonePath, getTasksPath } from "../lib/paths.js";
import { toKebabCase } from "../lib/task.js";

interface TaskEntry {
  status: string;
  filename: string;
  id: number | null;
  mtime: Date;
}

export function registerDoctorCommand(program: Command): void {
  program
    .command("doctor")
    .description(
      "Scan task folders for issues (duplicate IDs, missing prefixes)",
    )
    .option("--fix", "Automatically rename files to resolve issues")
    .action(async (opts: { fix?: boolean }) => {
      const cwd = process.cwd();
      const jobdonePath = getJobdonePath(cwd);

      const exists = await fs
        .access(jobdonePath)
        .then(() => true)
        .catch(() => false);

      if (!exists) {
        console.error(
          pc.red("Error: .jobdone/ not found. Run `jobdone init` first."),
        );
        process.exitCode = 1;
        return;
      }

      const config = await loadConfig(cwd);
      const tasksPath = getTasksPath(cwd);

      console.log("Scanning tasks...");

      // Collect all task entries
      const entries: TaskEntry[] = [];

      for (const status of config.fields.status ?? []) {
        const dirPath = path.join(tasksPath, status);
        let files: string[];
        try {
          files = await fs.readdir(dirPath);
        } catch {
          continue;
        }

        for (const filename of files) {
          if (!filename.endsWith(".md")) continue;
          const filePath = path.join(dirPath, filename);
          const stat = await fs.stat(filePath);
          const match = filename.match(/^(\d+)-/);
          entries.push({
            status,
            filename,
            id: match ? Number.parseInt(match[1], 10) : null,
            mtime: stat.mtime,
          });
        }
      }

      // Find duplicates: group by id, filter groups with more than one entry
      const byId = new Map<number, TaskEntry[]>();
      for (const entry of entries) {
        if (entry.id === null) continue;
        const group = byId.get(entry.id) ?? [];
        group.push(entry);
        byId.set(entry.id, group);
      }

      const duplicateGroups = [...byId.values()].filter((g) => g.length > 1);
      const noPrefixFiles = entries.filter((e) => e.id === null);

      const issueCount = duplicateGroups.length + noPrefixFiles.length;

      if (issueCount === 0) {
        console.log(pc.green("✓ No issues found."));
        return;
      }

      if (!opts.fix) {
        // Report only
        for (const group of duplicateGroups) {
          const fileList = group
            .map((e) => `${e.status}/${e.filename}`)
            .join(", ");
          console.log(pc.red(`✗ Duplicate ID ${group[0].id}: ${fileList}`));
        }
        for (const entry of noPrefixFiles) {
          console.log(
            pc.red(`✗ No-prefix file: ${entry.status}/${entry.filename}`),
          );
        }
        console.log(
          `\n${issueCount} issue(s) found. Run \`jobdone doctor --fix\` to resolve automatically.`,
        );
        process.exitCode = 1;
        return;
      }

      // --fix mode: compute max existing ID and allocate new IDs
      const maxExistingId = Math.max(0, ...[...byId.keys()]);
      let nextId = maxExistingId + 1;

      // Fix duplicates: oldest by mtime keeps ID, newer ones get new IDs
      for (const group of duplicateGroups) {
        const sorted = [...group].sort(
          (a, b) => a.mtime.getTime() - b.mtime.getTime(),
        );
        const [kept, ...conflicting] = sorted;

        const keptDisplay = `${kept.status}/${kept.filename}`;
        const conflictParts = conflicting.map((entry) => {
          const slugMatch = entry.filename.match(/^\d+-(.+)$/);
          const slug = slugMatch
            ? slugMatch[1]
            : toKebabCase(entry.filename.replace(/\.md$/, ""));
          const newFilename = `${nextId}-${slug}`;
          const oldPath = path.join(tasksPath, entry.status, entry.filename);
          const newPath = path.join(tasksPath, entry.status, newFilename);
          const display = `${entry.status}/${entry.filename} → ${newFilename}`;
          nextId++;
          return { oldPath, newPath, display };
        });

        const conflictDisplay = conflictParts.map((c) => c.display).join(", ");
        console.log(
          pc.yellow(
            `✗ Duplicate ID ${group[0].id}: ${keptDisplay} (kept), ${conflictDisplay}`,
          ),
        );

        for (const { oldPath, newPath } of conflictParts) {
          await fs.rename(oldPath, newPath);
        }
      }

      // Fix no-prefix files
      for (const entry of noPrefixFiles) {
        const stem = entry.filename.replace(/\.md$/, "");
        const slug = toKebabCase(stem) || stem;
        const newFilename = `${nextId}-${slug}.md`;
        const oldPath = path.join(tasksPath, entry.status, entry.filename);
        const newPath = path.join(tasksPath, entry.status, newFilename);
        console.log(
          pc.yellow(
            `✗ No-prefix file: ${entry.status}/${entry.filename} → ${newFilename}`,
          ),
        );
        await fs.rename(oldPath, newPath);
        nextId++;
      }

      console.log(`\n${issueCount} issue(s) fixed.`);
    });
}
