# 02 - Discover

## Scenario

Happy path: a customer selects a rental location, creates a rental order from catalog items available at that location, the system automatically assigns assets, blocks those assets, and confirms the order.

## Core flow

1. Rental Location Selected
2. Rental Order Requested
3. Rental Order Validated
4. Rental Price Calculated
5. Assets Assigned
6. Assets Blocked
7. Rental Order Confirmed
8. Customer Notified
9. Tenant Notified

## Later lifecycle events

Accessories Assigned
Contract Signing Requested
Contract Signed
Rental Order Picked Up
Rental Order Delivered
Rental Order Returned
Rental Order Checked
Rental Order Completed

---

## Event: Rental Location Selected

Command: Select Rental Location

Actor: Tenant Customer or Tenant User

Meaning:
The customer or tenant user selected the location/sucursal where the rental will be fulfilled.

Rules:
A rental order belongs to one location.
The selected location scopes the customer-facing catalog.
The selected location scopes equipment availability.
The selected location affects which assets can be assigned.
Customers should not mix items from different locations in the same order.
The backoffice can show “all locations,” but “all” is a view mode, not an order location.

Questions:
Can tenant staff move an order from one location to another before confirmation?
Can tenant staff move an order from one location to another after confirmation?

---

## Event: Rental Order Requested

Command: Request Rental Order

Actor: Tenant Customer or Tenant User

Meaning:
A tenant customer or tenant user submitted a request to rent selected catalog items for one shared rental period.

Rules:
The order must belong to one tenant.
The order must belong to one location.
The order must have one rental period.
The order must contain at least one rentable catalog item from the selected location.
Catalog items can be individual equipment or combos.
Tenant users can create rental orders on behalf of tenant customers.
Tenant users can create draft orders that do not check availability until confirmed.

Questions:

---

## Event: Rental Order Validated

Command: Validate Rental Order

Actor: System

Meaning:
The system accepted that the requested rental period, customer, items, quantities, location, and tenant rules are valid.

Rules:
The rental period must be valid.
The requested items must exist and be rentable for the tenant.
The requested items must be available in the selected location.
The requested quantities must be valid.
Combos must be expanded into their required equipment demand while preserving the fact that the customer selected a Combo.

Questions:
Which validations belong to order creation?
Which validations belong to availability?
Which validations belong to pricing?

---

## Event: Rental Price Calculated

Command: Calculate Rental Price

Actor: System

Meaning:
The system calculated the expected rental price using selected equipment, combos, promotions, discounts, and custom adjustments.

Rules:
The price must be calculated before confirmation.
Combos may affect the price.
Promotions and discounts may affect the price.
Custom adjusted prices may override or modify calculated prices.
After the order is confirmed, the calculated price can be manually adjusted by tenant staff.

Questions:
Are promotions applied before or after custom adjustments?
Should the originally calculated price be preserved when staff manually adjusts it?

---

## Event: Assets Assigned

Command: Assign Assets

Actor: System

Meaning:
The system automatically selected specific physical assets to satisfy the requested equipment and combo items.

Rules:
Assets must belong to the tenant or be available through an owner contract.
Assets must be compatible with the requested equipment.
Assets must be available for the full rental period.
Assets must be assignable from the order’s location.
Manual asset assignment by tenant staff is not part of the current system behavior.

Questions:
Should assignment prefer tenant-owned assets before third-party-owned assets?
Should assignment consider asset condition?
What happens if only some requested assets can be assigned?
Should the system ever assign assets from another location as a fallback, or is that always forbidden?

---

## Event: Assets Blocked

Command: Block Assets

Actor: System

Meaning:
The assigned assets became unavailable for overlapping rental periods.

Rules:
Only assigned assets can be blocked.
Blocked assets cannot be assigned to another order for an overlapping period.
The block must cover the full rental period.
Blocking is scoped to the selected location because assigned assets belong to that location.

Questions:
Is asset blocking part of asset assignment, or a separate step?
Can blocked assets be replaced before pickup?
What happens if blocking succeeds for some assets but fails for others?

---

## Event: Rental Order Confirmed

Command: Confirm Rental Order

Actor: System

Meaning:
The rental order became an accepted commitment between the tenant and the tenant customer.

Rules:
The order can only be confirmed after validation, price calculation, asset assignment, and asset blocking.
The confirmed order should preserve the price and assigned assets used at confirmation time.
Confirmed orders can be edited by tenant staff.

Questions:
Can confirmation fail after assets were assigned?
Can a tenant user manually confirm an order that failed automatic assignment?
When a confirmed order is edited, does the system reassign assets, recalculate price, or both?

---

## Event: Customer Notified

Command: Notify Customer

Actor: System

Meaning:
The tenant customer received confirmation or next-step information.

Rules:
The customer should be notified after the order is confirmed.
The notification channel may depend on tenant configuration or product mode.

Questions:
Is notification always required?
Is WhatsApp the future primary channel?
Should email still exist for professional rentals?

---

## Event: Tenant Notified

Command: Notify Tenant

Actor: System

Meaning:
Tenant staff received notice that a new rental order requires attention.

Rules:
Tenant staff should be notified when a customer-created order is confirmed.
Staff-created orders may not need the same notification.
Only customer-created orders notify the tenant.

Questions:
Who inside the tenant should receive the notification?

---

## Discovery notes

Location is part of the core rental flow, not just a UI filter.

Backoffice location selection is an operational filter. Order location is a business commitment.

Today, location behaves more like a city/territory/sucursal than a physical warehouse. Supporting multiple warehouses inside the same location is out of scope for now, but the model should not make it impossible later.

A future model may allow a location to contain multiple warehouses or fulfillment points. For now, the system treats location as the branch/sucursal responsible for catalog visibility, availability, orders, and asset assignment.


## Combo discovery notes

A Combo is an all-or-nothing catalog offer made of two or more equipment types.

Each equipment type inside a Combo has a required quantity.

Customers can add a Combo to a Rental, but they cannot modify its contents.

Tenant staff cannot override Combo contents inside a Rental.

A Rental can contain Combos and individual equipment types at the same time.

The same equipment type can be requested more than once, for example individually and through one or more Combos.

For availability and asset assignment, selected Combos must be expanded into equipment demand.

If any required equipment type or quantity inside the Combo is unavailable, the whole Combo is unavailable.

During preparation, accessories are assigned based on the equipment demand created by both individual equipment and Combos.
