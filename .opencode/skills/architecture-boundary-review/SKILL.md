---
name: architecture-boundary-review
description: >
  Reviews changes for architectural boundary problems across apps and shared packages.
  Use this skill when a change crosses modules, apps, or package boundaries.
---

# Architecture Boundary Review

Use this skill when a change risks violating intended structure.

## Review focus

- backend module public surfaces and bounded contexts
- web feature boundaries versus shared utilities
- shared package contract stability
- generated artifacts versus source-of-truth files

## Repository anchors

- root review expectations: `docs/agent-rules/review.md`
- backend boundaries: `apps/backend/docs/agent-rules/architecture.md`
- web boundaries: `apps/backoffice/docs/agent-rules/architecture.md`
- shared package rules: `packages/docs/agent-rules/shared-packages.md`
