# Products

## Meaning

The Products module owns the Backoffice experience for managing what the business offers for rent.

It represents the tenant-facing intent:

> Manage what I offer for rent.

A Product is the commercial thing shown to customers or selected by staff when creating a rental.

A Product may represent a standalone piece of rentable equipment or a package that requires several kinds of equipment to fulfill.

The module should use simple commercial language familiar to rental businesses.

It must not expose the internal separation between Catalog records, fulfillment requirements, branch offers, pricing assignments, and inventory records unless that distinction is useful to the tenant.

## Tenant-facing responsibilities

Products is the primary area for configuring the business's rental offering.

It may include capabilities such as:

```text
view products
create products
edit product information
archive or restore products
upload product images
organize products by category
create standalone products
create packages
define equipment required to fulfill a product
choose which branches offer a product
control storefront visibility
control whether a product can currently be rented
configure product pricing
review setup completeness
add an existing product to another branch
```

The exact capabilities available depend on the implemented product and setup workflows.

Do not expose separate administrative steps merely because the backend stores the resulting configuration across several modules.

Whenever practical, let the tenant express one product-level intention and coordinate the required backend work behind that workflow.

## Product language

Prefer tenant-facing terminology over backend terminology.

Examples:

```text
Backend                         Backoffice

RentableItem                    Product
RentalOffer                     Product availability at a branch
FulfillmentRequirement          Required equipment / Included equipment
EquipmentType                   Equipment type
RentalOfferPricing              Product pricing
RatePlan                        Price plan
isVisible                       Visible in storefront
isRentable                      Available for rental
PACKAGE                         Package
SINGLE                          Single product / Product
Archived offer/item             Archived product
```

Concepts such as the following should normally remain invisible:

```text
RentalOffer as a separate entity
FulfillmentRequirement as an entity
pricing assignment
catalog selection resolution
reference authority
authoring capability
backend ownership boundaries
persistence model names
```

Expose their business meaning rather than their implementation terminology.

## Core concepts and workflows

### Products and physical equipment

Products and Inventory represent different tenant-facing concepts.

```text
Products
  What the business offers for rent.

Inventory
  The physical equipment the business actually has.
```

For example:

```text
Product:
  Sony FX3 Camera

Required equipment:
  Sony FX3 × 1

Inventory:
  CAM-001
  CAM-002
  CAM-003
```

The Product is what the customer selects.

The physical units are what the business uses to fulfill that selection.

Do not collapse these concepts merely because a standalone Product often maps to one equipment type.

Likewise, do not require tenant users to understand that the backend stores separate Catalog and Inventory identities for a standalone rentable product.

### Single products and packages

A Product may be fulfilled by one or several equipment requirements.

A standalone product may look like:

```text
Sony FX3 Camera

Requires:
  Sony FX3 × 1
```

A package may look like:

```text
Filming Kit

Includes / Requires:
  Sony FX3 × 1
  Tripod × 1
  LED Panel × 2
```

The package itself is the product rented by the customer.

Its equipment requirements describe what the business must provide to fulfill it.

Do not model or present packages as collections of child Products when the actual fulfillment definition is based on equipment types.

For example, the UI should not imply:

```text
Filming Kit
  contains Product: Sony FX3 Camera
  contains Product: Tripod Rental
```

when the actual business rule is:

```text
Filming Kit
  requires Sony FX3 equipment × 1
  requires Tripod equipment × 1
```

A package should remain a commercial product with its own name, description, image, category, visibility, and pricing.

### Equipment requirements

Products may define what equipment is required to fulfill one rented unit.

Use tenant-facing language such as:

```text
Equipment required
Package contents
Requires
Quantity needed
```

The exact wording may vary by screen.

These requirements describe equipment demand.

They do not assign specific physical units.

For example:

```text
Filming Kit requires:
  Sony FX3 × 1
```

does not mean:

```text
Filming Kit uses:
  CAM-003
```

Specific physical units are chosen later as part of a Rental workflow.

Products must not attempt to manage rental-specific equipment assignment or reservation.

### Branch availability

A Product can be offered differently across branches.

The tenant should think in terms such as:

```text
Available at
Offered at
Branches
Visible in storefront
Available for rental
```

rather than `RentalOffer`.

For example:

```text
Sony FX3 Camera

Main Branch
  Visible in storefront: Yes
  Available for rental: Yes

Downtown Branch
  Visible in storefront: No
  Available for rental: Yes
```

Storefront visibility and rental eligibility are separate concepts.

A Product may be visible to customers without currently being selectable for rental.

A Product may also be hidden from storefront discovery while remaining available through an explicit workflow supported by the product.

Do not reduce these independent concepts to a single generic "Active" switch when both behaviors need to be controlled.

Archived Products should not be presented as available for new rentals.

### Product pricing

Products should make it easy to understand and configure how a particular Product is priced.

Use tenant-facing concepts such as:

```text
Pricing
Price plan
Price
Pricing for this branch
```

Do not expose pricing assignments as standalone entities.

For example:

```text
Sony FX3 Camera
Main Branch

Pricing:
  Camera Daily Pricing
```

The Product experience may allow the tenant to select, create, or change a reusable Price Plan without forcing them to leave the Product workflow.

The separate Pricing module remains the place for managing reusable pricing rules globally.

A Product being visible or available for rental does not necessarily mean that valid pricing exists.

When pricing is required before a Product can actually be booked, present that as a setup state in tenant-facing language.

For example:

> Pricing needs to be configured before this Product can be booked.

