# 07 - Define

## Purpose

This step defines the candidate bounded contexts more explicitly. A bounded context is not just a module or folder; it is a boundary where terms have a specific meaning and where one part of the system has authority over specific business decisions.

This revision updates the model around the new rental catalog language: `RentableItem`, `RentalOffer`, `FulfillmentRequirement`, `EquipmentType`, and `Asset`.

```text
RentableItem = what the tenant defines as a rentable catalog item.
RentalOffer = how a branch offers a RentableItem under commercial rules.
FulfillmentRequirement = what equipment is required to fulfill a RentableItem.
EquipmentType = an operational equipment type that groups interchangeable assets.
Asset = the actual physical object assigned and blocked for a rental.
```

The major design change is that customer/staff selection is no longer modeled as selected equipment types and selected combos. The system now models selection through branch-specific `RentalOffer`s. A `RentalOffer` points to a tenant-owned `RentableItem`; each `RentableItem` expands into one or more `FulfillmentRequirement`s; each requirement produces `EquipmentType` demand; and that demand is fulfilled with physical `Asset`s.

## Guiding principles

Context is king. The same real-world concept can appear in multiple contexts with different meanings. A context should own the behavior and data needed to perform its business capability. A context may keep local references or snapshots of data from other contexts without becoming the authority over the original data. Logical boundaries come first; these contexts can initially live inside a modular monolith.

The system should avoid entity services such as one giant Product Service, Asset Service, or Order Service that every feature depends on. It should also avoid cross-context transactions that recreate coupling. It should separate commercial selection from operational fulfillment, and it should distinguish what a customer selected, what equipment is required, and which physical assets are assigned.

Confirmed rental orders should preserve local snapshots of the selected rental offers, resolved rentable items, expanded equipment demand, accepted price, selected branch, rental period, and assigned asset references.

Not every strategically important product experience is a bounded context. The WhatsApp-style customer flow is strategically important, but for now it is a customer-facing application flow built on top of Rental Catalog, Pricing, Tenant Management, and Rental Commitment.

## Current architectural decisions

The confirmation flow must be atomic. Confirming a rental order, assigning equipment assets, blocking those assets, preserving the confirmed price snapshot, and changing the order status must succeed or fail together.

Rental Commitment is the first and most important bounded context. It owns rental-specific commitment facts and is the sole authority over all rental-related asset blocks, including equipment and accessory blocks. Other contexts do not write to or query asset blocks directly; they use Rental Commitment public capabilities or react to its events.

Rental Catalog owns tenant-defined rentable items, branch rental offers, and fulfillment requirements. It does not own physical assets, asset availability, final rental commitments, or accepted order price snapshots.

Asset Inventory owns equipment types and physical assets. It does not own storefront items, selected rental items, rental orders, or rental asset blocks.

Pricing owns calculation rules and returns price breakdowns. Rental Commitment preserves the accepted price breakdown as the order price snapshot. Pricing must not own durable order price state.

Preparation is not a separate bounded context for now. It lives inside Rental Commitment because preparation affects selected accessories, accessory assignments, and accessory blocks.

Locations and scheduling are not a separate bounded context for now. They live inside Tenant Management because they are currently tenant/branch configuration: branches, schedules, pickup slots, return slots, timezone rules, and product mode configuration.

---

# Bounded Contexts

## 1. Rental Commitment Context

### Purpose

Manages rental orders as operational commitments. It turns a customer or staff request into a rental commitment by preserving the selected rental period, selected branch, selected rental offers, resolved rentable item snapshots, expanded equipment demand, confirmed price snapshot, assigned asset references, preparation state, and asset blocks.

### Strategic role

Core domain. This is the trust engine of the system. If this context is wrong, the system may double-book assets, confirm unavailable rentals, lose price consistency, prepare orders with incorrect accessories, or create invalid operational orders.

### Local language

