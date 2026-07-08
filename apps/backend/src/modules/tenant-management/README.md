# Tenant Management Module

## Purpose

Tenant Management owns the platform account boundary.

It answers which tenant is being accessed, which tenant user is acting inside that tenant, which branch/location is selected, which permissions apply, which tenant configuration is enabled, and how a request host, domain, or slug resolves into a trusted tenant context.

Public API: `tenant-management.public-api.ts`

## Owns

```text
Tenant
Tenant users
Tenant-user authentication
Tenant-scoped authorization
Tenant roles and permissions
Tenant configuration
Tenant product mode / capabilities
Branches / locations
Branch schedules
Pickup and return slot rules
Tenant timezone / branch timezone rules
Tenant branding
Tenant custom domains
Tenant context resolution
Contract signer configuration
```

Tenant users are backoffice/admin actors that belong to a tenant. They are not rental customers.

Tenant Management is the authority for tenant-scoped authentication and authorization unless that boundary is explicitly redesigned later.

## Does Not Own

```text
Rentable catalog definitions
Rental offers
Equipment types
Physical assets
Asset blocks
Rental lifecycle
Rental selections
Rental demand lines
Assigned assets
Price calculation
Rate plans
Promotions
Coupons
Contract document generation
Document signing state
Notification delivery
```

Tenant Management may validate tenant, branch, user, permission, and configuration rules for other modules, but it must not take ownership of their domain decisions.

Examples:

```text
Tenant Management can say whether offering setup is enabled.
Offering Setup, Asset Inventory, Rental Catalog, and Pricing own the setup records.

Tenant Management can say whether a tenant user may confirm rentals.
Rental Commitment owns rental confirmation rules.

Tenant Management provides tenant contract signer configuration.
Contracts owns generated documents, signing sessions, signature acceptance, and signed artifacts.
```

## Dependencies

Tenant Management should have minimal domain dependencies.

It may depend on infrastructure services for authentication, sessions, OAuth, email, file storage, custom domain verification, and similar platform concerns.

Other modules depend on Tenant Management for validation, authorization, configuration, and trusted tenant context.

## Key Domain Concepts

### Tenant

A tenant is a business using the platform.

Tenant state controls whether tenant-scoped operations are allowed. A disabled or deleted tenant must not resolve as an active tenant context.

### Tenant User

A tenant user is a dashboard/backoffice actor that belongs to a tenant.

A tenant user is not a rental customer.

Tenant users authenticate into the admin/backoffice product and receive permissions through roles or direct grants.

### Tenant User Authentication

Tenant Management owns authentication for tenant/backoffice users.

Auth users, credentials, sessions, OAuth identities, and tenant-user authorization belong here for now.

### Branch

A branch is a tenant-owned operational location where rentals can be offered, picked up, returned, or fulfilled.

Tenant Management owns the branch profile, active/inactive state, timezone, schedule, and pickup/return slot rules.

A branch reference may appear in Rental Catalog, Asset Inventory, Pricing, or Rental Commitment, but Tenant Management remains the authority over the branch itself.

### Tenant Configuration

Tenant configuration defines tenant-level behavior, defaults, feature flags, product mode, and capabilities.

Configuration must not become a generic place for rules that belong to Catalog, Pricing, Asset Inventory, Rental Commitment, Contracts, or Notifications.

Configuration changes affect future operations, not historical confirmed rentals.

### Tenant Branding

Tenant branding owns the tenant's public visual identity.

Examples:

```text
logoUrl
faviconUrl
primaryColor
accentColor
storefrontName
tagline
```

Branding belongs here because it describes the tenant's public/business identity, not catalog, pricing, inventory, or rental commitment.

### Tenant Domain

Tenant domains represent custom domains used to resolve storefront or admin tenant context.

A tenant may have multiple domain records over time. Domain verification state belongs to each domain record.

### Tenant Contract Signer

Tenant contract signer data is the tenant-side legal/signer identity used when generating rental contracts.

The signer may be linked to a tenant user, but it should be tenant-owned because the person whose data or signature appears on contracts is not necessarily the current logged-in user.

Contracts must snapshot signer data when generating a contract document.

## Lifecycle / State Rules

```text
Only active tenants should resolve into usable tenant context.
A disabled tenant must not allow new tenant-scoped operational work.
A deleted or soft-deleted tenant must not resolve as active tenant context.
Only active branches should be available for new branch-scoped operational work.
```

A disabled branch may still appear in historical rentals, catalog records, or reports, but it should not be accepted for new operational actions unless a specific historical/read workflow allows it.

## Persistence Ownership

Tenant Management owns tables related to:

```text
tenants
tenant users
auth users / identities
credentials
sessions
roles
permissions
tenant user roles
branches
branch schedules
tenant configuration
tenant branding
tenant domains
tenant contract signers
```

Examples of external references:

```text
Rental Catalog may reference branchId.
Asset Inventory may reference branchId.
Rental Commitment may snapshot branchId.
Pricing may reference tenantId.
Contracts may reference tenantId.
```

## Important Invariants

A tenant-scoped operation must validate tenant existence and tenant active state before performing business work.

A branch-scoped operation must validate that the branch belongs to the tenant and is active.

A tenant user must belong to the tenant before permissions are evaluated.

Custom domains must not resolve unless active and verified.

The frontend must not be trusted as the authority for tenant context resolution.

`TenantDomain.cfHostnameId` is provider metadata for one domain and must not live directly on the tenant.

Tenant branding belongs to Tenant Management, not Rental Catalog.

Tenant contract signer data belongs to Tenant Management, but generated contracts must snapshot signer data.

Billing unit in tenant configuration is only a default or allowed option. The actual pricing billing unit belongs to Pricing through `RatePlan`.

## Events / Side Effects

Possible event categories include:

```text
Tenant lifecycle changes
Tenant configuration changes
Tenant user changes
Tenant user permission changes
Branch changes
Branch schedule changes
Tenant branding changes
Tenant domain verification changes
Tenant contract signer changes
```

Tenant Management may call external providers for infrastructure concerns such as:

```text
Cloudflare custom hostname creation/verification
Object storage for branding/signature files
Email provider for auth/invitation flows
OAuth providers for login
```

Provider-specific details should stay inside Tenant Management or infrastructure adapters.

## Common Mistakes

Do not put catalog images, rentable item categories, rental offers, or pricing rules in Tenant Management.

Do not make the frontend resolve tenant context only from hostname or pathname. The backend must return trusted tenant context.

Do not treat `defaultBillingUnit` from tenant configuration as the final billing unit for price calculation.

Do not store custom domain state directly on `V2Tenant` if domain verification, Cloudflare hostname IDs, primary domains, or multiple domains are needed.

Do not make tenant contract signer data only user-profile data. It is tenant legal/signing configuration.

Do not let tenant configuration changes rewrite confirmed rental snapshots.

Do not let a disabled tenant, disabled branch, disabled user, or unverified domain pass validation for new operational work.

## Related Docs

```text
apps/backend/docs/architecture/overview.md
apps/backend/docs/architecture/adr/
tenant-management.public-api.ts
```
