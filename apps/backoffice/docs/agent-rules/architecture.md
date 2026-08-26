# Web Architecture

Treat `apps/backoffice/` as a route-driven TanStack Start frontend organized around tenant-facing business areas and vertical slices.

The Backoffice architecture must model how rental businesses understand and operate DEPIQO.

It must not mirror the backend bounded-context structure or expose backend implementation terminology unnecessarily.

## Frontend and backend boundaries

Backend bounded contexts and Backoffice modules serve different purposes.

Backend bounded contexts define ownership of:

```text
business rules
authoritative data
invariants
domain state
cross-module collaboration
```

Backoffice modules define coherent product areas from the tenant user's perspective.

They are intentionally not required to match one-to-one.

For example:

```text
Backoffice Products
  may call backend capabilities from:
    Rental Catalog
    Asset Inventory
    Pricing
    Tenant Management
    Offering Setup
```

and:

```text
Backoffice Rentals
  may call backend capabilities from:
    Rental Commitment
    Rental Catalog
    Asset Inventory
    Pricing
    Tenant Management
    Contracts
```

This is expected.

Do not rename or organize Backoffice code around backend terms such as:

```text
rental-commitment
rental-catalog
asset-inventory
tenant-management
offering-setup
```

unless the name is specifically required at an integration boundary because it reflects an actual backend contract.

Prefer tenant-facing language such as:

```text
rentals
products
inventory
customers
pricing
settings
branches
team
```

## Primary Backoffice modules

The primary tenant-facing business areas are:

```text
src/modules/
  rentals/
  products/
  inventory/
  customers/
  pricing/
  settings/
```

Their business meanings are documented in their local `README.md` files.

These are product-area boundaries.

They are not:

```text
backend bounded contexts
route boundaries
single vertical slices
technical layers
```

A module may appear across several routes.

A route may compose several frontend concerns when the user experience requires it.

## Vertical Slice Architecture

The primary unit of frontend behavior is the vertical slice.

A vertical slice represents one user capability or workflow and owns the frontend code needed to fulfill that intent end to end.

Examples include:

```text
modules/rentals/create-rental/
modules/rentals/rental-detail/
modules/products/create-product/
modules/products/branch-availability/
modules/settings/branches/create-branch/
modules/settings/branches/edit-branch/
```

The business-area module groups related slices.

The slice is where behavior should normally live.

A slice may own:

```text
UI
backend API calls
TanStack Query behavior
mutations
schemas
frontend models
DTO mapping
local state
local hooks
feature-specific utilities
```

Prefer keeping code that changes together inside the same slice.

Do not force each slice through shared frontend layers merely because several slices access similar backend concepts.

## Slice ownership

Determine slice ownership from the tenant user's intent.

Use questions such as:

```text
Manage this rental?
  → Rentals

Manage what I offer for rent?
  → Products

Manage the physical equipment I have?
  → Inventory

Manage this customer?
  → Customers

Manage how I charge?
  → Pricing

Configure my business?
  → Settings
```

Within the owning module, identify the specific workflow.

For example:

```text
Create a rental
  → modules/rentals/create-rental/

Assign equipment to an existing rental
  → modules/rentals/rental-detail/equipment-assignment/

Change Main Branch opening hours
  → modules/settings/branches/edit-branch/

Create a reusable Price Plan
  → modules/pricing/price-plans/create-price-plan/
```

Do not decide frontend ownership from the backend module that owns the underlying data.

## Backend integration inside slices

A frontend slice may call backend APIs from multiple backend bounded contexts directly when those calls exist to fulfill that slice's user intent.

For example:

```text
modules/rentals/create-rental/
```

may interact with backend capabilities related to:

```text
Rental Commitment
Rental Catalog
Pricing
Tenant Management
Asset Inventory
```

without first routing those interactions through the Products, Pricing, Settings, Customers, or Inventory frontend modules.

Backend ownership determines which backend capability is authoritative.

Frontend user intent determines which frontend slice owns the integration.

Do not introduce a frontend module dependency merely to mirror backend ownership.

For example, avoid introducing:

```text
Rentals
  → Products frontend module
    → Catalog backend
```

when a Catalog read exists only to support a Rental workflow.

The Rental slice may own that purpose-specific API integration directly.

## Consumer-owned integrations

When integration code exists only to support one frontend slice, keep it with that slice.

This applies even when the data concerns another frontend business area.

For example, if Rental Detail needs a Product display summary and that read exists only for Rental Detail, prefer:

```text
modules/rentals/rental-detail/product-display/
```

over:

```text
modules/products/product-summary/
  → exported to Rentals
```

