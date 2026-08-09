# Backend Architecture TODOs

## Data integrity

- [ ] Add or justify a database FK for `V2TenantUser.tenantId`.
  - The schema currently permits users referencing nonexistent tenants.
  - Audit existing data before introducing the constraint, or document the intentional architectural reason for its absence.

- [ ] Serialize concurrent confirmation of the same rental.
  - Two concurrent requests can load the same DRAFT/PENDING rental and both report success.
  - Ensure only one logical confirmation transition can succeed.

- [ ] Make confirmation asset eligibility authoritative.
  - Confirmation currently relies on `V2RentalAssetCandidate`, whose stale projection could permit an asset or equipment type that is no longer eligible.
  - Add authoritative validation or guarantee projection freshness at confirmation time.

## Rental confirmation

- [ ] Emit `RentalConfirmedIntegrationEvent` from normal confirmation.
  - Confirming an existing DRAFT/PENDING rental currently does not emit the intended integration event because `Rental.confirm()` does not record the corresponding domain event.

## Date and time model

- [ ] Formalize timestamp semantics across backend.
  - Application generally treats rental timestamps as UTC instants.
  - Relevant columns currently use PostgreSQL `TIMESTAMP(3) WITHOUT TIME ZONE`.
  - Define the canonical model for absolute instants versus tenant-local calendar values and plan any schema migration.

- [ ] Fix branch schedule-slot timezone semantics.
  - Branch has an IANA timezone with tenant fallback.
  - Current slot construction uses UTC-midnight schedule dates rather than branch-local dates/times.
  - Cover non-UTC branches, timezone boundaries, and DST behavior.

## External infrastructure boundaries

- [ ] Put custom-hostname provider behind an application port.
- [ ] Put Google identity verification/exchange behind an application port.
- [ ] Ensure E2E composition replaces every network-capable external provider with a safe fake.
  - Resend
  - R2/object storage
  - Cloudflare
  - Google OAuth

## Clarifications

- [ ] Clarify the `V2AuthIdentity` invariant for local accounts.
  - Registration creates a `V2AuthIdentity`, but local authentication apparently does not require it.
  - Define what this entity represents and when it must exist.

- [ ] Review integration-test application composition.
  - Some integration tests boot the complete `AppModule`, pulling unrelated modules such as Contracts/React PDF into slice tests.
  - Evaluate a narrower composition while retaining real PostgreSQL and required internal dependencies.
