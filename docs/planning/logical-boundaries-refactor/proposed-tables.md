# Logical Boundaries Refactor - Proposed Tables

## Purpose

This document proposes a database table shape for the bounded-context refactor described in `docs/ddd/`.

The goal is to keep the current rental logic where possible while making the logical boundaries clearer, especially around:

- combos/bundles;
- accessories;
- rental equipment demand;
- asset assignment vs asset blocking;
- shared concepts such as Equipment Type and Branch.

This is a planning document only. It does not define a final migration plan.

---

## Naming direction

| Current name | Proposed domain name |
|---|---|
| Order | Rental |
| Customer | Rental Customer |
| Location | Branch |
| ProductType | Equipment Type / Rental Item Type |
| Bundle | Combo |
| OrderItem | Rental Item |
| OrderItemAccessory | Selected Accessory |
| AssetAssignment | Assigned Asset / Asset Block |

`Equipment Type` is a shared reference concept. Catalog owns its full definition, but Rental Commitment, Pricing, and Asset Inventory may reference it locally.

---

## Bounded contexts

Proposed bounded contexts:

- Rental Commitment
- Catalog
- Asset Inventory
- Pricing
- Tenant Management
- Contracts
- Notifications

The Lightweight Customer Rental Flow remains an application/product flow, not a bounded context for now.

---

# Catalog Context

## Purpose

Catalog owns what the tenant offers or configures for rental.

It answers:

> What can the customer or tenant staff choose/configure?

Catalog does not own rental commitments, asset assignment, or asset blocks.

---

## `equipment_categories`

Replaces/renames current `product_categories`.

```text
equipment_categories
--------------------
id
tenant_id
name
description
created_at
updated_at
```

### Constraints

- `unique(tenant_id, name)`
- category names are tenant-scoped.

---

## `equipment_types`

Replaces/renames current `product_types`.

An Equipment Type is the model/type that can be requested, used in combos, used as an accessory, and/or backed by physical assets.

```text
equipment_types
---------------
id
tenant_id
category_id nullable
billing_unit_id nullable
name
description
image_url
is_rentable_standalone boolean
can_be_combo_component boolean
can_be_accessory boolean
requires_asset_tracking boolean
tracking_mode
attributes jsonb
exclude_from_new_arrivals boolean
published_at nullable
retired_at nullable
deleted_at nullable
created_at
updated_at
```

### Meaning of capability flags

- `is_rentable_standalone`: can appear as a standalone customer/staff-selectable rental item.
- `can_be_combo_component`: can be included inside a combo.
- `can_be_accessory`: can be suggested/selected as an accessory during preparation.
- `requires_asset_tracking`: fulfillment requires physical asset records.

### Examples

```text
Sony FX3 Camera
is_rentable_standalone = true
can_be_combo_component = true
can_be_accessory = false
requires_asset_tracking = true

Camera Rig Handle
is_rentable_standalone = false
can_be_combo_component = true
can_be_accessory = false
requires_asset_tracking = true

Battery
is_rentable_standalone = true
can_be_combo_component = true
can_be_accessory = true
requires_asset_tracking = true

Charger
is_rentable_standalone = false
can_be_combo_component = false
can_be_accessory = true
requires_asset_tracking = true
```

### Constraints

- standalone catalog listing only includes rows where `is_rentable_standalone = true`.
- combo components must reference rows where `can_be_combo_component = true`.
- accessory rules must reference accessory rows where `can_be_accessory = true`.
- retired/deleted equipment types cannot be selected for new rentals.
- existing confirmed rentals preserve snapshots and are not mutated by equipment type changes.

---

## `equipment_type_branch_visibility`

Location/branch-scoped catalog visibility for standalone equipment types.

```text
equipment_type_branch_visibility
--------------------------------
id
tenant_id
equipment_type_id
branch_id
is_visible
is_rentable
created_at
updated_at
```

### Constraints

