---
name: backend-use-case-implementation
description: >
  Guides implementation of backend use cases in the NestJS app. Use this skill when
  adding or changing a v2 command, query, handler, service, controller, DTO, mapper,
  repository, API contract, or HTTP error mapper in `apps/backend/`.
---

# Backend Use Case Implementation

Use this skill for backend feature work that needs to fit the existing NestJS, CQRS, vertical-slice, API-contract, and Problem Details patterns.

## First Steps

1. Read the nearest `AGENTS.md` files for repo/app/package guidance.
2. Read `apps/backend/docs/agent-rules/architecture.md`.
3. Load the artifact-specific rules it points to, such as query, command, controller, DTO, repository, mapper, or Problem Details rules.
4. Read nearby feature code in the same module before designing the change.
5. If behavior, response shape, ownership, filtering, or error handling is unclear, ask clarifying questions before writing an implementation plan.

## Decide the Use-Case Shape

### Read / Query Use Case

Use this path when the endpoint retrieves data and should not mutate state.

- Model the request as one CQRS query class and one query handler.
- Query objects are plain classes with readonly primitive properties.
- Query handlers may inject `PrismaService` and read directly from Prisma.
- Build read models directly from selected Prisma fields.
- Do not instantiate aggregates or use repositories for normal read models.
- Do not call domain services unless the read truly needs domain computation.
- Tenant-scoped reads must filter by tenant id from request context/current user.
- List reads should support pagination unless the use case explicitly does not need it.
- Return DTO-safe primitives; serialize dates as ISO strings.
- Expected read failures should return `Result<T, ApplicationError>` and be mapped by the controller to v2 Problem Details.

### Mutation / Command Use Case

Use this path when the endpoint creates, updates, deletes, confirms, cancels, or otherwise changes state.

- Model the request as one command and one command handler or application service.
- Keep request DTOs and commands separate.
- Controllers translate DTO + request context into commands.
- Business rules belong in domain entities, value objects, or domain services.
- Use repositories for aggregate persistence on the command side.
- Cross-module coordination must go through public APIs/facades, not private module internals.
- Expected failures return `Result<T, ApplicationError>`.
- Application errors stay transport-agnostic; controllers map them to v2 Problem Details.
- Let unexpected infrastructure failures propagate.

## API Contracts and DTOs

When a use case exposes or changes an HTTP contract:

- Add or update schemas in `packages/api-contracts/src/<bounded-context>/`.
- Follow nearby contract naming and `ApiContract` shape.
- Export new contracts explicitly from the package index files.
- Backend request and response DTOs should wrap API-contract schemas with `createZodDto`.
- Define response fields explicitly; never expose raw Prisma records or domain objects.
- Prefer additive contract changes and stable response shapes.
- Dates in response schemas should be ISO strings with `z.string().datetime()`.

## Controllers

- Keep controllers thin.
- Extract tenant/user context from decorators, not client input.
- Validate transport input through DTOs.
- Dispatch via `CommandBus` or `QueryBus`.
- Return response DTO-shaped objects.
- Convert expected `Result` errors to v2 Problem Details at the HTTP boundary.
- Do not put business rules, Prisma calls, persistence, or orchestration logic in controllers.

## Problem Details for v2 HTTP Errors

For expected HTTP-facing failures:

- Define a small use-case or module application error type with stable `code` values.
- Map domain/public-module errors into application errors outside the controller when needed.
- Create a private Problem Details catalog near the use case or module.
- Controller throws `V2ProblemException` through the mapper when `Result` is `Err`.
- Do not throw Nest HTTP exceptions from handlers, services, domain objects, or repositories.
- Keep 5xx details generic and avoid leaking infrastructure details.

## Module Boundaries

- Put v2 vertical-slice use cases under `apps/backend/src/modules/v2/<bounded-context>/features/<use-case>/` unless nearby code says otherwise.
- Respect bounded-context ownership from planning docs and existing module layout.
- If a use case needs another bounded context, depend on its public API only.
- Do not import private domain errors, repositories, or entities from another module.

## Module Wiring

After adding a use case:

- Register HTTP controllers in the owning module's `controllers` array.
- Register CQRS handlers, application services, repositories, and mappers in `providers` as needed.
- Export only deliberate public APIs/facades from modules.

## Validation

Choose the smallest useful validation:

- For API contract changes, run the `@repo/api-contracts` build.
- For backend changes, run the backend build.
- Run targeted lint or tests when feasible.
- Use `apps/backend/docs/agent-rules/testing.md` to choose tests for risky or behavioral changes.

## Common Anchors

- v2 vertical-slice query example: `src/modules/v2/tenant-management/features/get-branches/`
- v2 command/controller/error flow example: `src/modules/v2/asset-inventory/features/add-assets-to-equipment-type/`
- Tenant management module wiring: `src/modules/v2/tenant-management/tenant-management.module.ts`
- API contracts: `packages/api-contracts/src/`
- Backend rule index: `apps/backend/docs/agent-rules/architecture.md`
- Problem Details rule: `apps/backend/docs/agent-rules/problem-details.md`
