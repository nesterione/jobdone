import fs from "node:fs/promises";
import { parse, stringify } from "yaml";
import { getConfigPath } from "./paths.js";

export interface JobdoneConfig {
  statuses: string[];
  defaults: {
    priority: string;
    template: string;
  };
}

export const DEFAULT_CONFIG: JobdoneConfig = {
  statuses: ["todo", "doing", "done"],
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
      statuses: parsed.statuses ?? DEFAULT_CONFIG.statuses,
      defaults: {
        priority: parsed.defaults?.priority ?? DEFAULT_CONFIG.defaults.priority,
        template: parsed.defaults?.template ?? DEFAULT_CONFIG.defaults.template,
      },
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}
