# Inventory

## Meaning

The Inventory module owns the Backoffice experience for managing the business's physical rental equipment.

It represents the tenant-facing intent:

> Manage the equipment I actually have.

Inventory describes the current physical truth of the business's equipment: what units exist, what type of equipment they are, where they are, what condition they are in, whether they can currently be used, and who owns them.

The module should use concrete operational language familiar to rental staff.

It must not expose backend concepts such as asset projections, rental blocks, reference authorities, or persistence models unless an explicit support or administrative workflow requires them.

## Tenant-facing responsibilities

Inventory is the primary area for managing physical equipment.

It may include capabilities such as:

```text
view equipment types
view physical equipment units
add equipment types
add physical units
edit equipment information
record serial or reference numbers
manage equipment condition
activate or deactivate equipment units
manage current branch or location
move equipment between branches
manage ownership
review current availability context
configure suggested accessories
archive or remove equipment when supported
```

The exact capabilities available depend on the implemented inventory workflows.

Do not treat rental-specific assignment or reservation as Inventory configuration merely because it concerns physical equipment.

Inventory manages the equipment itself.

Rentals manages how that equipment is committed to a particular rental.

## Product language

Prefer tenant-facing terminology over backend terminology.

Examples:

```text
Backend                         Backoffice

EquipmentType                   Equipment type
Asset                           Equipment unit / Unit
Asset serialNumber              Serial number / Reference
Asset branchId                  Current branch / Location
Asset condition                 Condition
Asset active state              Active / Available for use
Asset ownership                 Ownership
Accessory Default               Suggested accessory
RentalAssetCandidate            Hidden
AssetBlock                      Reserved / Unavailable
```

Concepts such as the following should normally remain invisible:

```text
RentalAssetCandidate
candidate projection
projection synchronization
reference authority
display-facts capability
authoring capability
asset block as an entity
persistence model names
```

Expose the operational meaning instead.

## Core concepts and workflows

### Equipment types and physical units

Inventory distinguishes between a kind of equipment and the individual physical units of that equipment.

For example:

```text
Equipment type:
  Sony FX3

Physical units:
  CAM-001
  CAM-002
  CAM-003
```

The equipment type describes what kind of physical equipment the business has.

A physical unit is one actual piece of equipment.

This distinction is meaningful to tenant staff and should remain visible in the Backoffice.

An equipment type may have zero, one, or many physical units.

Do not confuse the equipment type with the Product that customers rent.

For example:

```text
Product:
  Sony FX3 Camera Rental

Required equipment:
  Sony FX3 × 1

Inventory:
  CAM-001
  CAM-002
  CAM-003
```

The Product belongs to the commercial offering.

The equipment type and units belong to Inventory.

### Products and Inventory

Products and Inventory represent different tenant-facing concerns.

```text
Products
  What the business offers for rent.

Inventory
  The physical equipment the business actually has.
```

A standalone Product may appear closely related to one equipment type, but they must not be treated as the same concept.

For example, changing the Product's storefront description should not change the equipment type.

Adding another physical Sony FX3 unit should not create another Product.

Likewise, a package Product may require several equipment types without owning those Inventory records.

Inventory should not infer Product or package structure from the physical units that happen to exist.

### Equipment profile

A physical unit may expose current operational facts such as:

```text
equipment type
internal code
serial number
condition
current branch or location
active state
ownership
metadata
```

These describe the equipment's current physical profile.

The exact fields exposed should follow actual operational needs.

Do not surface backend fields merely because they are persisted.

Prefer labels that describe what staff need to know or change.

For example:

```text
Serial number
Condition
Current branch
Owner
Status
```

rather than generic technical metadata labels.

### Condition and usability

Inventory owns the current condition and active state of physical equipment.

These facts may influence whether the equipment can be assigned to new rentals.

Use tenant-facing states appropriate to the implemented domain.

Examples may include:

```text
Active
Inactive
Available for use
Under maintenance
Damaged
Retired
```

Do not introduce condition states that the backend does not actually support.

Do not equate every temporary rental conflict with an Inventory status change.

A unit that is reserved for another rental may still be active and in good condition.

Likewise, an active unit is not necessarily available for a particular rental period.

Current physical usability and rental-period availability are different concepts.

### Location and branches

Inventory manages where physical equipment currently belongs or is located when that concept is supported.

Use language such as:

```text
Current branch
Location
Move to branch
Transfer equipment
```

A location change affects the equipment's current physical profile and may affect future rental eligibility.

It must not rewrite historical rentals that previously used that unit from another branch.

Branch definitions themselves belong to Settings.

Inventory consumes those branch choices when managing physical equipment.

### Ownership

Inventory owns the current ownership facts of physical equipment.

A unit may be owned by the tenant or by a third party when supported by the product.

Use straightforward language such as:

```text
Owned by us
Third-party owned
Owner
Ownership details
```

Current ownership is not necessarily the same as historical rental payout truth.

If ownership affects a confirmed rental financially, that rental may preserve its own historical owner or payout information.

Changing the current equipment owner must not silently rewrite historical rental records.

### Suggested accessories

Inventory may define default accessory relationships between equipment types.

For example:

```text
Sony FX3

Suggested accessories:
  Battery × 2
  Tripod × 1
```

These are operational suggestions.

