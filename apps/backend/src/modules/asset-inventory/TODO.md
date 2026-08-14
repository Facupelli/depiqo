# Asset Inventory TODO

## Architectural / Boundary Follow-ups

- [ ] Move `get-rental-accessory-defaults` Rental Commitment reads behind a public Rental Commitment API/query, or relocate the use case to the owning workflow/module.
  - Current file: `features/get-rental-accessory-defaults/get-rental-accessory-defaults.handler.ts`
  - Issue: reads `v2Rental`, demand lines, `v2RentalAssetCandidate`, and `v2_asset_blocks` directly.
  - README rule: Asset Inventory must not own rental lifecycle, assigned rental state, asset blocks, or query Rental Commitment asset blocks directly to decide availability.

- [ ] Clarify or split `AssetInventoryPublicApi.listAssetsByEquipmentTypeAndBranch`.
  - Current file: `public-api/asset-inventory.public-api.service.ts`
  - Issue: returns all non-deleted assets, including `INACTIVE` and `RETIRED` assets.
  - If used for assignment candidates, provide a separate eligibility API that filters assignable assets, e.g. `status: ACTIVE` and non-deleted.
  - If intended as a raw physical inventory read, document that consumers must not treat it as assignment eligibility.

## Persistence / Invariants

- [ ] Enforce equipment-type accessory default invariants at the database level.
  - Current schema: `apps/backend/prisma/schema/models/v2/asset-inventory/equipment-types.prisma`
  - Invariants:
    - An equipment type must not define itself as its own accessory default.
    - Accessory default quantity must be positive.
  - Current state: enforced by API/handler only; schema contains a TODO for DB checks.

## Error Handling / Consistency

- [ ] Bring `create-owner-with-contract` into the module's standard Result/application-error/Problem Details flow.
  - Current file: `features/create-owner-with-contract/create-owner-with-contract.handler.ts`
  - Issue: writes directly through Prisma and returns raw success result without expected-error mapping.
  - Keep concept in Asset Inventory, because current third-party ownership metadata belongs here per README, but align implementation with the rest of the module.
