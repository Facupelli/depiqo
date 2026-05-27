# 04 - Strategize

## Purpose

This step classifies the candidate business areas by strategic importance.

The goal is not to decide modules yet. The goal is to decide where the system deserves the most modeling effort, where it only needs to be reliable, and where it should stay simple.

A business area can be critical without being strategically differentiating.

Critical capability = the product fails if this is wrong.

Strategic core = the area where the product can become meaningfully different from alternatives.

## Strategic framing

The system has two different strategic realities.

For complex professional rentals, the system must be operationally strong, but it does not currently have a strong differentiator against established rental platforms.

For smaller rental businesses, the opportunity is to provide a simple customer-facing catalog and WhatsApp-style ordering flow that feels much easier than spreadsheets, informal messages, or heavy rental software.

The system should keep a strong rental operations engine, but future product differentiation should come from simplifying the customer-facing flow for smaller tenants.

The important strategic principle is:

Do not let professional-rental complexity leak into the small-rental customer flow.

## Product direction

The product should support two modes of usage.

### Professional rental mode

This mode supports complex rentals with a stronger backoffice workflow.

It may include:

- locations;
- combos;
- third-party equipment owners;
- owner contracts;
- discounts and promotions;
- draft orders and custom budgets;
- customer approval/rejection flows;
- contract generation and signing;
- accessory assignment and tracking;
- preparation and return checking.

This mode is necessary because the current customer depends on these capabilities.

However, this mode is not the main growth bet because larger professional rentals may compare the product against mature rental platforms.

### WhatsApp-style rental mode

This mode is aimed at smaller rental businesses.

The customer-facing experience should be simple:

- customer opens the catalog;
- customer selects a location if needed;
- customer selects a rental period;
- customer sees equipment;
- customer chooses equipment or combos;
- system generates a prefilled WhatsApp message with the order details;
- customer sends the message manually to the tenant;
- the system creates a Pending rental order;
- tenant and customer continue the conversation in WhatsApp;
- tenant staff reviews the Pending order;
- tenant staff clicks Confirm if they want to accept it;
- when confirming, the system validates the order, calculates price if needed, assigns assets, blocks assets, and confirms the order.

In this mode, the system does not send automatic WhatsApp notifications.

The system should not depend on the WhatsApp Business API, because requiring small rentals to create and configure a Meta business portfolio is not feasible for the target market.

For this mode, WhatsApp is not notification infrastructure. It is a handoff channel where the customer intentionally sends the order/request to the tenant.

A Pending order does not block assets. Availability shown to the customer before confirmation is informative, not a final commitment.

The rental becomes a real commitment only when tenant staff confirms it and the system successfully validates the order, assigns assets, and blocks them.

## Core domains

### Lightweight Customer Rental Flow

Why it is core:

This is the future product differentiator.

The goal is to make it extremely easy for small rental businesses to show their catalog, let customers choose a period, see availability, select equipment, and send a rental request through WhatsApp.

This flow should feel closer to lightweight social commerce than to enterprise rental software.

What must be great:

The flow must be simple, fast, mobile-friendly, and understandable for non-technical rental owners and their customers.

The customer should understand what is likely available before contacting the tenant.

The customer should be able to send a clear WhatsApp message containing the rental request without needing an account, payment flow, or complex checkout.

Important rules:

The customer sends the WhatsApp message manually.

The system may generate the prefilled message, but it does not send the message automatically.

The system creates a Pending rental order.

The tenant and customer continue communication directly in WhatsApp.

The flow should avoid complex professional-rental concepts unless the tenant explicitly needs them.

A Pending order does not block assets.

Risks:

If this flow becomes as complex as the professional backoffice, the product loses its advantage for small rentals.

If the customer cannot quickly understand availability, the flow becomes just another static catalog.

If the WhatsApp handoff is unclear, the tenant may receive messy or incomplete requests.

If customers believe availability is guaranteed before tenant confirmation, the product may create false expectations.

Related business areas:

Catalog
Availability / Asset Allocation
Locations
Pricing
Rental Ordering

### Rental Commitment Engine

Why it is core:

This is the trust engine of the system.

