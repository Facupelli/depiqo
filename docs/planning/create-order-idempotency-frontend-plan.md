# Create-Order Idempotency Frontend Implementation Plan

## Goal

Finish the create-order idempotency feature in `apps/web` for customer cart checkout.

Backend now requires customer order creation requests to send:

```http
Idempotency-Key: <uuid>
```

Frontend must generate, preserve, and forward this key so duplicate submits and retry scenarios do not create duplicate orders.

Primary flow:

```txt
cart checkout submit
  -> build CreateOrderDto
  -> get/reuse idempotency key for this exact payload
  -> TanStack Query mutation
  -> TanStack Start server function
  -> backend POST /orders with Idempotency-Key header
```

---

## Backend contract recap

Endpoint:

```http
POST /orders
Idempotency-Key: <uuid>
```

Success response remains:

```ts
CreateOrderResponseDto
```

Relevant backend problem details:

| Type | Status | Frontend behavior |
| --- | ---: | --- |
| `errors://missing-idempotency-key` | 400 | Should not happen if frontend is correct. Treat as unexpected booking error. |
| `errors://invalid-idempotency-key` | 400 | Should not happen if generated with `crypto.randomUUID()`. Treat as unexpected booking error. |
| `errors://idempotency-key-in-progress` | 409 | Retry automatically with the same key when `retryable: true`. |
| `errors://idempotency-key-conflict` | 409 | Discard current key and ask user to submit again intentionally. |

Retryable in-progress extension:

```json
{
  "retryable": true
}
```

---

## Current frontend flow

Relevant files:

- `apps/web/src/features/rental/cart/hooks/use-cart-order.ts`
- `apps/web/src/features/orders/orders.mutations.ts`
- `apps/web/src/features/orders/orders.api.ts`
- `apps/web/src/lib/api.ts`
- `apps/web/src/lib/api-auth.ts`

Current submission path:

1. `useCartOrder.handleBook` builds `CreateOrderDto` inline.
2. It calls `useCreateOrder().mutateAsync(dto)`.
3. `useCreateOrder` calls TanStack Start server function `createOrder({ data: dto })`.
4. Server function forwards `POST /orders` to backend through `authenticatedApiFetch`.
5. No idempotency key is currently generated or forwarded.

---

## Implementation principles

- Keep idempotency key out of `CreateOrderDto`; it is an HTTP header, not body data.
- Make `useCreateOrder` require idempotency variables so callsites cannot submit without a key.
- Own checkout idempotency in the cart checkout orchestration layer, not presentational components.
- Avoid `useEffect` watchers for payload changes. Compare a deterministic payload signature at submit time.
- Keep retry logic local to create-order checkout behavior; do not enable broad TanStack Query mutation retries.
- Clear the cart after every successful order creation response, including WhatsApp redirect mode.

---

## Step 1. Add web-local create-order idempotency constants/types

Create or update web-local types for the mutation/server function input.

Suggested shape:

```ts
type CreateOrderMutationVariables = {
  dto: CreateOrderDto;
  idempotencyKey: string;
};
```

Suggested constant:

```ts
const CREATE_ORDER_IDEMPOTENCY_HEADER = "idempotency-key";
```

Likely touched files:

- `apps/web/src/features/orders/orders.api.ts`
- `apps/web/src/features/orders/orders.mutations.ts`
- optional new file: `apps/web/src/features/orders/orders.constants.ts`
- optional new file: `apps/web/src/features/orders/types/create-order.types.ts`

Tasks:

- Add a UUID-bearing input type for create-order mutation variables.
- Decide whether to colocate the header constant in `orders.api.ts` or export it from an orders constants file.
- Keep the public mutation API explicit: `{ dto, idempotencyKey }`.

---

## Step 2. Update the TanStack Start `createOrder` server function

Change the server function input from raw `CreateOrderDto` to an object containing:

```ts
{
  dto: CreateOrderDto;
  idempotencyKey: string;
}
```