Likewise, a customer selector used only to assign a Customer to a Rental normally belongs to the Rental workflow rather than becoming a general Customers capability.

Consumer-owned code may include:

```text
purpose-specific API wrappers
view-specific DTO mapping
query hooks
selectors
small display adapters
workflow-specific components
```

Do not duplicate important business rules owned by the backend.

The goal is to localize frontend integration and presentation behavior, not reproduce backend domain logic.

## Cross-module reuse

Frontend modules should remain as independent as practical.

Do not create cross-module public APIs by default.

First ask whether the code represents a genuinely reusable frontend capability or merely accesses data associated with another business area.

A cross-module dependency is justified when multiple areas genuinely share the same behavior and reason to change.

For example:

```text
Pricing owns:
  Create Price Plan

Products may reuse:
  the same Create Price Plan interaction
```

A narrow Pricing entrypoint may be appropriate because creating a reusable Price Plan is itself a meaningful Pricing capability.

By contrast:

```text
Rental Detail needs a Product name
```

does not by itself justify a Products frontend API.

When cross-module reuse is justified:

* expose only the narrow reusable capability;
* keep the module's implementation private;
* do not expose internal query keys, schemas, DTO adapters, or slice internals unnecessarily;
* avoid circular dependencies.

Do not build a frontend dependency graph that reproduces backend provider/consumer relationships.

## Vertical slice structure

Prefer slice folders organized around user capabilities.

For example:

```text
modules/products/
  create-product/
    CreateProductForm.tsx
    create-product.api.ts
    create-product.queries.ts
    create-product.schema.ts

  product-detail/
    ProductDetailPage.tsx
    product-detail.api.ts
    product-detail.queries.ts
```

This is preferred over organizing the module primarily as:

```text
modules/products/
  components/
  hooks/
  api/
  queries/
  schemas/
  types/
```

Technical categories may exist inside a substantial slice when useful, but they should not become the primary module architecture.

Keep code local until multiple slices genuinely need it.

Do not create abstractions or shared folders preemptively.

## Nested business areas

A primary module may contain a substantial nested business area when the tenant-facing concept contains several workflows of its own.

For example:

```text
modules/settings/
  branches/
  team/
  branding/
  categories/
```

A nested area may itself contain vertical slices:

```text
modules/settings/
  branches/
    list-branches/
    create-branch/
    edit-branch/
```

Similarly:

```text
modules/pricing/
  price-plans/
    list-price-plans/
    create-price-plan/
    edit-price-plan/

  promotions/
    create-promotion/
    edit-promotion/
```

Do not introduce hierarchy merely to classify files.

Create a nested area when it represents a meaningful product concept with several related capabilities.

## Routes

`src/routes/` owns URL structure and routing behavior.

Route files may own concerns that exist specifically because of routing, including:

```text
route params
search schemas
route guards
beforeLoad behavior
loader orchestration
route-level pending behavior
route error boundaries
route-specific metadata
```

Business implementation should normally live in the owning vertical slice.

For example:

```text
src/routes/dashboard/rentals/create.tsx
```

may parse route state and render:

```text
modules/rentals/create-rental/
```

The route should not own the complete Create Rental form, queries, mutations, and business UI merely because it renders that page.

Route files do not need to be artificially tiny.

Use the reason the code exists as the boundary:

```text
exists because of URL/routing
  → route

exists because of Create Rental behavior
  → Rentals / create-rental
```

Route placement does not define business ownership.

Changing navigation placement or URL structure does not automatically require moving the underlying module.

Do not rename route URLs merely to match frontend module names unless there is a separate product reason.

## Aggregator experiences

Some screens intentionally compose several business areas.

Examples may include:

```text
dashboard
operational overview
cross-domain search
global activity
```

Aggregator experiences should primarily compose existing capabilities and purpose-specific reads.

They do not become the owner of the business behavior they display.

Do not create cross-module abstractions solely to satisfy an aggregator when a small purpose-specific integration can remain local to the aggregator.

## Application-level capabilities

Not all application behavior belongs inside the six tenant-facing modules.

Capabilities that exist outside a normal authenticated tenant business area may live at the top application level.

Examples include:

```text
src/auth/
src/onboarding/
```

`src/auth/` may own application authentication workflows such as:

```text
login
logout
current authenticated user
authentication guards or state
```

`src/onboarding/` may own workflows that happen before a normal tenant context exists, such as initial business registration.

Do not force these capabilities into Settings merely because their backend implementation belongs to Tenant Management.

Keep purely technical infrastructure separate.

For example:

```text
src/lib/api/
```

