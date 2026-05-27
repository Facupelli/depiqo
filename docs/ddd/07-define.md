# 07 - Define

## Purpose

This step defines the candidate bounded contexts more explicitly.

The goal is to move from broad business areas into clear boundaries of language, authority, behavior, and data.

A bounded context is not just a module or folder. It is a boundary where terms have a specific meaning and where a part of the system has local authority over specific business decisions.

## Guiding principles

Context is king.
The same real-world concept can appear in multiple contexts with different meanings.
A context should own both the behavior and the data needed to perform its business capability.
A context may keep local references or snapshots of data from other contexts without becoming the authority over the original data.
Logical boundaries come first. These contexts can initially live inside a modular monolith.
The system should avoid entity services such as one giant Product Service, Asset Service, or Order Service that every feature must depend on for everything.
The system should also avoid cross-context transactions that recreate the current coupling problem.
Not every strategically important product experience is a bounded context. The WhatsApp-style customer flow is strategically important, but for now it is a customer-facing product/application flow built on top of Catalog, Pricing, Tenant Management, and Rental Commitment.

## Current architectural decisions

The confirmation flow must be atomic.
Confirming a rental order, assigning equipment assets, blocking those assets, preserving the confirmed price snapshot, and changing the order status must succeed or fail together.
Rental Commitment is the first and most important bounded context.
Rental Commitment does not own the entire catalog, pricing system, inventory system, or tenant/location configuration system.
Rental Commitment owns the rental-specific commitment facts that must be consistent when an order is created, confirmed, edited, prepared, cancelled, picked up, returned, or completed.
Rental Commitment is the sole authority over all rental-related asset blocks.
All asset blocks live inside Rental Commitment, including equipment asset blocks and accessory asset blocks.
Other contexts do not write to or query asset blocks directly. If another context needs block information, it must use Rental Commitment public capabilities or react to Rental Commitment events.
Pricing is a separate bounded context because pricing rules can become complex: tiers, promotions, coupons, discounts, custom adjustments, and price explanations.
Pricing calculates and returns a price breakdown.
Rental Commitment preserves the accepted price breakdown/result as a price snapshot on the order.
Pricing must not own durable order price state. The accepted price for a specific order belongs to Rental Commitment.
Preparation is not a separate bounded context for now. It lives inside Rental Commitment because preparation affects selected accessories, accessory asset assignments, and accessory asset blocks.
Locations and scheduling are not a separate bounded context for now. They live inside Tenant Management because they are currently tenant/location configuration: locations, schedules, pickup slots, return slots, timezone rules, and product mode configuration.

---

# Bounded Contexts

## 1. Rental Commitment Context

### Purpose

Manages rental orders as operational commitments.

This context turns a customer or staff request into a rental commitment by preserving the selected rental period, selected location, requested items, confirmed price snapshot, assigned physical asset references, accessory selections, preparation state, and asset blocks.

### Strategic role

Core domain.

This is the trust engine of the system.

If this context is wrong, the system cannot be trusted because it may double-book assets, confirm unavailable rentals, lose price consistency, prepare orders with incorrect accessories, or create invalid operational orders.

### Local language

In this context:

Order = a rental request or rental commitment for one tenant, one location, one rental period, and one or more requested rentable items.
Pending Order = an order created from the WhatsApp-style customer flow that has not yet been accepted by tenant staff and does not block assets.
Draft Order = an order created by tenant staff as a budget or proposal that does not block assets until confirmed.
Confirmed Order = an accepted operational order that is expected to happen and has assigned and blocked equipment assets.
Prepared Order = a confirmed order whose accessory choices have been reviewed by tenant staff.
Order Item = the local record of what the customer requested, usually referencing an equipment type or combo from the catalog.
Rental Period = the selected pickup/return or start/end period preserved on the order.
Confirmed Price Snapshot = the price breakdown/result preserved on the order when it becomes confirmed, or when tenant staff edits the confirmed price.
Assigned Asset Reference = the local reference to a physical asset selected to satisfy an order item or selected accessory.
Asset Block = the local commitment that a specific asset cannot be used by another overlapping rental order.
Equipment Asset Block = an asset block created because equipment assets are required for a confirmed rental order.
Accessory Asset Block = an asset block created because tenant staff selected accessory assets during preparation.
Accessory Selection = the reviewed accessory list and quantities chosen by tenant staff during preparation.
Location Reference = the selected branch/sucursal responsible for this order.
Tenant Customer Reference = the customer related to this order.
Selected Combo = a Combo chosen for a specific Rental.
Expanded Equipment Demand = the equipment types and quantities required to fulfill selected individual equipment and selected Combos.

