### Value Object

#### Role
A **Value Object** represents a domain concept defined entirely by its attributes rather than a unique identity. Unlike entities, Value Objects are interchangeable if their properties are identical. They are **immutable** and serve as the primary tool for encapsulating "trivial validation," ensuring that the data entering an aggregate or entity is always valid from the moment of construction.

---

#### Core Philosophy: Simplify the Aggregate
The video sources highlight that Value Objects are essential for keeping Aggregate Roots clean and focused on complex business logic. 
*   **Offload Trivial Validation:** Instead of an Aggregate Root having methods that check if a price is greater than zero or if a string is non-empty, these rules should be moved into a Value Object (e.g., `ProductPrice`).
*   **Guarantee Validity:** By forcing callers to pass in a Value Object, the receiving method is guaranteed to receive valid data, removing the need for defensive checks within the domain logic.
*   **Model Rules, Not Data:** A Value Object is not just a data container; it is a way to model a specific domain rule or meaningful semantic concept (e.g., a `BookingPeriod` that ensures the end date is after the start date).

---

#### Rules

**1. Identity-less Equality**
*   **Structural Comparison:** Two Value Objects are equal if all their properties match.
*   **No ID:** Value Objects must not have an ID field. If you find yourself adding an ID, you are likely modeling an Entity.

**2. Absolute Immutability**
*   **Readonly State:** All properties must be `readonly`, and no public setters should exist.
*   **Functional "Mutations":** Methods that appear to change the state must instead return a **new instance** of the Value Object with the updated values.

**3. Self-Validation (Fail Fast)**
*   **Valid on Construction:** A Value Object must never exist in an invalid state. Validation must occur in the constructor or a static factory method.
*   **Throw on Violation:** If invalid data is provided, the Value Object should throw a domain exception immediately.

**4. Domain Purity**
*   **Infrastructure-Free:** Value Objects are pure domain objects and should never contain framework decorators (like NestJS), database types (like Prisma), or transport-layer logic.
*   **Explicit Mapping:** If a Value Object needs to be serialized for a database, it should expose a method for that (e.g., `toPostgresRange()`), but this method is invoked by a separate **Mapper**, never by the Value Object itself interacting with the database.

---

#### When to Create a Value Object
*   When a concept involves **multiple fields** that belong together (e.g., an `Address` or `MoneyAmount`).
*   When a relationship between fields requires an **invariant** (e.g., a `DateRange` where start < end).
*   When a single primitive value (like a string or decimal) carries **non-trivial validation** or domain behavior (e.g., a `ProductPrice` that must be positive).

---

#### When NOT to Create a Value Object
*   **Pure Aesthetics:** Do not create "primitive wrappers" just for type aesthetics if the value has no unique domain behavior or validation.
*   **Anemic Data:** A plain `name: string` or `description: string` with no behavior should remain a primitive to avoid unnecessary complexity.
*   **Identity Matters:** If the object has a lifecycle and must be tracked over time even as its properties change, it must be an **Entity**.

---

#### Examples

*   **✅ Correct (Self-Validating):**
    ```typescript
    // The ProductPrice ensures it is valid upon creation.
    const price = new ProductPrice(10.50); 
    // Aggregate root can now trust 'price' is positive.
    product.updatePrice(price); 
    ```
*   **❌ Wrong (Validation Leaked):**
    ```typescript
    // Trivial validation is handled by the caller or the root,
    // leading to duplicate logic and potential invalid states.
    if (newPrice > 0) {
       product.price = newPrice;
    }
    ```
*   **✅ Correct (Immutability):**
    ```typescript
    // Adding to money returns a NEW instance.
    const total = salary.add(bonus); 
    ```
*   **❌ Wrong (Mutation):**
    ```typescript
    // Mutating internal state breaks the Value Object contract.
    salary.amount += bonus.amount; 
    ```
