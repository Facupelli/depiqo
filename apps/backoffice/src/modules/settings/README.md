# Settings

## Meaning

The Settings module owns the Backoffice experience for configuring how the tenant's business operates in DEPIQO.

It represents the tenant-facing intent:

> Configure my business.

Settings contains business-wide configuration and administrative capabilities that support the rest of the Backoffice but are not primarily about managing a specific Rental, Product, physical equipment unit, Customer, or Price Plan.

The module should use simple administrative language familiar to tenant users.

It must not expose the backend concept of Tenant Management as a product area.

## Tenant-facing responsibilities

Settings is the primary area for configuring the tenant's business and administrative environment.

It may include capabilities such as:

```text
manage branches
configure branch schedules
configure pickup and return behavior
manage team members
manage roles and permissions
configure business identity
configure branding
manage storefront domains
manage categories
configure notification preferences
configure rental defaults
configure billing preferences
configure insurance settings
configure contract signer information
manage other tenant-level capabilities
```

The exact capabilities available depend on the implemented product.

Do not place every tenant-scoped configuration value in Settings merely because Tenant Management persists it.

Configuration should remain with the frontend module whose user intent best matches it.

For example:

```text
Reusable Price Plan
  → Pricing

Product visibility
  → Products

Physical equipment location
  → Inventory

Business-wide billing preference
  → Settings
```

## Product language

Prefer tenant-facing terminology over backend terminology.

Examples:

```text
Backend                         Backoffice

Tenant                          Business
TenantUser                      Team member
Branch                          Branch
TenantBranding                  Branding
TenantDomain                    Domain / Storefront domain
TenantContractSigner            Contract signer
TenantCategoryTaxonomy          Categories
TenantNotificationPreferences   Notification settings
TenantBillingPreferences        Billing settings
TenantInsuranceOfferingTerms    Insurance settings
Tenant Configuration            Business settings
Permission                      Permission
Role                            Role
```

Concepts such as the following should normally remain invisible:

```text
Tenant Context
TenantOperationalFacts
TenantIdentityFacts
BranchFacts
BranchScheduleEligibility
provider-specific domain metadata
public capability names
tenant-scoped validation contracts
persistence model names
```

Expose their administrative meaning rather than their backend terminology.

## Core concepts and workflows

### Business profile

Settings may expose the tenant's current business identity.

This may include information such as:

```text
Business name
Public name
Business details
Contact information
Legal information
```

Only expose fields actually supported by the product.

Use "Business" rather than "Tenant" in normal UI language.

Backend tenant identity remains an implementation concern.

### Branches

Branches represent operational locations belonging to the business.

A Branch may be used for:

```text
offering Products
storing equipment
pickup
returns
delivery operations
rental fulfillment
```

Branch configuration may include:

```text
name
address
active state
timezone
opening or operating schedule
pickup schedule
return schedule
delivery support
```

The exact configuration depends on the implemented domain.

Use tenant-facing language such as:

```text
Branches
Opening hours
Pickup hours
Return hours
Timezone
Delivery available
```

rather than backend concepts such as Branch Facts or Schedule Eligibility.

A disabled Branch may remain visible in historical data while being unavailable for new operational work.

The UI should communicate this in normal lifecycle language.

For example:

```text
Active
Inactive
```

Do not imply that disabling a Branch rewrites historical Rentals, Products, or Inventory references.

### Team

Settings owns the tenant-facing administration of people who operate the Backoffice.

Use concepts such as:

```text
Team
Team member
Role
Permissions
Invite
Active
Inactive
```

A Team member is not a Customer.

This distinction must remain clear throughout the Backoffice:

```text
Team member
  operates the business

Customer
  rents from the business
```

Do not expose backend terminology such as `TenantUser` in normal UI language.

Authentication, roles, permissions, and sessions may be implemented by Tenant Management, but the tenant-facing experience should remain centered around managing the Team.

### Roles and permissions

Roles and permissions describe what Team members are allowed to do.

Use clear capability-oriented language.

For example:

```text
Can manage Rentals
Can edit Products
Can manage Inventory
Can manage Pricing
Can manage Team
```

The exact permission model must reflect the implemented backend authorization rules.

Do not invent simplified permissions that do not map safely to backend behavior.

Likewise, do not expose internal permission identifiers when a human-readable label can represent the same rule.