### Local meaning of shared concepts

Equipment does not mean the full catalog entity. It means a requested rentable type referenced by an order item.
Combo does not mean the full catalog package definition. It means a selected package that expands into requested order items.
Asset does not mean the full physical asset profile. It means a physical asset reference assigned and blocked for this order, either as required equipment or as selected accessories.
Accessory does not mean the full catalog/accessory definition. It means a selected tracked physical item included during preparation.
Location does not mean the full branch profile, schedule, or tenant configuration. It means the selected branch/sucursal responsible for this order.
Price does not mean the whole pricing model. It means the confirmed price snapshot preserved for this order.
Availability does not mean a general catalog display value. It means whether the required physical assets can be assigned and blocked for this rental period and location.
Preparation does not mean the entire professional workflow. It means the order-specific review of accessories and readiness details before contract signing, pickup, or delivery.

### Owns

Order lifecycle.
Order status.
Order items as requested rental demand.
Selected rental period.
Selected location reference.
Tenant customer reference.
Confirmed price snapshot.
Assigned equipment asset references.
Equipment asset blocks.
Accessory selections.
Assigned accessory asset references.
Accessory asset blocks.
Preparation state.
The no-overlap invariant for all rental-related asset blocks.
The atomic confirmation operation.
The atomic confirmed-order edit operation when the edit affects period, items, quantities, price, assignments, or blocks.
The preparation operation when it affects accessory selections, accessory assignments, or accessory blocks.
Selected Combo references.
Selected Combo snapshots if needed for history/display.
Expanded equipment demand created by selected Combos.
Relationship between Rental items and the Combo that produced them.

### Does not own

Catalog descriptions.
Equipment images.
Category browsing.
Full combo definition as a catalog offering.
Full accessory compatibility/default definitions.
Full physical asset profile.
Asset maintenance state.
Tenant profile.
Tenant user roles/permissions.
Tenant configuration.
Location profile.
Location schedules.
Pickup/return slot rules.
Customer-facing catalog browsing.
WhatsApp message generation.
Pricing rules.
Promotion/coupon/discount rule definitions.
Contract document generation.
Contract signing state.
Notification delivery.
Basic reporting.
Analytics.

### Main decisions

Can this order be created as Pending?
Can this order be created as Draft?
Can this order attempt confirmation?
What facts must be preserved when the order becomes confirmed?
Which equipment assets are assigned to the order?
Which equipment assets are blocked for the order period?
Can this confirmed order be edited?
Does an edit require availability revalidation?
Can the edited order still be fulfilled?
When should asset blocks be released?
Can the order be cancelled?
Can the order enter preparation?
Which selected accessories should be reserved?
Which accessory assets are blocked after preparation confirms accessory selection?
Can the order continue with zero accessories?

### Public capabilities

Create Pending Order.
Create Draft Order.
Confirm Order.
Edit Confirmed Order.
Cancel Order.
Release Asset Blocks.
Start Preparation.
Review Accessories.
Reserve Selected Accessories.
Release Accessory Blocks.
Mark Order Prepared.
Get Order Commitment Details.
Check whether an order is currently committed.
Check whether an asset is blocked for a rental period.

### Uses from other contexts