- `unique(tenant_id, equipment_type_id, branch_id)`
- an equipment type can be hidden or non-rentable in a branch.
- this controls standalone visibility only; combo components do not need to be individually visible as standalone items.

---

## `combos`

Replaces/renames current `bundles`.

A Combo is a catalog-visible all-or-nothing package composed of equipment types.

```text
combos
------
id
tenant_id
billing_unit_id nullable
name
description
image_url
published_at nullable
retired_at nullable
deleted_at nullable
created_at
updated_at
```

### Constraints

- a published combo must have at least two valid components.
- catalog changes do not mutate already-created rental combo snapshots.
- combo pricing rules live in Pricing, not directly in Catalog, unless a simple base price is intentionally kept here.

---

## `combo_components`

Defines current editable combo contents.

```text
combo_components
----------------
id
tenant_id
combo_id
equipment_type_id
quantity
sort_order nullable
created_at
updated_at
```

### Constraints

- `unique(combo_id, equipment_type_id)`
- `quantity > 0`
- `equipment_type.can_be_combo_component = true`
- components are the current catalog definition only; rental history uses snapshots.

---

## `combo_branch_visibility`

Branch-scoped visibility for combos.

```text
combo_branch_visibility
-----------------------
id
tenant_id
combo_id
branch_id
is_visible
is_rentable
created_at
updated_at
```

### Constraints

- `unique(tenant_id, combo_id, branch_id)`
- a combo may be visible/rentable in a branch even if some component equipment types are not standalone-visible.
- combo availability still depends on physical asset availability for all components in the branch.

---

## `equipment_accessory_rules`

Replaces/renames current `accessory_links`.

Defines compatible/default accessory relationships between equipment types.

```text
equipment_accessory_rules
-------------------------
id
tenant_id
primary_equipment_type_id
accessory_equipment_type_id
is_default
Default_quantity nullable
notes nullable
created_at
updated_at
```

### Constraints

- `unique(tenant_id, primary_equipment_type_id, accessory_equipment_type_id)`
- `primary_equipment_type_id != accessory_equipment_type_id`
- `accessory_equipment_type.can_be_accessory = true`
- if `is_default = true`, `default_quantity > 0`
- if `is_default = false`, `default_quantity` may be null.

### Design note

Accessories remain based on `equipment_types` with capabilities instead of introducing a separate `accessory_types` table. This supports items like batteries that can be both standalone rentable items and accessories.

---

# Asset Inventory Context

## Purpose

Asset Inventory owns the physical truth about assets.

It answers:

> Which physical units exist, where are they, who owns them, and are they eligible candidates?

Asset Inventory does not own rental asset blocks.

---

## `assets`

Physical units. Keeps the current core design: one row per physical rentable/trackable unit.

```text
assets
------
id
tenant_id
branch_id
equipment_type_id
owner_id nullable
serial_number nullable
notes nullable
condition/status
is_active
deleted_at nullable
created_at
updated_at
```

### Constraints

- asset references an `equipment_type`.
- if the equipment type is tracked, each available physical unit should have an asset row.
- assignment availability is based on eligible assets minus overlapping active asset blocks.
- `branch_id` identifies the branch/sucursal the asset is assignable from.
- Asset Inventory must not write rental asset blocks directly.

### Availability concept

```text
available quantity = eligible asset count - overlapping active asset block count
```

---

## `asset_owners`

Current `owners`, renamed by language if desired.

```text
asset_owners
------------
id
tenant_id
name
contact_info fields/jsonb
created_at
updated_at
```

### Constraints

- owners are tenant-scoped.
- tenant-owned assets may use nullable `owner_id` or an explicit tenant owner row; final choice TBD.

---

## `owner_contracts`

Existing concept retained.

```text
owner_contracts
---------------
id
tenant_id
owner_id
asset_id nullable
terms fields/jsonb
basis
owner_share
rental_share
valid_from
valid_to nullable
created_at
updated_at
```

### Constraints

- owner contracts determine third-party asset eligibility and future split calculations.
- owner contracts should not complicate Rental Commitment more than necessary.

