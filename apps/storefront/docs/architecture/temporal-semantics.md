# Storefront Temporal Semantics

Use this document when adding or changing date, time, schedule, pricing, cart, or rental request behavior in Storefront.

## Two Different Values

`YYYY-MM-DD` is a `LocalDate`: a business calendar date with no time or timezone. An explicit-offset ISO datetime identifies one exact instant.

```text
/rental and /cart URL search params -> LocalDate -> YYYY-MM-DD
schedule slots -> exact instant -> ISO datetime with Z or numeric offset
```

Do not convert a date-only value to UTC or construct an instant merely to transport it. In particular, do not use `new Date(localDate)` or `toISOString()` for `/rental` and `/cart` search parameters. Keep their `YYYY-MM-DD` values unchanged until a workflow explicitly resolves a local date and time using the branch timezone.

## Transport Boundary

Storefront transport uses wire values, not backend application values:

```text
browser -> TanStack server function -> Storefront API/BFF -> explicit-offset ISO string
shared API contract -> ExplicitOffsetInstantWireSchema -> string
backend Nest request boundary -> Date
```

- Schedule-slot `instant` values are already exact instants. Keep them as ISO strings.
- TanStack server functions and API helpers must preserve and serialize those wire strings directly.
- Validate outbound instant-bearing bodies with the shared contract schema, then `JSON.stringify` the resulting object.
- Do not use transforming instant schemas in Storefront transport. `ExplicitOffsetInstantSchema` is a backend application parser that returns `Date`.
- Do not add `.toISOString()` merely to undo a schema transformation.

## Rental and Cart Flows

Pricing and rental confirmation use the selected pickup and return schedule-slot instants. They must not derive an instant from `/rental` or `/cart` date-only URL parameters.

The URL dates describe the customer's calendar search. Selected schedule slots provide the exact rental period submitted to pricing and confirmation.

## Related Code

- `../../../packages/api-contracts/src/explicit-offset-instant.schema.ts`
- `../../../packages/api-contracts/src/local-date.schema.ts`
- `../../src/modules/rental-commitment/cart/review-cart/confirmed-rental-request.ts`
- `../../src/modules/rental-commitment/cart/prospective-cart-cost/`
