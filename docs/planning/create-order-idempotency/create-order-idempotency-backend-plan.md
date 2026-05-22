# Create-Order Idempotency Implementation Plan

## Goal

Make `POST /orders` idempotent for customer checkout order creation so duplicate submits/retries return the original order result instead of creating duplicate orders, especially in WhatsApp redirect mode.

Idempotency scope:

```txt
tenantId + customerId + idempotencyKey
```

Idempotency key transport:

```http
Idempotency-Key: <uuid>
```

Same key + same payload:

- first successful request creates the order
- repeated request returns the same `orderId`, `status`, and `nextStep`
- repeated request does **not** emit `OrderCreatedByCustomerEvent` again

Same key + different payload:

- return `409 Conflict`

In-progress duplicate:

- return retryable `409 Conflict`

Failed business validation:

- do not permanently consume the key
- user can retry after correction, though frontend should generate a new key when payload changes

No TTL/cleanup in initial implementation.

---

## 1. Add persistence model for create-order idempotency

Add a new Prisma model, likely in `apps/backend/prisma/schema/order.prisma`.

Likely touched files:

- `apps/backend/prisma/schema/order.prisma`
- `apps/backend/src/generated/prisma/*` after Prisma generation

Suggested model:

```prisma
enum OrderCreateIdempotencyStatus {
  IN_PROGRESS
  COMPLETED
}

model OrderCreateIdempotencyKey {
  id             String                       @id @default(uuid())
  tenantId       String                       @map("tenant_id")
  customerId     String                       @map("customer_id")
  idempotencyKey String                       @map("idempotency_key")
  requestHash    String                       @map("request_hash")
  status         OrderCreateIdempotencyStatus @default(IN_PROGRESS)
  orderId        String?                      @map("order_id")
  createdAt      DateTime                     @default(now()) @map("created_at")
  completedAt    DateTime?                    @map("completed_at")

  order Order? @relation(fields: [orderId], references: [id])

  @@unique([tenantId, customerId, idempotencyKey])
  @@index([tenantId, customerId])
  @@index([orderId])
  @@map("order_create_idempotency_keys")
}
```

Notes:

- Keep this separate from `Order` because idempotency is an API/application concern, not core order domain state.
- No `expiresAt` for now to keep implementation minimal.
- Add enum to generated Prisma types.

Potential naming alternatives:

- `CustomerOrderCreationIdempotencyKey`
- `CreateOrderIdempotencyKey`

Recommended name: `OrderCreateIdempotencyKey`, because it is clear and concise.

---

## 2. Add migration

Create Prisma migration adding:

- `OrderCreateIdempotencyStatus` enum
- `order_create_idempotency_keys` table
- unique index on `(tenant_id, customer_id, idempotency_key)`
- FK to `orders(id)`

Likely touched files:

- `apps/backend/prisma/migrations/<timestamp>_add_order_create_idempotency_keys/migration.sql`
- `apps/backend/prisma/schema/order.prisma`
- `apps/backend/src/generated/prisma/*` after Prisma generation

Important DB behavior:

- The unique constraint is the main concurrency guard.
- It prevents two concurrent requests with the same key from both creating an order.

---

## 3. Extend command/controller contract

### Controller

Update `CreateOrderHttpController` to read:

```ts
@Headers('idempotency-key') idempotencyKey?: string
```

Then pass it into `CreateOrderCommand`.

### Command

Extend `CreateOrderCommand` with:

```ts
public readonly idempotencyKey: string;
```

or optional initially:

```ts
public readonly idempotencyKey: string | undefined;
```

Recommended backend behavior: make it **required** for customer checkout once implemented.

Likely touched files:

- `apps/backend/src/modules/order/application/commands/create-order/create-order.http.controller.ts`
- `apps/backend/src/modules/order/application/commands/create-order/create-order.command.ts`
- `apps/backend/src/modules/order/application/commands/create-order/create-order.types.ts`

