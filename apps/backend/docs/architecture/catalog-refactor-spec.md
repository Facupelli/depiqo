# Catalog lifecycle and offer publication refactor - implementation specification

**Status:** Agreed design; implementation pending. This specification records the intended end state, not the behavior of the current code. The Catalog module README and the architecture overview remain the sources of truth for bounded-context ownership.

## 1. Problem Statement

Catalog currently creates Rentable Items in `DRAFT`, but has no production workflow that activates them. Storefront discovery and new rental selection require `ACTIVE`, so newly authored offerings cannot reach those flows through the existing setup workflows. Rental Offers nevertheless start visible and rentable. Publication dating also depends on item status and is decided across creation and offer-update paths, rather than being reliable across all transitions.

The refactor removes the unused item-level draft/active distinction and models the separate business concerns directly: item archival, branch-offer storefront discovery, new-selection permission, and first publication.

## 2. Goals

- Allow an unarchived item to participate in discovery and new selection according to its offer settings, without an activation step.
- Make newly created offers safe by default, while allowing a coordinated priced workflow to launch immediately.
- Record first publication once, including publication upon restoration where appropriate, and retain its recency semantics for New Arrivals.
- Preserve Rental Commitment's accepted rental facts independently of later Catalog changes.
- Replace snapshot-based offer-flag writes that can lose concurrent changes.
- Remove the old item status, old offer-field names, and obsolete lifecycle behavior from the final code and contracts.

## 3. Non-Goals / Out of Scope

- Do not make Catalog flags a substitute for valid Pricing, physical stock, or rental-period availability.
- Do not introduce a setup-completeness state or automatic status calculation as a replacement for `DRAFT`/`ACTIVE`.
- Do not automatically change offer flags when Pricing is assigned, removed, or becomes invalid.
- Do not reinterpret or rewrite existing confirmed rentals when Catalog configuration changes.
- Do not add a Catalog archival check to confirmation of an already persisted rental draft.
- Do not build a compatibility layer for rolling old and new lifecycle models simultaneously; the finished refactor is released as a whole.

## 4. Current Problems

- `RentableItem` persists `DRAFT | ACTIVE | ARCHIVED`, but normal creation produces `DRAFT` and the existing `activate()` method has no production workflow.
- Initial offers default to `isVisible = true` and `isRentable = true`, even though initial combo and optional standalone-rental creation do not assign pricing.
- Storefront and staff offer searches, as well as Catalog's new-selection resolution, require an active item. New Arrivals additionally needs a recent non-null publication timestamp.
- Offer creation and visibility updates determine `publishedAt` in different places. The offer repository writes both flags from a loaded snapshot, allowing competing partial edits to overwrite each other.
- The offer-edit path advertises an archived-offer error, but the offer has no archived state to enforce it. Existing administrative behavior also prevents some archived configuration edits, contrary to the intended model.
- The Storefront can list a visible, non-rentable offer, but its cart control currently checks pricing and stock without checking `isRentable`. Pricing's rate-plan detail read also directly queries Catalog-owned persistence, contrary to the module boundary rule.

## 5. Final Domain Model

| Concept | Meaning |
| --- | --- |
| `RentableItem.archivedAt: Date | null` | Non-null means the item is archived. There is no item `DRAFT` or `ACTIVE` status. Archival masks new discovery and selection; it does not freeze configuration or erase history. |
| `RentalOffer.showInStore: boolean` | Whether this branch offer is configured for customer discovery. It does not imply rentability, pricing, or physical availability. |
| `RentalOffer.isRentable: boolean` | Whether this branch offer may be newly selected for a rental. A hidden but rentable offer may still be selected directly by a supported staff workflow. |
| `RentalOffer.firstPublishedAt: Date | null` | First time this offer becomes discoverable through `showInStore` on an unarchived item, subject to the explicit legacy migration proxy below. Once set, it never changes. New Arrivals uses this timestamp. |

Effective customer discovery requires an unarchived item and `showInStore = true`. Effective eligibility for **new Catalog selection** requires an unarchived item and `isRentable = true`. Pricing and physical availability have their own owners and additional booking constraints.

## 6. Behavioral Rules

- The two offer flags are independent administrative settings, not computed readiness states. All four combinations are valid.
- A visible but non-rentable offer can be discovered but cannot be added to the storefront cart or newly selected. An unpriced offer can be discovered but cannot be booked; the Storefront may display its existing contact-for-price presentation.
- Pricing assignment and later Pricing changes do not silently enable or disable either Catalog flag. Invalid or missing pricing prevents actual booking through the relevant Pricing/Rental Commitment checks, even if `isRentable` is true.
- Archived items are absent from Storefront discovery and staff selection/search and cannot be newly added to a rental, regardless of their stored offer flags. They remain available in administrative views for editing and restoration.
- Setup/read models must not call an archived offer ready for new rentals, even if its stored flags and pricing would otherwise be ready. Administrative pricing and offer-edit actions remain possible while archived.

## 7. Creation and Launch Workflows

New Rental Offers default to:

