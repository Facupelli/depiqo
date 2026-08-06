# Tenant Management MVP TODO

## Existing capabilities

Tenant registration with an owner, staff and customer session authentication, trusted hostname resolution, tenant/config/branding reads and updates, branch creation/update/list/detail, storefront schedules, customer onboarding review, custom-domain registration/status refresh, and contract-signer configuration exist. Evidence includes `tenant-management.module.ts`, `features/`, `auth/features/`, `customer/features/`, and `public-api/tenant-management.public-api.ts`.

## Missing or incomplete capabilities

### [ ] Manage tenant users, roles, and permissions

- **Priority:** P0
- **Status:** Missing
- **MVP scenario:** An owner invites staff and limits who may configure inventory, pricing, rentals, and contracts.
- **Current evidence:** `prisma/schema/models/v2/tenant-management/tenant-user.prisma` stores `V2TenantUser.role`, status, credentials, and invitations, but `tenant-management/features/` has no staff invitation, listing, role, status, or permission capability; protected controllers generally use only `TenantUserSessionGuard`.
- **Gap:** Registration creates the owner, but the tenant cannot administer additional users or enforce operation-specific authority.
- **Expected behavior:** Owners can invite/list/deactivate/reactivate staff and grant MVP roles or permissions; sensitive commands authorize the actor.
- **Lifecycle rules:** Only authorized active users may administer staff; deactivation invalidates sessions without deleting audit history or ownership references.
- **Owning module:** Tenant Management
- **Dependencies:** Cross-cutting authorization enforcement.
- **Side effects:** Session-version invalidation and auditable membership/role changes.
- **Acceptance criteria:** A second staff user can be invited, activated, authorized selectively, deactivated, and denied immediately afterward.
- **Suggested tests:** E2E owner invitation and role change; forbidden cross-tenant and insufficient-role commands; session invalidation integration test.

### [ ] Deactivate and reactivate tenants safely

- **Priority:** P1
- **Status:** Missing
- **MVP scenario:** Platform operations suspends a tenant without deleting historical rentals and contracts.
- **Current evidence:** `V2Tenant.status` and `deletedAt` exist in `tenants.prisma`; `README.md` defines inactive/deleted resolution rules, but no tenant lifecycle command is registered.
- **Gap:** Persisted lifecycle state has no application capability.
- **Expected behavior:** Explicit suspension/reactivation changes trusted context resolution and blocks new tenant work while retaining historical reads under controlled access.
- **Lifecycle rules:** Deleted tenants cannot reactivate through ordinary administration; suspension must not rewrite snapshots.
- **Owning module:** Tenant Management
- **Dependencies:** Trusted tenant resolver and shared guards.
- **Side effects:** Revoke/invalidate sessions and emit a tenant lifecycle event where consumers need it.
- **Acceptance criteria:** Suspended tenants no longer resolve for storefront or new operations; reactivation restores eligible access.
- **Suggested tests:** Resolver and authenticated E2E tests for active, suspended, reactivated, and soft-deleted tenants.

### [ ] Deactivate/reactivate branches and protect historical references

- **Priority:** P1
- **Status:** Partial
- **MVP scenario:** A location temporarily closes and must disappear from new bookings while remaining on old rentals.
- **Current evidence:** `V2Branch.isActive` and `deletedAt` exist; `update-branch` updates branch data, while public APIs validate branch availability. No explicit archive/reactivate workflow or dependency-impact behavior is evident.
- **Gap:** It is not proven that branch lifecycle changes are deliberate, authorized, and consistently excluded from all new catalog/rental flows.
- **Expected behavior:** Staff can deactivate/reactivate a branch, with clear handling of active offers, assets, future confirmed rentals, and storefront schedules.
- **Lifecycle rules:** Historical reads retain branch identity; deactivation must not silently cancel commitments.
- **Owning module:** Tenant Management
- **Dependencies:** Catalog, Asset Inventory, and Rental Commitment consume branch-state events or validations.
- **Side effects:** Storefront removal and an operational warning/list of affected future rentals.
- **Acceptance criteria:** Every new-operation validator rejects an inactive branch while historical rental detail remains available.
- **Suggested tests:** Cross-module E2E deactivation with offers, assets, and future rentals; reactivation test.

### [ ] Maintain branch schedules after creation

- **Priority:** P1
- **Status:** Partial
- **MVP scenario:** Staff correct opening hours, closures, and pickup/return slots.
- **Current evidence:** Branch create/update repositories persist schedules transactionally and storefront schedule queries exist; no schedule-specific deletion/exception lifecycle is exposed beyond replacing branch input.
- **Gap:** Correction semantics, removal, date exceptions, overlap validation, and effects on existing future rentals are not demonstrated by tests.
- **Expected behavior:** Authorized staff can replace schedules safely, reject invalid overlaps, and see commitments made under superseded schedules.
- **Lifecycle rules:** Schedule changes govern new choices; they do not invalidate confirmed facts automatically.
- **Owning module:** Tenant Management
- **Dependencies:** Rental Commitment schedule validation.
- **Side effects:** Storefront slot availability changes and warnings for affected rentals.
- **Acceptance criteria:** Recurring and date-specific windows can be added, corrected, and removed without corrupting existing rentals.
- **Suggested tests:** Integration tests for overlap/invalid windows and E2E schedule correction with an existing confirmed rental.

### [ ] Correct and deactivate rental customers

- **Priority:** P1
- **Status:** Missing
- **MVP scenario:** Staff fixes customer identity/contact data or prevents a customer from making new requests.
- **Current evidence:** Customer list/detail and onboarding approve/reject exist; `V2RentalCustomer.isActive`, `deletedAt`, and profile fields exist, but no staff update/deactivate/reactivate capability exists.
- **Gap:** Customer records cannot be maintained after onboarding without destructive database changes.
- **Expected behavior:** Authorized staff can correct current profile/contact facts and deactivate/reactivate customers while confirmed rentals preserve accepted customer snapshots.
- **Lifecycle rules:** Deactivated customers cannot create or be assigned to new rentals; historical records remain readable.
- **Owning module:** Tenant Management
- **Dependencies:** Rental Commitment customer snapshots and validation.
- **Side effects:** Invalidate customer sessions and emit customer-state changes where needed.
- **Acceptance criteria:** Corrections affect future operations only; deactivation blocks login/new rentals but not historical retrieval.
- **Suggested tests:** E2E correction/deactivation/reactivation, session invalidation, tenant isolation, and snapshot preservation.
