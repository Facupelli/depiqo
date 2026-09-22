# Offering Setup

The `offering-management` module implements **Offering Setup**, the tenant-admin orchestration boundary for creating or composing related records across provider modules. Offering Setup coordinates cross-context authoring workflows while provider bounded contexts remain authoritative for the domain records they own. It owns no persisted domain records of its own.

## Setup semantics

### Physical and commercial concepts

Physical inventory concepts and commercial rental concepts are distinct. An Equipment Type describes the kind of physical equipment used operationally. A Rentable Item / Rental Offer describes what is commercially offered to customers. Creating a standalone rentable offering from an Equipment Type does not collapse those concepts into one domain object.

Commercial offerings express the equipment needed for fulfillment through fulfillment requirements. Those requirements describe operational demand; they are not physical Assets.

### Branch independence

The Branch associated with a physical Asset and the Branch in which a Rental Offer is commercially available are independent concepts. Physical location does not automatically determine commercial availability, and commercial availability does not imply that a specific physical Asset belongs to that Branch.

### Category independence

The category used to classify an Equipment Type and the category used to classify its corresponding standalone commercial Rentable Item are independent. Physical equipment classification and commercial product classification may differ intentionally.

### Coordinated setup

A coordinated setup operation should have an all-or-nothing business outcome: if the overall operation fails, it should not leave a partial cross-context commercial, physical, or pricing setup. The provider modules remain owners of the resulting records.

## Boundaries

- Offering Setup coordinates cross-context tenant-admin setup workflows but does not own the provider domain records they create.
- Asset Inventory, Catalog, Pricing, Tenant Management, and other provider modules remain authoritative for their own concepts and invariants.
- Physical inventory relationships and commercial offering relationships must not be conflated merely because Offering Setup coordinates them together.
