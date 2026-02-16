import fs from "node:fs/promises";
import { parse, stringify } from "yaml";
import { getConfigPath } from "./paths.js";

export const CURRENT_CONFIG_VERSION = 1;

export interface JobdoneConfig {
  version: number;
  statuses: string[];
  priorities: string[];
  defaults: {
    priority: string;
    template: string;
  };
}

export const DEFAULT_CONFIG: JobdoneConfig = {
  version: CURRENT_CONFIG_VERSION,
  statuses: ["todo", "doing", "done"],
  priorities: ["low", "medium", "high"],
  defaults: {
    priority: "medium",
    template: `---
title: {{ title }}
priority: {{ priority }}
created: {{ date }}
---

## Description

<!-- What needs to be done? -->

## Acceptance Criteria

- [ ] ...
`,
  },
};

export function serializeConfig(config: JobdoneConfig): string {
  return stringify(config);
}

export async function loadConfig(cwd: string): Promise<JobdoneConfig> {
  const configPath = getConfigPath(cwd);
  try {
    const content = await fs.readFile(configPath, "utf-8");
    const parsed = parse(content) as Partial<JobdoneConfig>;
    return {
      version: parsed.version ?? CURRENT_CONFIG_VERSION,
      statuses: parsed.statuses ?? DEFAULT_CONFIG.statuses,
      priorities: parsed.priorities ?? DEFAULT_CONFIG.priorities,
      defaults: {
        priority: parsed.defaults?.priority ?? DEFAULT_CONFIG.defaults.priority,
        template: parsed.defaults?.template ?? DEFAULT_CONFIG.defaults.template,
      },
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function loadRawConfig(
  cwd: string,
): Promise<Record<string, unknown>> {
  const configPath = getConfigPath(cwd);
  const content = await fs.readFile(configPath, "utf-8");
  return (parse(content) ?? {}) as Record<string, unknown>;
}

export interface MigrationResult {
  config: Record<string, unknown>;
  changes: string[];
}

type MigrationFn = (raw: Record<string, unknown>) => MigrationResult;

function migrateV0toV1(raw: Record<string, unknown>): MigrationResult {
  const changes: string[] = [];
  const config = { ...raw };

  if (!config.statuses) {
    config.statuses = DEFAULT_CONFIG.statuses;
    changes.push("Added default statuses: todo, doing, done");
  }

  if (!config.priorities) {
    config.priorities = DEFAULT_CONFIG.priorities;
    changes.push("Added default priorities: low, medium, high");
  }

  const defaults = (config.defaults ?? {}) as Record<string, unknown>;
  const newDefaults = { ...defaults };

  if (!newDefaults.priority) {
    newDefaults.priority = DEFAULT_CONFIG.defaults.priority;
    changes.push("Added default priority: medium");
  }

  if (!newDefaults.template) {
    newDefaults.template = DEFAULT_CONFIG.defaults.template;
    changes.push("Added default template");
  }

  config.defaults = newDefaults;
  config.version = 1;
  changes.push("Set config version to 1");

  return { config, changes };
}

const MIGRATIONS: MigrationFn[] = [migrateV0toV1];

export function migrateConfig(raw: Record<string, unknown>): MigrationResult {
  const currentVersion = typeof raw.version === "number" ? raw.version : 0;

  if (currentVersion >= CURRENT_CONFIG_VERSION) {
    return { config: raw, changes: [] };
  }

  let config = { ...raw };
  const allChanges: string[] = [];

  for (let v = currentVersion; v < CURRENT_CONFIG_VERSION; v++) {
    const result = MIGRATIONS[v](config);
    config = result.config;
    allChanges.push(...result.changes);
  }

  return { config, changes: allChanges };
}
