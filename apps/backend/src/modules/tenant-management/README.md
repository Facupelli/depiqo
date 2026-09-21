# Tenant Management

Tenant Management owns the tenant/account boundary and the current tenant-scoped identity and operational configuration used by the rest of the system. Its durable concepts include Tenant, Tenant User, Rental Customer identity/profile facts, Branch, tenant configuration and branding, storefront custom domains, tenant contract signer configuration, and shared category taxonomy.

## Domain concepts

### Tenant

A Tenant represents one business/account using the platform. It is the ownership boundary for tenant-scoped users, branches, configuration, customers, branding, domains, signers, and shared categories.

Current operational use and retained historical references are distinct. A tenant may remain referenced by historical artifacts even when it is not usable for current operational work.

### Tenant User

A Tenant User is a backoffice/admin actor belonging to a Tenant. Tenant Management owns tenant-scoped authentication and authorization for Tenant Users. A Tenant User is distinct from a Rental Customer.

### Rental Customer

A Rental Customer represents the customer side of the rental relationship and is distinct from a Tenant User.

Tenant Management owns current customer identity/profile facts used by tenant workflows. When another module needs durable historical customer facts, it may preserve the accepted facts it requires rather than treating the mutable current profile as historical truth.

### Branch

A Branch is a tenant-owned operational location. Its current facts include branch identity, pickup/return schedules, effective timezone, and operational location. Other workflows use these current Branch facts.

### Tenant Configuration

Tenant configuration represents current tenant-level preferences and operational defaults. It must not become the owner of business rules that belong to other bounded contexts.

### Tenant Branding

Tenant branding represents tenant-owned public visual identity and presentation.

### Custom Domain

A custom domain is tenant-owned configuration used to resolve public storefront tenant context. Only verified, usable custom-domain configuration participates in current storefront resolution.

### Tenant Contract Signer

A Tenant Contract Signer is tenant-owned signing/legal configuration used when generating contracts. It is a standalone tenant-owned signer concept, not a Tenant User relationship in the current model. Generated Contracts preserve the signer facts they need as part of their own historical artifact.

### Shared Category Taxonomy

Tenant Management owns the shared tenant category vocabulary used by Catalog and Asset Inventory. Existing references to an inactive category may remain, but inactive categories cannot be newly assigned for new work.

## Boundaries

- Tenant Management supplies current tenant-scoped facts and authorization/context decisions without owning the business outcomes of consuming modules.
- Modules that own historical rental or contract artifacts preserve the accepted Tenant Management facts they require rather than reconstructing them later from mutable current state.