Validate with Zod:

```ts
z.object({
  dto: createOrderSchema,
  idempotencyKey: z.string().uuid(),
})
```

Forward the key to backend as a request header:

```ts
headers: {
  "idempotency-key": data.idempotencyKey,
}
```

Likely touched files:

- `apps/web/src/features/orders/orders.api.ts`

Tasks:

- Add `createOrderInputSchema` near the server function.
- Update `inputValidator` to parse `{ dto, idempotencyKey }`.
- Change backend `apiFetch` body from `data` to `data.dto`.
- Add the idempotency header to `apiFetch` options.
- Keep existing `ProblemDetailsError` wrapping behavior unchanged.
- Keep response parsing with `createOrderResponseSchema.parse(result)`.

Notes:

- `apps/web/src/lib/api.ts` already accepts `headers` through `RequestInit`, so no generic API-client change should be necessary.
- `apps/web/src/lib/api-auth.ts` forwards request options, so no auth fetch change should be necessary.

---

## Step 3. Update `useCreateOrder` mutation variables

`useCreateOrder` should require the idempotency key.

Before:

```ts
useMutation<CreateOrderResponseDto, ProblemDetailsError, CreateOrderDto>
```

After:

```ts
useMutation<
  CreateOrderResponseDto,
  ProblemDetailsError,
  CreateOrderMutationVariables
>
```

Mutation function:

```ts
mutationFn: async (variables) => {
  const result = await createOrder({ data: variables });
  ...
}
```

Likely touched files:

- `apps/web/src/features/orders/orders.mutations.ts`

Tasks:

- Replace `OrderMutationOptions` variable type from `CreateOrderDto` to `CreateOrderMutationVariables`.
- Update `useCreateOrder` mutation function to pass `{ dto, idempotencyKey }` into the server function.
- Keep `meta.invalidates = orderKeys.all()`.
- Confirm all `useCreateOrder` callsites are updated. Current known callsite:
  - `apps/web/src/features/rental/cart/hooks/use-cart-order.ts`

---

## Step 4. Extract create-order DTO construction from the cart hook

The cart hook currently builds the `CreateOrderDto` inline in `handleBook`. Extract this to a pure utility so the same payload can be used for submission and signature generation.

Suggested new utility:

```txt
apps/web/src/features/rental/cart/cart-order-submit.utils.ts
```

Possible functions:

```ts
export function buildCartCreateOrderDto(params): CreateOrderDto
```

```ts
export function createCartCreateOrderSubmissionSignature(dto: CreateOrderDto): string
```

Likely touched files:

- new: `apps/web/src/features/rental/cart/cart-order-submit.utils.ts`
- `apps/web/src/features/rental/cart/hooks/use-cart-order.ts`

Tasks:

- Move payload construction into `buildCartCreateOrderDto`.
- Include all order-affecting fields:
  - `locationId`
  - `pickupDate`
  - `returnDate`
  - `pickupTime`
  - `returnTime`
  - `currency`
  - `items`
  - `insuranceSelected`
  - `couponCode`
  - `fulfillmentMethod`
  - `deliveryRequest`
- Normalize `couponCode` consistently with existing behavior:
  - trimmed non-empty string
  - `undefined` when empty
- Preserve current delivery request normalization behavior.
- Preserve current item order.

Signature notes:

- The frontend signature does not need to match the backend request hash.
- It only needs to determine whether the user is submitting the same logical payload again.
- Use deterministic stable JSON/stringification rather than relying on object identity.
- Since `CreateOrderDto` construction controls key order, a small stable stringify helper is acceptable.

---

## Step 5. Add checkout idempotency key lifecycle helper

The cart checkout needs to reuse a key while retrying the same payload and generate a new key when the payload changes.

Suggested implementation options:

### Option A: small hook

```txt
apps/web/src/features/rental/cart/hooks/use-create-order-idempotency.ts
```

Possible API:

