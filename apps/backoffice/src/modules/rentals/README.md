# Rentals

## Meaning

The Rentals module owns the Backoffice experience for managing customer rentals from creation through fulfillment and completion.

It represents the tenant-facing intent:

> Manage this rental.

A rental is the operational record that a customer is renting certain products for a period, under agreed conditions, and the business must prepare and fulfill that commitment.

The module should use simple operational language familiar to rental staff.

It must not expose backend implementation concepts unless a distinction is meaningful to the tenant user.

## Tenant-facing responsibilities

Rentals is the primary operational area for tenant staff.

It may include capabilities such as:

```text
view rentals in lists and calendars
create rentals and budgets
review customer requests
confirm rentals
edit rental dates, branch, customer, or items
review selected products
assign physical equipment
prepare accessories
manage pickup or delivery
record returns and completion
cancel rentals
review confirmed pricing
generate and send contracts
track signature status
download rental documents
review relevant rental history and activity
```

The exact capabilities available depend on the implemented rental lifecycle.

Do not expose an action or lifecycle concept merely because a corresponding backend state exists.

## Product language

Prefer tenant-facing terminology over backend terminology.

Examples:

```text
Backend                         Backoffice

Rental                          Rental
RentalSelection                 Rental item / Product
RentalDemandLine                Required equipment
AssignedAssetReference          Assigned unit
AssetBlock                      Reserved / Unavailable
ConfirmedPriceSnapshot          Confirmed price
RentalAccessorySelection        Accessory
ContractArtifact                Contract / Contract document
SigningRequest                  Signature request
RESIGN_REQUIRED                 Needs a new signature
```

Concepts such as the following should normally remain invisible:

```text
RentalAssetCandidate
AssetBlock as an entity
snapshot schema/version
projection
integration event
artifact hash
signing token
receipt token
persistence model names
```

Expose their business meaning rather than their implementation terminology.

## Core concepts and workflows

### Commercial items and physical fulfillment

A rental contains both:

```text
what the customer rented
```

and:

```text
which physical equipment will fulfill it
```

The Backoffice should preserve this distinction where it helps staff perform their work without exposing backend concepts such as selections and demand lines.

For example:

```text
Filming Kit × 1

Required equipment:
  Sony FX3     → CAM-003
  Tripod       → TRI-007
  LED Panel ×2 → LED-012, LED-019
```

The Filming Kit remains the product the customer rented.

The equipment below it represents what the business needs to prepare in order to fulfill that product.

Do not present fulfillment equipment as individually rented products when it originated from a package.

### Rental detail

The rental detail experience may compose several concerns into one coherent workflow.

Typical areas may include:

```text
Rental details
Customer
Items
Equipment
Preparation
Price
Pickup / Delivery
Contract
Activity
```

These are presentation concerns, not required internal folder boundaries.

Prefer presenting related information together when that makes the rental easier to operate.

Do not force users to navigate into another product area to complete normal rental operations.

For example, assigning a physical unit belongs to the rental workflow even though Inventory owns the unit's physical profile.

### Pricing

Rentals presents the price agreed for the rental.

Once a rental has an accepted historical price, present that value as the rental's confirmed or agreed price.

Do not imply that confirmed rentals are continuously recalculated from current pricing rules.

Current Pricing rules may participate during rental creation or price-affecting edits, but later changes to reusable pricing rules must not silently change the price already agreed for the rental.

When useful, explain this in business language such as:

> This is the price confirmed for this rental. Later pricing changes do not affect it.

Do not expose snapshot terminology or Pricing persistence structures to normal tenant users.

### Equipment and availability

Rental staff may need to see and assign the physical units that fulfill a rental.

Use language such as:

```text
Required equipment
Assigned equipment
Available units
Reserved
Unavailable
```

Do not expose concepts such as:

```text
AssetBlock
RentalAssetCandidate
candidate projection
projection synchronization
```

If a unit is unavailable because another rental uses it during the same period, present the operational reason and, when useful, allow navigation to the conflicting rental.

Inventory owns current physical equipment facts.

Rentals owns the rental-specific decision that a physical unit is assigned or reserved for this rental.

### Preparation and accessories

Rental preparation may include rental-specific accessory decisions.

Suggested accessories may originate from Inventory configuration, but they remain suggestions until staff include them in the rental.

The UI should distinguish between concepts such as:

```text
Suggested accessories
Included accessories
Assigned accessory units
```

Do not imply that an equipment accessory default automatically belongs to every rental.