Catalog data to know what was requested, expand combos, and get accessory compatibility/default rules.
Pricing to calculate the price and return a price breakdown.
Tenant Management to validate tenant/user permissions, tenant configuration, selected location, pickup/return slots, schedules, timezone, product mode, and other tenant/location rules.
Asset Inventory data to know which physical assets exist and are eligible candidates for assignment.
Tenant customer data to reference or snapshot the tenant customer.

### Local copied data / snapshots

Equipment identifier.
Equipment name snapshot if needed for history/display.
Combo identifier.
Combo name snapshot if needed for history/display.
Accessory identifier.
Accessory name snapshot if needed for history/display.
Selected location identifier.
Tenant customer identifier.
Customer name/contact snapshot if needed for history/display.
Confirmed price snapshot.
Price breakdown snapshot.
Assigned equipment asset identifiers.
Assigned accessory asset identifiers.
Rental period.
Order source/mode, such as Professional or WhatsApp-style.

### Events published

Pending Rental Order Created.
Draft Rental Order Created.
Rental Order Confirmed.
Confirmed Rental Order Edited.
Rental Order Cancelled.
Equipment Asset Blocks Created.
Accessory Asset Blocks Created.
Asset Blocks Released.
Preparation Started.
Accessories Reviewed.
Rental Order Prepared.
Rental Order Picked Up.
Rental Order Delivered.
Rental Order Returned.
Rental Order Checked.
Rental Order Completed.

### Events consumed

Catalog Item Changed, if local display snapshots need updating before confirmation.
Asset Became Unavailable, if this should warn about pending/draft orders.
Tenant Configuration Changed, if this affects future confirmations.
Pricing Rule Changed, if this should affect future draft/pending validation or recalculation.

### Consistency rules

A Pending order does not block assets.
A Draft order does not block assets until confirmed.
A Confirmed order must have assigned and blocked equipment assets.
Confirming an order must atomically preserve the confirmed price snapshot, assigned equipment assets, equipment asset blocks, and confirmed order status.
Editing a Confirmed order must be atomic when it affects rental period, equipment, quantities, assigned assets, asset blocks, or price.
The system must not leave an order confirmed without equipment asset blocks.
The system must not leave assets blocked without a related rental order.
The system must not partially block only some required equipment assets for a confirmed order.
Accessory assignment is optional.
A rental order can continue with zero accessories.
Accessory asset blocks must be linked to a prepared order/accessory selection.
The same physical asset must not be blocked for overlapping rental periods.
The system must not change the current confirmed price snapshot without preserving order consistency.

### Important notes

Confirmed means reserved, not final.
A Confirmed order is still editable before pickup or delivery.
Contract signing does not automatically make the order immutable.
Contract state and order state are related, but they are not the same thing.
Preparation happens before contract signing because accessories are detailed in the contract.
The confirmed price snapshot is authoritative for that specific order, even if catalog prices or pricing rules change later.
Pricing calculates the price breakdown, but Rental Commitment owns the accepted price snapshot for the order.
Asset blocks are authoritative for protecting assigned assets from overlapping rental orders.
Rental Commitment owns all rental-related asset blocks, including equipment blocks and accessory blocks.

### Open questions

Can a Confirmed order be edited after pickup or delivery?
When a confirmed order is cancelled, should asset blocks be released immediately?
Should asset assignment history be preserved?
Should price snapshot history be preserved?
Should the context distinguish Confirmed from Locked, or is Confirmed enough?
Should contract-signed orders require extra warnings before editing?
If preparation is edited after contract signing, should the contract require re-signing?
Should mandatory accessories exist in the future?

---

## 2. Catalog Context

### Purpose

Defines what the tenant offers for rent and how those offerings are presented to customers and tenant users.

### Strategic role

Supporting subdomain.

It strongly supports the customer-facing rental flow, but it should not own the rental commitment itself.

### Local language

