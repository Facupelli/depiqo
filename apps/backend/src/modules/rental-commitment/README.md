# Rental Commitment

Rental Commitment owns the accepted rental commitment. It owns the rental-specific facts that become operational or historical truth, including accepted commercial selections, operational equipment demand, physical asset participation and reservation, accepted pricing and delivery facts, and rental-specific preparation decisions.

Confirmed rental facts must remain understandable independently of later changes in mutable neighboring modules.

## Core domain concepts

### Rental Selection

A Rental Selection represents the commercial thing accepted as part of the rental. It preserves the identity and relevant accepted facts of what was selected commercially.

For a composite or package offering, the selection remains the commercial parent even when fulfilling it requires several kinds of equipment.

### Rental Demand Line

A Rental Demand Line represents the operational equipment demand required to fulfill a selection. It may derive from the fulfillment requirements of a selected Catalog offer, but it is not itself the customer-facing commercial selection.

The distinction is:

- selection = commercial truth;
- demand = operational fulfillment truth.

### Assigned Asset

An assigned asset is a physical asset participating in fulfillment of rental demand. Assignment is not physical pickup, delivery, possession, or return tracking.

Current or open participation contributes to current fulfillment. Closed participation records prior fulfillment and remains historical; it must not be reinterpreted as current fulfillment when participation ends. Confirmed-rental edits that end or replace participation preserve the prior participation history rather than rewriting it as though it never existed.

Rental Commitment preserves the ownership and owner-contract facts needed to interpret an assignment historically. Later changes to current Asset Inventory ownership must not rewrite that history.

## Reservation and availability

### Prospective availability

Prospective availability answers whether current physical capacity appears sufficient for proposed demand. It is advisory: it does not assign assets or reserve them.

Catalog supplies the fulfillment requirements, and Rental Commitment evaluates physical capacity. For an offering requiring multiple equipment types, capacity is constrained by the scarcest required equipment.

### Asset Blocks

Asset blocks represent the physical reservation of assets for rental participation. A physical asset cannot have overlapping active reservation periods.

## Confirmed rental semantics

Confirmation creates the accepted commercial and operational rental commitment.

`CONFIRMED` does not mean that the customer has picked up the equipment, that delivery has occurred, or that equipment has been returned. It also does not imply legal or historical immutability. Supported confirmed-rental edits may change current accepted facts while preserving prior historical participation where required.

Contract-signing state is separate from Rental Commitment lifecycle state.

## Accepted historical facts

Rental Commitment preserves the accepted facts needed to understand a rental after mutable provider modules change.

### Pricing

Pricing proposes current prices. Rental Commitment owns the accepted pricing facts of the rental; current Pricing configuration must not be used later to reconstruct what the rental accepted.

A supported rental edit may intentionally obtain and accept a new proposed price.

### Delivery

Delivery may provide current proposed delivery terms. Rental Commitment preserves the delivery facts accepted for the rental. Where accepted delivery affects the physical reservation period, that relationship is interpreted using the accepted delivery facts rather than later proposals.

### Asset ownership

Asset Inventory owns current physical ownership. Rental Commitment preserves the ownership and owner-contract facts needed to interpret historical asset participation, so current ownership changes must not reinterpret past rental assignments.

## Accessories

Asset Inventory may define equipment-type accessory defaults. Those defaults are suggestions for rental preparation; they do not automatically become rental selections, assignments, or reservations.

Rental Commitment owns the rental-specific accessory decisions and physical participation actually accepted for a rental.

## Boundaries

- Catalog defines current commercial offers and fulfillment requirements; Rental Commitment owns what the rental actually accepts.
- Asset Inventory owns current physical asset facts; Rental Commitment owns rental-specific assignments, reservations, and historical participation facts.
- Pricing proposes current prices; Rental Commitment owns accepted rental pricing.
- Delivery proposes current delivery terms; Rental Commitment owns accepted rental delivery facts.