### Pickup and delivery

Rentals owns the tenant-facing workflow for how a rental is fulfilled.

Use straightforward concepts such as:

```text
Pickup
Delivery
Pickup time
Return time
Delivery address
Delivery contact
```

Branch schedules, delivery eligibility, tenant configuration, and Pricing may contribute to this experience behind the scenes.

Present the resulting business behavior rather than the backend ownership boundaries involved in evaluating it.

### Contracts and signing

Contracts are part of operating a rental from the tenant user's perspective.

Normal contract actions therefore belong inside the Rentals experience even though Contracts is a separate backend bounded context.

Typical tenant-facing states may include:

```text
Not generated
Ready to send
Waiting for signature
Signed
Needs a new signature
```

Typical actions may include:

```text
Generate contract
Send for signature
Resend signature request
Cancel signature request
Download contract
Download signed contract
```

Do not expose artifact hashes, signing tokens, receipt tokens, acceptance records, or other signing infrastructure unless an explicit administrative or support workflow requires them.

## Backend relationships

The Rentals frontend module composes several backend bounded contexts.

These relationships do not define the frontend module boundary.

### Rental Commitment

Rental Commitment is the main backend owner of rental truth.

It owns:

```text
rental lifecycle
selected rental items
operational equipment demand
physical equipment assignments
rental-created equipment reservations
accepted pricing
delivery facts
rental-specific accessories
historical owner split facts
```

The Backoffice should expose the business meaning of those concepts rather than adopt Rental Commitment's internal terminology.

### Rental Catalog

Rental Catalog provides the current products and branch-specific offers that may be selected when creating or editing a rental.

Once accepted, confirmed rental selections are historical rental facts.

The frontend must not behave as if a confirmed rental is always reconstructed from the current Product definition.

### Asset Inventory

Asset Inventory provides current physical equipment information such as:

```text
equipment type
physical unit
serial number
condition
location
ownership
```

Rentals may use these facts when showing or assigning equipment.

Inventory remains authoritative over the current physical profile of that equipment.

### Pricing

Pricing calculates proposed prices from current pricing rules.

Rentals presents the accepted rental price preserved by Rental Commitment once that price becomes historical truth.

### Tenant Management

Tenant Management provides current facts required by rental workflows, including:

```text
tenant identity
branches
customers
schedules
configuration
permissions
operational eligibility
```

The Backoffice should translate these into tenant-facing concepts such as:

```text
Business
Branch
Customer
Team member
Settings
```

### Contracts

Contracts owns document generation and the contract signing lifecycle.

The Rentals frontend composes those capabilities into the rental workflow rather than exposing Contracts as a separate backend-oriented product area.

### Notifications

Notifications may deliver rental and contract communications.

Delivery mechanics do not become rental business truth.

A notification delivery failure does not mean the rental itself failed.

## Frontend boundary

Code belongs in `src/modules/rentals/` when its primary tenant-facing intent is:

> Manage this rental.

Use the user's intent to determine frontend ownership rather than the backend bounded context providing the underlying data.

Examples:

```text
Assign CAM-003 to Rental #1042
  → Rentals

Prepare accessories for Rental #1042
  → Rentals

Send Rental #1042's contract for signature
  → Rentals

Change Rental #1042's agreed dates
  → Rentals

Move CAM-003 permanently to another branch
  → Inventory

Change the default price used by several products
  → Pricing

Change which branches offer Sony FX3
  → Products

Edit the customer's phone number
  → Customers

Change branch opening hours
  → Settings
```

A Rentals feature may call APIs from several backend bounded contexts when needed to fulfill a rental workflow.

That is expected and does not violate the frontend module boundary.

Do not move rental-specific business behavior into shared locations simply because it consumes several backend modules.

## Internal structure

Prefer vertical slices organized around tenant workflows.

Possible slices include:

```text
rentals/
  list-rentals/
  rental-calendar/
  create-rental/
  rental-detail/
  edit-rental/
  confirm-rental/
  equipment-assignment/
  preparation/
  pickup/
  delivery/
  return/
  cancellation/
  contract/
```

These are examples, not required folders.

Create a slice only when the capability actually exists.

Keep implementation local to its slice until several Rentals features genuinely need the same code.

Shared Rentals code may then be promoted to an explicit module-level shared location.

Do not recreate backend architecture inside the module through folders such as:

```text
rental-commitment/
contracts/
asset-inventory/
pricing/
tenant-management/
```