Equipment = a rentable type/model shown in the catalog.
Category = a grouping used to organize equipment.
Combo = a catalog-visible all-or-nothing package composed of two or more equipment types with required quantities.
Catalog Visibility = whether an item is shown or rentable in a given tenant/location/customer-facing flow.
Accessory Definition = a catalog/configuration definition of an accessory type.
Accessory Compatibility = the relationship between equipment and compatible/default accessories.
Default Accessory = a suggested accessory and quantity for a given equipment item.

### Local meaning of shared concepts

Equipment means the offer shown to users, not a physical asset.
Combo means a selectable catalog package, not the final expanded rental demand.
Accessory means an accessory type/definition and compatibility rule, not an order-specific selected physical accessory asset.
Location means where catalog items are visible or rentable, not the full operational branch model.
Availability displayed in the catalog is informative. It is not a final rental commitment.

### Owns

Equipment definitions.
Equipment names, descriptions, images, and categories.
Combo definitions.
Catalog visibility rules.
Accessory definitions.
Equipment-to-accessory compatibility definitions.
Default accessory rules.
Location-scoped catalog visibility.

### Does not own

Order lifecycle.
Asset assignment.
Asset blocking.
Confirmed price snapshot.
Rental commitment.
Preparation state.
Contract generation.
Notification delivery.

### Public capabilities

List catalog items.
Get equipment details.
Get combo details.
Resolve combo contents.
Check whether an item is visible/rentable in a location.
Provide equipment/accessory compatibility rules.
Provide default accessory suggestions.

### Events published

Equipment Created.
Equipment Updated.
Equipment Visibility Changed.
Combo Created.
Combo Updated.
Combo Visibility Changed.
Accessory Definition Created.
Accessory Definition Updated.
Accessory Compatibility Changed.
Default Accessory Rule Changed.

### Consistency expectations

Catalog changes should not mutate already confirmed orders.
Confirmed orders may preserve snapshots of catalog data for historical accuracy.
Catalog can show availability information, but it does not own the final decision to commit assets.

### Open questions

Should combo expansion happen inside Catalog or inside Rental Commitment using Catalog data?
Should accessories be visible in the customer-facing catalog in some tenant modes?
How much catalog data should be snapshotted into orders?

---

## 3. Asset Inventory Context

### Purpose

Owns the physical truth about assets that can be rented, tracked, maintained, owned, or assigned.

### Strategic role

Supporting subdomain.

It provides the physical asset data required by Rental Commitment.

### Local language

Asset = a physical unit owned by the tenant or a third party.
Asset Owner = the owner of a physical asset.
Asset Condition = the operational state of the asset.
Asset Location = the location/sucursal where the asset belongs or is normally assigned.
Equipment Asset = a physical asset that can satisfy a rentable equipment request.
Accessory Asset = a physical asset that can satisfy a selected accessory request.
Third-Party Asset = an asset owned by someone other than the tenant.

### Local meaning of shared concepts

Equipment means the catalog type/model this asset can satisfy.
Accessory means the catalog/accessory type this physical asset can satisfy.
Location means where the physical asset belongs or can be assigned from.
Availability does not mean rental commitment. Rental availability is affected by blocks owned by Rental Commitment.

### Owns

Physical asset profile.
Asset identity.
Asset ownership.
Asset location.
Asset condition.
Asset metadata.
Asset active/inactive status.
Whether an asset is an equipment asset, accessory asset, or both if that is allowed.

### Does not own

Order status.
Order lifecycle.
Confirmed price snapshot.
Rental order confirmation.
Asset blocks.
Customer-facing catalog descriptions.
Preparation state.
Contract signing.
Notification delivery.

### Public capabilities

List assets by equipment type and location.
List accessory assets by accessory type and location.
Get asset details.
Check asset eligibility as an assignment candidate.
Update asset condition.
Update asset owner.
Update asset location.
Activate/deactivate asset.

### Events published

Asset Created.
Asset Updated.
Asset Condition Changed.
Asset Location Changed.
Asset Owner Changed.
Asset Deactivated.

### Consistency expectations