`Order` = a rental request or rental commitment for one tenant, one branch, one rental period, and one or more selected rental offers.  
`Pending Order` = an order created from the WhatsApp-style customer flow that has not yet been accepted by tenant staff and does not block assets.  
`Draft Order` = an order created by tenant staff as a budget or proposal that does not block assets until confirmed.  
`Confirmed Order` = an accepted operational order that is expected to happen and has assigned and blocked required equipment assets.  
`Prepared Order` = a confirmed order whose accessory choices have been reviewed by tenant staff.  
`RentalSelection` = the local commercial record of what the customer or staff selected. It references a selected `RentalOffer` and preserves a snapshot of the resolved `RentableItem`.  
`RentalDemandLine` = the local fulfillment demand produced by a `RentalSelection`. It references an `EquipmentType` and preserves the quantity required.  
`Confirmed Price Snapshot` = the accepted price breakdown/result preserved on the order.  
`Assigned Asset Reference` = the local reference to a physical asset selected to satisfy a demand line or accessory selection.  
`Asset Block` = the local commitment that a specific asset cannot be used by another overlapping rental order.  
`Expanded Equipment Demand` = the equipment types and quantities required to fulfill all selected rental offers.

### Local meaning of shared concepts

`RentableItem` means the customer-facing item snapshot preserved on the order, not the full Rental Catalog entity. `RentalOffer` means the selected offer reference, not the full branch offer lifecycle. `EquipmentType` means the operational equipment type required by a demand line, not a storefront item. `Asset` means a physical asset reference assigned and blocked for this order, not the full physical asset profile. `Location` or `Branch` means the selected branch responsible for the order, not the full tenant configuration. `Price` means the confirmed price snapshot, not the whole pricing model. `Availability` means whether required physical assets can be assigned and blocked for this period and branch.

### Owns

Order lifecycle and status. Rental selections as the commercial record of what was requested. Rental demand lines as the local fulfillment demand created from selections. Selected rental period. Selected branch reference. Tenant customer reference. Confirmed price snapshot. Assigned equipment asset references. Equipment asset blocks. Accessory selections and accessory asset blocks. Preparation state. The relationship between a rental selection and the demand lines it produced. The no-overlap invariant for all rental-related asset blocks. Atomic confirmation and atomic confirmed-order edits when period, selections, quantities, price, assignments, or blocks change.

### Does not own

Rental Catalog descriptions, rentable item images, category browsing, full `RentableItem`, full `RentalOffer`, or full `FulfillmentRequirement` definitions. Full physical asset profiles, equipment type lifecycle, branch schedules, tenant configuration, pricing rules, promotion/coupon definitions, contract generation, notification delivery, reporting, or analytics.

### Main decisions

Can this order be created as Pending or Draft? Can it be confirmed? What facts must be preserved at confirmation? Which selected offers become rental selections? Which fulfillment requirements become demand lines? Which assets are assigned and blocked? Can this confirmed order be edited, cancelled, prepared, picked up, returned, or completed? Does an edit require catalog revalidation, pricing recalculation, or availability revalidation?

### Public capabilities

Create Pending Order. Create Draft Order. Confirm Order. Edit Confirmed Order. Cancel Order. Release Asset Blocks. Start Preparation. Review Accessories. Reserve Selected Accessories. Release Accessory Blocks. Mark Order Prepared. Get Order Commitment Details. Check whether an order is committed. Check whether an asset is blocked for a period. Check availability for resolved equipment demand. Assign assets to resolved equipment demand.

### Uses from other contexts

Rental Catalog to validate selected rental offers, resolve rentable item snapshots, and resolve fulfillment requirements. Pricing to calculate price breakdowns. Tenant Management to validate tenant/user permissions, selected branch, rental period, schedules, slots, timezone, product mode, and configuration. Asset Inventory to know which equipment types and assets exist and are eligible assignment candidates. Tenant customer data to reference or snapshot the customer.

### Local copied data / snapshots

Rental offer id. Rentable item id/name/kind snapshot. Equipment type id/name snapshot. Accessory id/name snapshot. Selected branch id. Customer id/contact snapshot. Confirmed price and breakdown snapshot. Assigned asset ids. Rental period. Order source/mode.

