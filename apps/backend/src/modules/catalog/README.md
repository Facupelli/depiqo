# Catalog

Catalog owns the tenant's current commercial rental offering. It defines the commercial identity of what can be rented, branch-specific rental offers, and the equipment requirements needed to fulfill those offerings. Catalog does not own physical asset allocation or rental fulfillment, and it does not represent historical confirmed-rental truth.

## Domain concepts

### Rentable Item

A Rentable Item is the tenant-owned commercial/catalog identity of something that can be offered for rent. Its fulfillment is described through equipment requirements rather than through child Rentable Items.

### Rental Offer

A Rental Offer makes a Rentable Item commercially available in a branch.

Visibility controls whether an offer is discoverable. Rentability controls whether an already-known offer may participate in rental selection. These are independent: a hidden but rentable offer can still be selected directly.

### Fulfillment Requirement

Fulfillment requirements describe the equipment types and quantities needed to fulfill a Rentable Item. They express operational demand, but do not identify or reserve physical assets. Catalog composition is expressed through these requirements, not through child Rentable Items.

## Boundaries

- Asset Inventory owns equipment types and physical assets. Catalog references equipment types in fulfillment requirements.
- Pricing determines proposed pricing. Catalog does not own pricing.
- Rental Commitment owns accepted rental selections, physical availability, assignments, reservations, and historical rental facts.