Authorization determines whether a user may attempt an action.

The owning business domain still determines whether the action itself is valid.

### Branding

Branding represents the business's public visual identity.

It may include:

```text
logo
favicon
primary color
accent color
storefront name
tagline
```

Use terms such as:

```text
Branding
Logo
Colors
Storefront name
```

Do not expose storage keys, provider metadata, or branding persistence models.

Branding affects current presentation.

Changing current Branding must not imply that historical contracts or other already-snapshotted documents are rewritten.

### Domains

Settings may allow the business to configure domains used for its Storefront.

Use tenant-facing language such as:

```text
Domains
Storefront domain
Custom domain
Verification status
```

Provider-specific concepts should remain hidden unless they are necessary to explain an actionable error.

For example, Cloudflare hostname identifiers or verification metadata should not become normal UI concepts.

A custom domain should not be presented as usable until the backend considers it active and verified.

### Categories

Categories provide a shared organizational taxonomy used by Products and Inventory.

From the tenant's perspective, they are simply:

```text
Categories
```

A Category may be used to organize:

```text
Products
Equipment types
```

The backend ownership of the shared taxonomy belongs to Tenant Management, but that distinction does not need to appear in the UI.

Settings is the natural place for managing the taxonomy itself.

For example:

```text
Create Camera category
  → Settings

Assign Camera category to Sony FX3 Product
  → Products

Assign Camera category to Sony FX3 equipment type
  → Inventory
```

Inactive Categories may remain visible on existing records while being unavailable for new assignment.

The UI should communicate that behavior without exposing persistence or soft-delete semantics.

### Notification settings

Settings may expose the business's notification preferences.

These may include:

```text
enabled communication channels
rental communication preferences
customer notification behavior
```

Use simple language such as:

```text
Notifications
Email notifications
Customer communications
Send automatically
```

Settings controls business preferences.

It does not own the actual delivery of individual messages.

A failed notification delivery is not a Settings state.

### Billing settings

Settings may expose tenant-level billing preferences that influence Pricing behavior.

For example:

```text
Default partial-day charging behavior
Billing defaults
```

These are business-level preferences.

They must not be confused with a specific Price Plan.

The distinction is:

```text
Business-wide default or preference
  → Settings

Rules for Camera Daily Pricing
  → Pricing
```

The actual billing unit used by a specific pricing calculation comes from the applicable Price Plan where the backend domain defines it that way.

Do not present tenant defaults as overriding explicit Product pricing rules.

### Insurance settings

If the business offers rental insurance through DEPIQO, Settings may expose configuration such as:

```text
Offer insurance
Insurance rate
Insurance terms
```

Only expose the concepts currently supported by the backend.

This is business-wide offering configuration.

Rental-specific accepted insurance facts, when historical, should remain with the Rental rather than being reconstructed from current Settings.

### Contract settings

Settings may contain business-wide legal configuration used when generating Rental contracts.

For example:

```text
Contract signer
Legal identity
Contract configuration
```

The tenant contract signer represents the business-side identity used on generated contracts.

It is not necessarily the currently authenticated Team member.

Use tenant-facing language such as:

```text
Contract signer
Name
Document number
Role
Signature
```

The backend Contracts module should preserve the signer information used for an already generated contract.

Changing the current signer in Settings must not imply that existing signed or generated contracts are rewritten.

Rental-specific contract generation and signing actions belong to Rentals.

### Rental settings

Settings may contain business-wide defaults and operational preferences that affect future rental workflows.

Examples may include:

```text
default rental behavior
booking mode
insurance defaults
notification preferences
billing preferences
other tenant-level operational settings
```

Do not turn Settings into a generic container for business rules owned by other modules.

A useful test is:

> Is this a business-wide preference, or am I actually configuring a Product, Inventory item, Price Plan, Customer, or Rental?

If another frontend module clearly owns the user's intent, the configuration should remain there.

### Current configuration and historical facts

Settings represents current business configuration.

Changes to Settings generally affect future operations.

They must not imply that historical confirmed facts are rewritten.

For example:

```text
Change business logo
  affects current presentation

Change contract signer
  affects future generated contracts

Change billing preference
  affects future applicable calculations
```

but should not silently rewrite:

```text
confirmed Rental prices
historical customer facts
generated contracts
signed contracts
historical equipment ownership snapshots
```

