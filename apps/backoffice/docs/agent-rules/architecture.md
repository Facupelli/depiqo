# Web Architecture

Treat `apps/backoffice/` as a route-driven TanStack Start frontend organized around tenant-facing business capabilities.

The Backoffice architecture must model how rental businesses understand and operate DEPIQO. It must not mirror the backend's bounded-context structure or expose backend implementation terminology unnecessarily.

## Frontend modules and backend bounded contexts

Backend modules and Backoffice modules serve different purposes.

Backend bounded contexts define ownership of business rules, authoritative data, invariants, and cross-module collaboration.

Backoffice modules define coherent areas of the product from the tenant user's perspective.

They are intentionally not required to match one-to-one.

For example:

```text
Backoffice Products
  may compose:
    Rental Catalog
    Asset Inventory
    Pricing
    Tenant Management
    Offering Setup
```

and:

```text
Backoffice Rentals
  may compose:
    Rental Commitment
    Contracts
    Asset Inventory
    Pricing
    Tenant Management
```

This is expected.

Do not rename or organize Backoffice code around backend terms such as `rental-commitment`, `rental-catalog`, `tenant-management`, or `offering-setup` unless the code is specifically an infrastructure-level integration with that backend contract.

Prefer simple tenant-facing language such as `rentals`, `products`, `inventory`, `customers`, `pricing`, `branches`, and `team`.

## Primary Backoffice modules

The primary tenant-facing modules are:

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

These modules are product boundaries, not route boundaries and not backend ownership boundaries.

A module may appear across several routes, and one route may compose several modules.

## Module responsibilities

A frontend module owns a coherent tenant-facing capability and the application code needed to provide that experience.

A module may contain:

```text
UI
queries and mutations
API access
schemas
frontend domain models
DTO mapping
local hooks
feature-specific utilities
vertical feature slices
```

Prefer vertical slices organized around user capabilities over broad technical buckets.

For example:

```text
modules/products/
  create-product/
  edit-product/
  product-detail/
  branch-availability/
  product-pricing/
```

is preferred over:

```text
modules/products/
  components/
  hooks/
  api/
  queries/
  types/
```

Module-level shared code may exist when multiple slices inside the same module genuinely use it.

Do not create abstractions or shared folders preemptively.

## Nested business areas

A primary module may contain a meaningful nested business area when that concept has several capabilities of its own.

For example:

```text
modules/settings/
  branches/
  team/
  branding/
  notifications/
```

A nested business area may itself contain vertical slices:

```text
modules/settings/
  branches/
    list-branches/
    create-branch/
    edit-branch/
```

Do not add another hierarchy level merely to classify files. Introduce nested areas only when the product concept is substantial enough to benefit from its own boundary.

## Routes

`src/routes/` owns URL structure and route-level composition.

Route files should remain thin. They may:

* parse route and search parameters;
* perform route-specific loading or guards;
* compose module entrypoints;
* provide route-level layout.

Business behavior, API interaction, validation, and domain-specific UI should normally live in the owning module rather than the route file.

Route placement does not define module ownership.

For example, moving Branches from a Settings submenu into primary navigation should not require moving its business implementation out of `modules/settings/` unless its product responsibility has actually changed.

## Cross-module collaboration

A frontend module may consume several backend bounded contexts when required to fulfill one tenant-facing workflow.

This is not considered a frontend boundary violation.

Frontend boundaries instead control ownership and reuse inside the Backoffice application.

When one frontend module needs functionality owned by another frontend module, prefer the owning module's explicit public entrypoint rather than importing private implementation files.

If substantial implementation must be shared between modules, reconsider whether:

* one module should own it;
* the concept deserves its own product boundary; or
* the code is genuinely domain-agnostic and belongs in a shared location.

Do not move business-specific code into `shared` merely to avoid a module dependency.

## Aggregator experiences

Pages that compose multiple tenant-facing domains may compose several modules.

Examples include dashboards, operational overviews, or cross-domain search experiences.

Aggregator code should consume module public entrypoints rather than reaching into module internals.

An aggregator does not become the owner of the business behavior it displays.

## Shared and infrastructure code

Use shared locations only for code without a clear tenant-facing domain owner.

Folder roles:

* `src/routes/` — route definitions and route-level composition.
* `src/modules/` — tenant-facing business modules and their vertical slices.
* `src/shared/` — genuinely cross-cutting, domain-agnostic frontend code.
* `src/components/ui/` — shared UI primitives.
* `src/components/` — app-level reusable components that do not belong to one business module.
* `src/lib/` — infrastructure and general application helpers.
* `src/integrations/` — framework integrations such as TanStack Query.

Keep business-specific request code inside the owning module instead of scattering it across routes, shared utilities, or UI files.

For normal Backoffice SPA behavior, call the backend directly from module API primitives. Do not introduce TanStack Start server functions unless the feature explicitly requires server-side behavior.

## Product language

Frontend naming should describe concepts as tenant users understand them.

Backend terminology may remain at the API boundary where required by shared backend contracts, but it should be translated before becoming product terminology when the backend term is implementation-oriented.

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

Do not expose a backend distinction merely because it exists.

Preserve distinctions that are meaningful to the tenant. In particular:

```text
Products
  What the business offers for rent.

Inventory
  The physical equipment the business actually has.

Rentals
  Customer rental commitments and their operational fulfillment.
```

## Existing `src/features/`

`src/features/` is legacy organization for Backoffice business code.

Do not create new business features there.

New work belongs under the appropriate `src/modules/<module>/` boundary.

Existing feature slices should be migrated deliberately when they are substantially changed or through an explicit migration task. Avoid unrelated bulk moves during normal feature work.

Do not duplicate the same capability under both `src/features/` and `src/modules/`.

## General expectations

* Organize business code by tenant-facing capability, not technical concern.
* Prefer vertical slices inside modules.
* Keep routes thin.
* Keep domain-agnostic primitives in shared locations.
* Prefer module public APIs over private cross-module imports.
* Do not apply NestJS layering or backend bounded-context naming to the Backoffice.
* Do not edit generated files unless the task explicitly requires it.
* Follow surrounding code conventions when they do not conflict with this architecture.
* For substantial React feature work, use the `react-modular-architecture` skill.