### Events

Publishes: Pending Rental Order Created, Draft Rental Order Created, Rental Order Confirmed, Confirmed Rental Order Edited, Rental Order Cancelled, Asset Blocks Created/Released, Preparation Started, Accessories Reviewed, Rental Order Prepared, Picked Up, Delivered, Returned, Checked, and Completed.

Consumes: Rental Catalog Item Changed, Rental Offer Changed, Asset Became Unavailable, Tenant Configuration Changed, and Pricing Rule Changed when pending/draft validation, warnings, or recalculation may be affected.

### Consistency rules

Pending and Draft orders do not block assets. Confirmed orders must have assigned and blocked equipment assets for all required demand lines. Confirmation must atomically preserve the confirmed price snapshot, assigned assets, asset blocks, rental selection snapshots, demand snapshots, and confirmed status. Confirmed-order edits must be atomic when they affect period, selected offers, quantities, assigned assets, blocks, or price. Every demand line must be traceable to a rental selection. Every equipment asset block must be traceable to a demand line or accessory selection. The same physical asset must not be blocked for overlapping rental periods. Confirmed price snapshots must not change without preserving order consistency.

### Important notes

Confirmed means reserved, not final. Confirmed orders are still editable before pickup or delivery. Contract signing does not automatically make the order immutable. Preparation happens before contract signing because accessories are detailed in the contract. The confirmed price snapshot is authoritative for that specific order, even if rental catalog or pricing rules change later. Rental Commitment owns all rental-related asset blocks.

### Open questions

Can confirmed orders be edited after pickup/delivery? When are blocks released? Should assignment and price history be preserved? Is Confirmed enough, or is Locked needed? Which edits require contract warnings or re-signing? How much of the resolved offer should be snapshotted?

---

## 2. Rental Catalog Context

### Purpose

Defines what the tenant offers for rent and how those rentable items are presented and made selectable through branch-specific rental offers. This replaces the old direct split between equipment and combos as selectable catalog concepts.

### Strategic role

Supporting subdomain. It strongly supports customer-facing rental flows and staff order creation, but it does not own the rental commitment.

### Local language

`RentableItem` = a tenant-owned rentable catalog item that can be presented to customers or staff. It can represent a standalone item, package, kit, combo, bundle, or future rentable unit.  
`RentalOffer` = a branch-specific commercial offer to rent a `RentableItem`. It controls visibility, rentability, validity, and pricing references for that branch.  
`FulfillmentRequirement` = the equipment type and quantity required to fulfill one unit of a `RentableItem`.  
`RentableItemKind` = a UI/reporting classification such as `SINGLE`, `PACKAGE`, `KIT`, or `BUNDLE`; it should not drive fulfillment behavior.  
`Category` = a grouping used to organize rentable items.  
`Catalog Visibility` = whether a rental offer is shown in a tenant/branch/customer-facing flow.  
`Rentability` = whether a rental offer can currently be selected.  
`Accessory Definition` = a catalog/configuration definition of an accessory type.  
`Accessory Compatibility` = the relationship between rentable items/equipment requirements and compatible/default accessories.

### Local meaning of shared concepts

`RentableItem` means the catalog identity of what may be rented, not the committed order selection. `RentalOffer` means the branch-specific offer that makes a rentable item selectable, not an order line. `FulfillmentRequirement` means the catalog rule describing required equipment demand, not assigned assets. `EquipmentType` means the operational equipment type referenced by requirements; Asset Inventory is the authority over equipment types. `Branch` means the branch where an offer is visible/rentable; Tenant Management is the authority over branch profile and schedule. Catalog availability is informative, not a final rental commitment.

### Owns

Rentable item definitions, presentation fields, categories, and lifecycle. Rental offer definitions, branch-scoped visibility, branch-scoped rentability, validity windows, and pricing/rate plan references. Fulfillment requirements for rentable items. Accessory definitions, compatibility definitions, and default accessory rules.

