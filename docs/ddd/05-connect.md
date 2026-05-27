# 05 - Connect

## Flow: Confirm Rental Order

Trigger:
Tenant staff clicks Confirm on a Pending or Draft rental order.

Goal:
Turn a non-committed order into a confirmed rental commitment.

## Business decisions involved

### Decision 1: Can this order attempt confirmation?

The system must determine whether the order is in a state that allows confirmation.

Rules:
The order must belong to one tenant.
The order must belong to one location.
The order must be Pending or Draft.
The order must have one rental period.
The order must contain at least one rentable item.

Result:
The order is allowed to continue toward confirmation, or confirmation is rejected.

---

### Decision 2: What price should be locked?

The system must calculate or preserve the financial terms of the order.

Rules:
The price must be known before confirmation.
Combos may affect the price.
Promotions and discounts may affect the price.
Custom adjustments may override or modify the calculated price.

Result:
A confirmed price is produced and will be preserved on the confirmed order.

---

### Decision 3: Which physical assets can satisfy this order?

The system must resolve the requested equipment types and combos into specific physical assets.

Rules:
Assets must be compatible with the requested equipment.
Assets must belong to the tenant or be available through an owner contract.
Assets must be assignable from the order’s location.
Assets must be available for the full rental period.

Result:
A complete set of assets is selected, or confirmation fails.

---

### Decision 4: Can those assets be blocked?

The system must protect the selected assets from being used by overlapping confirmed orders.

Rules:
Only assigned assets can be blocked.
The block must cover the full rental period.
Blocked assets cannot be assigned to another order for an overlapping period.

Result:
All selected assets are blocked, or confirmation fails.

---

### Decision 5: Has the order become a confirmed commitment?

The system must change the order from non-committed to confirmed.

Rules:
The order can only be confirmed if all previous decisions succeeded.
The confirmed order must preserve the rental period, location, customer, order items, confirmed price, and assigned assets.

Result:
The order becomes Confirmed.

## Strong consistency

These decisions must succeed or fail together:

- lock confirmed price;
- assign assets;
- block assets;
- confirm order.

Dangerous partial states:

- order confirmed but assets not blocked;
- assets blocked but order not confirmed;
- only some required assets blocked;
- confirmed order without preserved price.

Conclusion:
Confirm Rental Order is one atomic business operation.

## Reactions after confirmation

After the order is confirmed, other things may happen:

- customer may be notified in professional mode;
- tenant staff may be notified;
- contract signing may be requested;
- preparation work may be created;
- owner split reporting may be prepared;
- analytics may be recorded.

These are reactions to the fact that the order was confirmed. They should not be required for the order to become confirmed unless a specific business rule says so.

## Connect principle

A decision belongs inside the confirmation flow if the order would be invalid or unsafe without it.

A reaction belongs after confirmation if it can fail or happen later without invalidating the confirmed order.

---

## Flow: Create WhatsApp-style Pending Rental Order

Trigger:
A tenant customer completes the lightweight catalog flow and chooses to send the generated WhatsApp message to the tenant.

Goal:
Capture the customer’s rental request in the system without creating a final rental commitment yet.

## Business decisions involved

### Decision 1: Can a pending order be created?

The system must determine whether the customer request contains enough valid information to create a Pending order.

Rules:
The order must belong to one tenant.
The order must belong to one location.
The order must have one rental period.
The order must contain at least one rentable item.
The order must have customer information.
The selected items must exist in the tenant’s catalog.
The selected items must be visible/rentable in the selected location’s catalog.

Result:
A Pending order can be created, or the request is rejected.

---

### Decision 2: What information should be saved?

The system must save the information needed for tenant staff to review and later confirm the order.

Rules:
The Pending order preserves the selected items.
The Pending order preserves the rental period.
The Pending order preserves the selected location.
The Pending order preserves the customer information.
The Pending order preserves the quoted or estimated price.
The Pending order preserves the source/mode as WhatsApp-style/customer-created.

Result:
A normal rental order is created with Pending status.

---

### Decision 3: What does not happen yet?

The system must avoid treating the Pending order as a confirmed commitment.

Rules:
A Pending order does not assign assets.
A Pending order does not block assets.
A Pending order does not guarantee final availability.
A Pending order does not require contract signing.
A Pending order does not become operational work until tenant staff accepts it.

