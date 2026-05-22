# Rental Orders And Fulfillment

This document explains how orders, booking mode, assignment stage, bundles, and delivery fit together in the rental domain.

Related docs:

- `rental-domain-model.md` for the overview
- `rental-locations-and-availability.md` for availability and assignment primitives
- `rental-pricing.md` for how priced order lines are calculated
- `rental-ownership-and-payouts.md` for downstream owner split implications
- `user-customer-auth.md` for customer versus user identity boundaries around order flows

## Orders As Commercial Records

`Order` represents the commercial rental record for a customer checkout or staff-created rental. For confirmed/active orders, it is the rental agreement the business accepted. For request-to-book orders in `PENDING_REVIEW`, it is only a customer request awaiting staff acceptance.

An order belongs to:

- one tenant
- one location
- optionally one customer

It contains `OrderItem[]`, one shared booking period, and booking metadata that preserves how the rental was requested.

The key shape is:

- one order has one rental period
- all order items share that order-level period
- an order may mix product and bundle items
- the booking snapshot preserves the local booking inputs used at checkout

Items describe what was bought, but the booking window belongs to the order as a whole.

## Order Items

`OrderItem` is the line-level boundary between what the customer bought and how the system fulfills it.

Each order item is either:

- `PRODUCT`
- `BUNDLE`

An order item references either `productTypeId` or `bundleId` and stores `priceSnapshot` so pricing remains historically correct even if catalog pricing changes later.

Asset assignments attach at the order-item level, which allows one order to contain multiple independently fulfilled lines.

## Booking Snapshot And Fulfillment Method

Orders keep a booking snapshot that preserves:

- pickup date
- pickup time
- return date
- return time
- timezone used to interpret those values

Orders also carry a fulfillment method:

- `PICKUP`
- `DELIVERY`

If the order uses delivery, it also carries an `OrderDeliveryRequest` with recipient and address details.

For actor boundaries between customer-facing and admin-facing order flows, see `user-customer-auth.md`.

## Booking Mode And Initial State

The initial order status and reservation side effects depend on tenant booking mode:

- `INSTANT_BOOK` creates the order as `CONFIRMED` and creates `COMMITTED` asset assignments immediately.
- `REQUEST_TO_BOOK` creates the order as `PENDING_REVIEW` and does **not** create asset assignments or block availability at customer submission time.

That distinction matters because request-to-book separates customer intent from business acceptance and physical reservation. A pending-review request is review work for staff; it is not yet an operational reservation.

## Order Lifecycle

The current status model is:

- `PENDING_REVIEW`
- `CONFIRMED`
- `REJECTED`
- `EXPIRED`
- `ACTIVE`
- `COMPLETED`
- `CANCELLED`

The valid transition shape is:

- `PENDING_REVIEW -> CONFIRMED | REJECTED | EXPIRED`
- `CONFIRMED -> ACTIVE | CANCELLED`
- `ACTIVE -> COMPLETED`

This reflects a workflow where review and acceptance may be separate from final operational execution.

## Assignment Stage

Asset assignments are the physical reservation primitive. An order blocks availability only through asset assignments, not merely by existing in a particular order status.

The assignment stage enum currently includes:

- `HOLD`
- `COMMITTED`

For the supported booking modes:

- instant-book orders start with `COMMITTED` assignments
- request-to-book orders start with no assignments while they are `PENDING_REVIEW`

Lifecycle actions update order state and reservation state together:

- approving/confirming a pending-review order re-checks availability and creates `COMMITTED` assignments transactionally
- approving/confirming a pending-review order can fail if the requested assets/items are no longer available for the requested rental period
- rejecting or expiring a pending-review order closes the request without releasing inventory, because no inventory was blocked by the pending request
- cancelling a confirmed order releases committed assignments
- activating and completing an order advance fulfillment lifecycle around already committed assignments

`HOLD` remains part of the shared model, but customer request-to-book submission should not use it to reserve inventory. The current request-to-book fulfillment story is centered on approval-time commitment, not tentative reservation.

## Assignment Source

`AssignmentSource` still records where fulfillment came from:

- `OWNED`
- `EXTERNAL`

This supports procurement tracking and downstream financial logic, but it is secondary to assignment stage in the current operational model.

## Bundles In Orders

Bundles are sellable catalog objects, not special inventory entities.

That means:

- customers can rent a bundle as one order item
- the system still fulfills it using the component product types inside the bundle
- bundle booking eventually results in asset assignments against concrete assets

Bundles are snapshotted at booking time through:

- `BundleSnapshot`
- `BundleSnapshotComponent`

This preserves booked composition and bundle-level price even if the catalog definition changes later.

## Bundle Availability

A bundle is fulfillable only if all required component quantities can be satisfied for the requested period.

So bundle availability is effectively an AND across all required component lines, each evaluated against real asset availability.

Mixed orders are valid. An order may contain a bundle item, a standalone product item, or even a product that also appears inside the bundle.