Do not imply that Product visibility, rental eligibility, pricing configuration, and physical availability are the same state.

### Product setup

Creating something rentable may require records owned by several backend modules.

The tenant should not be required to reproduce those backend steps manually.

A setup workflow may ask for information such as:

```text
Product name
Description
Image
Category
Single product or package
Equipment required
Existing physical units
Branches
Visibility
Rental availability
Pricing
```

and coordinate the necessary backend operations behind one coherent workflow.

For example, the user intent:

> I want to rent Sony FX3 cameras at the Main Branch for $100 per day, and I currently own three units.

may require backend work across Catalog, Asset Inventory, Pricing, Tenant Management, and Offering Setup.

That complexity should remain behind the Products experience.

Do not design setup around instructions such as:

```text
First create an Equipment Type
Then create Assets
Then create a RentableItem
Then create a RentalOffer
Then create a FulfillmentRequirement
Then create a RatePlan
Then create a Pricing Assignment
```

unless an advanced administrative workflow genuinely requires independent control of those concepts.

### Product state and physical availability

Product configuration and physical stock are separate.

A Product may exist, be configured, and be visible even when there are currently no physical units available.

Likewise, adding physical equipment does not automatically mean the business has created or changed a Product.

Do not use current physical stock to redefine Product identity, package composition, or pricing.

Final availability for a specific rental period belongs to the rental workflow rather than the Products module.

The Products area may display helpful inventory context, but it must not present Catalog configuration as authoritative rental-period availability.

## Backend relationships

The Products frontend module composes several backend bounded contexts and setup capabilities.

These relationships do not define the frontend module boundary.

### Rental Catalog

Rental Catalog is the main backend owner of the commercial rental offering.

It owns:

```text
rentable items
branch-specific rental offers
catalog presentation
visibility
rentability
fulfillment requirements
```

The Backoffice translates those concepts into Products, branch availability, storefront visibility, rental availability, and required equipment.

Do not reproduce Rental Catalog's persistence structure in the frontend information architecture.

### Asset Inventory

Asset Inventory owns:

```text
equipment types
physical equipment units
current condition
current location
current ownership
equipment accessory defaults
```

Products references equipment types when defining what equipment is required to fulfill a Product.

Products may also participate in setup workflows that create initial equipment records.

The physical equipment itself remains owned by Inventory.

Adding or editing physical units must not implicitly redefine Product identity, package composition, or pricing unless the workflow explicitly includes those changes.

### Pricing

Pricing owns:

```text
price plans
pricing tiers
product-offer pricing assignments
promotions
coupons
current price calculations
```

Products may allow the tenant to configure which pricing applies to a Product or branch as part of the Product experience.

Reusable pricing rules remain conceptually owned by the Pricing frontend module.

A Product may exist without valid pricing during setup, but it should not be presented as fully bookable when required pricing is missing.

### Tenant Management

Tenant Management provides current business facts required by Product workflows, including:

```text
branches
categories
tenant capabilities
configuration
permissions
```

The Backoffice should expose these through tenant-facing concepts such as:

```text
Branches
Categories
Business settings
Team permissions
```

Categories are shared between Product and Inventory concepts even though their backend ownership belongs to Tenant Management.

### Offering Setup

Offering Setup coordinates tenant-admin workflows that span several backend modules.

It does not own Product, Inventory, Pricing, or Tenant records itself.

It is particularly relevant to Products because it can translate a simple administrative intention such as:

> Make this equipment rentable in these branches with this pricing.

into coordinated backend operations.

Offering Setup is an orchestration mechanism and should not appear as a tenant-facing Backoffice area.

Do not create an `offering-setup` frontend module merely because the backend has one.

### Rental Commitment

Rental Commitment consumes current Product definitions when creating or changing rentals and preserves the accepted commercial selections and equipment demand for confirmed rentals.

Products owns current offering configuration.

It must not behave as if editing the current Product definition rewrites historical confirmed rentals.

## Frontend boundary

Code belongs in `src/modules/products/` when its primary tenant-facing intent is:

> Manage what I offer for rent.

Use the user's intent to determine frontend ownership rather than the backend bounded context providing the underlying data.

Examples:

```text
Create a new Filming Kit
  → Products

Change the Sony FX3 product description
  → Products

Choose which branches offer the Filming Kit
  → Products

Define which equipment a Filming Kit requires
  → Products

Choose the price plan used by Sony FX3 at Main Branch
  → Products

Add another physical Sony FX3 unit
  → Inventory

Move CAM-003 to another branch
  → Inventory

Change Camera Daily Pricing for every product using it
  → Pricing

Assign CAM-003 to Rental #1042
  → Rentals

Edit a shared Category
  → Settings
```

A Products feature may call APIs from Catalog, Asset Inventory, Pricing, Tenant Management, or Offering Setup when required to fulfill a Product workflow.

That is expected and does not violate the frontend module boundary.

Do not move Product-specific behavior into shared code merely because its implementation spans several backend modules.

## Internal structure

Prefer vertical slices organized around tenant workflows.

Possible slices include:

```text
products/
  list-products/
  create-product/
  product-detail/
  edit-product/
  archive-product/
  package-composition/
  equipment-requirements/
  branch-availability/
  product-pricing/
```

These are examples, not required folders.

Create a slice only when the capability actually exists.

Keep implementation local to its slice until several Products features genuinely need the same code.

Shared Products code may then be promoted to an explicit module-level shared location.

Do not recreate backend architecture inside the module through folders such as:

```text
catalog/
asset-inventory/
pricing/
tenant-management/
offering-setup/
```