may contain transport-level behavior such as CSRF handling or generic API request infrastructure.

## Application context

Distinguish application-wide operational context from tenant-facing Settings management.

For example:

```text
Current authenticated business context
```

may be needed by:

```text
app shell
routing
global rendering
multiple business slices
```

That does not automatically mean it belongs to:

```text
modules/settings/business-profile/
```

Settings owns the tenant-facing workflow:

> View or change my business configuration.

Application context exists to operate the frontend itself.

Do not move an application-wide query into Settings only because both refer to the same backend Tenant entity.

Apply the same reasoning to global operational concerns such as effective timezone.

Determine ownership from why the frontend behavior exists, not from the backend entity names it reads.

## Shared and infrastructure code

Use shared locations only for code without a clear business-slice owner.

Folder roles:

* `src/routes/` — URL structure and routing behavior.
* `src/modules/` — tenant-facing business areas and their vertical slices.
* `src/auth/` — application authentication capabilities when applicable.
* `src/onboarding/` — pre-tenant or application onboarding workflows when applicable.
* `src/shared/` — genuinely cross-cutting, domain-agnostic frontend code.
* `src/components/ui/` — shared UI primitives.
* `src/components/` — app-level reusable components with no specific business owner.
* `src/lib/` — technical infrastructure and general application helpers.
* `src/integrations/` — framework integrations such as TanStack Query.

Do not move business-specific code into `shared` merely because several files use it.

Do not use `shared`, `lib`, or `components` as escape hatches for unclear ownership.

If code appears reusable, first determine whether the reuse represents:

```text
one business capability used in multiple places
a truly domain-agnostic primitive
or accidental similarity
```

Then choose the appropriate owner.

## Product language

Frontend naming should describe concepts as tenant users understand them.

Backend terminology may remain at an actual integration boundary when required by shared contracts, but it should not automatically become product terminology.

For example:

```text
Backend                    Backoffice

RentableItem               Product
RentalOffer                Product availability at a branch
FulfillmentRequirement     Required / included equipment
Asset                      Equipment unit
ConfirmedPriceSnapshot     Confirmed price
SigningRequest             Signature request
TenantUser                 Team member
```

A slice may still consume DTO properties such as:

```text
rentalOfferId
equipmentTypeId
```

when those belong to the backend contract.

That does not require the frontend structure or UI to adopt those backend concepts.

Do not expose a backend distinction merely because it exists.

Preserve distinctions that are meaningful to tenant users.

In particular:

```text
Products
  What the business offers for rent.

Inventory
  The physical equipment the business actually has.

Rentals
  Customer rental commitments and their operational fulfillment.
```

## Existing `src/features/`

`src/features/` is the legacy organization for Backoffice business code.

Do not create new business capabilities there.

New work belongs under the appropriate:

```text
src/modules/<business-area>/<vertical-slice>/
```

or, where appropriate, an explicit application-level capability such as:

```text
src/auth/
src/onboarding/
```

Existing features should be migrated deliberately.

Prefer:

```text
inspect user intent
→ identify the vertical slice
→ move and rename
→ update imports
→ validate
```

Do not mechanically reproduce legacy backend-oriented folders beneath `src/modules/`.

For example, avoid migrations such as:

```text
features/rental-commitment/
→ modules/rentals/rental-commitment/
```

or:

```text
features/catalog/
→ modules/products/catalog/
```

when the legacy names represent backend architecture rather than tenant-facing frontend capabilities.

Do not duplicate the same capability under both `src/features/` and its new location.

Avoid unrelated bulk refactors during structural migration.

Refactor implementation only when moving the existing structure unchanged would preserve an obviously incorrect frontend abstraction.

## General expectations

* Organize business code by tenant-facing intent.
* Treat business-area modules as grouping boundaries and vertical slices as behavioral units.
* Keep code that changes together inside the same slice.
* Allow slices to call multiple backend bounded contexts directly when required by the workflow.
* Do not introduce frontend module dependencies merely to respect backend ownership.
* Keep consumer-specific integrations with their consumer slice.
* Extract reusable frontend capabilities only when actual reuse and shared ownership are demonstrated.
* Prefer vertical slices over technical buckets.
* Keep routing concerns in routes and business behavior in modules.
* Keep application-wide capabilities out of business modules when they do not represent tenant-facing business areas.
* Keep domain-agnostic primitives in shared locations.
* Do not apply NestJS layering or backend bounded-context naming to the Backoffice.
* Do not edit generated files unless the task explicitly requires it.
* Follow surrounding code conventions when they do not conflict with this architecture.

For substantial React feature work, use the `react-modular-architecture` skill.