### Does not own

Order lifecycle, rental selections on orders, demand lines on orders, asset assignment, asset blocking, confirmed price snapshots, final availability decisions, physical asset profiles, equipment type lifecycle, branch schedules, pricing rule behavior, preparation state, contracts, or notifications.

### Main decisions

Can this rentable item exist, activate, archive, or be deleted? What equipment requirements are needed to fulfill one unit? Can this branch offer this rentable item? Should this offer be visible or selectable? Is this offer valid for the requested period? Which pricing/rate plan reference applies? Which accessory definitions are compatible or suggested?

### Public capabilities

List rentable items. Get rentable item details. List rental offers for a tenant/branch. Get rental offer details. Resolve selected rental offers. Validate whether selected offers are visible, rentable, and valid for a branch. Return rentable item snapshots for selected offers. Return fulfillment requirements for selected offers. Provide accessory compatibility and default accessory suggestions.

### Typical resolved selection contract

```ts
type ResolvedSelectedRentalOffer = {
  rentalOfferId: string;
  rentableItem: {
    id: string;
    name: string;
    kind: 'SINGLE' | 'PACKAGE' | 'KIT' | 'BUNDLE';
  };
  branchId: string;
  quantity: number;
  pricingRef?: {
    ratePlanId: string;
  };
  fulfillmentRequirements: Array<{
    equipmentTypeId: string;
    equipmentTypeName?: string;
    quantityPerItem: number;
  }>;
};
```

This contract lets Rental Commitment preserve selection snapshots, Pricing calculate from commercial selections, and availability/assignment logic calculate equipment demand.

### Events

Publishes: Rentable Item Created/Updated/Activated/Archived/Deleted, Rental Offer Created/Updated/Visibility Changed/Rentability Changed/Pricing Reference Changed, Fulfillment Requirement Changed, and accessory definition/compatibility/default rule events.

Consumes: Equipment Type, Branch, and Rate Plan changes when admin read models, validation, or warning flows may be affected.

### Consistency expectations

Rental catalog changes should not mutate already confirmed orders. Confirmed orders preserve snapshots of selected offers, rentable items, and resolved fulfillment demand. Rental Catalog may reference `EquipmentType`, `Branch`, and `RatePlan` identifiers, but Asset Inventory, Tenant Management, and Pricing remain the authorities over those concepts.

### Open questions

Should requirements support branch overrides? Should offers support customer eligibility or seasonal publishing? Should `RentableItemKind` support service/add-on labels? Where should accessory compatibility attach? How much catalog data should orders snapshot?

---

## 3. Asset Inventory Context

### Purpose

Owns the physical and operational truth about equipment types and assets that can be rented, tracked, maintained, owned, transferred, or assigned.

### Strategic role

Supporting subdomain. It provides the physical asset data required by Rental Commitment and the operational equipment type data referenced by Rental Catalog fulfillment requirements.

### Local language

`EquipmentType` = an operational type/model of equipment that groups interchangeable assets for fulfillment. It is not the customer-facing rentable item.  
`Asset` = a physical unit owned by the tenant or a third party.  
`Asset Owner` = the owner of a physical asset.  
`Asset Condition` = the operational state of the asset.  
`Asset Location` = the branch/location where the asset belongs, currently is, or is normally assigned.  
`Equipment Asset` = a physical asset that can satisfy equipment type demand.  
`Accessory Asset` = a physical asset that can satisfy a selected accessory request.  
`Third-Party Asset` = an asset owned by someone other than the tenant.

### Local meaning of shared concepts

`RentableItem` is not an inventory concept. It is a Rental Catalog item that may require equipment types. `FulfillmentRequirement` is not an inventory fact; it is a Rental Catalog rule that references equipment types. `Asset` means the full physical asset profile. `Location` means where the asset belongs or can be assigned from. `Availability` does not mean rental commitment; rental availability is affected by blocks owned by Rental Commitment.

