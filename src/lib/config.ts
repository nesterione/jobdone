import fs from "node:fs/promises";
import { parse, stringify } from "yaml";
import { getConfigPath } from "./paths.js";

export const CURRENT_CONFIG_VERSION = 2;

export interface JobdoneConfig {
  version: number;
  fields: Record<string, string[]>;
  defaults: {
    priority: string;
    template: string;
  };
}

export const DEFAULT_CONFIG: JobdoneConfig = {
  version: 2,
  fields: {
    status: ["todo", "doing", "done"],
    priority: ["low", "medium", "high"],
  },
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

export function validateField(
  fieldName: string,
  value: string,
  config: JobdoneConfig,
): string | null {
  const allowed = config.fields[fieldName];
  if (allowed && !allowed.includes(value)) {
    return `Invalid ${fieldName} "${value}". Must be one of: ${allowed.join(", ")}`;
  }
  return null;
}

export async function loadConfig(cwd: string): Promise<JobdoneConfig> {
  const configPath = getConfigPath(cwd);
  try {
    const content = await fs.readFile(configPath, "utf-8");
    const parsed = parse(content) as Record<string, unknown>;

    let fields: Record<string, string[]>;
    if (
      parsed.fields &&
      typeof parsed.fields === "object" &&
      !Array.isArray(parsed.fields)
    ) {
      fields = parsed.fields as Record<string, string[]>;
    } else {
      // Backward-compatible: build fields from legacy statuses/priorities
      fields = { ...DEFAULT_CONFIG.fields };
      if (Array.isArray(parsed.statuses)) fields.status = parsed.statuses;
      if (Array.isArray(parsed.priorities)) fields.priority = parsed.priorities;
    }

    const defaults = (parsed.defaults ?? {}) as Record<string, unknown>;
    return {
      version:
        typeof parsed.version === "number"
          ? parsed.version
          : CURRENT_CONFIG_VERSION,
      fields,
      defaults: {
        priority:
          typeof defaults.priority === "string"
            ? defaults.priority
            : DEFAULT_CONFIG.defaults.priority,
        template:
          typeof defaults.template === "string"
            ? defaults.template
            : DEFAULT_CONFIG.defaults.template,
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
    config.statuses = DEFAULT_CONFIG.fields.status;
    changes.push("Added default statuses: todo, doing, done");
  }

  if (!config.priorities) {
    config.priorities = DEFAULT_CONFIG.fields.priority;
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

function migrateV1toV2(raw: Record<string, unknown>): MigrationResult {
  const changes: string[] = [];
  const config = { ...raw };
  const fields = { ...((config.fields ?? {}) as Record<string, unknown>) };

  if (Array.isArray(config.statuses)) {
    fields.status = config.statuses;
    delete config.statuses;
    changes.push("Moved statuses → fields.status");
  } else if (!fields.status) {
    fields.status = DEFAULT_CONFIG.fields.status;
    changes.push("Added default fields.status");
  }

  if (Array.isArray(config.priorities)) {
    fields.priority = config.priorities;
    delete config.priorities;
    changes.push("Moved priorities → fields.priority");
  } else if (!fields.priority) {
    fields.priority = DEFAULT_CONFIG.fields.priority;
    changes.push("Added default fields.priority");
  }

  config.fields = fields;
  config.version = 2;
  changes.push("Set config version to 2");
  return { config, changes };
}

const MIGRATIONS: MigrationFn[] = [migrateV0toV1, migrateV1toV2];

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
