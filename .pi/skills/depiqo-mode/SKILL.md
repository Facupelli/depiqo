---
name: depiqo-mode
description: Engineering workflow for developing Depiqo. Use when explicitly invoked by the user.
---

# Depiqo Mode

## Execution

Restate the user's goal and identify the scope of the task.

Read the matching playbook in full. Copy its steps into the todo list before adding task-specific steps.

Track all agreed requirements as task-specific todos.
Keep the todo list updated throughout execution.

Continue until all agreed requirements are implemented and verified, unless blocked.

If no todo list tool is available, maintain an explicit checklist instead.

## Playbooks

- Feature: adding or changing system behavior.
  Read `playbooks/feature.md`.

If no playbook matches, report that the task is not supported by this mode yet.

## Skill triggers

Load the corresponding skill when a situation matches its trigger.

- Understanding an existing subsystem before modifying it: `how`.

## Engineering principles

When a principle applies, read its full SKILL.md before making the relevant decision.

Principle skills are located in sibling directories.

- Model the Domain (`principle-model-the-domain`):
  designing stateful or complex business logic.

- Redesign from First Principles
  (`principle-redesign-from-first-principles`):
  integrating a new requirement into an existing design.

- Prove It Works (`principle-prove-it-works`):
  before declaring work complete.

## Autonomy

Proceed independently on reversible decisions within the requested scope.

Ask before irreversible operations or when a missing business requirement materially affects correctness.

## Final report

Reconcile the todo list with the user's original goal.

Report:

- The original goal.
- What changed.
- How the result was verified.
- Remaining work and blockers, if any.
- Which principles were applied and which specific
  decisions they influenced.

Only name principles whose full SKILL.md was read during this session.