### Owns

Equipment type definitions and operational metadata. Physical asset profile, identity, ownership, location, condition, metadata, active/inactive status, and eligibility data used for assignment candidate checks. Whether an asset is an equipment asset, accessory asset, or both if allowed.

### Does not own

Rentable item definitions, rental offers, fulfillment requirements, customer-facing catalog descriptions, storefront visibility, order lifecycle, confirmed price snapshots, rental confirmation, asset blocks, preparation state, contracts, or notifications.

### Main decisions

Can this equipment type exist or be active? Can this asset exist? Which equipment type does this asset belong to? Where is this asset located? Is this asset active and eligible for assignment? Is this asset owned by the tenant or a third party?

### Public capabilities

List equipment types. Get equipment type details. Create/update equipment types. Activate/deactivate equipment types. List assets by equipment type and branch. List accessory assets by accessory type and branch. Get asset details. Check asset eligibility as an assignment candidate. Update asset condition, owner, location, and active status.

### Events

Publishes: Equipment Type Created/Updated/Activated/Deactivated, Asset Created/Updated, Asset Condition/Location/Owner Changed, and Asset Deactivated.

Consumes: Rental Order lifecycle events only if inventory needs operational read models or utilization statistics.

### Consistency expectations

Rental Commitment may reference equipment types and assets, but Asset Inventory remains the authority over physical asset profiles and equipment type definitions. Rental Catalog may reference equipment types in fulfillment requirements, but Asset Inventory owns the equipment type lifecycle. Rental Commitment owns rental-related asset blocks. Asset Inventory should not directly confirm, prepare, cancel, or modify rental orders.

### Open questions

Should maintenance or owner contracts become separate contexts? Are accessories normal assets with a role/type? Can one asset satisfy multiple equipment types? Should equipment types stay tenant-wide? The current recommendation is tenant-wide.

---

## 4. Pricing Context

### Purpose

Calculates rental prices based on selected rental offers, rentable items, rental period, rate plans, promotions, coupons, discounts, tiers, and custom adjustments.

### Strategic role

Supporting subdomain. Pricing must be reliable and may become complex enough to deserve independent authority.

### Local language

`Price Calculation` = the process of calculating a rental price.  
`Price Breakdown` = the structured explanation of how the final price was produced.  
`Rate Plan` = a named set of pricing rules that can be referenced by rental offers.  
`Base Price` = the normal price for renting an item.  
`Pricing Tier` = a pricing rule based on duration, quantity, customer type, branch, or another dimension.  
`Promotion`, `Coupon`, `Discount`, and `Custom Adjustment` = mechanisms that modify price.  
`Package Price` = a price or discount rule applied when a rentable item represents a package/kit/bundle.

### Local meaning of shared concepts

`RentalOffer` means a pricing input/reference, not the full Rental Catalog offer lifecycle. `RentableItem` means a priceable selected item, not the full catalog entity. `Order` means the pricing input, not the full order lifecycle. `Price Snapshot` means the accepted pricing result stored by Rental Commitment. `EquipmentType` should not usually be the primary pricing input unless a pricing rule explicitly prices fulfillment components.

### Owns

Pricing rules, rate plans, base price logic, tiers, promotions, coupon validation, discounts, custom adjustment rules, price calculation behavior, price explanations, package pricing rules, and price breakdown generation.

### Does not own

Rental offer lifecycle, rentable item catalog definitions, order lifecycle, asset assignment, asset blocking, confirmed order status, confirmed price snapshots, contracts, or notifications.

### Main decisions

Can this price calculation be performed? Which rate plan applies? How do rental period, quantity, package pricing, promotions, coupons, discounts, and custom adjustments affect the result? What price breakdown should be returned?

### Public capabilities

Calculate price. Validate pricing inputs. Validate coupon. Explain price breakdown. Apply promotion/discount rules. Return price breakdown for an order input. List and get rate plans.

### Events

