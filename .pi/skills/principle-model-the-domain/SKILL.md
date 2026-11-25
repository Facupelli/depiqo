---
name: principle-model-the-domain
description: Apply when designing stateful logic, complex
  business rules, or repeated conditional logic.
---

# Model the Domain

Represent domain rules and invariants through data structures rather than scattered conditional logic.

Prefer structures that prevent invalid states and reduce the number of branches needed to express behavior.

Consider state machines, discriminated unions, typed models, registries, reducers and appropriate collections.

Choose the simplest structure that fits the problem.
Do not introduce abstractions that add indirection without reducing complexity or preventing invalid states.

Warning signs:
- Adding another branch to a growing conditional.
- Adding another boolean that must remain synchronized.
- Repeating the same business rule across multiple files.
