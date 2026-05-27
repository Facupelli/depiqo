# Logical Boundaries Refactor - Proposed Context Contracts

## Purpose

This document defines the public contract for each proposed bounded context in the modular monolith.

The goal is to make the mental model clear:

> A context owns its data and decisions. Other contexts should interact with it only through its public contract.

This prevents the monolith from becoming a big ball of mud where any module can reach into any table, service, or repository.

---

## Contract rule of thumb

Inside the monolith, code can technically call anything.

So each context should intentionally expose only a small public surface:

```text
Commands = ask the context to change something it owns.
Queries = ask the context for information it owns or is allowed to reveal.
Events = facts the context publishes after something happened.
Public application services = the only callable entry points from outside the context.
```

Everything else is private implementation.

Do not share repositories, ORM models, internal entities, aggregate methods, or database tables across contexts.

---

## Context relationship style

Prefer this:

```text
Other Context
  -> Public Application Service / Command / Query
     -> Context internals
        -> repository / aggregate / policies / tables
```

Avoid this:

```text
Other Context
  -> repository from another context
  -> internal entity from another context
  -> direct table access owned by another context
```

---

# 1. Rental Commitment

## Mental model

Rental Commitment is the trust engine.

It owns the lifecycle of a rental and the facts that make a rental safe to promise:

- selected branch;
- rental period;
- selected equipment and combos;
- price snapshot;
- assigned assets;
- rental-related asset blocks;
- selected accessories;
- preparation state.

If a fact affects whether a rental is safely committed, it belongs here.

## Exposes commands

```text
CreatePendingRental
CreateDraftRental
ConfirmRental
EditConfirmedRental
CancelRental
StartPreparation
ReviewAccessories
ReserveSelectedAccessories
MarkRentalPrepared
MarkRentalPickedUp
MarkRentalDelivered
MarkRentalReturned
MarkRentalChecked
CompleteRental
ReleaseRentalAssetBlocks
```

## Exposes queries

```text
GetRentalCommitmentDetails
GetRentalSummary
GetConfirmedRentalSnapshot
GetPreparedRentalSnapshot
GetRentalAssetBlocks
CheckAssetBlockedForPeriod
CheckRentalIsCommitted
ListRentalsForBranch
ListPendingRentals
```

## Publishes events

```text
PendingRentalCreated
DraftRentalCreated
RentalConfirmed
ConfirmedRentalEdited
RentalCancelled
EquipmentAssetBlocksCreated
AccessoryAssetBlocksCreated
AssetBlocksReleased
PreparationStarted
AccessoriesReviewed
RentalPrepared
RentalPickedUp
RentalDelivered
RentalReturned
RentalChecked
RentalCompleted
```

## Public application services

```text
RentalCommandService
RentalQueryService
RentalAvailabilityQueryService
```

## Must not expose

- Rental aggregate internals.
- Rental item repositories.
- Assigned asset repositories.
- Asset block repositories.
- Direct writes to rental-owned tables.

## Boundary notes

Rental Commitment may call Catalog, Pricing, Tenant Management, and Asset Inventory during commands.

But the final committed facts are written only by Rental Commitment.

Asset Inventory owns physical asset profiles. Rental Commitment owns rental asset blocks.

Pricing calculates. Rental Commitment snapshots the accepted price.

Catalog defines combos. Rental Commitment snapshots selected combos and expands them into rental demand.

---

# 2. Catalog

## Mental model

Catalog owns what the tenant offers and what can be selected.

It answers:

> Can this equipment type or combo be shown, selected, or used as an accessory?

It does not own rental commitments or asset availability.

## Exposes commands

```text
CreateEquipmentType
UpdateEquipmentType
PublishEquipmentType
RetireEquipmentType
SetEquipmentTypeBranchVisibility
CreateCombo
UpdateCombo
PublishCombo
RetireCombo
SetComboBranchVisibility
CreateAccessoryRule
UpdateAccessoryRule
RemoveAccessoryRule
```

## Exposes queries

```text
ListCatalogItems
GetEquipmentTypeDetails
GetComboDetails
ResolveComboContents
CheckEquipmentTypeRentableInBranch
CheckComboRentableInBranch
GetAccessoryRulesForEquipmentDemand
GetDefaultAccessorySuggestions
```

## Publishes events

```text
EquipmentTypeCreated
EquipmentTypeUpdated
EquipmentTypePublished
EquipmentTypeRetired
EquipmentTypeBranchVisibilityChanged
ComboCreated
ComboUpdated
ComboPublished
ComboRetired
ComboBranchVisibilityChanged
AccessoryRuleCreated
AccessoryRuleUpdated
AccessoryRuleRemoved
```