---

# Rental Commitment Context

## Purpose

Rental Commitment owns rental requests, confirmed commitments, preparation, selected accessories, assigned asset references, and all rental-related asset blocks.

It answers:

> What was requested, what became committed, which physical assets satisfy it, and which assets are blocked?

---

## `rentals`

Replaces/renames current `orders`.

```text
rentals
-------
id
tenant_id
branch_id
rental_customer_id nullable
coupon_id nullable
status
fulfillment_method
rental_number
source_mode -- PROFESSIONAL | WHATSAPP_STYLE | STAFF_DRAFT etc.
notes nullable
insurance_selected boolean
booking_snapshot jsonb
price_snapshot jsonb
period_start
period_end
prepared_at nullable
reviewed_at nullable
reviewed_by_user_id nullable
rejection_reason nullable
created_at
updated_at
deleted_at nullable
```

### Constraints

- a rental belongs to exactly one tenant.
- a rental belongs to exactly one real branch.
- no rental belongs to an "all branches" view.
- a rental has one shared rental period.
- Pending/request rentals do not block assets.
- Draft rentals do not block assets until confirmed.
- Confirmed rentals must have assigned and blocked equipment assets.
- `unique(tenant_id, rental_number)`

---

## `rental_items`

Replaces/renames current `order_items`.

Stores what the customer/staff selected.

```text
rental_items
------------
id
tenant_id
rental_id
item_kind -- EQUIPMENT_TYPE | COMBO
equipment_type_id nullable
combo_id nullable
quantity
name_snapshot
price_snapshot jsonb nullable
manual_pricing_override jsonb nullable
created_at
updated_at
```

### Constraints

- `quantity > 0`
- if `item_kind = EQUIPMENT_TYPE`, `equipment_type_id is not null` and `combo_id is null`.
- if `item_kind = COMBO`, `combo_id is not null` and `equipment_type_id is null`.
- standalone equipment rental items require `equipment_type.is_rentable_standalone = true` at selection time.
- combo rental items preserve combo snapshots.

---

## `rental_combo_snapshots`

Replaces/renames current `bundle_snapshots`.

Stores the combo as selected at rental creation/confirmation time.

```text
rental_combo_snapshots
----------------------
id
tenant_id
rental_id
rental_item_id
combo_id
combo_name_snapshot
combo_description_snapshot nullable
combo_price_snapshot jsonb nullable
created_at
```

### Constraints

- `unique(rental_item_id)`
- exists only for `rental_items.item_kind = COMBO`.
- never changes when the Catalog combo is later edited.

---

## `rental_combo_snapshot_components`

Replaces/renames current `bundle_snapshot_components`.

Stores historical combo contents for the selected rental combo.

```text
rental_combo_snapshot_components
--------------------------------
id
tenant_id
rental_combo_snapshot_id
equipment_type_id
equipment_name_snapshot
quantity_per_combo
total_quantity
standalone_price_snapshot jsonb nullable
created_at
```

### Constraints

- `quantity_per_combo > 0`
- `total_quantity = quantity_per_combo * rental_item.quantity`
- snapshot rows do not change when combo components are later edited.

---

## `rental_equipment_demands`

Materialized fulfillment demand for a rental.

A row means:

> This rental requires this quantity of this equipment type for fulfillment, because of this rental item/source.

```text
rental_equipment_demands
------------------------
id
tenant_id
rental_id
source_rental_item_id
source_kind -- STANDALONE_ITEM | COMBO_COMPONENT
equipment_type_id
equipment_name_snapshot
quantity
created_at
updated_at
```

### Constraints

- `quantity > 0`
- generated from standalone rental items and combo snapshot components.
- source-level rows are preferred over only aggregated rows for traceability.
- availability/assignment may aggregate by `equipment_type_id` when needed.
- demands are the input for equipment asset assignment and accessory suggestions.

### Why this exists

`rental_items` preserve what the customer selected.

