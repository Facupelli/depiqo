# Implementation Rules

This directory contains backend implementation rules for common artifact types.

Use these files only when changing the related artifact. Do not load every rule file by default.

## Architecture stance

These rules are inspired by Domain-Driven Hexagon, Domain-Driven Design, Clean Architecture, Hexagonal Architecture, and Vertical Slice Architecture, but they are intentionally pragmatic for this NestJS modular monolith.

We preserve the important boundaries:

- Domain code is persistence-free and transport-free.
- Application services/handlers orchestrate use cases.
- Controllers own HTTP translation and Problem Details mapping.
- Modules communicate through public APIs/facades or explicit events, not private internals.
- Commands and queries are separate.
- Request/response DTOs are separate from commands, queries, and domain objects.
- Command-side repositories persist aggregates/entities through mappers.
- Query handlers may read directly from Prisma into read models.

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
