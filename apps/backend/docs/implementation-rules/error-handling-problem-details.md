# Error Handling, Result Flow, Problem Details, and Logging Rule

## Use When

Use this rule when adding or changing an HTTP-facing backend use case, especially command/query handlers, controllers, feature error files, Problem Details mapping, validation error behavior, dependency error mapping, or logging behavior.

## Purpose

Backend features must make failures explicit, safe for API clients, and useful in logs without adding unnecessary ceremony.

Core principle:

```text
Expected failures return Result.
Unexpected failures throw.
HTTP mapping happens at the HTTP edge.
pino-http logs once when the response completes.
```

## Runtime Flow

Expected failure flow:

```text
HTTP request
  -> pino-http starts request timing and assigns request id
  -> controller builds command/query
  -> handler returns Result<Success, FeatureError>
  -> controller maps Err to ProblemException
  -> ProblemDetailsFilter enriches LogContext and serializes application/problem+json
  -> pino-http emits one canonical completion log after the response finishes
```

Unexpected failure flow:

```text
Unexpected thrown error
  -> bubbles to ProblemDetailsFilter
  -> filter stores safe problem fields and attaches the Error to the response logger path
  -> filter returns safe generic 500 Problem Details
  -> pino-http emits the canonical error completion log
```

## Repo Convention

- HTTP-facing handlers and application services return `Result<T, FeatureError>` for expected failures.
- Feature expected failures live in `<feature>.errors.ts`.
- Feature error files are transport-agnostic and must not import NestJS HTTP classes.
- Controllers map `Result.Err` values to `ProblemException`.
- HTTP Problem Details mapping stays close to the controller by default.
- Extract mapping to `<feature>.http-errors.ts` only when it becomes large or reused.
- `src/core/problem-details` owns generic HTTP error mechanics only.
- Core problem-details code must not contain feature or module-specific problem mappings.
- `ProblemDetailsFilter` serializes `application/problem+json` and enriches request logging context without emitting logs.
- `pino-http` owns the single canonical HTTP completion log.
- Validation errors are request-shape errors and are handled by global Problem Details infrastructure.
- Current canonical example: `apps/backend/src/modules/pricing/features/calculate-cart-price/`.

Default vertical slice shape:

```text
src/modules/<module>/features/<feature>/
  <feature>.controller.ts
  <feature>.handler.ts
  <feature>.query.ts or <feature>.command.ts
  <feature>.errors.ts
  <feature>.request.dto.ts
  <feature>.response.dto.ts
```

Preferred implemented example:

```text
src/modules/pricing/features/calculate-cart-price/
  calculate-cart-price.controller.ts
  calculate-cart-price.handler.ts
  calculate-cart-price.query.ts
  calculate-cart-price.errors.ts
  calculate-cart-price.request.dto.ts
  calculate-cart-price.response.dto.ts
```

## Decision Guide

### Expected Failures

Use `Result<T, E>` when the caller can reasonably react to the failure.

Expected failures include:

```text
invalid domain transition
invalid value object or application input
resource not found in current tenant/context
duplicate resource
already confirmed / cancelled / signed
asset unavailable or insufficient quantity
invalid coupon or customer requirement
known dependency rejection
permission denied as an application decision
```

### Unexpected Failures

Let errors throw or bubble when the system is broken or the failure is not a normal business outcome.

Unexpected failures include:

```text
database connection failure
unknown Prisma error
serialization bug
missing required configuration
impossible invariant violation
unexpected SDK crash
programmer mistake
unrecognized dependency failure
```

Do not wrap unknown technical failures as fake expected `Result` errors. A code like `pricing.calculation_failed` should exist only if it is a known, expected application outcome. If the algorithm crashed, let it throw.

### HTTP Status Policy

Use this policy:

```text
400 Bad Request            DTO shape, parsing, malformed input, validation
401 Unauthorized           missing or invalid authentication
403 Forbidden              authenticated caller is not allowed
404 Not Found              resource absent or hidden in current context
409 Conflict               valid request conflicts with current state
422 Unprocessable Entity   valid shape, invalid business semantics
429 Too Many Requests      rate or usage limit exceeded
502 Bad Gateway            external dependency returned invalid/failed response
503 Service Unavailable    dependency/system temporarily unavailable
500 Internal Server Error  unknown bug, unexpected exception, infrastructure failure
```

Examples:

```text
Asset no longer available -> 409
Rental already confirmed -> 409
Duplicate document number -> 409
Invalid rental period business rule -> 422
Coupon requires customer -> 422
Tenant pricing config unavailable -> 503
```

