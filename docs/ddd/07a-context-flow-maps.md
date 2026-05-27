# 07a - Context Flow Maps

## Purpose

This document tests the revised bounded contexts against important business flows.

The goal is to make dependencies visible:

- which context owns the decision;
- which context owns the data being written;
- which cross-boundary reads/calls are needed;
- which events or reactions happen after the main operation.

These maps are not implementation diagrams. They are boundary tests.

## Revised bounded contexts

The current bounded contexts are:

- Rental Commitment
- Catalog
- Asset Inventory
- Pricing
- Tenant Management
- Contracts
- Notifications

The Lightweight Customer Rental Flow is not a bounded context for now. It is a customer-facing product/application flow.

Preparation is not a separate bounded context for now. It lives inside Rental Commitment.

Locations and Scheduling are not a separate bounded context for now. They live inside Tenant Management.

---

# Map 1 - Confirm Rental Order

## Flow

Tenant staff clicks Confirm on a Pending or Draft rental order.

## Goal

Turn a non-committed order into a confirmed rental commitment.

## Context graph

```text
Tenant User
   |
   | command: Confirm Rental Order
   v
Rental Commitment
   |
   | owns read/write:
   | - order status
   | - order items
   | - rental period
   | - selected location reference
   | - tenant customer reference
   | - confirmed price snapshot
   | - assigned equipment asset references
   | - equipment asset blocks
   |
   | cross-boundary read/call:
   |--> Tenant Management
   |      reason: validate tenant/user permissions, tenant configuration,
   |              selected location, pickup/return slots, timezone, and product mode
   |
   | cross-boundary read/call:
   |--> Catalog
   |      reason: validate selected items are still rentable,
   |              expand combos, and read catalog snapshots if needed
   |
   | cross-boundary read/call:
   |--> Pricing
   |      reason: calculate/validate order price and return price breakdown
   |
   | cross-boundary read/call:
   |--> Asset Inventory
   |      reason: find eligible physical asset candidates by equipment,
   |              location, condition, ownership, and active status
   |
   | owns write:
   | - confirmed price snapshot
   | - price breakdown snapshot
   | - assigned equipment asset references
   | - equipment asset blocks
   | - order status = Confirmed
   |
   v
Event published: Rental Order Confirmed
```

## Boundary notes

Rental Commitment owns the final committed facts.

Pricing owns the pricing rules and returns a price breakdown, but Rental Commitment owns the accepted price snapshot for the order.

Asset Inventory owns the physical asset profile, but Rental Commitment owns asset assignments and asset blocks.

Catalog owns what can be offered, but Rental Commitment owns what was requested and committed.

Tenant Management owns tenant configuration, users, locations, schedules, pickup/return slots, timezone, and product mode configuration. Rental Commitment owns the selected location and rental period snapshot.

## Strong consistency

These writes must succeed or fail together:

- confirmed price snapshot;
- price breakdown snapshot;
- assigned equipment asset references;
- equipment asset blocks;
- order status = Confirmed.

## Reactions after confirmation

```text
Rental Order Confirmed
   |
   | event reaction
   |--> Contracts
   |      may prepare contract generation/signing flow
   |
   | event reaction
   |--> Notifications
   |      may notify customer/staff in professional mode
   |
   | event reaction
   |--> Reporting / Analytics
          may record the confirmation
```

These reactions must not control whether the order becomes confirmed unless a specific business rule says so.

---

# Map 2 - Create WhatsApp-style Pending Rental Order

## Flow

A tenant customer completes the lightweight customer catalog flow and chooses to send the generated WhatsApp message.

## Goal

Capture the customer’s rental request without creating a final rental commitment.

## Context graph

```text
Tenant Customer
   |
   | uses
   v
Lightweight Customer Rental Flow
(application/product flow, not bounded context)
   |
   | cross-boundary read/call:
   |--> Tenant Management
   |      reason: load tenant/location configuration, product mode,
   |              location options, schedules, and timezone
   |
   | cross-boundary read/call:
   |--> Catalog
   |      reason: show customer-facing catalog items, combos,
   |              categories, and location-scoped visibility
   |
   | cross-boundary read/call:
   |--> Pricing
   |      reason: show quoted/estimated price if enabled
   |
   | cross-boundary read/call:
   |--> Rental Commitment
   |      reason: create customer-originated Pending order
   |
   v
Rental Commitment
   |
   | owns write:
   | - Pending order
   | - order items
   | - rental period
   | - selected location reference
   | - tenant customer/contact reference or snapshot
   | - quoted/estimated price snapshot if shown
   | - order source/mode = WhatsApp-style
   |
   | does not write:
   | - assigned assets
   | - asset blocks
   | - confirmed status
   |
   v
Lightweight Customer Rental Flow
   |
   | owns application behavior:
   | - generated WhatsApp message
   |
   v
Customer manually sends WhatsApp message
```