```text
showInStore = false
isRentable = false
firstPublishedAt = null
```

Initial combo creation and optional standalone-rental creation do not create pricing. They create offers at those safe defaults. Assigning pricing later leaves the flags unchanged; admins launch through the existing branch-availability controls, with clear UI indication that pricing alone does not launch an offer.

The priced branch-add workflow creates the offer and assigns pricing within its existing all-or-nothing orchestration. It launches by default with `showInStore = true`, `isRentable = true`, and `firstPublishedAt` set at creation. If pricing assignment fails, the offer creation and launch roll back as part of the same business operation. An assigned plan does not itself guarantee that booking can succeed; later pricing validity and availability remain separate checks. Catalog owns the flags and timestamp; Offering Management owns the cross-module coordination. Catalog does not acquire a dependency on Pricing to decide its flags.

## 8. Archive and Restore Semantics

- Archiving sets `archivedAt` on the first transition. Repeated archival has no further effect. It does not clear offer flags, publication dates, requirements, or existing accepted rental facts.
- Admins can continue to edit item, offer, and pricing configuration while archived. Such settings have no discovery or new-selection effect until restoration. Archival is not offer immutability.
- Restoration is an explicit administrative action that clears `archivedAt`; it does not create a new item or reset its offer configuration. Existing published offers keep their original `firstPublishedAt`.
- On restoration, every offer configured with `showInStore = true` and `firstPublishedAt = null` receives its first-publication date then. Offers still hidden remain undated. An offer made visible while archived remains undated until restoration.
- Restoring an item re-exposes whatever flags were configured while it was archived. Pricing and physical availability remain separate, so restoration does not promise bookability.

## 9. Publication Semantics

- For an unarchived item, creating an offer with `showInStore = true` records first publication at creation. Changing an offer from hidden to shown records it if it has never been published.
- Changing only `isRentable` never sets or changes publication. Hiding, showing again, archiving, restoring, changing pricing, and branch availability changes never replace a non-null first-publication date.
- Setting `showInStore = true` while archived does not yet make the offer discoverable and does not date it; restoration applies the rule above. Temporary branch unavailability does not reset or postpone a publication date for an otherwise unarchived offer configured for discovery.
- A non-null `firstPublishedAt` is write-once. New Arrivals continues to filter and order by first-publication recency, not creation time or the most recent re-show date. The migration exception below uses a historical proxy, not a claim to have recovered an exact publication instant.

## 10. Rental Selection and Existing Draft Semantics

Catalog is authoritative when a **new selection** is resolved: an archived item or non-rentable offer is rejected. This applies when creating a rental, adding a selection to an existing rental, and checking out a Storefront cart. A browser cart is not a persisted rental draft; an offer archived between adding it to the cart and checkout is rejected when checkout resolves the new selection.

A rental draft that already persists an accepted selection, fulfillment demand, and price snapshot may still proceed to confirmation after its item is archived. Confirmation uses Rental Commitment's persisted facts and its own operational checks; it must not introduce a new Catalog lifecycle check that retroactively invalidates the selected offer. Existing confirmed rentals retain their historical facts. Subsequent operations that add **new** selections still validate those selections against current Catalog rules.

## 11. Migration Semantics

Backfill legacy records using the old item status *before removing that column*:

| Old item status | New item state | Existing offers |
| --- | --- | --- |
| `DRAFT` | `archivedAt = null` | `showInStore = false`, `isRentable = false`, `firstPublishedAt = null`, regardless of their old flags. |
| `ACTIVE` | `archivedAt = null` | Preserve both flags. Preserve non-null `publishedAt` as `firstPublishedAt`. If an offer is visible and `publishedAt` is null, set `firstPublishedAt` to that offer's `createdAt`. Otherwise preserve null. |
| `ARCHIVED` | `archivedAt` set to migration time | Preserve both flags and the existing publication date, including null. The legacy archival instant is not known; migration time is acceptable as its archival marker. |

The `createdAt` fallback for a visible legacy active offer is a deliberate approximate historical date. It prevents a later hide/show or archive/restore from falsely dating that offer as newly published, without adding a legacy-only marker. It must not be applied to formerly draft offers. Existing non-null publication timestamps never reset.

Final schema, contracts, and code must remove the obsolete item status and old offer-field names. New timestamp columns represent absolute instants using the project's V2 temporal conventions. No dual persistent fields or compatibility lifecycle are required.

## 12. Concurrency Requirements

- A request changing only `showInStore` must not overwrite a concurrent change to `isRentable`, and vice versa. Persist only the flags actually supplied. Competing edits to the *same* flag may use last-write-wins.
- Assign `firstPublishedAt` only when still null, atomically with the applicable visibility/restoration transition. Concurrent attempts must not change an already assigned date or leave an effectively visible, unarchived, never-published new offer undated.
- Coordinate offer edits with archive/restore so publication observes the effective item state. Do not rely on a stale loaded offer followed by an unguarded separate timestamp write. The precise transaction/locking strategy is an implementation choice, not a new product concept.

## 13. Cross-Module Responsibilities

