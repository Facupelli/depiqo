# Error Handling, Result Flow, Problem Details, and Logging

## Purpose

Backend features must make failures explicit, safe for API clients, and useful in logs without adding unnecessary ceremony.

Use this rule for HTTP-facing backend use cases, especially command/query handlers and controllers.

Core principle:

```text
Expected failures return Result.
Unexpected failures throw.
HTTP mapping happens at the HTTP edge.
Logging happens once at the global edge.
```

The canonical implemented example is:

```text
apps/backend/src/modules/pricing/features/calculate-cart-price/
```

It shows the preferred feature-local error file, `Result` handler return type, dependency error mapping, controller-local Problem Details mapping, and `ProblemException` usage.

---

## Runtime Flow

```text
HTTP request
  -> controller builds command/query
  -> handler returns Result<Success, FeatureError>
  -> controller maps Err to ProblemException
  -> ProblemDetailsFilter serializes application/problem+json
  -> ProblemDetailsFilter logs once

Unexpected thrown error
  -> bubbles to ProblemDetailsFilter
  -> filter returns safe generic 500 Problem Details
  -> filter logs the real error/cause/stack
```

---

## Expected vs Unexpected Failures

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

---

## Feature Error Files

Each HTTP-facing use case with expected failures should define a small feature-local error file:

```text
<feature>.errors.ts
```

Example shape:

```ts
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

Rules:

- Keep error codes stable and namespaced, for example `pricing.coupon_requires_customer`.
- Do not branch on `message`; branch on `code` or typed errors.
- Keep this file transport-agnostic.
- Do not import NestJS HTTP classes here.
- Preserve original domain/dependency errors as `cause`.
- Include only safe debugging metadata in `context`.

---

## Application Error Shape

Expected application errors use:

```ts
export interface ApplicationError {
  code: string;
  message: string;
  cause?: unknown;
  context?: Record<string, unknown>;
}
```

`message` is for developers/logs and is not automatically client-safe. Preserve original failures in `cause`. Put only safe metadata in `context`, such as use case name, tenant id, branch id, resource ids, counts, and booleans.

Never include secrets, tokens, passwords, authorization headers, raw SQL, private keys, payment data, identity documents, full external provider payloads, or large request bodies.

---

## Use Case / Handler Rules

Handlers and application services return `Result<T, FeatureError>` for expected failures.

Rules:

- Validate application-level invariants and return `err(featureError(...))`.
- Convert known domain errors into feature/application errors when crossing into an HTTP-facing use case.
- Convert known public dependency errors into the current feature’s error shape.
- Preserve dependency/domain error as `cause`.
- Let unknown dependency errors throw.
- Do not throw Nest HTTP exceptions from handlers, services, domain objects, or repositories.
- Do not catch unknown errors just to convert them into generic expected errors.

Do not throw HTTP exceptions for expected failures, and do not catch unknown errors just to convert them into generic expected errors. If a calculation throws unexpectedly, let the global filter handle it.

---

## Dependency Error Mapping

A use case must not leak private errors from another bounded context to its HTTP contract.

Rules:

- Depend only on public APIs/facades/contracts from other modules.
- Do not import private domain internals from another bounded context.
- Preserve original dependency error as `cause`.
- Throw or rethrow unrecognized dependency failures.

---

## Controller Rules

Controllers are the HTTP edge. They may know about DTOs, guards, decorators, HTTP status codes, Problem Details, and `ProblemException`.

They should:

- map DTO + request context into a command/query
- dispatch via `CommandBus` or `QueryBus`
- map `Result.Err` to `ProblemException`
- return response DTO-shaped success values

Do not put business rules, Prisma calls, persistence, or orchestration logic in controllers.

---

## HTTP Problem Mapping

Keep HTTP error mapping close to the controller by default.

For most slices, define a small controller-local `to<Feature>Problem(error)` function and map. Extract mapping only when the controller becomes too large or the mapping is reused. A reasonable extracted name is:

```text
<feature>.http-errors.ts
```

Avoid creating these by default:

```text
<feature>.problem-catalog.ts
<feature>.http-error.mapper.ts
<feature>.application.error.ts
```

They are allowed only when they genuinely improve clarity.

---

## Core Problem Details Ownership

`src/core/problem-details` contains generic HTTP error infrastructure only.

Allowed examples:

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

Core must not contain feature or module-specific problem mappings.

Core owns mechanics. The feature owns business meaning.

---

## HTTP Status Policy

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

---

## Problem Details Response Shape

All HTTP errors should return `application/problem+json`.

Required Problem Details fields are `type`, `title`, `status`, `detail`, and `instance`.

Useful extensions include `code`, `requestId`, `invalid-params`, and other public-safe context clients can act on.

Clients must not branch on `title` or `detail`. Clients may branch on `type` or `code`.

Do not expose stack traces, SQL errors, internal class names, private exception messages, or sensitive data.

---

## Validation Errors

DTO validation errors are request-shape errors and usually return `400 Bad Request`.

Use `invalid-params` for field-level details.

Validation errors should be handled by global Problem Details infrastructure, not manually inside every controller.

---

## ProblemException

`ProblemException` is the HTTP-layer representation of a mapped expected failure.

It carries:

```text
problemDetails      serialized to the client
applicationError    for logs/observability
cause               for logs/observability
internal metadata   optional, not client-facing
```

Only controllers, HTTP presenters, or HTTP mapping helpers should create it.

Do not throw `ProblemException` from domain or application code.

---

## Global ProblemDetailsFilter

The global filter is responsible for:

```text
serializing application/problem+json
handling ProblemException
handling validation exceptions
handling ordinary Nest HttpException
handling unknown thrown errors
emitting one canonical structured log
hiding unsafe details in production
showing useful debugging details in development
```

For unknown exceptions, it returns generic `500 Internal Server Error` Problem Details and logs the original error.

---

## Logging Rules

Log once at the HTTP edge.

Do not manually log expected application errors in every controller or use case. Domain code must not log.

Canonical error logs should include request id, method, path, status, latency, tenant/user/customer context when available, problem fields, application error code/message/context, cause chain, stack trace for unexpected errors, and environment.

Log level guidance:

```text
400 validation                 debug/dev, usually no noisy prod app error
401/403                        warn if suspicious/repeated, otherwise info/debug
404                            debug or info depending context
409 business conflict          info or warn
422 business rule failure      info
429 rate limit                 warn
5xx unexpected                 error
external dependency outage     error or warn depending impact
```

---

## Recommended Feature Structure

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

---

## AI Coding Agent Checklist

When adding or modifying a HTTP-facing use case:

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

Reject these patterns:

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
