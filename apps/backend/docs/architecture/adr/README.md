# ADR Writing Guide

This directory contains Architecture Decision Records.

An ADR documents an important architectural decision that should remain understandable after the original discussion is forgotten.

ADRs are not general documentation. They exist to preserve decisions, context, trade-offs, and consequences.

## When to Write an ADR

Write an ADR when a decision affects module boundaries, persistence design, public APIs, integration patterns, deployment shape, long-term invariants, or behavior that future changes must preserve.

Good ADR topics include:

```text
Choosing which module owns a concept or table
Changing aggregate boundaries
Introducing a snapshot model
Changing cross-module communication rules
Choosing an integration strategy with an external provider
Changing authentication/session architecture
Changing deployment or infrastructure shape
Introducing a new persistence pattern
Accepting a known trade-off or limitation
Documenting an intentional exception to normal architecture rules
```

Do not write an ADR for routine implementation details, simple refactors, small bug fixes, formatting choices, local naming decisions, or code that is already obvious from the implementation.

## ADR Naming

Use this file name format:

```text
NNNN-short-kebab-case-title.md
```

Examples:

```text
0001-rental-commitment-owns-asset-blocks.md
0002-confirmed-rentals-store-price-snapshots.md
0003-tenant-context-resolved-by-backend.md
```

Numbers are sequential and must not be reused.

Use short names. The title should describe the decision, not the task.

## ADR Status

Each ADR must have one status:

```text
Proposed
Accepted
Superseded
Deprecated
```

Use `Proposed` when the decision is being discussed.

Use `Accepted` when the decision is the current architecture.

Use `Superseded` when a newer ADR replaces it.

Use `Deprecated` when the decision is no longer recommended but still explains historical context.

When superseding an ADR, do not delete the old file. Mark it as `Superseded` and link to the newer ADR.

## ADR Structure

Use this structure for every ADR:

```md
# NNNN. Decision Title

## Status

Accepted

## Date

YYYY-MM-DD

## Context

## Decision

## Consequences

## Alternatives Considered

## Implementation Notes

## Related Documents
```

Keep ADRs concise. Most ADRs should be one to three pages.

## Section Guidelines

### Title

The title should state the decision clearly.

Prefer:

```text
Rental Commitment Owns Rental-Created Asset Blocks
```

Avoid:

```text
AssetBlock Refactor
```

The title should remain meaningful after the implementation details change.

### Status

Use one of the allowed statuses.

```md
## Status

Accepted
```

When an ADR is superseded, write:

```md
## Status

Superseded by [0007-new-decision-title.md](0007-new-decision-title.md)
```

### Date

Use the date when the decision was accepted or proposed.

```md
## Date

2026-07-08
```

### Context

Explain the problem, constraints, and forces that led to the decision.

Context should answer:

```text
What problem are we solving?
What was unclear or disputed?
Which modules, tables, or workflows are affected?
What constraints shaped the decision?
What would go wrong if future agents ignored this?
```

Do not include a long history of the conversation. Include only the information needed to understand the decision.

### Decision

State the decision directly.

This section should be the clearest part of the ADR.

Prefer:

```md
Rental Commitment owns rental-created `AssetBlock` records.

Asset Inventory owns physical asset metadata and assignment eligibility, but it does not own rental-created blocks.

A block exists because a rental has committed an asset for a period, so the block belongs to the rental commitment lifecycle.
```

Avoid vague wording such as:

```md
We should probably keep blocks close to rentals for now.
```

The decision should be explicit enough that an agent can preserve it during future changes.

### Consequences

Explain what becomes easier, what becomes harder, and what rules follow from the decision.

Include both positive and negative consequences.

Good consequences include:

```text
Which module owns the invariant
Which module other modules must call
Which tables must not be mutated directly
Which future changes become easier or harder
Which trade-offs were accepted
Which risks remain
```

Do not pretend the decision has no downside.

### Alternatives Considered

List serious alternatives and why they were not chosen.

Keep this section short.

Example:

```md
### Alternative: Asset Inventory owns all asset blocks

This would centralize all availability records inside Asset Inventory.

It was rejected because rental-created blocks are part of the rental commitment lifecycle. Rental Commitment must preserve which rental committed which assets for which period.
```

Do not include weak alternatives that were never realistic.

### Implementation Notes

Include implementation guidance only when it helps preserve the decision.

Good implementation notes include:

```text
Public API boundaries
Owned Prisma models
Required snapshots
Migration implications
Known exceptions
Testing expectations
```

