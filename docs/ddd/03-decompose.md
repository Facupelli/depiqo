# 03 - Decompose

## Purpose

This step identifies candidate business areas inside the rental system. These are not final modules yet. They are candidate subdomains that will be refined later.

## Candidate business areas

### Catalog

Purpose:
Defines what the tenant offers for rent.

Owns:
Equipment
Categories
Combos
Catalog visibility

Does not own:
Physical asset assignment
Rental order lifecycle
Final availability decisions

Key question:
What can the customer choose?

---

### Rental Ordering

Purpose:
Manages the rental order from request to confirmation and later lifecycle states.

Owns:
Order
Order items
Rental period
Order status
Tenant customer relationship to the order

Does not own:
Catalog definitions
Physical asset inventory
Notification delivery
Owner payout rules

Key question:
What is the customer asking to rent, for what period, and what is the order state?

---

### Availability / Asset Allocation

Purpose:
Resolves requested catalog items into specific physical assets and protects those assets from overlapping orders.

Owns:
Asset assignment
Asset blocking
Availability checks

Does not own:
Catalog presentation
Order pricing
Customer notifications

Key question:
Which physical assets can safely satisfy this order?

---

### Pricing

Purpose:
Calculates and preserves the financial terms of the rental order.

Owns:
Base price calculation
Combo discounts
Promotions
Custom adjustments
Confirmed order price

Does not own:
Asset availability
Order fulfillment
Owner contract payouts unless explicitly decided later

Key question:
How much should this rental cost?

---

### Locations

Purpose:
Defines the tenant’s rental branches/sucursales and scopes catalog, availability, orders, and asset assignment.

Owns:
Location
Location-level scope
Location visibility/status

Does not own:
The full rental order lifecycle
Physical warehouse modeling for now
Asset assignment rules
Catalog definitions

Key question:
Which location is responsible for this rental?

---

### Notifications

Purpose:
Notifies tenant customers and tenant users about relevant rental events.

Owns:
Notification rules
Notification channels
Notification delivery status

Does not own:
Order confirmation
Asset assignment
Pricing decisions

Key question:
Who should be informed, when, and how?

---
## Modeling pressure points

### Combos

Combos are catalog-visible rentable packages. They affect catalog, pricing, and availability because they must expand into required equipment items.

Open question:
Do combos belong mainly to Catalog, Pricing, or Rental Ordering?

Current hypothesis:
Combos are defined in Catalog, priced by Pricing, and expanded during Rental Ordering/Availability.

### Accessories

Accessories are tracked physical items tied to compatible equipment. They behave similarly to assets, but they are assigned during preparation and are not usually rented independently from the customer-facing catalog.

Open question:
Are accessories part of Asset Allocation, Preparation, Catalog, or their own area?

Current hypothesis:
Accessories should be modeled as tracked assets with special relationship rules to equipment.

### Owner Contracts

Third-party asset owners affect asset eligibility and financial splits.

Open question:
Do owner contracts belong to Asset Management, Pricing, or a separate Owner/Partner area?

Current hypothesis:
Owner contracts influence asset availability/eligibility and later financial reporting, but they should not complicate the core rental order too early.
