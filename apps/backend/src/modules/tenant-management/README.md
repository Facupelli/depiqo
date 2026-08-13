# Tenant Management Module

Tenant Management owns the platform account boundary.

It determines which tenant is being accessed, which tenant user is acting, which branch is selected, which permissions and tenant capabilities apply, and how a host, domain, or slug resolves into trusted tenant context.

Tenant users are backoffice/admin actors belonging to a tenant. They are not rental customers.

## Published Capabilities

Tenant Management publishes focused provider-owned operational capabilities under `public-api/`:

- `TenantOperationalFacts` provides current operational tenant availability and booking mode.
- `TenantIdentityFacts` provides current active, non-deleted tenant ID, name, and slug.
- `TenantBrandingFacts` provides the current active, non-deleted tenant logo URL.
- `TenantContractSignerFacts` provides the selected active tenant contract signer, if one exists.
- `RentalCustomerProfileFacts` provides the current tenant-scoped customer profile, including Tenant Management's display/legal name resolution; deleted or missing customers are not readable, while inactive customers remain readable.
- `BranchFacts` provides tenant-scoped current branch facts, including lifecycle state, delivery support, and effective timezone resolution.
- `BranchScheduleEligibility` evaluates a pickup or return instant against a branch schedule.
- `RentalCustomerOperationalEligibility` provides current rental-customer eligibility.
- `TenantNotificationPreferences` provides current enabled notification delivery channels and order communication mode.
- `TenantBillingPreferences` provides the tenant-selected daily billing policy.
- `TenantInsuranceOfferingTerms` provides the tenant-configured insurance offering availability and rate.
- `TenantPresentationPreferences` provides locale metadata where current response presentation requires it.
- `TenantCategoryTaxonomy` provides tenant-scoped Category display facts and current Category assignment validation.

`tenant-management.public-api.ts` remains temporarily for notification-recipient capabilities that have not yet been migrated.

## Domain Concepts

### Tenant

A `Tenant` is a business using the platform.

Only active tenants may resolve into usable tenant context or perform new tenant-scoped operational work.

Disabled or deleted tenants may remain referenced by historical data but must not resolve as active tenants.

### Tenant User

A `TenantUser` is a dashboard/backoffice actor belonging to a tenant.

Tenant users authenticate into the administrative product and receive permissions through roles or direct grants.

A tenant user is not a rental customer.

### Tenant User Authentication

Tenant Management owns tenant/backoffice authentication and tenant-scoped authorization.

This includes tenant users, local credentials, sessions, tenant roles, permissions, and user-role relationships.

### Branch

A `Branch` is a tenant-owned operational location where rentals may be offered, picked up, returned, or fulfilled.

Tenant Management owns its profile, active state, timezone, schedules, and pickup/return slot rules.

Other modules may reference `branchId`, but Tenant Management remains authoritative over the branch.

Disabled branches may remain visible in historical data but must not be accepted for new operational actions unless a specific historical/read workflow permits it.

### Tenant Configuration

Tenant configuration defines tenant-level defaults, feature flags, product mode, and platform capabilities.

It must not become a generic container for business rules owned by Rental Catalog, Asset Inventory, Pricing, Rental Commitment, Contracts, or Notifications.

Configuration changes affect future operations rather than historical confirmed rental facts.

### Tenant Branding

Tenant branding represents the tenant's public visual identity.

It may include:

```text id="v17n7q"
logoUrl
faviconUrl
primaryColor
accentColor
storefrontName
tagline
```

Branding belongs to Tenant Management rather than Rental Catalog.

### Tenant Domain

A tenant domain represents a custom domain used to resolve storefront or administrative tenant context.

A tenant may have multiple domain records over time.

Verification and provider state belong to the individual domain record rather than directly to the tenant.

### Tenant Contract Signer

Tenant contract signer data represents the tenant-side legal/signing identity used for rental contracts.

A signer may reference a tenant user, but signer configuration belongs to the tenant because the person represented on a contract is not necessarily the currently authenticated user.

Contracts must snapshot the signer data used when generating a contract.

## Business Rules

A tenant-scoped operation must validate tenant existence and active state before performing business work.

Tenant-user authentication requires an active tenant that is not soft-deleted.

A branch-scoped operation must validate that the branch belongs to the tenant and is active.

A tenant user must belong to the tenant before tenant-scoped permissions are evaluated.

Disabled users must not pass validation for new operational work.

Custom domains must be active and verified before they may resolve trusted tenant context.

Tenant context provided by the frontend must not be treated as authoritative. The backend must resolve and return trusted tenant context.

`TenantDomain.cfHostnameId` is provider metadata for an individual domain record and must not live directly on the tenant.

Tenant branding belongs to Tenant Management.

Tenant contract signer configuration belongs to Tenant Management, while generated contracts preserve their own signer snapshot.

Tenant configuration may define a default or allowed billing unit, but the billing unit used for an actual price calculation comes from Pricing through the `RatePlan`.

Tenant configuration changes must not rewrite confirmed rental snapshots.

## Boundaries

Tenant Management may validate tenants, tenant users, permissions, branches, and tenant configuration for other modules without becoming the owner of their business decisions.

Rental Catalog owns rentable items, rental offers, and catalog behavior.

Asset Inventory owns equipment types and physical assets.

Pricing owns pricing rules and calculations.

Rental Commitment owns rental lifecycle, confirmation, assignments, blocks, and accepted rental snapshots.

Contracts owns generated contract documents, signing requests, signature acceptance, artifacts, and signing state.

Notifications owns notification delivery.

For example, Tenant Management may determine whether a tenant user has permission to confirm a rental, while Rental Commitment determines whether that rental can actually be confirmed.

Tenant Management may expose contract signer configuration, while Contracts owns the resulting legal document and signing lifecycle.

Tenant Management should otherwise keep domain dependencies minimal.

## Persistence

Tenant Management owns persistence for:

```text id="kapqus"
tenants
tenant users and local credentials
rental-customer authentication identities
sessions
roles and permissions
tenant user roles
branches
branch schedules
tenant configuration
tenant branding
tenant domains
tenant contract signers
shared tenant categories
```

Other modules may store references or historical snapshots of tenant-owned facts without becoming authoritative over their current values.

## External Integrations

Tenant Management may use infrastructure services for platform concerns such as authentication, OAuth, invitations, custom-domain verification, email, and file storage.

Provider-specific state and behavior should remain inside Tenant Management or its infrastructure adapters.

Examples include Cloudflare custom-hostname state, branding/signature object storage, email providers, and OAuth providers.

## References

* `public-api/`
* `apps/backend/docs/architecture/overview.md`
* `apps/backend/docs/architecture/adr/`

## Shared Category Taxonomy

Tenant Management owns `V2Category`, the tenant-scoped taxonomy shared by Rental Catalog and Asset Inventory. A category can be assigned only while active. Inactive categories keep existing `V2RentableItem` and `V2EquipmentType` references but are unavailable for new assignment and selectable lists. Soft-deleted categories follow the same unavailable rule; physical deletion uses `ON DELETE SET NULL` for both references.

Rental Catalog and Asset Inventory consume Category display and assignment semantics through `TenantCategoryTaxonomy`; neither module reads or mutates category persistence directly.