Rental Commitment may reference assets, but Asset Inventory remains the authority over the physical asset profile.
Rental Commitment owns all rental-related asset blocks, including equipment asset blocks and accessory asset blocks.
Asset Inventory does not write to or query asset blocks directly.
Asset Inventory should not directly confirm, prepare, cancel, or modify rental orders.

### Open questions

Should maintenance live inside Asset Inventory or in a separate Maintenance context later?
Should owner contracts live here or in a separate Third-Party Owner context?
Should accessories be represented as normal assets with a different role/type?

---

## 4. Pricing Context

### Purpose

Calculates rental prices based on equipment, combos, rental period, promotions, coupons, discounts, tiers, and custom adjustments.

### Strategic role

Supporting subdomain.

Pricing must be reliable and may become complex enough to deserve independent authority.

### Local language

Price Calculation = the process of calculating a rental price.
Price Breakdown = the structured explanation of how the final price was produced.
Base Price = the normal price for renting an item.
Pricing Tier = a pricing rule based on duration, quantity, customer type, location, or another pricing dimension.
Promotion = a pricing rule that reduces or changes the price.
Coupon = a customer/staff-provided code or token that applies a pricing rule.
Discount = a reduction applied to the order or item.
Custom Adjustment = a manual price modification made by tenant staff.
Combo Price = the price or discount rule applied when equipment is rented as part of a Combo.

### Local meaning of shared concepts

Equipment means a priceable rentable item.
Combo means a priceable package.
Order means the pricing input, not the full order lifecycle.
Price means calculated financial terms.
Price Snapshot means the accepted pricing result stored by Rental Commitment. Pricing does not own the order's accepted price state.

### Owns

Pricing rules.
Base price logic.
Pricing tiers.
Promotion logic.
Coupon validation.
Discount logic.
Custom adjustment rules.
Price calculation behavior.
Price breakdown generation.
Combo pricing rules.
Combo discount rules.
Combo price breakdown.

### Does not own

Order lifecycle.
Asset assignment.
Asset blocking.
Confirmed order status.
Confirmed price snapshot on the order.
Order price state.
Contract signing.
Notification delivery.

### Public capabilities

Calculate price.
Validate pricing inputs.
Validate coupon.
Explain price breakdown.
Apply promotion/discount rules.
Return price breakdown for an order input.

### Events published

Pricing Rule Changed.
Pricing Tier Changed.
Promotion Created.
Promotion Updated.
Promotion Expired.
Coupon Created.
Coupon Updated.
Coupon Expired.

### Consistency expectations

Rental Commitment uses Pricing to calculate or validate the price before confirmation or price-affecting edits.
Pricing returns a price breakdown.
Rental Commitment owns the confirmed price snapshot after confirmation.
Past confirmed orders should not change when pricing rules change.
Pricing should not store durable order price state. The accepted price for a specific order belongs to Rental Commitment.

### Open questions

Should manual price adjustments be owned by Pricing rules or Rental Commitment order editing?
Should Pricing preserve calculation history, or should only Rental Commitment preserve snapshots?
Should pricing differ by location?
Should pricing differ by customer type?

---

## 5. Tenant Management Context

### Purpose

Manages tenants, tenant users, roles, permissions, tenant-level configuration, product mode configuration, locations/sucursales, and location schedules.

### Strategic role

Generic/supporting subdomain.

Tenant management is necessary, but it is not the main product differentiator.

Locations and scheduling live here for now because they are currently tenant/location configuration rather than a separate rich domain.

### Local language

Tenant = a business using the platform.
Tenant User = a user belonging to a tenant.
Role = a permission grouping.
Tenant Configuration = tenant-level settings that affect product behavior.
Product Mode = configuration that determines whether the tenant/location uses professional flow, WhatsApp-style flow, or both.
Location = a tenant branch/sucursal/territory where rentals are offered and fulfilled.
Schedule = the opening/operating hours for a location.
Pickup Slot = an allowed date/time for pickup.
Return Slot = an allowed date/time for return.
Timezone = the timezone used to interpret tenant or location dates/times.

