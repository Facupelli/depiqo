### Domain Service

#### Role
A **Domain Service** encapsulates business logic that does not naturally belong to a single entity or aggregate. It is primarily used to coordinate logic across multiple aggregate boundaries, compare multiple aggregate roots, or handle operations that would otherwise force an entity to know about concepts outside its specific scope. 

Crucially, a Domain Service is a **pure domain object**—it contains the "why" and "how" of a cross-root business rule but knows nothing about database tables, APIs, or external frameworks.

---

#### Core Philosophy: Coordination, Not Command
The video sources emphasize that the application layer is more than a "pass-through"; it orchestrates, while Domain Services handle the complex logic of that orchestration.
*   **Avoid the Anemic Anti-Pattern:** A Domain Service should never be an excuse to strip behavior away from entities. If a rule can be enforced by the **Aggregate Root**, it must stay there.
*   **Enforce Cross-Boundary Rules:** Use a Domain Service when a rule spans multiple roots (e.g., checking if a User has sufficient "Member Credits" before allowing them to "Reserve" a seat in a Dinner aggregate).
*   **Contextual Split:** As the sources suggest, different parts of a system may have different models for the same concept (e.g., `GroupMembership` vs. `GroupChat`). A Domain Service can coordinate these separate models when they must interact to fulfill a workflow.

---

#### Rules

**1. Statelessness**
*   **No Internal State:** Domain Services must have no mutable instance state and must not hold data between calls.
*   **Pure Functions:** All inputs should come through method parameters, and all results should be returned to the caller. They should act as pure calculation or coordination engines.

**2. No Infrastructure Dependencies**
*   **Infrastructure-Free:** They must not inject or call database services (e.g., Prisma), event emitters, or framework-specific utilities.
*   **Data Injection:** If the service needs data, the **Application Service** (the orchestrator) should load that data via a repository and pass it into the Domain Service as a parameter.
*   **Persistence-Free:** The Domain Service never saves data. It returns a result, and the Application Service handles the persistence of any changed aggregates.

**3. Expressive Return Types**
*   **Result Objects:** For recoverable business failures (e.g., "Insufficient Funds"), return a `Result` or `Either` type rather than throwing technical exceptions.
*   **Calculation Results:** For pure logic (e.g., a `PricingService`), return the calculated value directly.

**4. NestJS & Framework Integration**
*   **Domain First:** Domain Services are domain-layer constructs, not framework constructs. 
*   **Optional Injectability:** While they can be decorated with `@Injectable()` for consistency in NestJS, they should remain functional and testable without the framework. Do not use dependency injection purely to satisfy convention if direct instantiation is simpler.

---

#### Domain Service vs. Application Service
| Feature | Domain Service | Application Service |
| :--- | :--- | :--- |
| **Responsibility** | Complex business logic spanning roots. | Orchestration, I/O, and transaction management. |
| **State** | Stateless. | Stateless (usually). |
| **Dependencies** | Pure Domain Objects (Entities, Value Objects). | Repositories, External APIs, Bus. |
| **Database** | Never interacts with DB. | Loads and saves aggregates. |

---

#### When to Create a Domain Service
*   When a business rule requires **comparing** two or more different Aggregate Roots.
*   When an operation requires a **calculation** that uses data from multiple sources but shouldn't live in the "root" because it's not part of that root's primary consistency boundary.
*   When you need to **transform** domain concepts between different bounded contexts or split entities.

---

#### Examples

*   **✅ Correct (Cross-Root Coordination):** A `BookingAvailabilityService` that checks a `Guest`'s history and a `Dinner`'s current capacity to decide if a reservation is allowed.
*   **❌ Wrong (Anemic Entity):** A `ShipmentService` that has a `completePickup(shipment)` method which just calls `shipment.status = 'departed'`. This logic belongs inside the `Shipment` aggregate.
*   **✅ Correct (Pure Logic):** A `PricingService` that takes a `Product` and a `DiscountCode` value object and returns a new `Price` value object.
*   **❌ Wrong (Infrastructure Leak):** A Domain Service that uses a `PrismaClient` to check if a user exists before performing a calculation.
