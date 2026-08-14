# Tech Stack and Architecture

This backend uses NestJS, TypeScript, Prisma, PostgreSQL, pnpm, and NestJS CQRS.

The architecture combines Domain-Driven Design, Hexagonal Architecture, Clean Architecture, SOLID principles, and CQRS. The dependency direction points inward: infrastructure and interface adapters depend on the application and domain layers, never the reverse.

## Core architecture

- Domain layer contains business rules only.
- Application layer contains explicit command and query use cases.
- Interface adapters translate transport concerns into application requests.
- Infrastructure contains Prisma, repositories, mappers, persistence concerns, and technical integrations.

## Module boundaries

Each module is a bounded context and owns its authoritative business rules and data. Modules may interact only through provider-owned published capabilities, Integration Events, or consumer-owned projections.

Choose the mechanism by semantics:

- Use a provider-owned synchronous public capability when an authoritative answer or operation is needed now to complete the use case.
- Use an Integration Event for a completed business fact that consumers may react to independently.
- Use a consumer-owned projection only when repeated foreign facts provide a concrete eventual-consistency benefit that justifies synchronization complexity.

A provider may publish multiple small, cohesive capabilities. Contracts use the provider's vocabulary and stable published types; consumers translate them into their own concepts. Public contracts must not leak Prisma-generated types, persistence records, internal repositories, handlers, services, engines, or domain types or errors owned by another bounded context.

Forbidden:

- Importing from another module's private `application/`, `domain/`, or `infrastructure/` folders.
- Dispatching cross-module commands through private command classes.
- Leaking repositories, handlers, persistence details, implementation-specific types, or foreign bounded-context domain types through public contracts.

For detailed cross-module access rules, see `docs/architecture/overview.md`.

## Use case structure

One state-changing use case maps to:

- one command
- one Application Service
- one controller
- request and response DTOs

Queries are handled separately through Query Handlers.

Application Services do not call another module's private handlers. Cross-module collaboration uses a provider-owned synchronous public capability when a result is needed now, an Integration Event for independently reactable completed facts, or a consumer-owned projection where justified eventual consistency is beneficial.

## Persistence

PostgreSQL is the database. Prisma is the persistence tool.

Command-side persistence uses concrete repositories plus mappers. Query-side and supporting reads may use Prisma directly for efficiency. See `docs/implementation-rules/repository.md` and `docs/implementation-rules/query.md` for detailed rules.

Repositories are concrete classes. The project intentionally does not add repository ports or interfaces on top of Prisma-backed repositories.

## Domain modeling

Entities have identity. Aggregates define consistency boundaries. Value Objects are used only for complex multi-field concepts with meaningful invariants. Single primitive wrappers are avoided.

Expected business failures are Domain Errors returned through `neverthrow` `Result` types. Unexpected technical failures or broken invariants may throw exceptions.

## Events

Domain Events are module-internal facts recorded during aggregate state changes and dispatched after persistence succeeds. Integration Events are the public post-commit facts used for independent cross-module reactions. In-process event dispatch uses `@nestjs/event-emitter` where appropriate; it is not a substitute for a synchronous capability when the initiating use case requires a result.

## Testing and validation policy

Feature work should use small-batch SDD with TDD when practical.

Each feature spec should break requirements into scenarios. Each scenario should be implemented through a small loop:

1. write or update the failing test
2. confirm the failure is meaningful
3. implement the minimum production code
4. run the smallest effective test command
5. review the diff
6. refactor if needed
7. commit

Choose the smallest effective backend command from `apps/backend/AGENTS.md`, starting with targeted tests when available.