## Boundary notes

The Lightweight Customer Rental Flow owns the customer experience and WhatsApp handoff, but it is not a bounded context for now.

Rental Commitment owns the Pending order.

A Pending order is a normal rental order without assigned assets or asset blocks.

The WhatsApp message is manually sent by the customer. The system does not use WhatsApp Business API.

## Strong consistency

Creating the Pending order should save the request data consistently.

Dangerous partial states:

- WhatsApp message generated but Pending order not saved;
- Pending order saved without required order/customer data;
- Pending order accidentally blocks assets;
- Pending order accidentally becomes Confirmed.

## Reactions after pending order creation

```text
Pending Rental Order Created
   |
   | visible to
   |--> Tenant staff backoffice
   |
   | outside system
   |--> tenant/customer WhatsApp conversation
```

No assets are reserved until tenant staff confirms the order.

---

# Map 3 - Edit Confirmed Rental Order

## Flow

Tenant staff edits a Confirmed rental order before pickup or delivery.

## Goal

Change an accepted operational order while preserving consistency between rental period, items, price snapshot, assigned assets, and asset blocks.

## Context graph

```text
Tenant User
   |
   | command: Edit Confirmed Rental Order
   v
Rental Commitment
   |
   | owns read/write:
   | - order status
   | - order items
   | - rental period
   | - selected location reference
   | - confirmed price snapshot
   | - assigned equipment asset references
   | - equipment asset blocks
   |
   | cross-boundary read/call:
   |--> Tenant Management
   |      reason: validate permissions, tenant configuration,
   |              selected location, pickup/return slots, timezone, and product mode
   |
   | cross-boundary read/call:
   |--> Catalog
   |      reason: validate changed items and expand combos if needed
   |
   | cross-boundary read/call:
   |--> Pricing
   |      reason: recalculate/validate price if items, period,
   |              coupons, promotions, discounts, or manual adjustments changed
   |
   | cross-boundary read/call:
   |--> Asset Inventory
   |      reason: find eligible replacement/additional asset candidates
   |              if availability-affecting fields changed
   |
   | owns write:
   | - updated order items
   | - updated rental period if changed
   | - updated confirmed price snapshot if changed
   | - updated price breakdown snapshot if changed
   | - released old equipment asset blocks if no longer needed
   | - assigned new equipment asset references if needed
   | - created new equipment asset blocks if needed
   |
   v
Event published: Confirmed Rental Order Edited
```

## Boundary notes

Confirmed means reserved, not final.

A signed contract does not automatically make the order immutable.

Rental Commitment owns all changes that affect committed rental facts.

Pricing recalculates and returns a price breakdown, but Rental Commitment preserves the updated price snapshot.

Asset Inventory provides asset facts, but Rental Commitment owns block release/recreation.

Tenant Management validates tenant/location/schedule rules, but Rental Commitment owns the order's selected location and rental period snapshot.

## Strong consistency

These writes must succeed or fail together when affected:

- order items;
- rental period;
- confirmed price snapshot;
- price breakdown snapshot;
- assigned equipment asset references;
- equipment asset blocks.

Dangerous partial states:

- order period changed but blocks still use the old period;
- equipment added without assets blocked;
- equipment removed but old assets remain blocked;
- assets released before replacements are successfully blocked;
- price snapshot changed but order edit failed.

## Reactions after edit

```text
Confirmed Rental Order Edited
   |
   | event reaction
   |--> Contracts
   |      may mark contract re-signing required
   |
   | event reaction
   |--> Notifications
   |      may notify in professional mode
   |
   | event reaction
   |--> Reporting / Analytics
          may record change
```

---

# Map 4 - Prepare Rental Order

## Flow

Tenant staff prepares a Confirmed rental order, reviews suggested accessories, and confirms selected accessory quantities.

## Goal

Decide which accessories are included and reserve/block those accessory assets.

Preparation now lives inside Rental Commitment.

## Context graph

```text
Tenant User
   |
   | command: Start Preparation / Review Accessories
   v
Rental Commitment
   |
   | owns read/write:
   | - preparation state
   | - accessory review
   | - selected accessory quantities
   | - assigned accessory asset references
   | - accessory asset blocks
   |
   | cross-boundary read/call:
   |--> Tenant Management
   |      reason: validate permissions, tenant configuration,
   |              selected location, and product mode
   |
   | cross-boundary read/call:
   |--> Catalog
   |      reason: get compatible/default accessories for equipment
   |
   | cross-boundary read/call:
   |--> Asset Inventory
   |      reason: find eligible accessory asset candidates by accessory type,
   |              location, condition, ownership, and active status
   |
   | owns decision:
   | - which accessories were selected by staff
   | - whether to continue with fewer or zero accessories
   |
   | owns write:
   | - selected accessory quantities
   | - assigned accessory asset references
   | - accessory asset blocks
   | - prepared state
   |
   v
Event published: Rental Order Prepared
```