Keep 5xx response details generic and safe.

## Must Do

- Identify expected failures for each HTTP-facing use case.
- Model expected failures in `<feature>.errors.ts`.
- Use stable namespaced error codes, such as `pricing.coupon_requires_customer`.
- Return `Result<T, FeatureError>` for expected failures from handlers/application services.
- Preserve original domain/dependency errors as `cause`.
- Include only safe debugging metadata in `context`.
- Convert known domain errors into feature/application errors at the HTTP-facing use-case boundary.
- Convert known public dependency errors into the current feature's error shape.
- Throw or rethrow unrecognized dependency failures.
- Map `Result.Err` values to `ProblemException` at the controller/HTTP edge.
- Return HTTP errors as `application/problem+json`.
- Let `pino-http` log once when the HTTP response completes.
- Keep 5xx responses generic and safe.

## Must Not Do

- Do not throw Nest HTTP exceptions from handlers, services, domain objects, or repositories.
- Do not throw `ProblemException` from domain or application code.
- Do not catch unknown errors just to convert them into generic expected errors.
- Do not add generic `UnexpectedError` variants to Result unions just to avoid throwing.
- Do not leak private domain/dependency errors into an HTTP contract.
- Do not import private internals from another bounded context for error mapping.
- Do not branch on `message`; branch on stable `code` values or typed errors.
- Do not put feature-specific Problem Details mappings in `src/core/problem-details`.
- Do not expose stack traces, SQL errors, internal class names, private exception messages, or sensitive data in Problem Details.
- Do not manually log expected application errors in every controller or use case.
- Do not create empty mapper/catalog files such as no-op problem catalogs.

Never include secrets, tokens, passwords, authorization headers, raw SQL, private keys, payment data, identity documents, full external provider payloads, or large request bodies in error context or Problem Details extensions.

## Minimal Shape

### Feature error file

```typescript
import { ApplicationError } from 'src/core/errors';

export type CalculateCartPriceErrorCode =
  | 'pricing.invalid_cart_selection'
  | 'pricing.rental_offer_not_found'
  | 'pricing.coupon_requires_customer';

export interface CalculateCartPriceError extends ApplicationError {
  code: CalculateCartPriceErrorCode;
}

export function calculateCartPriceError(
  code: CalculateCartPriceErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): CalculateCartPriceError {
  return { code, message, cause, context };
}
```

Expected application errors use this core shape:

```typescript
export interface ApplicationError {
  code: string;
  message: string;
  cause?: unknown;
  context?: Record<string, unknown>;
}
```

`message` is for developers/logs and is not automatically client-safe.

### Handler result

```typescript
async execute(query: CalculateCartPriceQuery): Promise<Result<CalculateCartPriceResult, CalculateCartPriceError>> {
  const context = { useCase: 'CalculateCartPrice', tenantId: query.tenantId };

  const dependencyResult = await this.pricingPolicy.check(query);

  if (dependencyResult.isErr()) {
    return err(
      calculateCartPriceError(
        'pricing.invalid_cart_selection',
        dependencyResult.error.message,
        dependencyResult.error,
        context,
      ),
    );
  }

  return ok({ total: dependencyResult.value.total });
}
```

### Controller mapping

```typescript
const result = await this.queryBus.execute<
  CalculateCartPriceQuery,
  Result<CalculateCartPriceResponseDto, CalculateCartPriceError>
>(query);

if (result.isErr()) {
  throw toCalculateCartPriceProblem(result.error);
}

return result.value;
```

Use `ProblemException` and `createProblemDetails(...)` in the controller or a small HTTP mapping helper. See `controller.md` for the fuller controller shape.

## Problem Details Policy

All HTTP errors should return `application/problem+json`.

Required Problem Details fields are:

```text
type
title
status
detail
instance
```

Useful extensions include:

```text
code
requestId
invalid-params
other public-safe context clients can act on
```

Clients must not branch on `title` or `detail`. Clients may branch on `type` or `code`.

`ProblemException` is the HTTP-layer representation of a mapped expected failure. It carries:

```text
problemDetails      serialized to the client
applicationError    for logs/observability
cause               for logs/observability
internal metadata   optional, not client-facing
```

Only controllers, HTTP presenters, or HTTP mapping helpers should create it.

`src/core/problem-details` may contain generic mechanics such as:

```text
ProblemException
ProblemDetailsFilter
ProblemDetailsBody
createProblemDetails
createProblemType
createValidationProblem
PlatformProblemTypes
PROBLEM_DETAILS_CONTENT_TYPE
ResultHttpPresenter, if used
```

