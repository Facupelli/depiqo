# Customers

## Meaning

The Customers module owns the Backoffice experience for managing the people or organizations that rent from the business.

It represents the tenant-facing intent:

> Manage my customers.

A Customer is the rental customer known to the tenant.

The module should present customer identity, contact information, status, and relevant rental context in simple business language.

It must not expose backend distinctions between operational profile reads, retained historical profile reads, authentication identities, or capability-specific customer contracts unless an explicit support or administrative workflow requires them.

## Tenant-facing responsibilities

Customers is the primary area for managing tenant customer records.

It may include capabilities such as:

```text
view customers
search customers
create customers
edit customer profile information
review contact information
review customer status
activate or deactivate customers when supported
review customer rental history
review current or upcoming rentals
review eligibility or approval state when supported
access customer-specific documents when supported
```

The exact capabilities available depend on the implemented customer workflows.

Do not expose a capability merely because Tenant Management publishes a backend customer read model for another module.

The Backoffice should expose only customer information and actions that are useful to tenant staff.

## Product language

Prefer tenant-facing terminology over backend terminology.

Examples:

```text
Backend                              Backoffice

Rental Customer                      Customer
RentalCustomerProfileFacts           Customer profile
RentalCustomerContactFacts           Contact information
RentalCustomerOperationalEligibility Customer status / Eligibility
RetainedRentalCustomerProfileFacts   Hidden historical lookup behavior
rental-customer auth identity         Customer account / Login, when relevant
tenant-scoped customer reference      Customer
```

Concepts such as the following should normally remain invisible:

```text
profile facts capability
retained profile facts capability
contact facts capability
operational eligibility capability
tenant-scoped reference
historical retained lookup
persistence model names
backend ownership boundaries
```

Expose the business meaning instead.

## Core concepts and workflows

### Customer profile

A Customer profile represents the current information the tenant uses to identify and work with that customer.

It may include facts such as:

```text
name
document or identification number
address
phone
email
status
```

The exact fields shown should follow the implemented customer model.

Use straightforward labels familiar to rental staff.

Do not expose capability-specific backend shapes as separate customer concepts merely because different backend consumers require different subsets of customer information.

For example, the tenant should see one coherent Customer profile rather than separate concepts such as:

```text
Customer Profile Facts
Customer Contact Facts
Retained Customer Facts
```

Those distinctions exist to preserve backend boundaries and historical behavior, not to define the Backoffice information architecture.

### Current profile and rental history

The Customers module represents the customer's current profile.

Historical rentals may preserve customer facts that were accepted or retained at the time of those rentals or their legal documents.

Changing the current Customer profile must not imply that already confirmed rentals or generated contracts are rewritten.

For example:

```text
Customer today:
  María Pérez
  New address

Rental #1042:
  may preserve the customer facts accepted for that rental or contract
```

The Backoffice may show current Customer information alongside historical Rentals, but it should not silently replace historical facts with current values when the backend preserves them separately.

### Customer status and eligibility

Tenant Management may distinguish between customer lifecycle state and operational eligibility.

Translate those rules into business language relevant to staff.

Possible concepts may include:

```text
Active
Inactive
Eligible to rent
Not eligible to rent
Requires review
```

Only expose states that the implemented product actually supports.

Do not expose deleted or retained historical customer behavior as a normal selectable customer state unless the product explicitly requires it.

An inactive customer may still need to remain visible in historical rentals.

Likewise, historical records may continue to refer to a customer who can no longer be used for new operational work.

### Contact information

Customer contact information may be used by several workflows, including Rentals, Contracts, and Notifications.

The Customers module owns the tenant-facing experience for maintaining the current customer contact profile.

Other frontend modules may display that information where needed.

For example:

```text
Edit María's email
  → Customers

Send Rental #1042's contract to María
  → Rentals
```

The fact that a Rental workflow consumes a customer's email does not make email management part of Rentals.

### Customer rentals

A Customer detail experience may include rental context such as:

```text
current rentals
upcoming rentals
past rentals
cancelled rentals
```

These views compose data from Rentals but remain useful inside the Customer experience because the tenant intent is:

> Show me this customer's relationship with my business.

Customers does not become authoritative over rental lifecycle or rental history.

Rental actions should continue to be owned by Rentals.

For example, the Customer detail may link to Rental #1042, but confirming, preparing, cancelling, or completing that rental belongs to the Rentals module.

### Customer accounts and authentication

Tenant Management may own authentication identities for rental customers.

Do not automatically expose authentication as a major Customer concept unless the implemented product gives tenant staff meaningful account-management capabilities.

When customer login or account state matters, use tenant-facing language such as:

```text
Customer account
Login access
Account status
```

Do not expose backend authentication identity records or session concepts as normal customer profile fields.

### Customer documents

If the Backoffice supports staff access to customer identity or verification documents, that experience may belong to Customers when the tenant intent is to review or manage the customer.

Use straightforward language such as:

```text
Documents
Identification
Verification documents
```

Keep storage provider details, object keys, buckets, and access-token mechanics hidden from normal tenant users.

Document access should follow the actual authorization and retention rules implemented by the backend.

## Backend relationships

The Customers frontend module primarily composes Tenant Management together with rental context from other backend bounded contexts.

These relationships do not define the frontend module boundary.

### Tenant Management

Tenant Management is the main backend owner of current tenant-scoped Customer information and operational customer rules.

It publishes customer capabilities for purposes such as:

```text
current profile information
retained historical profile information
contact information
operational eligibility
customer authentication identity
```

These capabilities exist for different backend consumers and semantics.

The Backoffice should translate them into one coherent tenant-facing Customer experience rather than expose each capability as a separate frontend concept.

Tenant Management also owns the distinction between tenant users and rental customers.

The frontend must preserve that distinction in simple product language:

```text
Team member
  person who operates the Backoffice

Customer
  person or organization renting from the business
```

Do not call tenant users Customers or rental customers Team members.

### Rental Commitment

Rental Commitment owns Rentals and their retained customer references.

Customers may compose Rental information to provide customer history and context.

It must not become authoritative over:

```text
rental lifecycle
rental selections
equipment assignments
confirmed pricing
rental fulfillment
```

Those actions remain in Rentals.

### Contracts

Contracts may preserve customer facts used to generate and sign legal documents.

Customers owns the current Customer profile experience.

Editing the current Customer must not imply that previously generated or signed contracts are rewritten.

Historical legal document facts remain owned by Contracts.

### Notifications

Notifications may use current customer contact information when delivering messages.

Customers manages the tenant-facing current contact profile.

Notification delivery state does not become part of the Customer profile itself unless the product explicitly surfaces communication history.

## Frontend boundary

Code belongs in `src/modules/customers/` when its primary tenant-facing intent is:

> Manage this customer.

Use the user's intent to determine frontend ownership rather than the backend module providing the underlying data.

Examples:

```text
Create María Pérez as a customer
  → Customers

Change María's phone number
  → Customers

Review María's contact information
  → Customers

Review whether María can create a new rental
  → Customers

See María's rental history
  → Customers, composing Rentals

Open Rental #1042 from María's history
  → Rentals

Confirm Rental #1042
  → Rentals

Send Rental #1042's contract for signature
  → Rentals

Edit a Team member
  → Settings

Change customer-notification defaults for the business
  → Settings
```

A Customers feature may consume Rental or Contract context when required to provide a useful customer view.

That is expected and does not violate the frontend module boundary.

Do not move customer-specific behavior into shared locations merely because several other modules consume Customer information.

## Internal structure

Prefer vertical slices organized around tenant workflows.

Possible slices include:

```text
customers/
  list-customers/
  create-customer/
  customer-detail/
  edit-customer/
  customer-status/
  customer-rentals/
  customer-documents/
```

These are examples, not required folders.

Create a slice only when the capability actually exists.

Keep implementation local to its slice until several Customers features genuinely need the same code.

Shared Customers code may then be promoted to an explicit module-level shared location.

Do not recreate backend architecture inside the module through folders such as:

```text
tenant-management/
rental-commitment/
contracts/
notifications/
```