Result:
The order exists for review, but no physical assets are reserved.

---

### Decision 4: What message does the customer send?

The system must generate a clear WhatsApp message that the customer manually sends to the tenant.

Rules:
The message should include the selected items.
The message should include the rental period.
The message should include customer information if available.
The message should include the estimated price if shown.
The message should be understandable without requiring the tenant to open the backoffice immediately.

Result:
The customer sends the rental request manually through WhatsApp.

---

### Decision 5: What happens after the Pending order exists?

The tenant and customer continue the conversation in WhatsApp.

Tenant staff can review the Pending order in the backoffice.

If tenant staff wants to accept the request, they click Confirm.

When tenant staff clicks Confirm, the Confirm Rental Order flow starts.

Result:
The Pending order waits for tenant staff action.

## Strong consistency

Creating a Pending WhatsApp-style order should save the order data consistently.

The Pending order must not create asset assignments or asset blocks.

Dangerous partial states:

- WhatsApp message generated but no Pending order saved;
- Pending order saved without required customer/order data;
- Pending order accidentally blocks assets;
- Pending order shown as confirmed before tenant review.

Conclusion:
Create Pending Rental Order is an atomic operation for saving the request, but it is not a rental commitment operation.

## Reactions after pending order creation

After the Pending order is created:

- the customer manually sends the generated WhatsApp message;
- tenant staff may see the Pending order in the backoffice;
- tenant and customer may chat outside the system.

These reactions do not confirm the order and do not block assets.

---

## Flow: Edit Confirmed Rental Order

Trigger:
Tenant staff edits a Confirmed rental order before pickup or delivery.

Goal:
Change an accepted operational order while keeping the rental period, items, price snapshot, assigned assets, and asset blocks consistent.

## Terminology note

Confirmed does not mean final or immutable.

A Confirmed order is an accepted operational order that is expected to happen and has assigned/blocked assets.

The order may still be edited before pickup or delivery.

Contract signing does not automatically make the order immutable, because real-life changes can still happen before pickup.

Contract state and order state are related, but they are not the same thing.

## Business decisions involved

### Decision 1: Can this confirmed order be edited?

The system must determine whether the order is still editable.

Rules:
The order must belong to one tenant.
The order must belong to one location.
The order must be Confirmed.
The order must not be Completed.
The order should normally be editable before pickup or delivery.
Contract signing does not automatically make the order immutable.

Result:
The edit is allowed, or the edit is rejected.

---

### Decision 2: What kind of edit is being made?

The system must classify the edit because different changes have different consequences.

Rules:
Changing the rental period affects availability.
Adding equipment affects availability and price.
Removing equipment affects asset blocks and price.
Changing equipment quantities affects availability and price.
Changing the price affects the confirmed price snapshot.
Changing customer notes or internal notes may not affect availability or price.
Changing customer information may not affect availability, unless tenant rules require revalidation.

Result:
The system knows which parts of the order must be revalidated, recalculated, released, reassigned, or preserved.

---

### Decision 3: Does the edit require availability revalidation?

The system must re-check availability when the edit changes the rental period, requested equipment, equipment quantities, or location.

Rules:
Rental period changes require availability revalidation.
Equipment additions require availability revalidation.
Equipment removals require releasing no-longer-needed asset blocks.
Quantity increases require availability revalidation.
Quantity decreases require releasing no-longer-needed asset blocks.
Location changes, if allowed, require full availability revalidation.
Pure price changes do not require availability revalidation.
Pure notes/internal metadata changes do not require availability revalidation.

Result:
The system determines whether the existing asset assignments and blocks can remain, must be changed, or must be replaced.

---

### Decision 4: Can the new requested state be satisfied?

The system must determine whether the edited order can still be fulfilled.

Rules:
The edited order must have valid items and quantities.
The edited order must have a valid rental period.
The edited order must belong to one location.
The edited order must have compatible available assets.
Existing blocked assets may be kept if they still satisfy the edited order.
No-longer-needed assets must be released.
Newly needed assets must be assigned and blocked.
If the edited order cannot be fully satisfied, the edit must not be applied as a confirmed change.

Result:
The edit succeeds with updated assignments and blocks, or the edit is rejected.

---

### Decision 5: What price should be preserved after the edit?

The system must update the price snapshot when the edit affects financial terms.

