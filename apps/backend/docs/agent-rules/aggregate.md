### Aggregate

#### Role
An Aggregate is a **consistency boundary** for the write-side of a domain model. It is not a mere data container or a collection of related nouns; rather, it is a tool to group domain objects (the Aggregate Root, internal entities, and value objects) to enforce **business invariants**—rules that must remain consistent during every state change. 

Aggregates are specifically designed to manage complexity. If a feature is simple CRUD with only trivial validation, or if it involves long-running workflows where eventual consistency is acceptable, an aggregate may be unnecessary ceremony.

---

#### Core Philosophy: Model Rules, Not Relationships
The primary mistake in domain modeling is building deep object graphs (relationships) rather than focusing on the business rules themselves.
*   **Behavior-First Modeling:** Start by identifying the **workflows and state changes** the business cares about (e.g., `arrive()`, `pickup()`, `reserve()`) rather than nouns. These behaviors determine what data must be encapsulated to enforce consistency.
*   **Avoid "The Trap":** Do not load large collections (e.g., millions of messages or members) just to enforce a limit. If a rule requires checking a threshold, model the rule directly (e.g., a `MemberCount` field) instead of loading the relationship.
*   **Contextual Models:** There is no "one model to rule them all". A single entity like a "Dinner" or "User" may have different representations across different aggregates depending on the specific behavior being modeled.

---

#### Rules

**1. The Aggregate Root is the Only Entry Point**
*   External code interacts strictly with the **Aggregate Root**.
*   Child entities are internal implementation details and should never be exposed in a way that allows callers to bypass the root's invariants.
*   All state changes must be invoked through expressive methods on the root that describe **business intent** (e.g., `completePickup()` instead of `setStatus('completed')`).

**2. Enforce Invariants Atomically**
*   Aggregates must ensure that the entire boundary is in a **valid and consistent state** at the end of every transaction.
*   If an invariant spans multiple objects (e.g., a shipment's delivery stop cannot be completed before its pickup stop), that logic belongs inside the aggregate root.
*   Use **Value Objects** to handle "trivial validation" (e.g., ensuring a price is positive), allowing the Aggregate Root to focus on complex, multi-object invariants.

**3. Keep Aggregates Small**
*   Aggregates are optimized for **writes**, not queries.
*   Loading large object graphs into memory for a single state change causes performance issues and concurrency conflicts.
*   If an aggregate feels too large, it is likely modeling database relationships rather than focused business rules.

**4. Root-Owned Child Creation**
*   The Aggregate Root should be responsible for creating its internal child entities.
*   Callers should pass business intent or input DTOs to the root, rather than pre-building child entities that require knowledge of the root’s ID or internal state.

**5. Persistence and Events**
*   Repositories should load and save the **entire aggregate** as a single unit.
*   After a meaningful state change, the Aggregate Root may record **Domain Events** (facts about what happened) to be published after the transaction is committed.

---

#### When NOT to Create an Aggregate
Avoid the "pretend aggregate" (a data model with private setters and ceremony) when:
*   The use case is **simple CRUD** or data entry.
*   The methods only assign fields without enforcing non-trivial business rules.
*   The logic can be handled more efficiently by a **transaction script** interacting directly with the database.
*   The "rule" can tolerate staleness, in which case it should be enforced at the application layer using a **read model**.

---

#### Summary Table: Aggregate vs. Entity
| Concept | Purpose |
| :--- | :--- |
| **Entity** | An object with a stable identity and lifecycle. Owns behavior for its own state. |
| **Child Entity** | An entity internal to an aggregate, managed and persisted through the root. |
| **Aggregate Root** | The primary entity that guards the consistency boundary and exposes all behavior. |
| **Aggregate** | The **consistency boundary** encompassing the root and its internal components. |

---

#### Examples

*   **✅ Correct (Behavior-Driven):** A `Shipment` aggregate that enforces the order of `Stops` (Pickup → Arrived → Departed → Delivery). The root handles the sequencing rule.
*   **❌ Wrong (Data-Centric):** A `GroupChat` aggregate that loads a collection of 100,000 `User` objects just to check if the chat is full.
*   **✅ Correct (Rule-Driven):** A `GroupChat` aggregate that stores a simple `MemberCount` integer to enforce the capacity invariant efficiently.
*   **❌ Wrong (Useless Ceremony):** A `Product` aggregate with `setName()` and `setPrice()` methods that do nothing but assign values to properties.