### Local meaning of shared concepts

Tenant means the platform customer.
User means a dashboard/backoffice user, not necessarily the tenant’s rental customer.
Location means a tenant-owned branch/sucursal/configuration unit, not a rental commitment.
Order means a request that needs tenant/location validation, not the full rental commitment.

### Owns

Tenant profile.
Tenant users.
Roles and permissions.
Tenant-level configuration.
Product mode configuration.
Feature flags.
Location profile.
Location active/inactive status.
Location schedule.
Pickup/return slot rules.
Timezone rules.

### Does not own

Rental order lifecycle.
Catalog definitions.
Asset assignment.
Asset blocking.
Price calculation.
Contract generation.
Notification delivery.

### Public capabilities

Get tenant configuration.
Validate user permissions.
Manage tenant users.
Manage product mode.
List tenant locations.
Validate selected location.
Validate pickup slot.
Validate return slot.
Validate rental period against location schedule.
Get tenant/location timezone.

### Events published

Tenant Created.
Tenant Configuration Changed.
Tenant User Added.
Tenant User Role Changed.
Product Mode Changed.
Location Created.
Location Updated.
Location Disabled.
Location Schedule Changed.

### Consistency expectations

Other contexts may read tenant configuration during their decisions.
Tenant configuration and location schedule changes should affect future operations, not silently mutate already confirmed orders.
Rental Commitment preserves the selected location reference and rental period snapshot.

### Open questions

Should tenant timezone be tenant-wide or location-specific?
Can orders be moved between locations?
Will one location later contain multiple warehouses?
Should product mode be tenant-wide, location-specific, or flow-specific?
Should some tenants support both professional and WhatsApp-style flows?
When should Locations/Scheduling become a separate bounded context?

---

## 6. Contracts Context

### Purpose

Manages contract generation, signing requests, signature state, and signed contract records.

### Strategic role

Generic/supporting subdomain.

Important for professional rentals, but not the main product differentiator.

### Local language

Contract = the generated rental agreement document.
Signing Request = the request sent to the customer to sign.
Signed Contract = the completed signed agreement.
Re-signing Required = a state caused by changes to the order after contract generation or signing.

### Local meaning of shared concepts

Order means the source data used to generate a contract.
Accessories mean included items detailed in the contract.
Price means the confirmed price snapshot printed in the contract.

### Owns

Contract template usage.
Contract document generation.
Signing request state.
Signed contract storage/reference.
Re-signing requirement.

### Does not own

Order confirmation.
Asset assignment.
Asset blocking.
Price calculation.
Preparation decisions.

### Public capabilities

Generate contract.
Request signature.
Record signed contract.
Mark re-signing required.
Get contract status.

### Events published

Contract Generated.
Contract Signing Requested.
Contract Signed.
Contract Re-signing Required.

### Events consumed

Rental Order Confirmed.
Confirmed Rental Order Edited.
Rental Order Prepared.

### Consistency expectations

Contract signing does not automatically make an order immutable.
If an order changes after contract signing, Contracts may require re-signing.
Contract generation should use confirmed/prepared order snapshots.

### Open questions

Which order edits require re-signing?
Can pickup happen without a signed contract?
Should contract signing be mandatory per tenant configuration?

---

## 7. Notifications Context

### Purpose

Delivers system-generated notifications where supported.

### Strategic role

Generic subdomain.

### Local language

Notification = a system-generated message.
Channel = email, internal notification, or another supported delivery mechanism.
Recipient = the person who receives the notification.

### Local meaning of shared concepts

Order means the subject of a message.
Customer means the recipient/contact for a notification.
WhatsApp message generation in lightweight mode is not a notification here.

### Owns

Notification delivery.
Notification templates.
Notification delivery status.

### Does not own

Order confirmation.
WhatsApp-style manual handoff.
Contract signing state.
Asset assignment.
Asset blocking.