If missing, return `400 Bad Request` / problem detail.

Suggested error:

```txt
errors://missing-idempotency-key
```

Response:

```json
{
  "title": "Missing Idempotency Key",
  "detail": "Idempotency-Key header is required for order creation."
}
```

Validation:

- Require UUID format for now.
- This aligns with frontend generating `crypto.randomUUID()`.

Potential problem type:

```txt
errors://invalid-idempotency-key
```

---

## 4. Add application-level idempotency helper/service

Create a small helper near the use case.

Likely touched/new files:

- `apps/backend/src/modules/order/application/commands/create-order/create-order-idempotency.service.ts`
- `apps/backend/src/modules/order/application/commands/create-order/create-order.types.ts`
- `apps/backend/src/modules/order/order.module.ts`

Responsibilities:

1. Validate/normalize idempotency key.
2. Build request fingerprint/hash.
3. Try to create an `IN_PROGRESS` idempotency row.
4. Detect existing records.
5. Mark completed after successful order creation.
6. Clear/mark failed after business failure.

Keep this application-level rather than domain-level.

Suggested public methods:

```ts
start(params): Promise<
  | { kind: 'STARTED'; recordId: string }
  | { kind: 'COMPLETED_REPLAY'; orderId: string }
  | { kind: 'IN_PROGRESS' }
  | { kind: 'CONFLICT' }
>
```

```ts
complete(recordId: string, orderId: string, tx?: PrismaTransactionClient): Promise<void>
```

```ts
release(recordId: string): Promise<void>
```

Alternative: methods can return `neverthrow` `Result`s if that matches local style.

---

## 5. Request fingerprinting

Add deterministic request hashing.

Likely touched/new files:

- `apps/backend/src/modules/order/application/commands/create-order/create-order-request-fingerprint.ts`
- `apps/backend/src/modules/order/application/commands/create-order/create-order-request-fingerprint.spec.ts`
- `apps/backend/src/modules/order/application/commands/create-order/create-order-idempotency.service.ts`

Hash should include all logical fields that affect the created order:

```ts
{
  tenantId,
  customerId,
  locationId,
  pickupDate,
  returnDate,
  pickupTime,
  returnTime,
  items,
  currency,
  insuranceSelected,
  fulfillmentMethod,
  deliveryRequest,
  couponCode
}
```

Important details:

- Normalize optional fields:
  - `undefined` and missing should be treated consistently.
  - strings should match DTO-transformed values where possible.
- Sort object keys deterministically.
- Preserve item order or intentionally normalize item order.

Recommendation for item order:

- For now, preserve request item order because current pricing/creation may treat line order as part of request shape.
- If frontend sends same logical cart in different order with same idempotency key, it may conflict. That is acceptable.

Suggested implementation:

- Create a stable stringify function.
- Hash using Node `crypto.createHash('sha256')`.

Example:

```ts
createHash('sha256')
  .update(stableStringify(fingerprintInput))
  .digest('hex');
```

Avoid `JSON.stringify` directly unless key order is controlled.

---

## 6. Main create-order service flow

Current flow:

1. validate items/location/slots
2. price basket
3. transaction creates order + assignments + coupon redemption
4. load completion context
5. emit event
6. return response with `nextStep`

New flow should become:

1. Validate idempotency key presence/format.
2. Compute request hash.
3. Start idempotency record.
4. If completed replay:
   - load existing completion context
   - return existing `orderId`, `status`, `nextStep`
   - do **not** emit event
5. If in progress:
   - return retryable conflict
6. If hash conflict:
   - return conflict
7. If started:
   - continue existing create-order flow
8. If business/domain error before successful creation:
   - release/delete idempotency record
   - return original error
9. If order creation succeeds:
   - mark idempotency record `COMPLETED` with `orderId`
   - load completion context
   - emit event once
   - return response

Likely touched files:

- `apps/backend/src/modules/order/application/commands/create-order/create-order.service.ts`
- `apps/backend/src/modules/order/application/commands/create-order/create-order-idempotency.service.ts`
- `apps/backend/src/modules/order/application/commands/create-order/create-order.types.ts`
- `apps/backend/src/modules/order/application/commands/create-order/create-order.service.spec.ts`

Important: mark idempotency completion in the same DB transaction as order persistence if feasible.

### Transaction boundary recommendation

Inside the existing `$transaction`, after order save and dependent operations succeed:

```ts
await this.orderRepository.save(order, tx);
...
await this.idempotency.complete(recordId, order.id, tx);
```

This ensures an order is not committed without the idempotency record being completed.

However, the `IN_PROGRESS` record must be created **before** the order transaction to guard concurrent requests.

High-level:

```txt
outside tx:
  create IN_PROGRESS record

inside tx:
  create order
  assignments
  coupon redemption
  mark idempotency COMPLETED

after tx:
  emit event
```

If the transaction returns a domain error or throws:

```txt
delete IN_PROGRESS row
```

Edge case:

- Process crashes after creating `IN_PROGRESS` but before completing.
- Since no TTL now, the key remains stuck.
- Minimal handling: return “in progress” on retry.
- Better minimal improvement: include `createdAt` and treat very old `IN_PROGRESS` records as stale, e.g. older than 10 minutes can be deleted/reclaimed.

Recommended stale policy:

```txt
IN_PROGRESS older than 10 minutes = stale
```

On new request with same key/hash:

- delete stale `IN_PROGRESS`
- attempt to start again

This avoids permanently stuck keys without background jobs.

---

## 7. Replay response construction

On completed replay, return stable response:

```ts
{
  orderId,
  status,
  nextStep
}
```

Currently `nextStep` is rebuilt using:

```ts
loadCreateOrderCompletionContext(...)
buildCreateOrderNextStep(...)
```

Use the same path for replay.

Need to fetch order status too. Options:

1. Add status to `loadCreateOrderCompletionContext`.
2. Add a small query in replay path:
   - `order.findFirst({ select: { id, status } })`
3. Create a helper: `buildCreateOrderResponseForPersistedOrder(tenantId, orderId)`

Recommended: create a helper near create-order.

Likely touched/new files:

- `apps/backend/src/modules/order/application/commands/create-order/create-order-response.builder.ts`
- `apps/backend/src/modules/order/application/commands/create-order/create-order-completion-context.loader.ts`
- `apps/backend/src/modules/order/application/commands/create-order/create-order-next-step.builder.ts`
- `apps/backend/src/modules/order/application/commands/create-order/create-order.service.ts`
- `apps/backend/src/modules/order/application/commands/create-order/create-order.service.spec.ts`

Possible function:

```ts
async function buildCreateOrderResponseForPersistedOrder(
  prisma,
  queryBus,
  tenantId,
  orderId,
): Promise<CreateOrderResponseDto>
```

It would:

1. load order status
2. load completion context
3. build next step
4. return DTO

Then use it for both:

- fresh creation
- idempotent replay

This avoids response drift.

---

## 8. Add new create-order errors

Current `CreateOrderError` likely includes domain/pricing/catalog errors.

Extend it with idempotency-specific application errors:

```ts
export class MissingIdempotencyKeyError extends Error {}
export class InvalidIdempotencyKeyError extends Error {}
export class IdempotencyKeyInProgressError extends Error {}
export class IdempotencyKeyConflictError extends Error {}
```

Likely touched files:

- `apps/backend/src/modules/order/application/commands/create-order/create-order.types.ts`
- `apps/backend/src/modules/order/application/commands/create-order/create-order.http.controller.ts`
- `apps/backend/src/modules/order/application/commands/create-order/create-order.service.ts`

Map in controller:

### Missing key

HTTP `400 Bad Request`

```txt
errors://missing-idempotency-key
```

### Invalid key

HTTP `400 Bad Request`

```txt
errors://invalid-idempotency-key
```

### Same key, different payload