## Public application services

```text
CatalogCommandService
CatalogQueryService
CatalogSelectionPolicyService
AccessoryRuleQueryService
```

## Must not expose

- Equipment type repositories.
- Combo repositories.
- Combo component repositories.
- Direct writes to catalog tables.

## Boundary notes

Catalog changes affect future rentals only.

Confirmed rentals keep their own snapshots. Catalog must not rewrite rental history.

Catalog can provide informative catalog data, but it does not decide whether assets can be committed for a rental period.

---

# 3. Asset Inventory

## Mental model

Asset Inventory owns the physical truth about assets.

It answers:

> Which physical units exist, where are they, who owns them, and are they eligible candidates?

It does not own rental asset blocks.

## Exposes commands

```text
CreateAsset
UpdateAssetProfile
ChangeAssetCondition
ChangeAssetBranch
ChangeAssetOwner
ActivateAsset
DeactivateAsset
CreateAssetOwner
UpdateAssetOwner
CreateOwnerContract
UpdateOwnerContract
ExpireOwnerContract
```

## Exposes queries

```text
GetAssetDetails
ListAssetsByEquipmentTypeAndBranch
ListAccessoryAssetsByTypeAndBranch
FindEligibleAssetCandidates
CheckAssetEligibility
GetAssetOwnerDetails
GetActiveOwnerContractForAsset
```

## Publishes events

```text
AssetCreated
AssetUpdated
AssetConditionChanged
AssetBranchChanged
AssetOwnerChanged
AssetActivated
AssetDeactivated
AssetOwnerCreated
AssetOwnerUpdated
OwnerContractCreated
OwnerContractUpdated
OwnerContractExpired
```

## Public application services

```text
AssetInventoryCommandService
AssetInventoryQueryService
AssetEligibilityService
OwnerContractQueryService
```

## Must not expose

- Asset repositories.
- Owner contract repositories.
- Direct table access for rental assignment logic.
- Any API that writes rental asset blocks.

## Boundary notes

Asset Inventory can say an asset is eligible ignoring rental blocks.

Rental Commitment decides whether that asset can be assigned and blocked for a rental period.

Asset Inventory should not query or write `asset_blocks` directly.

---

# 4. Pricing

## Mental model

Pricing owns calculation rules.

It answers:

> Given this rental input, what price breakdown should be produced?

It does not own the accepted price of a confirmed rental.

## Exposes commands

```text
CreatePricingTier
UpdatePricingTier
CreatePromotion
UpdatePromotion
ExpirePromotion
CreateCoupon
UpdateCoupon
ExpireCoupon
CreateComboPricingRule
UpdateComboPricingRule
RemoveComboPricingRule
```

## Exposes queries

```text
CalculateRentalPrice
ValidateCoupon
ExplainPriceBreakdown
PreviewPriceForCatalogSelection
GetActivePricingRules
```

## Publishes events

```text
PricingTierChanged
PromotionCreated
PromotionUpdated
PromotionExpired
CouponCreated
CouponUpdated
CouponExpired
ComboPricingRuleChanged
```

## Public application services

```text
PricingCommandService
PricingCalculationService
PricingQueryService
```

## Must not expose

- Pricing repositories.
- Promotion/coupon internals.
- Durable order price state.

## Boundary notes

Pricing returns a `PriceBreakdown`.

Rental Commitment stores a `PriceSnapshot` when the rental is confirmed or edited.

Pricing rule changes must not mutate confirmed rentals.

---

# 5. Tenant Management

## Mental model

Tenant Management owns tenant identity, users, permissions, branches, schedules, product mode, and configuration.

It answers:

> Is this tenant/user/branch/configuration valid for the requested operation?

## Exposes commands

```text
CreateTenant
UpdateTenantConfiguration
AddTenantUser
ChangeTenantUserRole
CreateBranch
UpdateBranch
DisableBranch
UpdateBranchSchedule
UpdateProductModeConfiguration
```

## Exposes queries

```text
GetTenantConfiguration
ValidateTenantUserPermission
ListTenantBranches
GetBranchDetails
ValidateBranch
ValidateRentalPeriodAgainstBranchSchedule
ValidatePickupReturnSlots
GetTenantTimezone
GetBranchTimezone
GetProductModeConfiguration
```

## Publishes events

```text
TenantCreated
TenantConfigurationChanged
TenantUserAdded
TenantUserRoleChanged
BranchCreated
BranchUpdated
BranchDisabled
BranchScheduleChanged
ProductModeChanged
```

## Public application services