It turns catalog choices into safe rental commitments by validating the order, calculating the price, assigning physical assets, and blocking those assets for one rental period and one location.

Even if this is not a unique differentiator against mature rental platforms, it is core because the product cannot be trusted if this part fails.

What must be great:

The system must prevent double booking.

The system must respect the selected location.

The system must automatically assign compatible physical assets.

The system must correctly handle equipment, combos, and eventually accessories.

The system must support draft-to-confirmed and pending-to-confirmed workflows.

The system must preserve the confirmed price and assigned assets used when the order becomes a commitment.

Important rules:

Customers request equipment types or combos, not specific assets.

The system automatically assigns assets when the order is confirmed.

Manual asset assignment by tenant staff is out of scope for now.

Availability is protected by blocking assigned assets.

A Pending order does not block assets.

A Draft order does not block assets until confirmed.

A Confirmed order must have assigned and blocked assets.

An order belongs to one tenant, one location, and one shared rental period.

If validation or asset assignment fails, the order cannot be confirmed.

Risks:

If this engine is wrong, the product becomes unreliable.

If this engine becomes too coupled to the customer-facing flow, the small-rental experience will become hard to simplify.

If this engine becomes too coupled to the professional workflow, future product modes will become harder to support.

Related business areas:

Rental Ordering
Availability / Asset Allocation
Pricing
Locations
Catalog

## Supporting subdomains

### Catalog

Why it is supporting:

The catalog is essential because it defines what tenants offer and what customers can browse.

For small rentals, the catalog is very important to the customer experience. However, catalog alone is not the strategic center. It supports the Lightweight Customer Rental Flow and the Rental Commitment Engine.

Must be good at:

Equipment presentation.
Categories.
Combos.
Location-scoped visibility.
Clear customer-facing descriptions.
Simple browsing.
Showing informative availability based on selected period and location.

Strategic note:

The catalog should be designed to feel simple for small rentals while still supporting complex professional data when needed.

### Pricing

Why it is supporting:

Pricing is necessary and must be reliable, especially for discounts, combos, promotions, and custom budgets.

For professional rentals, pricing often needs flexibility because staff may create draft orders, budgets, and custom adjusted prices.

For smaller rentals, pricing should probably feel simple and predictable.

Must be good at:

Base price calculation.
Combo discounts.
Promotions.
Custom adjustments.
Preserving confirmed prices.
Supporting draft/budget workflows.

Strategic note:

Pricing supports the customer flow, but unless the product competes through advanced pricing automation, it should not dominate the design.

### Locations

Why it is supporting:

Locations are essential for scoping catalog, availability, orders, and asset assignment.

A location represents the branch/sucursal/territory responsible for a rental.

Locations are not the strategic differentiator by themselves, but getting them wrong would damage the rental commitment engine.

Must be good at:

Scoping customer-facing catalog.
Scoping availability.
Scoping asset assignment.
Scoping backoffice views.
Supporting an “all locations” operational view without allowing orders to belong to “all.”

Strategic note:

For now, the system treats location as the branch/sucursal responsible for catalog visibility, availability, orders, and asset assignment.

Multiple warehouses inside one location are out of scope, but the model should not make that impossible later.

### Third-Party Owner Management

Why it is supporting:

Third-party equipment is valuable because it allows a tenant to offer more equipment than they personally own.

This is very important for the current professional customer.

It may be a meaningful advantage for some rentals, but it is probably not the first strategic bet for smaller rentals.

Must be good at:

Representing asset owners.
Representing owner contracts.
Knowing whether third-party-owned assets can be offered.
Supporting future owner split calculations or reporting.

Strategic note:

Owner contracts influence asset eligibility and financial reporting, but they should not complicate the core rental order too early.

### Accessories / Preparation

Why it is supporting:

Accessories are important for professional rentals because they affect preparation, availability, blocking, and return checking.

They behave similarly to assets, but they are tied to compatible equipment and are not usually rented independently from the customer-facing catalog.

Must be good at:

Compatible accessory rules.
Automatic accessory assignment.
Blocking accessories for the rental period.
Preparation support.
Return checking.

Strategic note:

Accessories should not leak into the small-rental customer flow unless the tenant needs them.

### Professional Rental Workflow

Why it is supporting:

The professional workflow is necessary for the current customer and for larger rental operations.

It includes contracts, signing, customer approvals, draft budgets, preparation, pickup/delivery, return checks, and order completion.

Must be good at:

Draft orders.
Budget presentation.
Order confirmation.
Contract generation.
Contract signing.
Preparation.
Pickup/delivery.
Return checking.
Completion.

Strategic note:

This workflow must remain supported, but it should not define the whole product experience for smaller rentals.

## Generic subdomains

### Notifications

Why it is generic:

Notifications are generic when they are only delivery infrastructure.

For professional rental mode, the system may notify customers or tenant users after important events.

For WhatsApp-style rental mode, automatic notifications are not part of the flow.

Important distinction:

Generating a WhatsApp message for the customer to send is part of the Lightweight Customer Rental Flow.

Automatically sending notifications through WhatsApp would be notification infrastructure, and is intentionally out of scope for the small-rental strategy.

Must stay simple:

Email notifications.
Basic internal notifications.
Optional tenant/staff notifications.
No dependency on WhatsApp Business API for the small-rental flow.

### Tenant/User Management

Why it is generic:

Tenant and user management are necessary, but they are not product differentiators.

Must stay simple:

Tenant isolation.
Tenant users.
Roles/permissions.
Basic tenant configuration.

### Authentication

Why it is generic:

Authentication must be secure and reliable, but it should not consume strategic modeling effort.

Must stay simple:

Login.
Session management.
Access control.
Tenant scoping.

### Basic Reporting

Why it is generic for now:

Reporting is useful, but it is not the current strategic bet.

Must stay simple:

Basic rental/order visibility.
Basic asset usage visibility.
Basic financial summaries if needed.

### Contract Signing Infrastructure

Why it is generic/supporting:

Contract signing matters for professional rentals, but the infrastructure itself should not become the center of the domain model.

Must stay simple:

Generate contract.
Request signature.
Track signature status.
Store signed contract.

## Strategic classification summary

Core domains:

- Lightweight Customer Rental Flow
- Rental Commitment Engine

Supporting subdomains:

- Catalog
- Pricing
- Locations
- Third-Party Owner Management
- Accessories / Preparation
- Professional Rental Workflow

Generic subdomains:

- Notifications
- Tenant/User Management
- Authentication
- Basic Reporting
- Contract Signing Infrastructure

## Key strategic decisions

The product should not try to beat large rental platforms by becoming a more complex professional rental system.

The product should use the strong rental operations engine as a foundation, then expose it through a simpler customer-facing flow for smaller rentals.

WhatsApp-style mode should not require WhatsApp Business API.

In WhatsApp-style mode, the customer manually sends a generated WhatsApp message to the tenant.

In WhatsApp-style mode, the system creates a Pending rental order.

A Pending order does not block assets.

Tenant staff confirms the Pending order manually if they want to accept it.

When tenant staff confirms a Pending order, the system runs validation, calculates price if needed, automatically assigns compatible assets, blocks those assets, and confirms the rental order.

If validation or asset assignment fails, the order cannot be confirmed.

Automatic WhatsApp notifications are not part of the WhatsApp-style mode.

Professional-rental complexity should remain available, but it should not leak into the lightweight customer flow.

Location is part of the rental commitment because it scopes catalog, availability, orders, and asset assignment.

Automatic asset assignment is part of the current model. Manual asset assignment is a future possibility, not a current strategic requirement.

## Open strategic questions

Should small-rental tenants be able to operate without creating customer accounts?

Should Pending WhatsApp-style orders show availability as informative only, since assets are not blocked yet?

Should tenants be warned when a Pending order can no longer be confirmed because assets became unavailable?

Should the system automatically re-check availability when tenant staff opens a Pending order, or only when they click Confirm?

Should professional tenants and small tenants use the same order lifecycle with different configuration, or should there be separate simplified statuses for small rentals?

How much pricing complexity should be exposed in the lightweight flow?

Should third-party-owned equipment be available in WhatsApp-style mode, or only in professional mode?
