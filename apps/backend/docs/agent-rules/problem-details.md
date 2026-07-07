# Problem Details Error Handling

## Role

HTTP APIs expose failures with RFC 7807 / RFC 9457 Problem Details using `application/problem+json`.

Problem Details is the **transport contract** for API errors. Domain, public-module, and application code must stay transport-agnostic. Only HTTP-facing code converts application failures into Problem Details responses.

Problem Details is **not** the internal source of truth for debugging. The internal source of truth is the application error plus its cause chain and context.

---

## Mental Model

```text
Domain/public-module error
  -> module/public boundary error, when crossing bounded contexts
  -> use-case application error { code, message, cause, context }
  -> module Problem Details mapper/catalog
  -> ProblemException { problemDetails, applicationError/internal metadata }
  -> ProblemDetailsFilter
  -> HTTP application/problem+json response

Canonical logs receive:
  problemDetails + applicationError + serialized cause chain + safe request context
```

The HTTP response answers:

> What can the client safely know?

The server log answers:

> What actually happened?

---

## Core Rules

### Problem Details are client-safe only

Problem Details catalogs own the public API error representation:

- `type`
- `title`
- `status`
- public-safe `detail`
- optional public-safe extension members

Do not rely on Problem Details as the only logged error information.

### Application errors preserve the real failure

Expected use-case failures should return `Result<T, ApplicationError>`.

Application errors should use this shape:

```ts
export interface SomeApplicationError {
  code: SomeApplicationErrorCode;
  message: string;
  cause?: unknown;
  context?: Record<string, unknown>;
}
```

Field meanings:

- `code`: stable internal key used by the Problem Details catalog.
- `message`: developer-oriented explanation of the real failure.
- `cause`: original domain/public-module/error object. Do not discard it.
- `context`: safe debugging metadata such as use case name, tenant id, branch id, resource ids, etc.

Do not put secrets, credentials, tokens, raw SQL, or sensitive PII in `context`.

### Mappers must not be lossy

When a use case coordinates another module through a public API, map dependency errors intentionally into the current use-case application error shape.

Bad:

```ts
if (dependencyResult.isErr()) {
  return err(someApplicationError('ResourceNotFound', 'Resource was not found.'));
}
```

Good:

```ts
if (dependencyResult.isErr()) {
  return err(
    mapDependencyErrorToSomeApplicationError(dependencyResult.error, {
      useCase: 'SomeUseCase',
      tenantId,
      resourceIds,
    }),
  );
}
```

Every mapped error should preserve the original cause.

### Problem mappers attach internal metadata

HTTP Problem mappers convert application errors into `ProblemException`.

They must:

- keep the response body client-safe
- attach the application error as internal/non-response metadata
- not overwrite or discard `cause` and `context`

Conceptually:

```ts
return ProblemException.from({
  type: definition.type,
  title: definition.title,
  status: definition.status,
  detail: definition.detail,
  applicationError: error,
});
```

The `applicationError` metadata is for logging/observability only and must not be serialized into the HTTP response.

---

## Application services and use cases

- Do not throw HTTP exceptions from application services, command handlers, query handlers, domain entities, or domain services.
- Expected business failures return `Result<T, E>` with a domain/application error.
- Let unexpected infrastructure failures propagate.
- When a use case coordinates other modules through public APIs, map their public errors into the current module's application error shape.
- Do not import private domain errors from another module. Depend on public API contracts, public error codes, or facade-level errors.
- Do not collapse multiple dependency errors into one fake application error code unless that is intentionally the public use-case semantics and the original cause is still preserved.

---

## Module application errors

For HTTP-facing use cases that can fail in known ways, define a small module/use-case application error shape:

```ts
export type SomeApplicationErrorCode =
  | 'SomeBusinessRuleFailed'
  | 'SomeResourceNotFound'
  | 'Unexpected';

export interface SomeApplicationError {
  code: SomeApplicationErrorCode;
  message: string;
  cause?: unknown;
  context?: Record<string, unknown>;
}
```

The `code` is the internal stable key used by the module's Problem Details catalog. Avoid separate HTTP categories when the catalog can own status codes directly.

---

## Error-to-application-error mapping

Use a mapper near the use case/module boundary to translate known domain/public-module errors into application error codes:

```ts
export function toSomeApplicationError(error: unknown, context: Record<string, unknown>): SomeApplicationError {
  if (error instanceof SomeDomainError) {
    return someApplicationError('SomeBusinessRuleFailed', error.message, error, context);
  }

  if (isPublicDependencyErrorCode(error, 'DEPENDENCY_RULE_FAILED')) {
    return someApplicationError('SomeBusinessRuleFailed', error.message, error, context);
  }

  return someApplicationError('Unexpected', 'An unexpected error occurred.', error, context);
}
```