```text
TenantManagementCommandService
TenantManagementQueryService
PermissionService
BranchScheduleService
ProductModeService
```

## Must not expose

- User repositories.
- Role repositories.
- Branch repositories.
- Raw permission tables.

## Boundary notes

Tenant Management validates branches and schedules.

Rental Commitment stores the selected branch reference and rental period snapshot.

Branch configuration changes affect future operations, not already confirmed rental facts.

---

# 6. Contracts

## Mental model

Contracts owns contract documents and signing state.

It answers:

> What contract was generated, was signing requested, and is re-signing required?

It does not own rental confirmation or rental immutability.

## Exposes commands

```text
GenerateContract
RequestContractSigning
RecordContractSigned
MarkContractResigningRequired
CancelSigningRequest
```

## Exposes queries

```text
GetContractStatus
GetContractDocument
GetSigningRequestStatus
ListContractsForRental
```

## Publishes events

```text
ContractGenerated
ContractSigningRequested
ContractSigned
ContractResigningRequired
SigningRequestCancelled
```

## Consumes events

```text
RentalConfirmed
ConfirmedRentalEdited
RentalPrepared
```

## Public application services

```text
ContractCommandService
ContractQueryService
ContractGenerationService
SigningRequestService
```

## Must not expose

- Contract repositories.
- Signing provider internals.
- Direct writes to rental state.

## Boundary notes

Contracts reads stable rental snapshots from Rental Commitment.

If a rental changes after signing, Contracts may mark re-signing required.

A signed contract does not automatically lock the rental.

---

# 7. Notifications

## Mental model

Notifications owns system-generated message delivery.

It answers:

> Should a notification be sent, through which channel, and what happened to delivery?

Manual WhatsApp handoff is not notification infrastructure.

## Exposes commands

```text
SendNotification
ScheduleNotification
RetryNotificationDelivery
CancelScheduledNotification
UpdateNotificationTemplate
```

## Exposes queries

```text
GetNotificationDeliveryStatus
ListNotificationsForRental
GetNotificationTemplate
```

## Publishes events

```text
NotificationQueued
NotificationSent
NotificationFailed
NotificationDeliveryRetried
NotificationCancelled
```

## Consumes events

```text
RentalConfirmed
ConfirmedRentalEdited
RentalPrepared
ContractSigningRequested
ContractSigned
```

## Public application services

```text
NotificationCommandService
NotificationQueryService
NotificationDeliveryService
```

## Must not expose

- Notification repositories.
- Delivery provider internals.
- Any API that controls rental confirmation.

## Boundary notes

Notification failure must not invalidate rental confirmation, editing, preparation, or contract signing.

WhatsApp-style customer flow generates a message for the customer to send manually. That is not a notification command.

---

# 8. Lightweight Customer Rental Flow

## Mental model

This is a product/application flow, not a bounded context for now.

It composes other contexts into a simple customer experience.

It owns the customer-facing journey and WhatsApp handoff, but not durable rental authority.

## May call

```text
Tenant Management queries
Catalog queries
Pricing queries
Rental Commitment command: CreatePendingRental
```

## Owns application behavior

```text
Show customer-facing catalog flow
Collect rental request data
Generate WhatsApp message
Submit pending rental request
```

## Does not own

- Rental confirmation.
- Asset assignment.
- Asset blocks.
- Pricing rules.
- Catalog definitions.
- Automatic WhatsApp delivery.

## Boundary notes

The flow creates Pending Rentals only.

Pending Rentals do not assign assets and do not block assets.

The customer manually sends the WhatsApp message.

---

# Cross-context access rules

## Allowed

```text
Context A calls Context B public command/query service.
Context A reacts to Context B published event.
Context A stores an id or snapshot from Context B when needed.
```

## Not allowed

```text
Context A imports Context B repository.
Context A writes Context B table.
Context A mutates Context B aggregate/entity.
Context A depends on Context B internal ORM model.
Context A joins across context-owned tables for business decisions.
```

Reporting can have special read models later, but operational decisions should not use cross-context table joins.

---

# Recommended first enforcement

Start with the most dangerous boundaries:

```text
1. Only Rental Commitment can write rentals, assigned assets, and asset blocks.
2. Only Catalog can write equipment types, combos, combo components, and accessory rules.
3. Only Asset Inventory can write asset profiles and owner contracts.
4. Only Pricing can write pricing rules.
5. Other contexts must use public services, not repositories.
```

If only one rule is enforced first, enforce this:

> No context outside Rental Commitment can write rental-related asset blocks.

That is the boundary that protects the business from double booking and inconsistent commitments.
