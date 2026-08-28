# ADR Writing Guide

This directory contains Architecture Decision Records (ADRs).

An ADR records an important decision and, most importantly, **why that decision exists**.

ADRs are not general architecture documentation, implementation notes, task histories, or explanations of how the code works. Their purpose is to preserve decisions that future developers or agents might otherwise misunderstand or accidentally undo.

## When to Write an ADR

Write an ADR only when **all three** conditions are true:

1. **Hard to reverse** - changing the decision later would have meaningful cost.
2. **Surprising without context** - a future developer could reasonably look at the implementation and wonder why it works this way.
3. **The result of a real trade-off** - there were genuine alternatives and one was chosen for specific reasons.

If any of these conditions is missing, do not create an ADR.

An ADR is especially useful when somebody could otherwise "fix" intentional architecture because the reason behind it is no longer visible.

Typical ADR topics include:

```text
Module and bounded-context boundaries

Ownership of important domain concepts or persistence

Integration patterns between contexts

Persistence strategies and database choices with meaningful lock-in

Authentication or session architecture

Deployment or infrastructure choices that are expensive to reverse

Long-term invariants that application code must preserve

Deliberate deviations from the obvious implementation

Constraints that are important but not visible from the code

Rejected alternatives that future developers are likely to reconsider
```

Do not write ADRs for:

```text
Routine implementation details

Small refactors

Simple bug fixes

Naming or formatting decisions

Individual helper or library choices that are easy to replace

Implementation mechanics already clear from the code

Temporary plans or task lists
```

## ADR Location and Naming

ADRs live in:

```text
docs/architecture/adr/
```

Create the directory only when the first ADR is actually needed.

Use sequential numbering:

```text
0001-short-kebab-case-title.md
0002-short-kebab-case-title.md
0003-short-kebab-case-title.md
```

Scan the directory for the highest existing number and increment it.

Numbers must not be reused.

The file name and title should describe the **decision**, not the task that produced it.

Prefer:

```text
0004-rental-asset-reservation-concurrency-strategy.md
```

Avoid:

```text
0004-fix-rental-deadlock.md
```

The first remains meaningful after the implementation changes. The second describes an implementation event.

## ADR Format

Keep ADRs as small as the decision allows.

The default format is:

```md
# Short title of the decision

Explain the relevant context, what was decided, and why in one to three sentences.
```

That is enough for many ADRs.

The value of an ADR comes from preserving the decision and its reasoning, not from filling out a documentation template.

## Optional Detail

Add additional structure only when it preserves information that would otherwise be lost.

Useful optional sections include:

### Considered Options

Use this when rejected alternatives are important enough that somebody is likely to propose them again.

```md
## Considered Options

### Pessimistic locking

Rejected because ...

### Optimistic allocation with database enforcement

Chosen because ...
```

Do not list weak alternatives that were never seriously considered.

### Consequences

Use this when the decision creates non-obvious downstream rules, risks, or trade-offs.

```md
## Consequences

Concurrent confirmations can legitimately race during persistence.

A PostgreSQL exclusion violation represents a lost reservation race rather
than an unexpected database failure.
```

Include negative consequences when they matter. An ADR should not imply that the chosen design has no cost.

### Status

Status is optional and is mainly useful when a decision is later revisited.

For example:

```yaml
---
status: accepted
---
```

Useful values are:

```text
proposed
accepted
deprecated
superseded by ADR-NNNN
```

If a newer ADR replaces an older decision, keep the old ADR and make the relationship explicit rather than deleting the historical record.

## What Belongs in the ADR

Record the parts of the decision that future changes must understand or preserve.

Good information includes:

```text
What was chosen

Why it was chosen

The important constraints behind the choice

The real alternatives that were rejected

Non-obvious consequences

Explicit boundaries or "do not" rules when they are part of the decision
```

Avoid turning the ADR into a description of the current implementation.

Do not document every file, function, DTO, database column, or execution step.

The code remains the source of truth for implementation mechanics.

The ADR should explain why the architecture has its current shape.

## Writing Style

State decisions directly.

Prefer:

```text
Rental confirmation uses optimistic allocation with database enforcement.
```

Avoid:

```text
We decided that rental confirmation should probably use optimistic
allocation for now.
```

Use present-tense architectural language.

Be specific when boundaries or invariants are part of the decision.

For example:

```text
The database exclusion constraint is the authoritative double-booking
protection.
```

Explicit "no" decisions can be as important as positive decisions:

```text
Do not treat a PostgreSQL deadlock as evidence that an asset is unavailable.
```

Keep enough reasoning that a future developer can tell the difference between an intentional trade-off and accidental complexity.

## Reading ADRs

Before changing an architectural area, read the ADRs that apply to it.

An ADR represents context that may not be visible from the current implementation.

If a proposed change contradicts an existing ADR, surface that conflict explicitly rather than silently changing the architecture.

For example:

```text
This change contradicts ADR-0004, which intentionally keeps availability
planning outside the persistence transaction.

The ADR may need to be reconsidered because ...
```

An ADR is not permanent law. Architecture can change.

But an existing decision should be **reconsidered deliberately**, with its original reasoning understood, rather than accidentally undone.

## Quick Test

Before creating an ADR, ask:

```text
Would changing this later be meaningfully expensive?

Could a reasonable developer misunderstand or "fix" this without the
original context?

Did we choose between legitimate alternatives for specific reasons?
```

If the answer is not **yes to all three**, do not create an ADR.

If it is, record the decision while the reasoning is still fresh.