HTTP `409 Conflict`

```txt
errors://idempotency-key-conflict
```

### Same key currently processing

HTTP `409 Conflict`

```txt
errors://idempotency-key-in-progress
```

Include extension:

```json
{
  "retryable": true
}
```

for in-progress only.

---

## 9. Event emission behavior

Fresh successful creation:

- emit `OrderCreatedByCustomerEvent` exactly once

Replay:

- do not emit event

Likely touched files:

- `apps/backend/src/modules/order/application/commands/create-order/create-order.service.ts`
- `apps/backend/src/modules/order/application/commands/create-order/create-order.service.spec.ts`
- possible HTTP/integration spec files under `apps/backend/src/modules/order/application/commands/create-order/`

Implementation approach:

- idempotency start result controls whether this is a replay.
- If replay, return before event emission.
- If fresh, emit after transaction succeeds and after completion response is built.

Important for WhatsApp mode:

- notification suppression is separate, but duplicate event prevention still matters.
- Formal mode should also avoid duplicate confirmation emails.

---

## 10. Coupon redemption and inventory edge cases

Idempotency must wrap the entire current create-order process.

Likely touched files:

- `apps/backend/src/modules/order/application/commands/create-order/create-order.service.ts`
- `apps/backend/src/modules/order/application/commands/create-order/create-order.service.spec.ts`
- integration specs under `apps/backend/src/modules/order/application/commands/create-order/`

### Coupon redemption

Current flow redeems coupon inside transaction.

Retry after successful creation:

- should not redeem coupon again
- because replay bypasses creation flow and returns existing response

Retry after coupon validation/redeem failure:

- release idempotency row
- return original error

### Inventory assignment

Fresh creation:

- assignment rows created once

Replay:

- no assignment creation

Concurrent duplicate:

- second request sees existing `IN_PROGRESS` or unique conflict
- does not allocate inventory

### Availability failure

If first request fails availability:

- release/delete idempotency row
- return `OrderItemUnavailableError`
- no completed idempotency record remains

---

## 11. Frontend contract to document for later implementation

Even though this plan is backend-focused, backend should document expected client behavior.

Likely touched files when frontend work is implemented later:

- `apps/web/src/**` checkout/cart order submission hooks or services
- shared API client files if present
- storefront cart/checkout submit components

Frontend should:

1. Generate UUID idempotency key per checkout submission attempt.
2. Send it as:

```http
Idempotency-Key: <uuid>
```

3. Reuse the same key for:
   - double-click retry
   - network retry
   - browser retry
   - uncertain response retry
4. Generate a new key when any order input changes:
   - cart items
   - quantities
   - dates/times
   - fulfillment method
   - delivery request
   - coupon
   - insurance selection
   - location
5. Clear key after successful order creation.
6. On retryable in-progress conflict:
   - wait briefly
   - retry with same key
7. On idempotency conflict:
   - discard key
   - generate new key only if user intentionally submits current changed payload

This contract should be added to the planning doc or an API notes section.

---

## 12. Testing plan

### Unit tests

Add tests for request fingerprinting.

Likely touched/new files:

- `apps/backend/src/modules/order/application/commands/create-order/create-order-request-fingerprint.spec.ts`
- `apps/backend/src/modules/order/application/commands/create-order/create-order-idempotency.service.spec.ts`

Fingerprint cases:

- same logical command produces same hash
- different item/date/coupon/fulfillment produces different hash
- undefined optional values are normalized consistently
- delivery request changes alter hash

Idempotency service cases:

- starts new key
- completed same hash returns replay
- completed different hash returns conflict
- in-progress same hash returns in-progress
- in-progress different hash returns conflict
- stale in-progress can be reclaimed, if implemented

### CreateOrderService unit tests

Likely touched files:

- `apps/backend/src/modules/order/application/commands/create-order/create-order.service.spec.ts`

Cases:

1. Fresh successful create:
   - creates idempotency row
   - creates order
   - marks idempotency completed
   - emits event once
   - returns `nextStep`