Publishes: Rate Plan Created/Updated, Pricing Rule Changed, Pricing Tier Changed, Promotion Created/Updated/Expired, and Coupon Created/Updated/Expired.

### Consistency expectations

Rental Commitment uses Pricing before confirmation or price-affecting edits. Pricing returns a price breakdown. Rental Commitment owns the confirmed price snapshot after confirmation. Past confirmed orders should not change when pricing rules change. Rental Catalog may reference rate plan identifiers from rental offers, but Pricing remains the authority over rate plan behavior.

### Open questions

Who owns manual adjustments? Should Pricing preserve calculation history? Should pricing differ by branch/customer type? Should Pricing ever calculate from fulfillment requirements?

---

## 5. Tenant Management Context

### Purpose

Manages tenants, tenant users, roles, permissions, tenant-level configuration, product mode configuration, branches/sucursales, branch schedules, and rental time rules.

### Strategic role

Generic/supporting subdomain. Tenant management is necessary, but it is not the main product differentiator. Locations and scheduling live here for now because they are currently tenant/branch configuration rather than a separate rich domain.

### Local language

`Tenant` = a business using the platform.  
`Tenant User` = a user belonging to a tenant.  
`Role` = a permission grouping.  
`Tenant Configuration` = tenant-level settings that affect product behavior.  
`Product Mode` = configuration that determines whether the tenant/branch uses professional flow, WhatsApp-style flow, or both.  
`Branch` = a tenant branch/sucursal/territory where rentals are offered and fulfilled.  
`Schedule` = the opening/operating hours for a branch.  
`Pickup Slot` and `Return Slot` = allowed pickup/return times.  
`Timezone` = the timezone used to interpret tenant or branch dates/times.

### Local meaning of shared concepts

`Tenant` means the platform customer. `User` means a dashboard/backoffice user. `Branch` means a tenant-owned branch/configuration unit, not a rental commitment. `RentalOffer` may reference a branch, but Tenant Management owns the branch profile and schedule. `Asset` may reference a branch/location, but Asset Inventory owns the asset profile.

### Owns

Tenant profile, tenant users, roles and permissions, tenant-level configuration, product mode configuration, feature flags, branch profile, branch active/inactive status, branch schedule, pickup/return slot rules, and timezone rules.

### Does not own

Rental order lifecycle, rentable item definitions, rental offers, fulfillment requirements, asset assignment, asset blocking, price calculation, contracts, or notifications.

### Main decisions

Can this tenant use the system? Can this user perform this action? Is this branch active? Is this rental period valid for this branch? Are pickup and return slots valid? Which timezone applies? Which product mode is enabled?

### Public capabilities

Get tenant configuration. Validate user permissions. Manage tenant users. Manage product mode. List tenant branches. Validate selected branch, pickup slot, return slot, and rental period against branch schedule. Get tenant/branch timezone.

### Events

Publishes: Tenant Created, Tenant Configuration Changed, Tenant User Added, Tenant User Role Changed, Product Mode Changed, Branch Created/Updated/Disabled, and Branch Schedule Changed.

### Consistency expectations

Tenant configuration and branch schedule changes should affect future operations, not silently mutate confirmed orders. Rental Commitment preserves the selected branch reference and rental period snapshot. Rental Catalog may reference branch identifiers in rental offers, but Tenant Management remains the authority over branch lifecycle and scheduling.

### Open questions

Is timezone tenant-wide or branch-specific? Can orders move between branches? Can one branch contain multiple warehouses? When should Locations/Scheduling become a separate context?

---

## 6. Contracts Context

### Purpose

Manages contract generation, signing requests, signature state, and signed contract records.

### Strategic role

Generic/supporting subdomain. Important for professional rentals, but not the main product differentiator.

### Local language

`Contract` = the generated rental agreement document.  
`Signing Request` = the request sent to the customer to sign.  
`Signed Contract` = the completed signed agreement.  
`Re-signing Required` = a state caused by changes to the order after contract generation or signing.

### Local meaning of shared concepts