`rental_combo_snapshot_components` preserve what selected combos contained at that time.

`rental_equipment_demands` preserve what physical equipment must be fulfilled.

This avoids making asset assignment, availability, preparation, and edit flows repeatedly re-expand combos.

---

## `selected_accessories`

Replaces/renames current `order_item_accessories`.

Stores accessories selected during preparation.

```text
selected_accessories
--------------------
id
tenant_id
rental_id
rental_equipment_demand_id nullable
accessory_equipment_type_id
accessory_name_snapshot
quantity_suggested nullable
quantity_selected
status -- SUGGESTED | SELECTED | REMOVED | PARTIALLY_AVAILABLE etc.
notes nullable
created_at
updated_at
```

### Constraints

- `quantity_selected >= 0`
- `accessory_equipment_type.can_be_accessory = true` at selection time.
- accessories are optional.
- a rental can continue with zero selected accessories.
- selected accessories may be linked to a specific equipment demand, which handles accessories for equipment coming from combos.

---

## `assigned_assets`

New table or conceptual split from current `asset_assignments`.

Stores which physical assets were selected to satisfy equipment demand or selected accessories.

```text
assigned_assets
---------------
id
tenant_id
rental_id
rental_equipment_demand_id nullable
selected_accessory_id nullable
asset_id
assignment_kind -- EQUIPMENT | ACCESSORY
source -- AUTO | MANUAL future
status -- ASSIGNED | REPLACED | RELEASED
created_at
released_at nullable
release_reason nullable
```

### Constraints

- equipment assignments reference `rental_equipment_demand_id`.
- accessory assignments reference `selected_accessory_id`.
- assigned assets must be eligible assets from Asset Inventory.
- confirmed rentals must have enough active equipment assignments to satisfy their active equipment demands.

---

## `asset_blocks`

New table or conceptual split from current `asset_assignments`.

Stores no-overlap reservations/unavailability records for physical assets.

```text
asset_blocks
------------
id
tenant_id
rental_id nullable
assigned_asset_id nullable
asset_id
block_kind -- RENTAL_EQUIPMENT | RENTAL_ACCESSORY | MAINTENANCE | BLACKOUT
period tstzrange
status -- ACTIVE | RELEASED
created_at
released_at nullable
release_reason nullable
```

### Constraints

- active asset blocks must not overlap for the same `asset_id`.
- PostgreSQL exclusion constraint should enforce no-overlap, for example:

```text
exclude using gist (
  asset_id with =,
  period with &&
)
where released_at is null
```

- every active assigned asset for a confirmed rental must have an active block covering the rental period.
- maintenance/blackout blocks may exist without a rental or assigned asset.
- Rental Commitment is the sole authority over rental-related asset blocks.

### Conceptual difference from assignment

Assignment answers:

> Which physical asset satisfies this rental demand?

Block answers:

> Which physical asset is unavailable for this period?

They are related but not identical.

---

## `rental_owner_splits`

Renames/currently similar to `order_item_owner_splits`.

```text
rental_owner_splits
-------------------
id
tenant_id
rental_id
rental_item_id nullable
assigned_asset_id
asset_id
owner_id
contract_id
status
owner_share
rental_share
basis
gross_amount
net_amount
owner_amount
rental_amount
created_at
updated_at
```

### Constraints

- split terms are snapshotted at assignment/confirmation time.
- future owner contract changes do not mutate confirmed rental splits.

---

# Pricing Context

## Purpose

Pricing owns rules and calculations. Rental Commitment owns accepted price snapshots.

---

## Retained pricing tables

Existing tables can mostly remain, renamed only if needed:

```text
pricing_tiers
long_rental_discounts
long_rental_discount_exclusions
promotions
promotion_exclusions
coupons
coupon_redemptions
```

### Constraints

- Pricing returns a price breakdown.
- Rental Commitment stores the accepted `price_snapshot`.
- pricing rule changes do not mutate confirmed rentals.

---