```ts
const idempotency = useCreateOrderIdempotency();

const idempotencyKey = idempotency.getKeyForSignature(signature);
idempotency.clear();
idempotency.discard();
```

### Option B: inline state/ref in `use-cart-order.ts`

This is acceptable if kept small, but a hook is preferred for testability and separation.

Likely touched files:

- optional new: `apps/web/src/features/rental/cart/hooks/use-create-order-idempotency.ts`
- `apps/web/src/features/rental/cart/hooks/use-cart-order.ts`

Tasks:

- Store the active `{ signature, key }` pair.
- Generate `crypto.randomUUID()` when:
  - no active key exists
  - active signature differs from current submission signature
- Reuse the active key when signature matches.
- Clear key after successful order creation.
- Discard key after idempotency conflict.

Important behavior:

```txt
same payload + double click/retry -> same key
changed payload -> new key
success -> clear key
idempotency conflict -> discard key
```

No `useEffect` should be needed. Payload comparison happens inside `handleBook` at submit time.

---

## Step 6. Add idempotency-specific error predicates

Create small helpers to identify backend idempotency problem details.

Possible location:

- `apps/web/src/features/rental/cart/cart-booking-errors.ts`
- or new: `apps/web/src/features/rental/cart/cart-order-idempotency.errors.ts`

Suggested predicates:

```ts
isRetryableCreateOrderInProgressError(error: unknown): boolean
isCreateOrderIdempotencyConflictError(error: unknown): boolean
```

Likely touched files:

- `apps/web/src/features/rental/cart/cart-booking-errors.ts`
- optional new: `apps/web/src/features/rental/cart/cart-order-idempotency.errors.ts`

Tasks:

- Detect `ProblemDetailsError`.
- Check `problemDetails.type === "errors://idempotency-key-in-progress"`.
- Confirm `problemDetails.retryable === true` for automatic retries.
- Detect `problemDetails.type === "errors://idempotency-key-conflict"`.
- Keep this logic out of presentational components.

---

## Step 7. Add automatic retry for retryable in-progress conflicts

When backend returns `errors://idempotency-key-in-progress` with `retryable: true`, retry with the same idempotency key.

Recommended policy:

```txt
3 total attempts
500ms delay between attempts
same idempotency key for every attempt
```

Suggested helper:

```txt
apps/web/src/features/rental/cart/cart-order-idempotency-retry.ts
```

Possible API:

```ts
export async function retryCreateOrderWhenInProgress<T>(
  operation: () => Promise<T>,
): Promise<T>
```

Likely touched files:

- new: `apps/web/src/features/rental/cart/cart-order-idempotency-retry.ts`
- `apps/web/src/features/rental/cart/hooks/use-cart-order.ts`
- optional: `apps/web/src/features/rental/cart/cart-order-idempotency.errors.ts`

Tasks:

- Implement a small `wait(ms)` helper.
- Attempt the operation immediately.
- On retryable in-progress problem:
  - wait 500ms
  - retry same operation
- Stop after 3 total attempts.
- Rethrow the last error if attempts are exhausted.

Do not use global TanStack Query retry config for this. This retry is semantic and specific to create-order idempotency.

---

## Step 8. Wire idempotency into `useCartOrder.handleBook`

Update checkout submission orchestration.

Likely touched files:

- `apps/web/src/features/rental/cart/hooks/use-cart-order.ts`
- `apps/web/src/features/rental/cart/cart-order-submit.utils.ts`
- `apps/web/src/features/rental/cart/hooks/use-create-order-idempotency.ts`
- `apps/web/src/features/rental/cart/cart-order-idempotency-retry.ts`

Tasks:

- Keep current pre-submit validation unchanged:
  - authenticated customer
  - pickup/return time selected
  - delivery details complete when delivery is selected
- Build `CreateOrderDto` with extracted utility.
- Build submission signature from the DTO.
- Get/reuse idempotency key for that signature.
- Call mutation as:

```ts
await createOrder({ dto, idempotencyKey })
```