They do not automatically add accessories to every Product or Rental.

Use language such as:

```text
Suggested accessories
Usually include
Default quantity
```

Do not present these relationships as mandatory unless the domain explicitly introduces mandatory accessory rules.

Rental-specific accessory decisions belong to Rentals.

### Availability

Inventory may display useful current or future availability context for a physical unit, but it does not own rental reservations.

For example, a unit detail may show:

```text
Available
Reserved Aug 18–21
Assigned to Rental #1042
Unavailable for these dates
```

This is useful operational information.

However, rental-specific reservations and conflicts are owned by the Rentals workflow.

Do not expose `AssetBlock` as a tenant-facing entity.

Do not create or release rental reservations directly from general Inventory management unless the action is explicitly part of a Rental workflow.

An active, healthy physical unit is not automatically available for every rental period.

### Adding equipment

Adding equipment should follow the tenant's operational intent rather than backend persistence structure.

For example:

> Add three Sony FX3 cameras to Main Branch.

may require:

```text
one equipment type
three physical equipment units
branch references
ownership information
category information
```

The UI may coordinate those operations as one workflow.

Do not require the user to understand internal authoring capabilities or reference-validation steps.

If the equipment is also being made rentable as a Product, that larger workflow may belong to Products and coordinate Inventory creation behind the scenes.

The ownership of the resulting physical equipment still remains with Inventory.

## Backend relationships

The Inventory frontend module primarily composes Asset Inventory together with supporting facts from other backend bounded contexts.

These relationships do not define the frontend module boundary.

### Asset Inventory

Asset Inventory is the main backend owner of physical equipment truth.

It owns:

```text
equipment types
physical assets
current condition
current active state
current branch/location reference
current ownership
equipment metadata
equipment-type accessory defaults
```

The Backoffice translates `Asset` into tenant-facing concepts such as Equipment Unit or Unit.

Asset Inventory does not own rental-specific equipment assignment or rental availability.

The frontend must preserve that distinction.

### Rental Commitment

Rental Commitment owns:

```text
rental-specific equipment assignments
rental-created equipment reservations
rental-period availability decisions
rental-specific accessory selections
accessory assignments
historical ownership or payout snapshots when required
```

Inventory may display rental-related availability information, but it must not become authoritative over those rental facts.

For example:

```text
Change CAM-003's condition
  → Inventory

Assign CAM-003 to Rental #1042
  → Rentals
```

### Rental Catalog

Rental Catalog owns Products and their fulfillment requirements.

Inventory equipment types may be referenced by Products to describe what equipment is required to fulfill them.

Inventory does not own that Product definition.

Do not infer Products or package composition from physical inventory.

### Tenant Management

Tenant Management provides current supporting facts such as:

```text
branches
categories
tenant identity
permissions
```

Inventory may use branches for physical location and Categories for equipment organization.

The Backoffice should expose those through tenant-facing language rather than Tenant Management terminology.

Branch and Category configuration itself belongs to Settings.

### Offering Setup

Offering Setup may coordinate creation of Inventory records as part of a larger Product setup workflow.

For example:

> Make Sony FX3 rentable and create the three units I currently own.

may involve both Products and Inventory behind one UI workflow.

Offering Setup does not own the resulting equipment records and should not appear as an Inventory concept.

## Frontend boundary

Code belongs in `src/modules/inventory/` when its primary tenant-facing intent is:

> Manage this equipment.

Use the user's intent to determine frontend ownership rather than the backend module providing the underlying data.

Examples:

```text
Add physical camera CAM-004
  → Inventory

Change CAM-003's serial number
  → Inventory

Mark CAM-003 as under maintenance
  → Inventory

Move CAM-003 to Downtown Branch
  → Inventory

Change who owns CAM-003
  → Inventory

Configure Tripod as a suggested accessory for Sony FX3
  → Inventory

Create a Sony FX3 rental Product
  → Products

Change what equipment the Filming Kit requires
  → Products

Assign CAM-003 to Rental #1042
  → Rentals

See why CAM-003 is reserved next week
  → Rentals, possibly surfaced from Inventory

Edit Main Branch itself
  → Settings
```

An Inventory feature may consume supporting data from Rental Commitment, Rental Catalog, or Tenant Management when required to provide useful equipment context.

That is expected and does not violate the frontend module boundary.

Do not move equipment-specific behavior into shared locations simply because several backend contexts contribute information to the screen.

## Internal structure

Prefer vertical slices organized around tenant workflows.

Possible slices include:

```text
inventory/
  equipment-types/
  equipment-detail/
  add-equipment/
  edit-equipment/
  add-units/
  equipment-units/
  move-equipment/
  change-condition/
  ownership/
  accessory-suggestions/
```

These are examples, not required folders.

Create a slice only when the capability actually exists.

A substantial nested area may itself contain vertical slices when that improves clarity.

For example:

```text
inventory/
  equipment-units/
    list-units/
    unit-detail/
    edit-unit/
    move-unit/
```

Do not introduce hierarchy only to classify files.

Keep implementation local to its slice until several Inventory features genuinely need the same code.

Shared Inventory code may then be promoted to an explicit module-level shared location.

Do not recreate backend architecture inside the module through folders such as:

```text
asset-inventory/
rental-commitment/
catalog/
tenant-management/
offering-setup/
```

