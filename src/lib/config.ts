import { stringify } from "yaml";

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
