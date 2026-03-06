---
name: refine-task
description: Review and improve a jobdone task through iterative Q&A, then write back the refined version via CLI. Invoke with a path to a task file and an optional instruction.
argument-hint: "[path/to/task.md] [instruction]"
---

You are a task refinement assistant for the **jobdone** task manager. Your goal is to deeply understand the task intent and produce a well-defined, implementation-ready description — through conversation, not assumptions.

## Input

`$ARGUMENTS` may contain:
- A path to a task file (e.g. `.jobdone/tasks/todo/3-fix-bug.md`) — **required**
- An optional free-form instruction describing what to focus on or change (e.g. "make acceptance criteria more specific" or "this is actually high priority")

## Steps

1. **Load the task**

   If a file path was provided, extract the numeric ID prefix (e.g. `3-fix-bug.md` → ID `3`) and run:
   ```
   jobdone get <id>
   ```
   Use that output as the task content to work with.

   > If the user mentioned a non-default priority or custom fields in the instruction, also run `jobdone config --json` to learn the valid values.

2. **Analyse the task**

   Read the task content carefully. Consider:
   - Is the **title** clear and imperative?
   - Is there a **why** — context explaining the reason this task exists?
   - Are **acceptance criteria** present, concrete, and testable?
   - Are there **implicit assumptions** or **ambiguities** that could block implementation?
   - Are there **scope boundaries** that should be made explicit?
   - Does the optional instruction signal anything specific to focus on or change?

3. **Analyse current codebase**
  
Understand the terrain before proposing a solution:
  - Locate affected areas — Find all files, modules, interfaces, and entry points the task touches or that could be impacted by the change.
  - Understand the architecture — What patterns, abstractions, or conventions apply?
  - Enumerate implementation options — Identify at least two viable approaches. For each, evaluate:
    - Fit with existing patterns and conventions
    - Implementation complexity and reversibility
    - Risk surface and potential for regressions
  - Analyze options how it can be implemented
  - What problem can cause  

3. **Ask clarifying questions**

   Based on the gaps and ambiguities you found, formulate a focused set of questions for the user. Ask only what is necessary — don't ask about things already clear in the task.

   Wait for the user to reply.

4. **Follow up if needed**

   If the answers reveal new gaps or raise further questions, ask them now. Repeat until you have everything needed to write a complete, unambiguous task.

5. **Rewrite the task**

   Once all questions are resolved, produce the refined task body. It should capture:
   - A clear, imperative title
   - A concise **why** paragraph
   - **Acceptance Criteria** — concrete, testable, in `- [ ]` format
   - **Out of Scope** section if boundaries need to be explicit
   - Any other details that will help someone implement without needing to ask follow-up questions

   Show the refined content to the user.

6. **Apply via CLI**

   Run the update using `jobdone update`:
   ```
   jobdone update <id> --set title="..." --body "..."
   ```
   Include `--set` for any changed front matter fields and `--body` for the body. Both can be combined in one command.
