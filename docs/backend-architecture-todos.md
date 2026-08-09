# Backend Architecture TODOs

## Data integrity

- [ ] Add/justify DB-level tenant FK for `V2TenantUser.tenantId`.
  - Current schema permits users referencing nonexistent tenants.
  - Audit existing data before introducing constraint.

## Date and time model

- [ ] Formalize timestamp semantics across backend.
  - Application generally treats rental timestamps as UTC instants.
  - Relevant columns currently use PostgreSQL `TIMESTAMP(3) WITHOUT TIME ZONE`.
  - Decide which values are absolute instants versus tenant-local calendar values.
  - Plan schema migration before changing types.

- [ ] Fix branch schedule-slot timezone semantics.
  - Branch has IANA timezone with tenant fallback.
  - Current slot construction uses UTC-midnight schedule dates rather than branch timezone.
  - Define/test behavior across timezone boundaries and DST.

## External infrastructure boundaries

- [ ] Put custom-hostname provider behind an application port.
- [ ] Put Google identity verification/exchange behind an application port.
- [ ] Ensure E2E composition replaces every network-capable external provider with a safe fake.
  - Resend
  - R2/object storage
  - Cloudflare
  - Google OAuth

## Clarifications

- [ ] Document the invariant/purpose of `V2AuthIdentity` for local tenant-user accounts.
  - Registration creates it.
  - Local login apparently does not require it.
  - Determine whether this is intentional before changing the model.