2. Completed replay:
   - does not call pricing
   - does not save order
   - does not save inventory assignment
   - does not redeem coupon
   - does not emit event
   - returns same response shape

3. Same key different payload:
   - returns idempotency conflict
   - does not call pricing/order save

4. In-progress key:
   - returns retryable conflict
   - does not call pricing/order save

5. Business failure:
   - releases/deletes in-progress idempotency row
   - returns original business error

### HTTP/controller tests

Add/extend integration tests if existing create-order HTTP specs are available.

Likely touched/new files:

- `apps/backend/src/modules/order/application/commands/create-order/customer-booking-guardrails.http.int-spec.ts`
- or new `apps/backend/src/modules/order/application/commands/create-order/create-order-idempotency.http.int-spec.ts`

Cases:

1. Missing `Idempotency-Key` returns `400`.
2. Invalid key returns `400`.
3. Duplicate identical submission returns same `orderId`.
4. Duplicate changed payload with same key returns `409`.
5. Completed replay still returns same WhatsApp `nextStep.whatsappUrl`.

For WhatsApp specifically:

- configure tenant in WhatsApp mode
- submit create-order with idempotency key
- repeat request
- assert:
  - one order exists
  - same `orderId`
  - same `nextStep.type`
  - same `whatsappUrl`

---

## 13. Suggested implementation sequence

1. Add Prisma model/enum + migration.
2. Generate Prisma client.
3. Add idempotency error types.
4. Add request fingerprint helper.
5. Add idempotency service/repository/helper.
6. Add `idempotencyKey` to `CreateOrderCommand`.
7. Read/validate `Idempotency-Key` in controller.
8. Refactor response-building into reusable persisted-order response helper.
9. Integrate idempotency into `CreateOrderService`.
10. Add unit tests for fingerprint/idempotency logic.
11. Add service tests.
12. Add HTTP/integration tests.
13. Run backend checks:
    - `pnpm build`
    - targeted tests
    - broader tests if needed

Likely touched files summary:

- `apps/backend/prisma/schema/order.prisma`
- `apps/backend/prisma/migrations/<timestamp>_add_order_create_idempotency_keys/migration.sql`
- `apps/backend/src/generated/prisma/*`
- `apps/backend/src/modules/order/order.module.ts`
- `apps/backend/src/modules/order/application/commands/create-order/create-order.command.ts`
- `apps/backend/src/modules/order/application/commands/create-order/create-order.http.controller.ts`
- `apps/backend/src/modules/order/application/commands/create-order/create-order.service.ts`
- `apps/backend/src/modules/order/application/commands/create-order/create-order.types.ts`
- `apps/backend/src/modules/order/application/commands/create-order/create-order-idempotency.service.ts`
- `apps/backend/src/modules/order/application/commands/create-order/create-order-request-fingerprint.ts`
- `apps/backend/src/modules/order/application/commands/create-order/create-order-response.builder.ts`
- `apps/backend/src/modules/order/application/commands/create-order/create-order-completion-context.loader.ts`
- `apps/backend/src/modules/order/application/commands/create-order/create-order.service.spec.ts`
- `apps/backend/src/modules/order/application/commands/create-order/create-order-request-fingerprint.spec.ts`
- `apps/backend/src/modules/order/application/commands/create-order/create-order-idempotency.service.spec.ts`
- `apps/backend/src/modules/order/application/commands/create-order/create-order-idempotency.http.int-spec.ts`

---

## Main edge cases covered

- Double click creates only one order.
- Browser retry returns same response.
- WhatsApp redirect retry returns same WhatsApp URL.
- Same key with changed payload is rejected.
- Replay does not emit duplicate events/emails.
- Coupon is not redeemed twice.
- Inventory assignments are not duplicated.
- Availability/business failures do not permanently consume key.
- Process crash during in-progress can be handled by stale in-progress reclaim if we include that minimal safeguard.