## Boundary notes

Preparation is not a separate bounded context for now.

Rental Commitment owns preparation state, accessory selection, accessory assignment references, and accessory asset blocks.

Catalog owns accessory definitions, compatibility, and default accessory rules.

Asset Inventory owns the physical accessory asset profile.

If no accessories are selected, Rental Commitment creates no accessory blocks.

The order can continue with zero accessories.

## Strong consistency

These writes must succeed or fail together when accessories are selected:

- selected accessory quantities;
- assigned accessory asset references;
- accessory asset blocks;
- prepared state.

Dangerous partial states:

- prepared order says accessories are included but they are not blocked;
- accessories are blocked but preparation was not marked consistently;
- unavailable accessory assets are blocked;
- old accessory blocks remain after preparation is edited.

## Reactions after preparation

```text
Rental Order Prepared
   |
   | event reaction
   |--> Contracts
   |      may generate/sign contract using prepared accessory details
   |
   | event reaction
   |--> Notifications
   |      may notify staff/customer in professional mode
   |
   | event reaction
   |--> Reporting / Analytics
          may record preparation
```

---

# Map 5 - Generate / Request Contract Signing

## Flow

Tenant staff requests contract generation/signing for a Confirmed or Prepared rental order.

## Goal

Generate a contract using stable order facts and track signing state without controlling the order lifecycle.

## Context graph

```text
Tenant User
   |
   | command: Generate / Request Contract Signing
   v
Contracts
   |
   | cross-boundary read/call:
   |--> Rental Commitment
   |      reason: get confirmed/prepared order details,
   |              price snapshot, selected accessories,
   |              assigned assets, rental period, location, and customer snapshot
   |
   | cross-boundary read/call:
   |--> Tenant Management
   |      reason: get tenant contract configuration and validate permissions
   |
   | owns write:
   | - contract document/reference
   | - signing request state
   |
   v
Event published: Contract Signing Requested
```

## Boundary notes

Contracts owns document/signing state.

Rental Commitment owns order state and committed/prepared order facts.

Contract signing does not automatically make the order immutable.

If the order changes later, Contracts may mark re-signing required.

## Strong consistency

Contract creation/signing state should be internally consistent inside Contracts.

It should not be part of the core order confirmation transaction.

## Reactions after contract events

```text
Contract Signed
   |
   | event reaction
   |--> Rental Commitment
   |      may record contract status reference if needed,
   |      but order state is not automatically locked
```

---

# Cross-Flow Authority Summary

## Rental Commitment owns

- Pending orders.
- Draft orders.
- Confirmed orders.
- Order status.
- Order items as requested rental demand.
- Selected rental period.
- Selected location reference.
- Confirmed price snapshot.
- Price breakdown snapshot.
- Equipment asset assignment references.
- Equipment asset blocks.
- Preparation state.
- Accessory selections.
- Accessory asset assignment references.
- Accessory asset blocks.
- All rental-related no-overlap block invariants.

## Catalog owns

- Equipment definitions.
- Category definitions.
- Combo definitions.
- Catalog visibility.
- Accessory definitions.
- Compatible/default accessory definitions.

## Pricing owns

- Pricing rules.
- Pricing tiers.
- Promotions.
- Discounts.
- Coupons.
- Custom adjustment rules.
- Price calculation.
- Price breakdown generation.

Pricing does not own durable order price state.

## Asset Inventory owns

- Physical asset profile.
- Asset identity.
- Asset condition.
- Asset location.
- Asset owner.
- Asset active/inactive status.
- Whether an asset is an equipment asset, accessory asset, or both.

## Tenant Management owns

- Tenant profile.
- Tenant users.
- Roles/permissions.
- Tenant configuration.
- Product mode configuration.
- Locations/sucursales.
- Location schedules.
- Pickup slot rules.
- Return slot rules.
- Timezone rules.

## Contracts owns

- Contract generation.
- Signing request.
- Signed contract state.
- Re-signing required state.

## Notifications owns

- Notification templates.
- Notification delivery.
- Delivery status.

## Lightweight Customer Rental Flow owns as application flow

- Customer-facing lightweight flow.
- WhatsApp message generation.
- WhatsApp handoff experience.

It is not a bounded context for now.