Do not perform HTTP status mapping in this file.

Avoid parsing message strings for semantics. If current dependency errors are not structured enough, preserve the cause and migrate toward explicit public error codes/classes.

---

## Problem Details catalog

Each HTTP-facing module/use case should have a private Problem Details catalog that is the single source of truth for public error response metadata:

```ts
const SomeProblemCatalog: Record<SomeApplicationErrorCode, ProblemDefinition> = {
  SomeBusinessRuleFailed: {
    type: createProblemType('some-module/some-business-rule-failed'),
    title: 'Some business rule failed',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The request could not be processed because a business rule failed.',
  },
  Unexpected: {
    type: PlatformProblemTypes.system.internalServerError,
    title: 'Internal server error',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    detail: 'An unexpected error occurred. Please try again later.',
  },
};
```

The catalog owns:

- RFC problem `type` URI
- stable `title`
- HTTP `status`
- default client-safe `detail`
- public-safe extension member mapping

Keep catalogs private unless there is a deliberate public contract/documentation reason to export them.

---

## Controller behavior

Controllers translate `Result` failures into Problem Details exceptions:

```ts
const result = await this.commandBus.execute(command);

if (result.isErr()) {
  throw toSomeProblem(result.error);
}
```

Controllers may also map DTO/value-object construction failures into application errors before converting to Problem Details.

---

## Logging and observability

Canonical logs for `ProblemException` should include:

- HTTP status
- problem `type`, `title`, and `detail`
- application error `code`
- application error `message`
- application error `context`
- serialized cause/cause chain

Development logs may include stack traces. Production logs should avoid leaking sensitive internals while preserving enough structured metadata to diagnose failures.

Do not manually log expected application errors in every controller. Attach metadata to `ProblemException` and let the global logging/filter infrastructure emit one canonical log line.

---

## Problem Details response shape

All HTTP errors should be serialized as `application/problem+json` and include:

- `type`: stable machine-readable URI
- `title`: stable human-readable summary for the problem type
- `status`: same value as the HTTP response status
- `detail`: human-readable client-safe explanation; keep 5xx details generic
- `instance`: request URI or occurrence identifier

Use extensions for machine-readable public context only, for example:

```json
{
  "type": "https://api.depiqo.com/problems/rental-commitment/insufficient-asset-availability",
  "title": "Insufficient asset availability",
  "status": 409,
  "detail": "Not enough equipment is available for the requested rental period.",
  "instance": "/rentals/confirmed",
  "equipmentTypeId": "excavator-small",
  "requiredQuantity": 3,
  "availableQuantity": 1
}
```

For validation-style failures, prefer the `invalid-params` extension:

```json
{
  "invalid-params": [
    { "name": "selectedOffers.0.quantity", "reason": "Quantity must be a positive integer." }
  ]
}
```

---

## Naming conventions

Problem Details is now the current error flow. Do not use `v2` prefixes in core Problem Details names, imports, or file names.

Use:

- `ProblemException`
- `ProblemDetailsFilter`
- `ProblemDetailsBody`
- `ProblemDetailsExtensions`
- `createProblemDetails`
- `createProblemType`
- `createValidationProblem`
- `PlatformProblemTypes`
- `PROBLEM_DETAILS_CONTENT_TYPE`
- `PROBLEM_TYPE_BASE_URI`
- `src/core/problem-details`

Do not introduce legacy version-prefixed Problem Details names or imports.

---

## Safety and consistency

- Never branch client logic on `title` or `detail`; clients should use `type`.
- Do not expose stack traces, SQL errors, internal exception names, or sensitive data in `detail` or public extensions.
- Keep 5xx Problem Details generic for clients and preserve specifics in logs.
- Ensure `status` in the body matches the HTTP status.
- Do not allow extension keys to override reserved members: `type`, `title`, `status`, `detail`, `instance`.
- Once public clients depend on a `type` URI, treat it as stable API contract.

---

## Current anchors

Core Problem Details infrastructure:

- `src/core/problem-details/problem-details.ts`
- `src/core/problem-details/problem-details.factory.ts`
- `src/core/problem-details/problem.exception.ts`
- `src/core/problem-details/problem-details.filter.ts`
- `src/core/problem-details/platform-problem-types.ts`

Example module flow:

- `src/modules/rental-commitment/features/create-confirmed-rental/rental-commitment-application.error.ts`
- `src/modules/rental-commitment/features/create-confirmed-rental/map-rental-commitment-error.ts`
- `src/modules/rental-commitment/features/create-confirmed-rental/rental-commitment-http-error.mapper.ts`