## `combo_pricing_rules`

Optional explicit table if combo pricing needs to be separated from generic pricing tiers.

```text
combo_pricing_rules
-------------------
id
tenant_id
combo_id
rule_type -- FIXED_PRICE | DISCOUNT_PERCENT | DISCOUNT_AMOUNT etc.
value
valid_from nullable
valid_to nullable
created_at
updated_at
```

### Constraints

- Pricing owns combo price/discount behavior.
- Catalog owns combo composition.
- Rental Commitment owns selected combo price snapshot.

---

# Tenant Management Context

## Purpose

Tenant Management owns tenants, users, roles, branches, schedules, product mode configuration, and tenant/location rules.

---

## Core tables

Current tables can mostly remain, with language changes over time:

```text
tenants
tenant_users / users / user_profiles
roles
role_permissions
branches -- current locations
branch_schedules -- current location_schedules
tenant_configuration
product_mode_configuration
```

### Branch constraints

- a rental belongs to one branch.
- "all branches" is only a backoffice view mode, never a rental branch.
- branch schedule/configuration changes affect future operations, not already confirmed rental snapshots.

---

# Contracts Context

## Purpose

Contracts owns contract generation, signing requests, signing status, and signed document references.

---

## Core tables

Current document signing tables can mostly remain, renamed if desired:

```text
contracts
document_signing_requests
signed_contracts
```

### Constraints

- contract generation uses Rental Commitment snapshots.
- contract signing does not automatically make a rental immutable.
- if a confirmed/prepared rental changes, Contracts may mark re-signing required.

---

# Notifications Context

## Purpose

Notifications owns system-generated notification delivery.

---

## Core tables

```text
notifications
notification_templates
notification_deliveries
```

### Constraints

- notification failures do not invalidate confirmed rentals.
- WhatsApp-style manual handoff is not automatic notification infrastructure.

---

# Key invariants

## Rental commitment invariants

- Pending/request rentals do not assign or block assets.
- Draft rentals do not assign or block assets until confirmed.
- Confirmed rentals must have enough active equipment assignments for their equipment demands.
- Confirmed rentals must have active asset blocks for assigned equipment assets.
- Confirmation must atomically preserve:
  - rental status;
  - price snapshot;
  - equipment demands;
  - assigned equipment assets;
  - equipment asset blocks.

## Combo invariants

- A combo is an all-or-nothing catalog offer.
- Combo components are editable catalog definitions.
- Selected rental combos preserve snapshots.
- Rental history must display original combo contents, not current edited combo contents.
- Combo expansion creates rental equipment demand.
- A combo may include equipment types that are not rentable standalone.

## Accessory invariants

- Accessories are optional during preparation.
- Accessories are based on equipment type capabilities (`can_be_accessory`).
- An equipment type can be both standalone rentable and usable as an accessory.
- Accessory suggestions come from equipment accessory rules and rental equipment demands.
- Selected accessories can be assigned and blocked, but the rental can continue with zero accessories.

## Asset block invariants

- Rental Commitment owns rental-related asset blocks.
- Active blocks for the same asset must not overlap.
- Blocks may exist without rental assignment for maintenance/blackout.
- Assignment and blocking are conceptually separate:
  - assignment = asset selected to satisfy demand;
  - block = asset unavailable for a period.

---

# Open questions

1. Should `equipment_types` be renamed to `rental_item_types` to better support accessories and future non-equipment rentable items?
2. Should `assigned_assets` and `asset_blocks` be physically split immediately, or split conceptually first while migrating from current `asset_assignments`?
3. Should tenant-owned assets use `owner_id = null` or an explicit tenant owner row?
4. Should combo pricing have a dedicated `combo_pricing_rules` table or remain inside generic pricing tiers?
5. Should selected accessories be linked to source-level `rental_equipment_demands` always, or allow rental-level accessory selection not tied to a specific demand?
6. Should non-tracked/bulk inventory ever be supported, or should the system keep one `assets` row per rentable unit?
