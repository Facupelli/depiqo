# Error Handling Migration TODO

Track the migration of backend HTTP-facing use cases to the design defined in [`implementation-rules/error-handling-problem-details.md`](./implementation-rules/error-handling-problem-details.md).

Canonical example: `src/modules/pricing/features/calculate-cart-price/`.

## Migration checklist

### Asset inventory

- [x] `add-assets-to-equipment-type`
- [x] `create-equipment-type`
- [x] `create-equipment-type-accessory-defaults`
- [x] `get-equipment-type-detail`
- [x] `get-owner-detail`
- [x] `get-rental-accessory-defaults`

### Catalog

- [x] `activate-rentable-item`
- [x] `create-category`
- [x] `get-rentable-item-detail`

### Contracts

- [x] `generate-rental-remito`

### Document signing

- [x] `get-public-signing-session`

### Offering setup

- [x] `create-package`
- [x] `create-rentable-equipment`
- [x] `create-rental-offer-with-pricing`

### Pricing

- [x] `attach-rate-plan-to-rental-offer`
- [ ] `calculate-draft-rental-price`
- [x] `create-promotion`
- [x] `create-rate-plan`
- [x] `create-rate-plan-and-attach-to-rental-offer`
- [x] `get-promotion-detail`
- [x] `update-promotion`

### Rental commitment

- [ ] `assign-customer-to-draft-rental`
- [ ] `assign-rental-accessories`
- [ ] `cancel-rental`
- [ ] `confirm-rental`
- [ ] `create-confirmed-rental`
- [ ] `create-draft-rental`
- [ ] `get-rental-detail`

### Tenant management

- [ ] `approve-submitted-customer-onboarding`
- [ ] `create-branch`
- [ ] `create-contract-signer`
- [ ] `get-branch-detail`
- [ ] `get-current-tenant`
- [ ] `get-customer-profile-detail`
- [ ] `get-customer-summary`
- [ ] `get-public-tenant-config`
- [ ] `refresh-custom-domain-status`
- [ ] `register-custom-domain`
- [ ] `register-tenant-with-owner`
- [ ] `reject-submitted-customer-onboarding`
- [ ] `update-branch`
- [ ] `update-contract-signer`
- [ ] `update-tenant-branding`
- [ ] `update-tenant-config`
- [ ] `customer/get-current-rental-customer-profile`
- [ ] `customer/submit-customer-profile`

## Auth use cases requiring separate review

These use cases throw Nest HTTP exceptions from application services. They are listed separately because their authentication flow and transport boundary need to be reviewed before applying the standard feature migration mechanically.

- [ ] `tenant-management/auth/customer-google-login`
- [ ] `tenant-management/auth/validate-customer-local-credentials`
- [ ] `tenant-management/auth/validate-local-credentials`

## Migration checklist for each use case

- [ ] Identify all expected failures.
- [ ] Define feature-local expected failures in `<feature>.errors.ts`.
- [ ] Use stable, namespaced error codes.
- [ ] Return `Result<T, FeatureError>` for expected failures.
- [ ] Preserve domain and dependency errors as `cause`.
- [ ] Include only safe metadata in error `context`.
- [ ] Let unknown and infrastructure failures throw.
- [ ] Map expected errors to `ProblemException` at the HTTP edge.
- [ ] Keep Problem Details mapping near the controller unless reuse or size justifies extraction.
- [ ] Remove obsolete application-error and HTTP-error mapper files.
- [ ] Add or update tests for expected failures and HTTP Problem Details responses.
