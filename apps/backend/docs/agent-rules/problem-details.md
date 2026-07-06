# Problem Details Error Handling

## Role

HTTP APIs expose failures with RFC 7807 / RFC 9457 Problem Details using `application/problem+json`.

Problem Details is the transport contract for API errors. Domain and application code must stay transport-agnostic; only HTTP-facing code converts application failures into Problem Details responses.

---

## Mental Model

```text
Domain/public-module error
  -> module application error { code, message, cause }
  -> module Problem Details mapper/catalog
  -> V2ProblemException
  -> V2ProblemDetailsFilter
  -> HTTP application/problem+json response
```

---

## Rules

### Application services and use cases

- Do not throw HTTP exceptions from application services, command handlers, query handlers, domain entities, or domain services.
- Expected business failures return `Result<T, E>` with a domain/application error.
- Let unexpected infrastructure failures propagate.
- When a use case coordinates other modules through public APIs, map their public errors into the current module's application error shape.
- Do not import private domain errors from another module. Depend on public API contracts, public error codes, or facade-level errors.

### Module application errors

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
}
```

The `code` is the internal stable key used by the module's Problem Details catalog. Avoid separate HTTP categories when the catalog can own status codes directly.

### Error-to-application-error mapping

Use a mapper near the use case/module boundary to translate known domain/public-module errors into application error codes:

```ts
export function toSomeApplicationError(error: unknown): SomeApplicationError {
  if (error instanceof SomeDomainError) {
    return someApplicationError('SomeBusinessRuleFailed', error.message, error);
  }

  if (isPublicDependencyErrorCode(error, 'DEPENDENCY_RULE_FAILED')) {
    return someApplicationError('SomeBusinessRuleFailed', error.message, error);
  }

  return someApplicationError('Unexpected', 'An unexpected error occurred.', error);
}
```

Do not perform HTTP status mapping in this file.

### Problem Details catalog

Each HTTP-facing module/use case should have a private Problem Details catalog that is the single source of truth for public error response metadata:

```ts
const SomeProblemCatalog: Record<SomeApplicationErrorCode, ProblemDefinition> = {
  SomeBusinessRuleFailed: {
    type: createV2ProblemType('some-module/some-business-rule-failed'),
    title: 'Some business rule failed',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The request could not be processed because a business rule failed.',
    extensions: someBusinessRuleExtensions,
  },
  Unexpected: {
    type: V2PlatformProblemTypes.system.internalServerError,
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
- default `detail`
- extension member mapping

Keep catalogs private unless there is a deliberate public contract/documentation reason to export them.

### Controller behavior

Controllers translate `Result` failures into Problem Details exceptions:

```ts
const result = await this.commandBus.execute(command);

if (result.isErr()) {
  throw toSomeProblem(result.error);
}
```

Controllers may also map DTO/value-object construction failures into application errors before converting to Problem Details.

### Problem Details response shape

All HTTP errors should be serialized as `application/problem+json` and include:

- `type`: stable machine-readable URI
- `title`: stable human-readable summary for the problem type
- `status`: same value as the HTTP response status
- `detail`: human-readable explanation; keep 5xx details generic
- `instance`: request URI or occurrence identifier

Use extensions for machine-readable context, for example:

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

### Safety and consistency

- Never branch client logic on `title` or `detail`; clients should use `type`.
- Do not expose stack traces, SQL errors, internal exception names, or sensitive data in `detail` or extensions.
- Keep 5xx Problem Details generic for clients and preserve specifics in logs.
- Ensure `status` in the body matches the HTTP status.
- Do not allow extension keys to override reserved members: `type`, `title`, `status`, `detail`, `instance`.
- Once public clients depend on a `type` URI, treat it as stable API contract.

---

## Current anchors

Core Problem Details infrastructure:

- `src/core/problem-details/v2/problem-details.ts`
- `src/core/problem-details/v2/problem-details.factory.ts`
- `src/core/problem-details/v2/problem.exception.ts`
- `src/core/problem-details/v2/v2-problem-details.filter.ts`
- `src/core/problem-details/v2/platform-problem-types.ts`

Example module flow:

- `src/modules/rental-commitment/features/create-confirmed-rental/rental-commitment-application.error.ts`
- `src/modules/rental-commitment/features/create-confirmed-rental/map-rental-commitment-error.ts`
- `src/modules/rental-commitment/features/create-confirmed-rental/rental-commitment-http-error.mapper.ts`