Do not document every file, function, DTO, or method. The code remains the source of truth for implementation details.

### Related Documents

Link to module docs, database map sections, previous ADRs, and relevant public API files.

Examples:

```md
## Related Documents

- `docs/architecture/overview.md`
- `docs/modules/rental-commitment.md`
- `docs/modules/asset-inventory.md`
- `rental-physical-assignments.public-api.ts`
```

## Writing Rules

Write ADRs in present-tense architectural language.

Prefer “Rental Commitment owns...” over “We decided that Rental Commitment should own...”.

Be specific about module ownership.

Be specific about what other modules must not do.

Do not duplicate the Prisma schema column by column.

Do not duplicate public API files. Reference the public API file instead.

Do not use ADRs as implementation task lists.

Do not remove old ADRs because they are outdated. Supersede or deprecate them.

Do not write ADRs to justify every small refactor.

## Good ADRs Should Answer

Every ADR should make these questions easy to answer:

```text
What decision was made?
Why was this decision necessary?
What alternatives were rejected?
Which modules are affected?
Which invariants must future changes preserve?
What are the consequences?
Where should an agent look next?
```

## ADR Template

Copy this template when creating a new ADR.

```md
# NNNN. Decision Title

## Status

Proposed

## Date

YYYY-MM-DD

## Context

Describe the architectural problem, affected modules, constraints, and why this decision needs to be recorded.

## Decision

State the decision directly.

Describe ownership, boundaries, allowed dependencies, and the rule future changes must preserve.

## Consequences

Describe the positive and negative consequences of this decision.

Include any new constraints this creates for modules, persistence, public APIs, tests, or migrations.

## Alternatives Considered

### Alternative: First alternative

Explain why this alternative was not chosen.

### Alternative: Second alternative

Explain why this alternative was not chosen.

## Implementation Notes

Add only the implementation details needed to preserve the decision.

Reference source-of-truth files instead of duplicating them.

## Related Documents

- `docs/architecture/overview.md`
- `docs/modules/<module>.md`
- `<module>.public-api.ts`
```

## Example ADR

```md
# 0001. Rental Commitment Owns Rental-Created Asset Blocks

## Status

Accepted

## Date

2026-07-08

## Context

Depiqo needs to prevent the same physical asset from being committed to overlapping rentals.

Asset Inventory owns the physical truth about equipment: equipment types, physical assets, ownership, condition, location, active state, and assignment eligibility.

Rental Commitment owns rental orders as operational commitments. A confirmed rental must preserve which assets were assigned and blocked for the rental period.

The unclear boundary was whether `AssetBlock` should belong to Asset Inventory because it affects availability, or to Rental Commitment because it exists due to a rental commitment.

## Decision

Rental Commitment owns rental-created `AssetBlock` records.

Asset Inventory owns physical asset metadata and assignment eligibility, but it does not own rental-created blocks.

A rental-created block represents that a rental has committed a specific asset for a specific period. Because the block is part of the rental lifecycle and historical commitment, it belongs to Rental Commitment.

## Consequences

Rental Commitment is responsible for creating, releasing, and preserving rental-created blocks according to rental lifecycle rules.

Asset Inventory may be used to validate asset existence, tenant ownership, equipment type compatibility, active state, and assignment eligibility.

Other modules must not create, update, or delete rental-created blocks directly.

Future non-rental availability concepts, such as maintenance holds or manual inventory blocks, must be modeled intentionally. They should not be added to Rental Commitment unless they are part of a rental commitment.

The availability query model may need to combine rental-created blocks with future non-rental availability records.

## Alternatives Considered

### Alternative: Asset Inventory owns all asset blocks

This would centralize all availability records inside Asset Inventory.

It was rejected because rental-created blocks are part of the rental commitment lifecycle. Rental Commitment must preserve which rental committed which assets for which period.

### Alternative: Shared ownership

This was rejected because shared ownership creates unclear mutation rules. A block must have one owning module.

## Implementation Notes

Rental Commitment documentation must list `AssetBlock` as owned persistence.

Asset Inventory documentation must say it owns asset metadata and assignment eligibility, but not rental-created blocks.

Cross-module access should use public APIs. Other modules must not mutate `AssetBlock` through Prisma delegates directly.

## Related Documents

- `docs/architecture/overview.md`
- `docs/modules/rental-commitment.md`
- `docs/modules/asset-inventory.md`
```
