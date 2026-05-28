### Entity

#### Role
An **Entity** is a domain object defined primarily by a stable **identity** that persists throughout its lifecycle. While its attributes may change over time, the entity remains "the same" as long as its unique identifier remains constant. Entities are responsible for holding the business logic related to their own state and lifecycle transitions.

---

#### Core Philosophy: Context-Specific Modeling
A major mistake in domain modeling is trying to create "one model to rule them all".
*   **Context over Universality:** An entity should only exist within a specific **Bounded Context**. A "Guest" entity in a *Reservation* context may have completely different behaviors and data than a "Guest" entity in a *Billing* context.
*   **Splitting Entities:** If an entity feels too large or carries data irrelevant to certain workflows, it should be split into multiple context-specific entities.
*   **Behavior-Driven Identity:** Identity is not just a database primary key; it represents the continuity of a business process.

---

#### Rules

**1. Identity and Equality**
*   **Equality by ID:** Two entities are considered equal if their IDs match, regardless of whether their other properties are different.
*   **Immutable Identity:** The ID must be established at the time of creation and should be **readonly** for the remainder of the entity's lifecycle.

**2. Controlled Construction**
*   **No Empty Constructors:** An entity must never be in an invalid state. All required data must be provided upon construction.
*   **Explicit Intent:** Use static factory methods to distinguish between new instances and those being loaded from a database:
    *   `static create()`: For new entities. It generates a new ID and enforces initial invariants.
    *   `static reconstitute()`: For loading existing data from persistence. This method assumes the data was already valid when saved and restores the existing ID.
*   **Child Entity Creation:** If an entity is a child within an aggregate, it should usually be created by the **Aggregate Root** to ensure the root can manage the child's identity and initial state.

**3. Deep Encapsulation**
*   **No Public Setters:** Avoid public setters that allow external code to manipulate state arbitrarily.
*   **Expressive Methods:** Use methods that name the **business action** being performed (e.g., `reserveSeat()`, `cancel()`, `arrive()`) rather than technical mutations (e.g., `setStatus()`).
*   **Validation:** Use **Value Objects** for trivial validation (e.g., ensuring a price is positive) so the entity can focus on logic that involves its identity and lifecycle.

**4. Pure Domain Logic**
*   **Infrastructure-Free:** Entities must be "pure." They should not contain database decorators, ORM-specific types, or references to external services like logging or APIs.
*   **Internal Focus:** An entity only owns logic concerning its **own state**. If logic requires coordinating multiple entities or accessing external data, it belongs in a **Domain Service** or an **Aggregate Root**.

---

#### When NOT to Create an Entity
Do not force an entity model if:
*   The use case is **simple CRUD** or data entry where identity-based behavior doesn't exist.
*   The object only contains getters and setters with no actual business logic (an **anemic model**).
*   The concept is better defined by its attributes rather than a lifecycle (use a **Value Object** instead).
*   The model is just a "mirror" of a database table without enforcing any domain rules.

---

#### Technical Constraints
*   **No Side Effects:** Entities should not perform I/O or orchestrate workflows.
*   **Mappers:** Use separate Mapper classes to convert raw database rows into domain entities via the `reconstitute()` method, keeping persistence logic out of the domain layer.

---

#### Examples

*   **✅ Correct (Expressive):**
    ```typescript
    // Business intent is clear
    shipment.completePickup(stopId); 
    ```
*   **❌ Wrong (Data-Centric):**
    ```typescript
    // Bypasses rules and exposes internal state
    shipment.stops.find(s => s.id === id).status = 'departed';
    ```
*   **✅ Correct (Context-Specific):** A `Member` entity in the `Chat` context only tracks `memberId` and `joinDate` to enforce a "max member" rule.
*   **❌ Wrong (One Model to Rule Them All):** A `Member` entity that carries 50 fields including `bio`, `profilePicture`, and `encryptedPassword` into a simple chat-room logic boundary.