- Wrap the mutation in automatic retry helper.
- On success:
  - clear idempotency key
  - clear cart
  - navigate according to `nextStep`
- On idempotency conflict:
  - discard idempotency key
  - show a user-facing message
- On exhausted in-progress retry:
  - keep or discard key depending on chosen UX; recommended: keep key if payload unchanged so user click can replay same request
  - show a user-facing message that the order is still processing
- Preserve existing handling for:
  - availability conflicts
  - auth errors
  - delivery-not-supported errors
  - unknown errors

Success cart-clearing detail:

- Clear the cart for every successful `CreateOrderResponseDto`.
- This includes WhatsApp redirect mode.
- Recommended flow:

```txt
createdOrder received
  -> clear idempotency key
  -> clearCart()
  -> navigate to WhatsApp/contact-team/confirmation route
```

---

## Step 9. Extend cart booking error parsing and messages

Current booking errors are parsed in:

```txt
apps/web/src/features/rental/cart/cart-booking-errors.ts
```

Add idempotency-specific parsed kinds if needed:

```ts
type CartBookingIdempotencyConflictError = {
  kind: "idempotency-conflict";
  message: string;
};

type CartBookingIdempotencyInProgressError = {
  kind: "idempotency-in-progress";
  message: string;
};
```

Likely touched files:

- `apps/web/src/features/rental/cart/cart-booking-errors.ts`
- `apps/web/src/features/rental/cart/hooks/use-cart-order.ts`
- possibly `apps/web/src/features/rental/cart/components/cartpage-sidebar.tsx` only if UI needs new copy placement; likely not necessary because existing `bookingErrorMessage` can display it.

Tasks:

- Add parser branches for:
  - `errors://idempotency-key-conflict`
  - exhausted `errors://idempotency-key-in-progress`
- Return Spanish user-facing messages consistent with current cart copy.
- Update `handleBook` switch to handle new kinds.

Suggested messages:

- Conflict:

```txt
Los datos de la reserva cambiaron durante el envío. Revisá la reserva y volvé a confirmarla.
```

- Still in progress after retry:

```txt
Tu reserva todavía se está procesando. Esperá unos segundos y volvé a intentarlo.
```

---

## Step 10. Confirm interaction with auth/session retry

`authenticatedApiFetch` may refresh the access token and retry once on `401`.

Likely touched files:

- no changes expected
- review only:
  - `apps/web/src/lib/api-auth.ts`
  - `apps/web/src/lib/api.ts`

Tasks:

- Ensure idempotency header is part of the `requestOptions` passed into `authenticatedApiFetch`.
- Confirm session refresh retry reuses the same header because it reuses the same request options.
- No extra code should be needed if header is set in `orders.api.ts`.

Why this matters:

- If token refresh happens after the backend did not process the first request, retry is safe.
- If there is uncertainty, using the same idempotency key keeps the create-order operation safe.

---

## Step 11. Testing plan

### Unit tests for submit utilities

Likely files:

- new: `apps/web/src/features/rental/cart/cart-order-submit.utils.test.ts`
- or nearby existing test naming convention if different

Cases:

- Builds `CreateOrderDto` with expected fields.
- Trims empty coupon to `undefined`.
- Includes delivery request when fulfillment method is delivery.
- Signature is stable for the same DTO.
- Signature changes when any order-affecting input changes:
  - cart item quantity
  - dates/times
  - location
  - coupon
  - insurance
  - fulfillment method
  - delivery request

### Unit tests for idempotency helper

Likely files:

- new: `apps/web/src/features/rental/cart/hooks/use-create-order-idempotency.test.ts`
- or test extracted non-hook logic if hook testing utilities are not available

Cases:

- Generates a UUID for first signature.
- Reuses key for the same signature.
- Generates new key for changed signature.
- Clears key on success.
- Discards key on conflict.

### Unit tests for retry helper

Likely files:

- new: `apps/web/src/features/rental/cart/cart-order-idempotency-retry.test.ts`

Cases:

- Returns immediately on success.
- Retries retryable in-progress errors.
- Uses 3 total attempts.
- Rethrows non-retryable errors.
- Rethrows in-progress error after attempts are exhausted.

### Integration/component-level tests if existing patterns support it

Likely files:

- existing or new tests around `use-cart-order`
- route/cart page tests if present

Cases:

- Successful order clears cart in normal confirmation flow.
- Successful order clears cart in WhatsApp redirect flow.
- `useCreateOrder` receives `{ dto, idempotencyKey }`.
- Idempotency conflict discards key and shows message.

---

## Step 12. Manual verification checklist

Run from `apps/web/`:

```bash
pnpm test
pnpm lint
pnpm check
```

Manual browser scenarios:

1. Submit cart normally.
   - Request includes `Idempotency-Key` header.
   - Order succeeds.
   - Cart is cleared.
   - User is navigated correctly.

2. WhatsApp mode tenant.
   - Submit cart.
   - Request includes `Idempotency-Key` header.
   - User is navigated to WhatsApp created route.
   - Cart is cleared.

3. Double-click submit / repeated click while pending.
   - Same key is reused for same payload.
   - Only one order is created.
   - Replay/duplicate does not create a second order.

4. Change payload after an error.
   - New submission signature is generated.
   - New idempotency key is used.

5. Simulated in-progress response.
   - Frontend retries automatically with the same key.
   - If retry eventually succeeds, cart clears and navigation continues.
   - If retries exhaust, user sees processing message.

6. Simulated idempotency conflict.
   - Key is discarded.
   - User sees conflict message.
   - Intentional new submit uses a new key.

---

## Suggested implementation sequence

1. Add create-order idempotency input type/schema and header constant.
2. Update `orders.api.ts` server function to accept `{ dto, idempotencyKey }` and forward header.
3. Update `orders.mutations.ts` so `useCreateOrder` requires idempotency variables.
4. Extract cart create-order DTO builder from `use-cart-order.ts`.
5. Add deterministic submission signature utility.
6. Add idempotency key lifecycle helper/hook.
7. Add idempotency error predicates.
8. Add automatic retry helper for retryable in-progress conflicts.
9. Wire all pieces into `useCartOrder.handleBook`.
10. Extend cart booking error parser/messages.
11. Add focused tests for utilities/helpers.
12. Run `pnpm test`, `pnpm lint`, and `pnpm check` from `apps/web/`.

---

## Likely touched files summary

Expected:

- `apps/web/src/features/orders/orders.api.ts`
- `apps/web/src/features/orders/orders.mutations.ts`
- `apps/web/src/features/rental/cart/hooks/use-cart-order.ts`
- `apps/web/src/features/rental/cart/cart-booking-errors.ts`

Likely new:

- `apps/web/src/features/rental/cart/cart-order-submit.utils.ts`
- `apps/web/src/features/rental/cart/hooks/use-create-order-idempotency.ts`
- `apps/web/src/features/rental/cart/cart-order-idempotency-retry.ts`
- optional: `apps/web/src/features/rental/cart/cart-order-idempotency.errors.ts`

Possible tests:

- `apps/web/src/features/rental/cart/cart-order-submit.utils.test.ts`
- `apps/web/src/features/rental/cart/cart-order-idempotency-retry.test.ts`
- `apps/web/src/features/rental/cart/hooks/use-create-order-idempotency.test.ts`

Probably not needed:

- `apps/web/src/lib/api.ts`
- `apps/web/src/lib/api-auth.ts`

---

## Open decisions before implementation

- Exact file names for the idempotency helper and retry helper.
- Whether to test idempotency key lifecycle as a React hook or extract framework-free logic for easier unit testing.
- Whether retry delay should be fixed `500ms` or mild backoff (`500ms`, `1000ms`). Current recommendation: fixed `500ms`, 3 total attempts.