### Public capabilities

Send notification.
Record delivery status.
Retry failed delivery.

### Events consumed

Rental Order Confirmed.
Confirmed Rental Order Edited.
Contract Signing Requested.
Rental Order Prepared.

### Consistency expectations

Notification failures should not invalidate confirmed orders.
Automatic WhatsApp notifications are out of scope.

### Open questions

Which professional-mode events require notifications?
Should tenant staff notifications be configurable?

---

# Product/Application Flows That Are Not Bounded Contexts

## Lightweight Customer Rental Flow

### Purpose

Provides the simplified customer-facing rental flow for small rentals, including catalog browsing and WhatsApp handoff.

### Strategic role

Core product experience.

This is the future product differentiator, but it is not a bounded context for now.

### Why it is not a bounded context for now

It does not own durable business authority over the rental commitment.
It mostly composes other contexts into a simple customer experience.
It uses Catalog to show what can be selected.
It uses Tenant Management for tenant/location configuration and product mode.
It uses Pricing to show an estimated/quoted price if enabled.
It uses Rental Commitment to create a Pending order.
It generates the WhatsApp message that the customer manually sends.

### Owns

Customer-facing flow experience.
WhatsApp message generation.
Simple request submission behavior.
Mode-specific customer experience rules.

### Does not own

Asset blocking.
Order confirmation.
Confirmed price snapshot.
Contract signing.
Automatic WhatsApp notifications.
WhatsApp Business API integration.

### Flow rules

The customer manually sends the WhatsApp message.
The system does not send WhatsApp messages automatically.
The system does not depend on WhatsApp Business API.
The flow creates Pending orders only.
Pending orders do not assign or block assets.

---

# Context Relationship Notes

## Catalog and Rental Commitment

Catalog owns what can be offered.
Rental Commitment owns what was requested and committed.
Rental Commitment may copy catalog identifiers and display snapshots into orders.
Catalog changes do not mutate confirmed orders.

## Pricing and Rental Commitment

Pricing owns price calculation rules.
Pricing returns a price breakdown.
Rental Commitment owns the confirmed price snapshot and accepted price breakdown for the order.
Pricing changes do not mutate confirmed orders.
Pricing must not store durable order price state.

## Asset Inventory and Rental Commitment

Asset Inventory owns the physical asset profile.
Rental Commitment owns asset assignment references and all rental-related asset blocks.
Asset blocks protect confirmed orders and prepared accessory selections from overlap.
Asset Inventory must not write to or query Rental Commitment's asset blocks directly.

## Tenant Management and Rental Commitment

Tenant Management owns tenant profile, users, roles, permissions, tenant configuration, locations, schedules, pickup/return slots, timezone rules, and product mode configuration.

Rental Commitment owns the selected tenant/location reference and rental period snapshot.

Tenant/location configuration changes do not mutate confirmed orders automatically.

## Lightweight Customer Flow and Rental Commitment

Lightweight Customer Flow owns the simplified customer experience and WhatsApp handoff.
Rental Commitment owns the Pending order and later confirmation.
WhatsApp-style Pending orders do not block assets.

## Contracts and Rental Commitment

Contracts owns document/signing state.
Rental Commitment owns order state.
A signed contract does not automatically make an order immutable.

## Notifications and Rental Commitment

Notifications reacts to order events.
Notifications must not control order confirmation.

# Current High-Risk Design Questions

Should accessories be represented as normal assets in Asset Inventory with a different role/type?
Should owner contracts belong to Asset Inventory, Pricing, or a separate Third-Party Owner context?
Should manual price adjustments be owned by Pricing rules or Rental Commitment order editing?
Should tenant product mode be tenant-wide, location-specific, or flow-specific?
When should Locations/Scheduling become a separate bounded context?
When should Lightweight Customer Rental Flow become more than an application flow, if ever?
Should contract-signed orders require extra warnings or re-signing rules before editing?
