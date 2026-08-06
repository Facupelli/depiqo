# Tech Stack and Architecture

This backend uses NestJS, TypeScript, Prisma, PostgreSQL, pnpm, and NestJS CQRS.

The architecture combines Domain-Driven Design, Hexagonal Architecture, Clean Architecture, SOLID principles, and CQRS. The dependency direction points inward: infrastructure and interface adapters depend on the application and domain layers, never the reverse.

## Core architecture

- Domain layer contains business rules only.
- Application layer contains explicit command and query use cases.
- Interface adapters translate transport concerns into application requests.
- Infrastructure contains Prisma, repositories, mappers, persistence concerns, and technical integrations.

## Module boundaries

Each module is a bounded context. Modules may only interact through explicit public contracts exposed by the owning module.

Allowed cross-module patterns:

- Public Facade/API for synchronous business capabilities.
- Public Query Contract for read-only cross-module reads.
- Public Module Event for post-commit reactions.

Forbidden:

- Importing from another module's private `application/`, `domain/`, or `infrastructure/` folders.
- Dispatching cross-module commands through private command classes.
- Leaking repositories, handlers, persistence details, or implementation-specific types through public contracts.

For detailed cross-module access rules, see `docs/architecture/overview.md`.

## Use case structure

One state-changing use case maps to:

- one command
- one Application Service
- one controller
- request and response DTOs

Queries are handled separately through Query Handlers.

Application Services do not call each other. Command chaining follows:

Command -> Event -> Command

## Persistence

PostgreSQL is the database. Prisma is the persistence tool.

Command-side persistence uses concrete repositories plus mappers. Query-side and supporting reads may use Prisma directly for efficiency. See `docs/implementation-rules/repository.md` and `docs/implementation-rules/query.md` for detailed rules.

Repositories are concrete classes. The project intentionally does not add repository ports or interfaces on top of Prisma-backed repositories.

## Domain modeling

Entities have identity. Aggregates define consistency boundaries. Value Objects are used only for complex multi-field concepts with meaningful invariants. Single primitive wrappers are avoided.

Expected business failures are Domain Errors returned through `neverthrow` `Result` types. Unexpected technical failures or broken invariants may throw exceptions.

## Events

Domain Events are recorded during aggregate state changes and dispatched after persistence succeeds. In-process event dispatch uses `@nestjs/event-emitter`.

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