- **Catalog:** Owns item archival/restoration, branch-offer flags, publication timestamp, storefront/staff discovery queries, and current new-selection resolution. Publish only the Catalog capabilities other modules genuinely need.
- **Offering Management:** Coordinates multi-module creation and priced branch-add in one business transaction; records remain owned by Catalog and Pricing respectively.
- **Pricing:** Owns pricing assignments and proposed prices, not Catalog flags. When touching its rate-plan detail read during this refactor, replace the current direct read of Catalog-owned Prisma models with an appropriate Catalog-published read capability. Do not shift Catalog persistence ownership to Pricing.
- **Rental Commitment:** Consumes Catalog for new selections and owns accepted selections, demand, availability, and historical rental snapshots. Existing draft confirmation is not a new Catalog selection.
- **Asset Inventory and Tenant Management:** Retain their existing ownership of equipment and branch facts. Neither physical stock nor branch configuration is redefined by these Catalog fields.
- **Shared API contracts:** Express the final lifecycle/offer vocabulary consumed by the applications; remove the obsolete status and flag names rather than supporting both indefinitely.

## 14. Backoffice / Storefront UX Requirements

- Backoffice represents items as products and offers as branch availability, without exposing implementation structure unnecessarily. List filters should distinguish all, unarchived, and archived products, rather than presenting `DRAFT`/`ACTIVE` as setup states. Archived products must be findable, editable, and explicitly restorable.
- Existing branch-availability controls let admins independently show an offer in the store and permit new rentals. Initial unpriced offers remain hidden and non-rentable until explicitly enabled; pricing assignment alone must not imply launch. A priced branch-add launches by default.
- The administrative setup summary must reflect archival as not available for new rentals without treating archived configuration as immutable. UI labels must distinguish visibility, rentability, and pricing instead of treating them as one readiness switch.
- Storefront lists unarchived offers configured with `showInStore = true`, even if unpriced or non-rentable. Its cart action must reject offers with `isRentable = false`, missing applicable pricing, or no available stock under the existing availability rule. A listed unpriced offer may retain the existing contact-for-price presentation; being shown does not promise checkout eligibility.
- New Arrivals uses `firstPublishedAt` and retains its existing recency-window behavior. No new customer-facing publication-date display is required by this refactor.

## 15. Testing and Validation Strategy

- **Migration tests:** Cover each old status, all relevant flag/date combinations, the visible-active-null-date `createdAt` fallback, and archived rows with unknown historical archival dates. Verify that formerly draft visible offers cannot become newly discoverable just because the item status disappears.
- **Catalog tests:** Verify creation defaults, priced launch publication, hidden/directly selectable offers, visible/non-rentable offers, archived discovery and selection masking, administrative edits while archived, idempotent archive, explicit restore, and permanent first-publication dates across hide/show and archive/restore.
- **Concurrency tests:** Exercise simultaneous edits to different flags, competing publication attempts, and archive/restore racing with an offer becoming visible. Assert both final flags and timestamp invariants, not merely successful responses.
- **Cross-module tests:** Verify priced branch-add atomic rollback when pricing fails; new-selection rejection for archived/non-rentable offers; and confirmation of an existing persisted draft after archival using its accepted snapshots.
- **Frontend tests and end-to-end checks:** Exercise the unpriced initial setup and later launch, priced branch-add, archived administration and restore, visible-but-unpriced/non-rentable storefront cards and disabled cart actions, and New Arrivals. Inspect real application behavior and UI, not just contract types.
- **Integrated validation:** Build and validate affected shared contracts, backend, Backoffice, and Storefront workspaces, then audit for unintentionally retained legacy Catalog status/field references. Run relevant migration and integration tests. Do not edit generated code manually or run repository-wide validation by default.

## 16. Rollout Constraints

Work proceeds in small, reviewable units on the development refactor branch. The release happens **only after the full refactor** is complete and validated across the shared contracts, backend, Backoffice, and Storefront. Intermediate units need not be independently deployable against old versions of other applications. Do not add compatibility fields, dual lifecycle handling, or an old/new API layer for rolling deployment. Coordinate coupled contract and consumer changes and remove legacy code by the final integration gate.

The review sequence starts with the independent Storefront `isRentable` cart fix, then Catalog persistence/domain and queries, cross-module workflows, shared contracts and Backoffice, and finally the Storefront New Arrivals query vocabulary and final cleanup. These are review boundaries, not promises that partial lifecycle versions can be released safely.

## 17. Remaining Implementation Choices

The following are technical choices for implementation review, not unsettled product rules:

- Exact transaction/locking technique that makes offer edits and restore publication atomic without lost updates.
- Concrete shape and name of the narrow Catalog-published display read used by Pricing.
- Exact HTTP path, permission reuse, and response/error naming for the explicit restore action.
- Final shared-contract naming for archival filters and the New Arrivals sort/filter vocabulary, while preserving their semantics and eliminating obsolete Catalog terminology.
- How to divide backend work into smaller reviews without shipping or retaining a partial lifecycle.

No additional product decisions or compatibility mechanisms are required by this specification.
