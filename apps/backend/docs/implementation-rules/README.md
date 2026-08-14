# Implementation Rules

This directory contains backend implementation rules for common artifact types.

Use these files only when changing the related artifact. Do not load every rule file by default.

## Architecture stance

These rules are inspired by Domain-Driven Hexagon, Domain-Driven Design, Clean Architecture, Hexagonal Architecture, and Vertical Slice Architecture, but they are intentionally pragmatic for this NestJS modular monolith.

We preserve the important boundaries:

- Domain code is persistence-free and transport-free.
- Application services/handlers orchestrate use cases.
- Controllers own HTTP translation and Problem Details mapping.
- Modules communicate through provider-owned synchronous public capabilities, Integration Events, or consumer-owned projections, not private internals. Choose synchronous capability for an answer or operation needed now, Integration Event for independently reactable completed facts, and projection for repeated foreign facts where justified eventual consistency is beneficial. See `apps/backend/docs/architecture/overview.md` and `integration-event.md` for the full rules.
- Commands and queries are separate.
- Request/response DTOs are separate from commands, queries, and domain objects.
- Command-side repositories reconstitute aggregates/entities for behavior and persist them through mappers (see `repository.md`).
- Query handlers and command-supporting reads query module-owned Prisma models directly into read models (see `query.md` and `repository.md`).

We do not require ceremony by default:

- No repository ports/interfaces unless they provide concrete value.
- No Value Object for every primitive.
- No Aggregate for simple CRUD or data-entry flows.
- No event chains to hide the primary business workflow.

## Artifact-specific rules

- Application Services: `application-service.md`
- Commands: `command.md`
- Queries: `query.md`
- Controllers: `controller.md`
- Request DTOs: `request-dto.md`
- Response DTOs: `response-dto.md`
- Aggregates: `aggregate.md`
- Entities: `entity.md`
- Value Objects: `value-object.md`
- Domain Services: `domain-service.md`
- Domain Events: `domain-event.md`
- Integration Events: `integration-event.md`
- Domain Errors: `domain-error.md`
- Repositories: `repository.md`
- Mappers: `mapper.md`
- Error handling / Result flow / Problem Details: `error-handling-problem-details.md`