Core owns mechanics. The feature owns business meaning.

## Dependency Error Mapping

A use case must not leak private errors from another bounded context to its HTTP contract.

Rules:

- Depend only on public APIs/facades/contracts from other modules.
- Do not import private domain internals from another bounded context.
- Preserve original dependency errors as `cause`.
- Convert known public dependency errors into the current feature's error shape.
- Throw or rethrow unrecognized dependency failures.

## Validation Errors

DTO validation errors are request-shape errors and usually return `400 Bad Request`.

Use `invalid-params` for field-level details.

Validation errors should be handled by global Problem Details infrastructure, not manually inside every controller.

## Logging Policy

Log once at HTTP completion. `pino-http` is the sole owner of the canonical completion event. Interceptors, filters, controllers, and `LogContext` must not emit or flush a second canonical event.

Do not manually log expected application errors in every controller or use case. Domain code must not log.

Canonical error logs include request id, method, pathname without query values, status, duration, safe tenant/user context when available, DEPIQO database/cache/domain-event metrics, safe problem fields, and the root Error under `err`.

The status selects the actual Pino method and numeric `level` value:

```text
1xx-3xx  info
4xx      warn
5xx      error
```

Do not add an application-defined root `level` field. In particular, `LOG_LEVEL=error` must still emit 5xx canonical completion logs.

`ProblemDetailsFilter` is responsible for:

```text
handling ProblemException
handling validation exceptions
handling ordinary Nest HttpException
handling unknown thrown errors
storing safe problem fields in LogContext
attaching one genuine logging Error for pino-http when needed
serializing application/problem+json
```

The configured Pino `err` serializer includes only `type`, `message`, a safe primitive `code`, policy-allowed `stack`, and nested native Error causes. Cause traversal is limited to five levels and detects circular references by object identity. Arbitrary Error properties, arbitrary object causes, and `toJSON()` output are not serialized.

Production HTTP 4xx errors omit stacks. Development errors and HTTP 5xx errors retain stacks. This status policy is applied before serialization.

Causes, stacks, raw exceptions, application Error objects, and internal logging metadata must never be included in HTTP Problem Details responses. Unknown exceptions always receive generic `500 Internal Server Error` Problem Details while the original Error is retained only for logging.

## Examples

### Correct: known business failure returned as Result

```typescript
return err(
  calculateCartPriceError(
    'pricing.coupon_requires_customer',
    'Coupon requires a customer before it can be applied.',
    error,
    { useCase: 'CalculateCartPrice', tenantId },
  ),
);
```

### Wrong: HTTP exception thrown from a handler

```typescript
throw new ConflictException('Coupon requires customer');
```

### Correct: unknown infrastructure failure bubbles

```typescript
const record = await this.prisma.pricingConfig.findUniqueOrThrow({ where: { tenantId } });
```

If the database is unavailable, let the exception bubble to `ProblemDetailsFilter`.

### Wrong: unknown infrastructure failure wrapped as expected Result

```typescript
try {
  return await this.calculate(query);
} catch (error) {
  return err(calculateCartPriceError('pricing.calculation_failed', 'Calculation failed.', error));
}
```

### Reject these patterns

```text
throw new ConflictException(...) inside a use case
throw new BadRequestException(...) inside a domain entity
return null/undefined for a known failure
parse error.message to decide HTTP status
log and rethrow the same error in multiple layers
wrap unknown exceptions as expected Result errors
discard dependency error causes
expose stack traces in Problem Details
place feature problem mappings in src/core/problem-details
create no-op mapper/catalog files
```

## Checklist

When adding or modifying an HTTP-facing use case:

```text
Identify expected failures.
Model expected failures in <feature>.errors.ts.
Use stable namespaced error codes.
Return Result<T, FeatureError> for expected failures.
Preserve cause and safe context.
Do not import HTTP classes into domain/application files.
Do not add generic UnexpectedError to Result unions.
Let unknown technical failures throw.
Map Result errors to ProblemException at the controller/HTTP edge.
Keep HTTP mapping close to the controller by default.
Extract mapping only if large or reused.
Do not create empty mapper/catalog files.
Do not log expected failures manually in each layer.
Ensure API errors return application/problem+json.
Keep 5xx responses generic and safe.
```

## Related Rules

- `controller.md`
- `application-service.md`
- `domain-error.md`
- `command.md`
- `query.md`
- `request-dto.md`
- `response-dto.md`
