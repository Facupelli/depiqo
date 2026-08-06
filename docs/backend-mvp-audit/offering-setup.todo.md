# Offering Setup MVP TODO

## Existing capabilities

The orchestration module creates rentable equipment, packages, and an offer with pricing by invoking owning-module capabilities. It does not own persistence, matching the documented boundary.

## Missing or incomplete capabilities

### [ ] Make multi-module setup atomic or recoverable

- **Priority:** P0
- **Status:** Partial
- **MVP scenario:** A failure while creating inventory, catalog, offers, or pricing must not leave an apparently bookable half-configured offering.
- **Current evidence:** `create-rentable-equipment`, `create-package`, and `create-rental-offer-with-pricing` coordinate multiple public APIs, but no setup saga/idempotency record or cross-module compensation is present.
- **Gap:** Independent transactions can leave orphaned or incomplete records after a later step fails.
- **Expected behavior:** Use one safe transaction boundary where architecture permits, or persist an idempotent workflow with compensating deactivation and a resumable incomplete status.
- **Lifecycle rules:** An incomplete setup cannot be exposed as ready/bookable; retries must not duplicate records.
- **Owning module:** Offering Setup
- **Dependencies:** Idempotent public commands in Asset Inventory, Catalog, and Pricing.
- **Side effects:** Setup attempt state or compensating lifecycle changes, without assuming ownership of target records.
- **Acceptance criteria:** Injected failure at every step leaves no bookable partial result and retry converges to one complete offering.
- **Suggested tests:** Fault-injection integration tests per orchestration step and duplicate-request concurrency tests.

### [ ] Expose offering readiness diagnostics

- **Priority:** P1
- **Status:** Missing
- **MVP scenario:** Staff sees why an item is not bookable after setup and can finish the missing step.
- **Current evidence:** Setup create responses return created results, while readiness facts are distributed across active branch, item/offer, requirements, inventory, and pricing records; no composed diagnostic capability exists.
- **Gap:** Partial setup becomes an operational dead end with no authoritative explanation.
- **Expected behavior:** Compose owning-module validations into a read-only readiness result listing missing/invalid dependencies and stable identifiers.
- **Lifecycle rules:** The orchestrator reports facts but does not override owners or mark foreign records valid.
- **Owning module:** Offering Setup
- **Dependencies:** Tenant Management, Asset Inventory, Catalog, and Pricing public readiness APIs.
- **Side effects:** None.
- **Acceptance criteria:** Every incomplete setup state yields actionable reasons and a complete setup reports ready consistently with storefront selection/pricing.
- **Suggested tests:** Contract tests for each reason and E2E progression from incomplete to ready.

### [ ] Support completing existing partial offerings

- **Priority:** P1
- **Status:** Partial
- **MVP scenario:** Staff adds missing branch offers, assets, requirements, or pricing to records created earlier.
- **Current evidence:** `create-rental-offer-with-pricing` handles one completion path, but no general idempotent completion flow is present for existing equipment/package setups.
- **Gap:** Creation-first workflows cannot reliably resume or extend across branches without manual calls and duplicate risk.
- **Expected behavior:** Coordinate explicit add-to-existing workflows using owner public APIs and return per-module results.
- **Lifecycle rules:** Existing valid records are reused; conflicts are reported, not silently overwritten.
- **Owning module:** Offering Setup
- **Dependencies:** Catalog offer lifecycle, Pricing assignment lifecycle, Asset Inventory add/update capabilities.
- **Side effects:** Only owner-module records and owner-emitted events change.
- **Acceptance criteria:** An existing equipment type/item can be completed for a new branch without duplicate item, offer, or pricing records.
- **Suggested tests:** E2E resume after partial setup and add-second-branch idempotency tests.