The Backoffice should preserve this distinction when presenting historical information.

## Backend relationships

The Settings frontend module primarily composes Tenant Management and business-level configuration exposed by other backend bounded contexts.

These relationships do not define the frontend module boundary.

### Tenant Management

Tenant Management is the main backend owner of business identity and tenant-level administration.

It owns or publishes capabilities related to:

```text
tenant identity
tenant users
authentication
roles and permissions
branches
branch schedules
tenant configuration
branding
domains
contract signer
categories
notification preferences
billing preferences
insurance offering terms
presentation preferences
```

The Backoffice translates these into tenant-facing areas such as:

```text
Business
Team
Branches
Branding
Domains
Categories
Notifications
Billing
Insurance
Contract settings
```

Do not create a `tenant-management` frontend area merely because the backend has that bounded context.

### Rental Catalog

Products uses Branches and Categories configured through Settings.

Settings owns the tenant-facing administration of those shared business concepts.

It does not own Product definitions, branch-specific Product availability, visibility, or fulfillment requirements.

Those belong to Products.

### Asset Inventory

Inventory uses Branches and Categories configured through Settings.

Settings owns the Branch and Category definitions.

Inventory owns current physical equipment profile and location references.

For example:

```text
Rename Main Branch
  → Settings

Move CAM-003 to Main Branch
  → Inventory
```

### Pricing

Pricing may consume tenant-level billing preferences configured through Settings.

Settings owns business-wide preferences.

Pricing owns reusable Price Plans and current pricing rules.

Do not duplicate Price Plan configuration inside Settings.

### Rental Commitment

Rental workflows consume Branches, schedules, Customers, permissions, and other current tenant facts.

Settings configures those current business-level facts.

Rentals owns rental-specific decisions and historical rental truth.

Changing Settings must not silently rewrite confirmed Rentals.

### Contracts

Contracts consumes current tenant signer and other tenant facts when preparing documents.

Settings owns the current business configuration.

Contracts owns the generated document and its preserved historical facts.

Normal document generation and signing actions belong to Rentals rather than Settings.

### Notifications

Settings may configure which notification channels or communication modes the tenant enables.

Notifications owns actual message delivery and retry behavior.

Settings should not expose provider delivery internals as business configuration unless the tenant must act on them.

## Frontend boundary

Code belongs in `src/modules/settings/` when its primary tenant-facing intent is:

> Configure my business.

Use the user's intent to determine frontend ownership rather than the backend module providing the underlying data.

Examples:

```text
Create Downtown Branch
  → Settings

Change Main Branch opening hours
  → Settings

Invite a Team member
  → Settings

Change a Team member's role
  → Settings

Upload the business logo
  → Settings

Configure a custom Storefront domain
  → Settings

Create a Category
  → Settings

Change notification preferences
  → Settings

Choose the current contract signer
  → Settings

Configure a business-wide billing preference
  → Settings

Choose which branches offer Sony FX3
  → Products

Move CAM-003 to Downtown Branch
  → Inventory

Change Camera Daily Pricing
  → Pricing

Edit María's customer profile
  → Customers

Change Rental #1042's pickup Branch
  → Rentals
```

A Settings feature may expose configuration consumed by many other frontend modules.

That is expected.

Do not move a business rule into Settings merely because several modules use it.

Settings should remain the owner only when the tenant-facing intent is genuinely business-wide configuration.

## Internal structure

Settings is expected to contain several substantial nested business areas.

Possible areas include:

```text
settings/
  business-profile/
  branches/
  team/
  branding/
  domains/
  categories/
  notifications/
  billing/
  insurance/
  contract-settings/
  rental-settings/
```

These are examples, not required folders.

A substantial area may contain its own vertical slices.

For example:

```text
settings/
  branches/
    list-branches/
    create-branch/
    branch-detail/
    edit-branch/
    branch-schedule/
```

and:

```text
settings/
  team/
    list-team-members/
    invite-team-member/
    team-member-detail/
    roles-and-permissions/
```

Do not create every possible area preemptively.

Create a nested area or vertical slice when the capability actually exists.

Keep implementation local until several Settings features genuinely need the same code.

Shared Settings code may then be promoted to an explicit module-level shared location.

Do not recreate backend architecture inside Settings through folders such as:

```text
tenant-management/
catalog/
asset-inventory/
pricing/
contracts/
notifications/
```

