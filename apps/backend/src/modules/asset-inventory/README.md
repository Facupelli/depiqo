# Asset Inventory

Asset Inventory owns the tenant's current physical equipment inventory. It owns Equipment Types as operational equipment concepts, individual physical Assets, and current physical asset ownership. It represents current mutable physical truth, not rental-specific assignments, reservations, or historical rental participation.

## Domain concepts

### Equipment Type

An Equipment Type represents a kind of physical equipment used to fulfill operational rental demand. It is not the customer-facing commercial thing selected for rent. Catalog may reference Equipment Types when defining fulfillment requirements, but Catalog offerings and Equipment Types are different domain concepts.

### Asset

An Asset is one concrete physical unit of an Equipment Type. Asset Inventory owns its current mutable physical facts.

An Asset is not itself a rental assignment, rental reservation, or historical rental participation. Those rental-specific facts belong to Rental Commitment.

### Asset ownership

Asset Inventory owns current physical asset ownership and current owner-related facts. Rental Commitment preserves the ownership and owner-contract facts accepted for an asset's rental participation when those facts are needed historically.

Later changes to current Asset Inventory ownership must not reinterpret historical rental assignments.

### Accessory defaults

Accessory defaults represent suggested operational relationships between Equipment Types. They can be used to suggest accessories during rental preparation, but they do not themselves create Catalog composition, rental selections, asset assignments, or asset reservations.

## Boundaries

- Catalog owns customer-facing commercial offerings and references Equipment Types when defining fulfillment requirements.
- Rental Commitment owns rental-specific physical availability, assignments, reservations, and historical participation facts.