Rules:
Equipment changes may require recalculating price.
Rental period changes may require recalculating price.
Promotions and discounts may need to be reapplied.
Manual price edits rewrite the confirmed price snapshot.
The previous confirmed price may be useful for audit/history, but the current order must preserve the new price snapshot.
If the order edit is rejected, the price snapshot must remain unchanged.

Result:
The order has an updated confirmed price snapshot, or the previous price snapshot remains unchanged.

---

### Decision 6: Has the confirmed order been updated safely?

The system must apply the edit while preserving order consistency.

Rules:
The order must not end in a state where price, items, period, assigned assets, and blocked assets disagree.
If availability-related changes fail, the confirmed order should remain unchanged.
If price update fails, the confirmed order should remain unchanged.
The edit should be atomic when it affects price, asset assignment, asset blocks, rental period, or order items.

Result:
The confirmed order is updated, or the original confirmed order remains unchanged.

## Strong consistency

Availability-affecting edits must succeed or fail together.

These must stay consistent:

- order items;
- rental period;
- assigned assets;
- asset blocks;
- price snapshot.

Dangerous partial states:

- order period changed but asset blocks still use the old period;
- equipment added but no assets blocked for it;
- equipment removed but old assets remain blocked;
- quantity changed but assigned assets do not match the new quantity;
- price changed but order items or period failed to update;
- assets released before replacement assets were successfully blocked;
- order edited into a state that cannot be fulfilled.

Conclusion:
Editing a Confirmed order is an atomic business operation when the edit affects rental period, equipment, quantities, assigned assets, asset blocks, or price.

## Reactions after confirmed order edit

After a Confirmed order is edited:

- customer may be notified in professional mode;
- customer communication may continue outside the system in WhatsApp-style mode;
- contract may need regeneration;
- contract may need re-signing;
- preparation work may need updating;
- owner split reporting may need updating;
- analytics or audit history may record the change.

These reactions should not be required for the edit to succeed unless a specific tenant rule requires them.

## Important modeling notes

Confirmed means reserved, not final.

A signed contract does not necessarily freeze the order.

Contract status should probably be modeled separately from order status.

Possible contract-related events:

- Contract Signing Requested
- Contract Signed
- Contract Re-signing Required

Possible order statuses:

- Pending
- Draft
- Confirmed
- Picked Up
- Delivered
- Returned
- Checked
- Completed
- Cancelled

## Open questions

Can a Confirmed order be edited after pickup or delivery?

If a contract was already signed, which edits require re-signing?

Should the system keep a full history of previous price snapshots?

Should the system keep a full history of previous asset assignments and blocks?

Should tenant staff be allowed to force an edit that makes the order temporarily unavailable or incomplete?

If a location change is allowed, should it behave like cancelling and recreating the asset assignment from scratch?

---

## Flow: Prepare Rental Order

Trigger:
Tenant staff starts preparing a Confirmed rental order before contract signing and before pickup or delivery.

Goal:
Review the equipment in the order, decide which compatible accessories should be included, assign available accessory assets, and block those accessory assets for the rental period.

## Business decisions involved

### Decision 1: Can this rental order be prepared?

The system must determine whether the order is in a state that allows preparation.

Rules:
The order must belong to one tenant.
The order must belong to one location.
The order must be Confirmed.
The order must have assigned and blocked equipment assets.
The order must not be Completed or Cancelled.
Preparation should happen before contract signing because assigned accessories are detailed in the contract.

Result:
The order can enter preparation, or preparation is rejected.

---

### Decision 2: Which accessories should be suggested?

The system must determine the default compatible accessories for each equipment item in the order.

Rules:
Equipment can have compatible/default accessories.
Default accessories may include suggested quantities.
Accessory suggestions are shown per order item/equipment item.
Suggested accessories are not automatically final.
Tenant staff can review, edit, remove, or change accessory quantities.

Result:
The system shows a suggested accessory list for tenant staff review.

---

### Decision 3: Which accessories does tenant staff want to include?

Tenant staff must decide which suggested or compatible accessories should be included in the rental.

Rules:
Tenant staff can accept the default accessories.
Tenant staff can reduce accessory quantities.
Tenant staff can remove accessories.
Tenant staff can include zero accessories.
Tenant staff should not include accessories that are incompatible with the rented equipment, unless explicitly allowed later.

Result:
The order has a reviewed accessory request for the rental period.

---

