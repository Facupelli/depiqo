---
name: backend-use-case-implementation
description: >
  Guides implementation of backend use cases in the NestJS app. Use this skill when
  adding or changing a backend command, query, handler, service, controller, DTO, mapper,
  repository, API contract, or HTTP error mapper in `apps/backend`.
---

# Backend Use Case Implementation

Use this skill for backend feature work that needs to fit the existing NestJS, CQRS, vertical-slice, API-contract, and Problem Details patterns.

## First Steps

1. Read the nearest `AGENTS.md` files for repo/app/package guidance.
2. Read `apps/backend/docs/implementation-rules/README.md`.
3. Load the relevant artifact-specific rules it points to, such as query, command, controller, DTO, repository, mapper, or Problem Details rules.
4. Read nearby feature code in the same module before designing the change.
5. Identify the owning module for every Prisma model the use case may access. If ownership is unclear, stop and clarify it before planning.
6. If behavior, response shape, ownership, filtering, or error handling is unclear, ask clarifying questions before writing an implementation plan.

## Mandatory Persistence Decision Test

Apply this test before adding every database read:

1. Does the read reconstitute an aggregate or entity so the use case can invoke its business behavior?
2. If yes, load it through the aggregate/entity repository.
3. If no, query it directly with Prisma. This includes existence, uniqueness, impact, affected-ID, count, reporting, and projection reads.
4. Does the current module own the Prisma model?
5. If no, do not query it. Use the owning module's public API or an explicit integration event/projection mechanism.

Repositories only load aggregates/entities for behavior and persist them, including aggregate children. They are not general data-access layers. When a transaction is active, pass its client to the normal method, such as `findById(..., tx)` or `save(entity, tx)`. Never add `WithinTransaction` method variants.

## Decide the Use-Case Shape

### Read / Query Use Case

Use this path when the endpoint retrieves data and should not mutate state.

- Model the request as one CQRS query class and one query handler.
- Follow the query rules in `apps/backend/docs/implementation-rules/query.md`.
- Follow the cross-module access rules in `apps/backend/docs/architecture/overview.md`.
- Return DTO-safe primitives; serialize dates as ISO strings.

### Mutation / Command Use Case

Use this path when the endpoint creates, updates, deletes, confirms, cancels, or otherwise changes state.

- Model the request as one command and one command handler or application service.
- Keep request DTOs and commands separate.
- Controllers translate DTO + request context into commands.
- Follow the application service rules in `apps/backend/docs/implementation-rules/application-service.md`.
- Follow the repository rules in `apps/backend/docs/implementation-rules/repository.md`.
- Follow the cross-module access rules in `apps/backend/docs/architecture/overview.md`.
- Expected failures return `Result<T, ApplicationError>`; let unexpected infrastructure failures propagate.

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
- Convert expected `Result` errors to Problem Details at the HTTP boundary.
- Do not put business rules, Prisma calls, persistence, or orchestration logic in controllers.

## Problem Details for HTTP Errors

For expected HTTP-facing failures:

- Define a small use-case or module application error type with stable `code` values.
- Map domain/public-module errors into application errors outside the controller when needed.
- Create a private Problem Details catalog near the use case or module.
- Controller throws `V2ProblemException` through the mapper when `Result` is `Err`.
- Do not throw Nest HTTP exceptions from handlers, services, domain objects, or repositories.
- Keep 5xx details generic and avoid leaking infrastructure details.

## Module Boundaries

- Put vertical-slice use cases under `apps/backend/src/modules/<bounded-context>/features/<use-case>/` unless nearby code says otherwise.
- Respect bounded-context ownership from planning docs and existing module layout.
- Choose the collaboration mechanism from `apps/backend/docs/architecture/overview.md`: use a provider-owned synchronous public capability for an authoritative answer or operation needed now, an Integration Event for independently reactable completed facts, or a consumer-owned projection only when repeated foreign facts justify eventual consistency and synchronization complexity.
- A provider may publish multiple small, cohesive capabilities. Design them in the provider's vocabulary and semantics, not as consumer-purpose `forX` variants unless those represent genuinely different provider semantics.
- The provider owns its published contract. Consumers translate provider concepts into their own domain concepts.
- Public contracts must use stable published types and must not leak Prisma-generated types, persistence records, internal repositories/services/engines, or domain types/errors owned by another bounded context.
- Do not import private domain errors, repositories, or entities from another module.

## Module Wiring

After adding a use case:

- Register HTTP controllers in the owning module's `controllers` array.
- Register CQRS handlers, application services, repositories, and mappers in `providers` as needed.
- Export only deliberate public APIs/facades from modules.
- Follow the repository and transaction patterns in `apps/backend/docs/implementation-rules/repository.md`.

## Validation

Choose the smallest useful validation:

- For API contract changes, run the `@repo/api-contracts` build.
- For backend changes, run the backend build.
- Run targeted lint or tests when feasible.
- Choose the smallest effective backend command from `apps/backend/AGENTS.md`, starting with targeted tests when available.

## Common Anchors

- Vertical-slice query example: `src/modules/tenant-management/features/get-branches/`
- Command/controller/error flow example: `src/modules/asset-inventory/features/add-assets-to-equipment-type/`
- Tenant management module wiring: `src/modules/tenant-management/tenant-management.module.ts`
- API contracts: `packages/api-contracts/src/`
- Backend rule index: `apps/backend/docs/implementation-rules/README.md`
- Problem Details rule: `apps/backend/docs/implementation-rules/error-handling-problem-details.md`