`Order` means the source data used to generate a contract. `RentalSelection` means selected rentable item information printed or summarized in the contract. `Accessories` mean included items detailed in the contract. `Price` means the confirmed price snapshot printed in the contract.

### Owns

Contract template usage, document generation, signing request state, signed contract storage/reference, and re-signing requirement.

### Does not own

Order confirmation, asset assignment, asset blocking, price calculation, preparation decisions, or rental catalog definitions.

### Capabilities, events, and consistency

Generates contracts, requests signatures, records signed contracts, marks re-signing required, and exposes contract status. Publishes contract lifecycle events and consumes Rental Order Confirmed, Confirmed Rental Order Edited, and Rental Order Prepared. Contract signing does not automatically make an order immutable; order changes may require re-signing. Open questions: which edits require re-signing, whether pickup can happen without a signed contract, and whether signing is mandatory per tenant configuration.

---

## 7. Notifications Context

### Purpose

Delivers system-generated notifications where supported.

### Strategic role

Generic subdomain.

### Local language

`Notification` = a system-generated message.  
`Channel` = email, internal notification, or another supported delivery mechanism.  
`Recipient` = the person who receives the notification.

### Local meaning of shared concepts

`Order` means the subject of a message. `RentalSelection` means selected rentable item information summarized in a message. `Customer` means the recipient/contact for a notification. WhatsApp message generation in lightweight mode is not a notification here.

### Owns

Notification delivery, notification templates, and notification delivery status.

### Does not own

Order confirmation, WhatsApp-style manual handoff, contract signing state, asset assignment, asset blocking, or rental catalog definitions.

### Capabilities, events, and consistency

Sends notifications, records delivery status, and retries failed delivery. Consumes Rental Order Confirmed, Confirmed Rental Order Edited, Contract Signing Requested, and Rental Order Prepared. Notification failures must not invalidate confirmed orders. Automatic WhatsApp notifications are out of scope. Open questions: which professional-mode events require notifications and whether staff notifications are configurable.

---

# Product/Application Flows That Are Not Bounded Contexts

## Lightweight Customer Rental Flow

### Purpose

Provides the simplified customer-facing rental flow for small rentals, including rental catalog browsing and WhatsApp handoff.

### Strategic role

Core product experience. This is the future product differentiator, but it is not a bounded context for now.

### Why it is not a bounded context for now

It does not own durable business authority over rental commitment. It composes other contexts into a simple customer experience. It uses Rental Catalog to show rental offers, Tenant Management for tenant/branch configuration and product mode, Pricing for estimated/quoted prices if enabled, and Rental Commitment to create Pending orders. It generates the WhatsApp message that the customer manually sends.

### Owns

Customer-facing flow experience, WhatsApp message generation, simple request submission behavior, and mode-specific customer experience rules.

### Does not own

Asset blocking, order confirmation, confirmed price snapshots, contract signing, automatic WhatsApp notifications, WhatsApp Business API integration, or rental catalog authority.

### Flow rules

The customer manually sends the WhatsApp message. The system does not send WhatsApp messages automatically. The system does not depend on WhatsApp Business API. The flow creates Pending orders only. Pending orders do not assign or block assets.

---

# Context Relationship Notes

Rental Catalog owns what can be selected and what selected rentable items require. Rental Commitment owns what was requested, committed, assigned, blocked, and snapshotted. Catalog changes do not mutate confirmed orders.

Asset Inventory owns equipment types and assets. Rental Catalog references equipment types through fulfillment requirements. Rental Commitment references assets and owns rental-related blocks.

Pricing owns rate plans and calculation behavior. Rental Catalog may reference rate plans from rental offers. Rental Commitment owns accepted price snapshots.

Tenant Management owns tenants, branches, schedules, permissions, and configuration. Rental Catalog references branches in offers. Rental Commitment snapshots the selected branch and rental period.

Contracts and Notifications react to Rental Commitment events. They do not control confirmation, assignment, blocking, or order lifecycle.