### Decision 4: Are the requested accessory quantities available?

The system must check whether the requested accessory assets are available for the rental period.

Rules:
Accessories behave like tracked physical assets.
Accessory assets must belong to the tenant or be available through an owner contract if that is supported.
Accessory assets must be assignable from the order’s location.
Accessory assets must be available for the full rental period.
Accessory assets cannot be assigned to overlapping orders for the same period.

Result:
The system shows which requested accessories can be assigned and which cannot.

---

### Decision 5: How should unavailable accessories be handled?

Tenant staff must decide how to continue if some or all requested accessories are unavailable.

Rules:
Unavailable accessories do not automatically cancel the rental order.
Tenant staff can continue with only the available accessories.
Tenant staff can continue with zero accessories.
Tenant staff can change requested accessory quantities.
Tenant staff can decide to cancel the rental order if accessories are important enough for that specific case.

Result:
The order continues with the accessory quantities accepted by tenant staff, or the order is cancelled by staff decision.

---

### Decision 6: Can accessory assignments be confirmed?

The system must validate the final accessory selection and create the accessory asset assignments.

Rules:
Only available accessory assets can be assigned.
Only assigned accessory assets can be blocked.
Accessory blocks must cover the rental order period.
Accessory blocks must prevent overlapping use in other orders.
If no accessories are selected, no accessory assets are assigned or blocked.
The rental order can continue with zero accessories.

Result:
Accessory asset assignments and blocks are created, or no accessory assignments are created if staff selected zero accessories.

---

### Decision 7: Has preparation been completed?

The system must mark the preparation result clearly so later steps know what accessories are included.

Rules:
The prepared order must preserve the final assigned accessory assets and quantities.
The contract must use the prepared accessory information.
If zero accessories are assigned, the contract should show zero accessories or no accessories according to the contract format.
Preparation should be completed before contract signing.
The order can move toward contract signing, pickup, or delivery after preparation.

Result:
The rental order is prepared with the selected accessories, or prepared with zero accessories.

## Strong consistency

Confirming accessory assignments must succeed or fail together.

These must stay consistent:

- reviewed accessory quantities;
- assigned accessory assets;
- accessory asset blocks;
- prepared accessory snapshot used by the contract.

Dangerous partial states:

- accessories shown in the contract but not blocked;
- accessories blocked but not attached to the order;
- unavailable accessories assigned to the order;
- accessory quantities changed but old accessory blocks remain;
- preparation marked complete but accessory assignments failed.

Conclusion:
Confirming accessory assignments is an atomic business operation when accessories are selected.

However, accessory assignment is not required for the rental order to continue. The order can be prepared with zero accessories.

## Reactions after preparation

After preparation is completed:

- contract generation may use the final accessory list;
- tenant staff may continue to contract signing;
- pickup/delivery preparation may be updated;
- audit history may record accessory choices;
- unavailable accessory decisions may be recorded for operational visibility.

These reactions should not change the accessory assignments unless tenant staff edits preparation again.

## Important modeling notes

Accessories are tracked physical assets.

Accessories behave similarly to equipment assets for assignment and blocking.

Accessories are different from equipment because they are tied to compatible equipment and are usually decided during preparation.

Default accessories are suggestions, not mandatory requirements.

Unavailable accessories do not automatically block the rental order from continuing.

The business decision about missing accessories belongs to tenant staff.

A rental order can be picked up or delivered with zero accessories.

Preparation happens before contract signing because accessories are detailed in the contract.

Contract state and preparation state are related, but they are not the same thing.

## Open questions

Can preparation be edited after contract signing?

If preparation changes after contract signing, should the contract require re-signing?

Can accessories be added after pickup or delivery?

Should accessories have their own return/checking process separate from equipment?

Should unavailable accessory decisions be tracked for reporting?

Should some accessories be marked as mandatory in the future, making them required for pickup/delivery?

---

## Insights

Confirmed means reserved, not final.

Pending orders do not block assets.

Equipment asset assignment is required for confirmation.

Accessory asset assignment is optional and staff-reviewed during preparation.

Confirming an order is an atomic business operation.

Editing a confirmed order is atomic when it affects period, equipment, quantities, price, assignments, or blocks.

Post-confirmation reactions like notifications, contracts, preparation, reporting, and analytics should not be part of the core confirmation transaction unless a business rule explicitly requires them.
