# 01 - Understand

## What is the system for?

The system helps equipment rental businesses manage rental operations so they can avoid booking mistakes, control equipment availability, and operate rentals from request to return.

The current system supports complex professional rentals with specialized features such as multiple locations, third-party equipment owners, owner contracts, discounts, combos, contract signing, and accessory tracking.

The future product direction is to keep supporting complex professional rental operations, but grow by serving smaller rentals that need a simpler WhatsApp-style customer flow.

This means the core rental model must support complexity, while the customer-facing flow must be configurable and simple when the tenant does not need contracts, accessory preparation, or formal approval steps.

## Who are the people involved?

The paying customer is the tenant. A tenant can be an individual or a company that rents equipment to the public.

The tenant’s users are the business owner and their management/operations staff. These users work inside the operational dashboard and manage catalog, assets, availability, orders, customers, contracts, preparation, pickup/delivery, and returns.

The tenant’s customers are the people or companies who rent equipment from the tenant.

As platform owner, I need to support both sides of the product: the tenant’s operational backoffice and the tenant customer’s ordering/request flow.

## What are the main business objects?

Tenant = a business that uses the platform to rent equipment to the public.

Tenant User = a person related to the tenant, such as the owner or an employee, who uses the operational dashboard.

Tenant Customer = a person or company that rents equipment from a tenant.

Order = a rental request or rental commitment involving one or more rentable items for one shared rental period.

Equipment = a rentable type/model shown in the catalog. Customers usually select equipment, not specific physical assets.

Asset = a physical unit that can be assigned, reserved, picked up, returned, maintained, blocked, or tracked.

Category = a catalog grouping used to organize rentable equipment.

Combo = a catalog-visible rentable package composed of multiple equipment types, usually offered together and possibly with a discount. Customers can add combos to an order and can mix combos with individual equipment.

Accessory = a physical tracked item that is tied to compatible equipment. Accessories are usually assigned during order preparation, become blocked for the rental period, and are checked on return. Accessories behave similarly to equipment/assets, but they are not usually rented independently from the customer-facing catalog.

Availability = the system’s answer to whether the required assets can be promised for a given rental period.

Asset Assignment = the automatic process of selecting specific available physical assets to satisfy the equipment types, combos, and accessories required by an order.

Owner = the person or business that owns an asset. Usually this is the tenant, but it can also be a third party.

Owner Contract = an agreement that defines the payment split or commercial conditions for renting third-party-owned assets.

Location = a tenant operating area/branch/sucursal from which rental orders are created and fulfilled. Today, location behaves more like a city/territory/sucursal than a physical warehouse.

## Important modeling decisions

Customers request equipment types or combos from the catalog. They do not necessarily choose specific assets.

Asset assignment is automatic. The system does not currently support manual asset assignment by tenant staff.

When an order is accepted or confirmed, the system must automatically choose compatible available assets for the full rental period and block those assets.

An order cannot truly reserve availability without assigned assets. Availability is protected by blocking specific assets for the rental period.

A rental order belongs to exactly one location. Customers rent from one location at a time, and the selected location scopes catalog visibility, availability, asset assignment, and fulfillment.

The backoffice can have an “all locations” view, but “all” is only an operational view mode. A rental order itself belongs to one real location.

## What is the main workflow?

The system does not currently support in-app payments. Payment is usually handled at pickup or delivery time.

A complex rental usually works like this:

1. A tenant customer selects a rental location.
2. A tenant customer requests a rental, or tenant staff creates it manually.
3. The order contains equipment types and/or combos for one shared rental period.
4. The system checks availability for the required equipment and combo contents at the selected location.
5. The system automatically assigns compatible physical assets from the selected location.
6. The assigned assets are blocked for the rental period.
7. The rental is reserved or confirmed.
8. Tenant staff prepares the order.
9. During preparation, compatible/required accessories are automatically assigned when needed.
10. Tenant staff sends the contract for signature if contracts are enabled.
11. The tenant customer signs the contract if required.
12. Equipment and accessories are picked up or delivered.
13. Equipment and accessories are returned.
14. The return is checked.

For smaller WhatsApp-style rentals, the workflow may skip preparation complexity, formal contract signing, and some approval steps.

## What must never go wrong?

The worst business mistakes are:

- promising the same physical asset to two orders for overlapping periods;
- promising equipment when no compatible asset can actually satisfy the order;
- assigning assets from the wrong location;
- losing track of assigned accessories;
- calculating the wrong rental price or discount;
- applying the wrong owner split for third-party-owned assets;
- allowing one tenant to access another tenant’s data.

## What does the system do today?

The system currently supports a broad set of professional rental features:

- locations;
- asset owners;
- owner contracts/payment splits;
- promotions and discounts;
- customer approval/rejection flows;
- contract generation and signing;
- accessory management and assignment;
- combos;
- draft orders;
- adjusted prices for budgets or custom orders.

The current customer uses many of these advanced features.

The desired product direction is not to keep expanding complexity indefinitely. The current feature set should become the upper complexity limit for now, while future work focuses on polishing the existing model and creating a simpler WhatsApp-style experience for smaller rentals.

## What is painful in the current design?

The current system has weak module boundaries. Some modules may be the wrong modules, or they may be split around technical concepts instead of business consistency boundaries.

The biggest pain is that important business operations span transactions across multiple modules and create many dependencies between them.

Combos and accessories are especially painful because their current database designs do not represent their business behavior well.

The redesign should identify which concepts need to change together in one strong consistency boundary, and which concepts can communicate through explicit APIs, domain events, or delayed reactions.

## What are my constraints?

I am a solo developer, so the design must stay simple enough to hold in one head.

I currently have one complex customer, so I must keep supporting their workflow, but I should avoid overfitting the entire product to only that customer.

The current feature set is probably a good upper complexity limit for the system.

I want a modular monolith, so boundaries should be logical and enforceable inside one codebase, without introducing distributed-system complexity.

Any migration must be gradual and must not break the current customer.

## Understand conclusion

The core of the system is not just equipment catalog management.

The core is managing rental orders that automatically resolve catalog choices into specific physical assets, then block those assets for one shared rental period and one selected location.

The model must support complex professional rental operations, but the customer-facing flow must be able to feel simple for smaller WhatsApp-style rentals.

The most important modeling areas to investigate next are:

- order/rental lifecycle;
- location-scoped catalog and availability;
- automatic asset assignment;
- asset blocking;
- combos as catalog-visible rentable packages;
- accessories as tracked dependent assets;
- owner contracts for third-party assets;
- pricing, discounts, and custom adjustments;
- tenant isolation.
