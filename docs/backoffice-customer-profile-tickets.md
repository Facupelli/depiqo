# Backoffice Customer Profile implementation tickets

These are independent, agent-ready handoffs for the approved Backoffice Customer Profile specification. The specification is authoritative; no ticket may silently weaken its security or privacy rules. Each numbered section can be supplied to a fresh implementation session without the original conversation or the other tickets. Implement only the assigned ticket and its prerequisites, not the remaining feature.

## Breakdown and prefactoring

| ID | Demonstrable result | Blocked by |
| --- | --- | --- |
| 01 | Newly provisioned default members cannot review onboarding or receive the new sensitive/document grants; administrators retain them. | None |
| 02 | Customers appear and can be found by the same backend-resolved person/company identity. | None |
| 03 | Customer submission rejects another customer's document reference while accepting valid own references. | None |
| 04 | Staff review and Storefront self-profile contracts can diverge without changing either current response. | None |
| 05 | A `CustomersRead` staff member can open a useful, safe Customer Profile from the list. | 02, 03 |
| 06 | Reviewers deliberately open identity documents without browser-visible storage keys or eager preview loading. | 03, 04 |
| 07 | An authorized staff member deliberately loads and dismisses sensitive profile details. | 01, 05 |
| 08 | Appropriately authorized general-profile staff deliberately open the document through the already secured route. | 01, 05, 06 |

Ticket 04 is the one intentional prefactoring exception. The current staff-review and Storefront self-profile contracts share a response schema. Separating their definitions without changing responses is needed before removing the storage path from staff review; folding this compatibility change into the substantial document-security cutover would make that slice too large and easy to break. It leaves the application working. Ticket 03 independently fixes a live write-boundary vulnerability and provides the customer-owned reference rule reused by profile reads and document resolution. Neither is a generic cleanup ticket. No wide expand/migrate/contract refactor is required.

## 01 - Newly provisioned members do not receive privileged customer access

### Parent

This ticket belongs to the **Backoffice Customer Profile** specification (`docs/backoffice-customer-profile.md`). That approved decision record remains authoritative where this ticket omits detail.

### Blocked by

None.

### Goal

A newly provisioned tenant's default member role lacks onboarding-management, sensitive-profile and identity-document permissions while its Administrator retains all registered permissions.

### Context

Tenant Management registers permissions centrally and provisions a default member role. Today the default-member baseline includes every non-Team permission, including `CustomersOnboardingManage`. The new permissions are `CustomersSensitiveRead` and `CustomersIdentityDocumentRead`. Existing non-admin roles are editable and cannot reliably be identified as originally provisioned defaults.

### What to build

Register the two new customer permissions in the shared contract and Tenant Management permission catalog. Adjust the default-member baseline to omit all three privileged customer permissions, while preserving existing Administrator semantics and unrelated grants. Do **not** migrate or rewrite existing role rows. Keep the new permissions available for intentional assignment through the existing role-management workflow. Record the explicit current-tenant role-grant review needed before feature rollout; it is an operational configuration step, not an inferred migration.

### Required behavior

- `CustomersRead` remains the ordinary customer authority. `CustomersOnboardingManage` remains separate, and removing it from *new* default member roles does not remove it from existing granted roles.
- New default members receive neither `CustomersOnboardingManage`, `CustomersSensitiveRead` nor `CustomersIdentityDocumentRead`.
- Administrators receive both new registered permissions through the existing dynamic all-permissions rule.
- Existing custom and historically provisioned roles are not modified by deployment. Other permissions and existing onboarding-review behavior for roles that still hold the grant remain intact.
- The permission catalog communicates distinct customer-read, onboarding-review, sensitive-read and document-read capabilities. Registering a permission does not grant access to a future operation by itself.

### Acceptance criteria

- Registering a new tenant yields a member who cannot access the existing onboarding dossier but retains ordinary `CustomersRead` access; the tenant Administrator can access it.
- The newly provisioned member's effective permissions omit all three privileged customer permissions, while the Administrator's include them.
- Existing persisted role grants are unchanged; an existing explicitly granted reviewer continues to have review access until an administrator adjusts that tenant's grants.

### Testing and verification

Use the agreed **backend HTTP E2E** seam: registration, authenticated effective permissions and authorization against the existing review read. Extend existing authenticated-tenant/authorization scenarios rather than adding a separate test project. If needed, verify persisted role grants via the established real-database integration seam. No new Backoffice tests or unit-test-only architecture. During rollout, explicitly review and adjust grants for the current tenant and repeat for each additional existing tenant before enabling the experience; do not claim that the code change retroactively revoked access.

### Out of scope for this ticket

Do not implement the new profile reads, document resolver or Backoffice UI. Do not infer historical default roles or automatically rewrite them.

## 02 - Show and find customers by their resolved identity

### Parent

This ticket belongs to the **Backoffice Customer Profile** specification (`docs/backoffice-customer-profile.md`). That approved decision record remains authoritative where this ticket omits detail.

### Blocked by

None.

### Goal

Staff viewing the existing Customers list see the correct person or company identity and can search using the same identity they see.

### Context

The list currently displays and searches account first/last name, even for companies. Tenant Management's current profile-facts precedent gives submitted `fullName` precedence for a person and submitted `businessName` precedence over account `companyName` for a company. Professional `profile.company` is not company-account identity. The list also serves the pending-review workflow and rental customer selection through existing backend reads.

### What to build

Define one Tenant Management-owned interpretation of primary person, company and contact-person identity. Apply it to the existing tenant-scoped customer-list response and its search, with Backoffice displaying the returned meaning rather than recreating a fallback chain. Keep account and submitted information distinguishable where required. Preserve existing list filters, pagination, ordering and consumers by making compatible contract changes or adapting affected callers. Do not add a general Customer Profile page in this slice.

### Required behavior

- Submitted `fullName` takes precedence over account first/last name as person identity. For company identity, submitted `businessName` takes precedence over account `companyName`; professional `profile.company` is not a company-account name.
- An individual is primarily shown by the resolved person identity. A company with a usable name is primarily shown by the company while its person remains identifiable as contact. A company without a usable company name does **not** turn its contact person's name into a legal-company label; show the company name as unavailable and identify the contact separately.
- Search still finds account person names and also finds submitted person names and account/submitted company names where applicable. Displayed identity and search semantics agree.
- List search and pagination remain tenant-scoped; soft-deleted customers remain excluded. Onboarding-status and active filters continue to work. The backend list remains usable by its existing review/selector consumers, without granting access to the general Backoffice page.
- Do not broaden the published cross-module customer-profile facts into a page contract or refactor unrelated rental reads for this list change.

### Acceptance criteria

- Searching a displayed submitted individual name finds that customer, including when account first/last name differs.
- Searching a displayed company name finds the company, whether the value came from submitted `businessName` or account `companyName`; searching the contact's account person name still finds it.
- A company lacking both company-name sources has an unavailable company identity and an identifiable contact person rather than a false business name.
- Search for one tenant cannot find another tenant's customer, and deleted customers remain absent. Existing list filtering/pagination and pending-review selection still return usable results.

### Testing and verification

Use backend **HTTP E2E**, or real-database **integration** where it more directly proves search/pagination semantics. Cover identity precedence, missing profile/company names, tenant isolation and existing list filters through observable results. Manually verify desktop rows, compact cards and search behavior in the running Backoffice. Do not add Backoffice automated tests.

### Out of scope for this ticket

Do not add the general detail route, sensitive reads, document handling, onboarding mutations or rental-history information.

## 03 - Reject another customer's identity-document reference on submission

### Parent

This ticket belongs to the **Backoffice Customer Profile** specification (`docs/backoffice-customer-profile.md`). That approved decision record remains authoritative where this ticket omits detail.

### Blocked by

None.

### Goal

A customer can submit or resubmit a profile with their own uploaded identity-document reference, but cannot attach a reference in another customer's namespace.

### Context

The Storefront uploads documents into a customer-specific Customers R2 key namespace. The current profile-submission request accepts an arbitrary nonempty path and stores it. Future Backoffice access will trust Tenant Management to resolve an authorized object, so this write boundary needs ownership validation before new references are accepted. The Storefront may reuse the existing customer's key on resubmission.

### What to build

Validate the submitted identity-document reference against the **authenticated customer's** ID and the established customer document-key namespace in Tenant Management. Keep the rule reusable by the future ordinary on-file indicator and descriptor resolver. Map invalid input to an appropriate existing-style client error rather than silently persisting it. Preserve valid current upload and resubmission behavior. Do not ask Backoffice to judge key ownership and do not fetch document bytes during submission.

### Required behavior

- Client-supplied customer IDs or key prefixes are not authority. The backend compares the supplied reference against the customer identity from the authenticated, tenant-scoped Storefront session.
- Another customer's key, a malformed reference, or a reference outside the expected customer identity-document namespace is rejected before the profile is changed.
- A valid own-customer key, including a previously stored own key used on resubmission, remains acceptable under the existing onboarding-state rules.
- Existing stored invalid references are not silently rewritten or made into a general profile failure; descriptor-time revalidation belongs to Ticket 06.
- This is security validation on the existing customer submission workflow, not a Backoffice upload or edit feature.

### Acceptance criteria

- Submitting a valid own-document reference follows the existing submission behavior.
- Submitting another customer's or malformed reference fails and does not persist the new profile/document reference or advance onboarding state.
- A rejected customer can resubmit using a valid existing own-document reference according to the current lifecycle rules.
- Another tenant's authenticated customer cannot attach the target customer's document by knowing its object key.

### Testing and verification

Use backend **HTTP E2E** with authenticated customer sessions and a real disposable database; assert the submission response and persisted customer state on success/failure. An application **integration** scenario is acceptable for transactional persistence if required, but no internal validator-only tests are required. No Backoffice tests. Manually sanity-check the existing Storefront upload/submission flow when this change lands.

### Out of scope for this ticket

Do not build R2 retrieval, a document descriptor, Backoffice document UI or a general document-management service. Do not automatically repair historical invalid references.

## 04 - Separate staff review and Storefront self-profile contracts without changing behavior

### Parent

This ticket belongs to the **Backoffice Customer Profile** specification (`docs/backoffice-customer-profile.md`). That approved decision record remains authoritative where this ticket omits detail.

### Blocked by

None.

### Goal

Staff review and Storefront self-profile reads continue to work exactly as before but no longer depend on one shared response-schema definition, allowing a later safe staff-only contract change.

### Context

The current Storefront current-profile contract aliases the staff onboarding-detail schema. Staff review must later stop exposing `identityDocumentPath`; Storefront uses its current self-profile representation to handle onboarding and resubmission. Changing the aliased schema during document cutover would accidentally change Storefront behavior.

### What to build

Give the two existing response contracts independent schema ownership, preserving their present JSON shapes, status/error behavior, endpoint access controls and consumers. Keep this prefactoring strictly compatibility-preserving. Ticket 06 removes the path from the **staff** contract once the new document access flow is ready; do not do so here while the current review UI still needs it. This slice must land green and independently deployable.

### Required behavior

- Existing staff review and Storefront self-profile requests produce the same responses and authorization outcomes immediately before and after this ticket.
- Storefront profile submission/resubmission can still use its currently returned document path where needed.
- Staff and Storefront schemas are independent so a future staff-only field removal cannot alter the Storefront response by aliasing.
- No newly exposed path or new access route is introduced.

### Acceptance criteria

- The same submitted customer has unchanged staff-review and Storefront self-profile HTTP representations immediately after this ticket; an account without a submitted profile retains the existing review/self-profile error behavior.
- Existing review document viewing and Storefront resubmission still work until Ticket 06 replaces the staff document flow.
- A later change to the staff response schema is not automatically reflected in the Storefront self-profile contract.

### Testing and verification

Use the backend **HTTP E2E** seam for the two authenticated reads and their response compatibility; verify the Storefront consumer boundary still accepts its response. Manually sanity-check review and Storefront resubmission. No Backoffice tests or new test-only contract infrastructure.

### Out of scope for this ticket

Do not yet remove the staff storage path, change document routes, alter profile data, add the general profile or change Storefront behavior.

## 05 - Open a safe general Customer Profile from the Customers list

### Parent

This ticket belongs to the **Backoffice Customer Profile** specification (`docs/backoffice-customer-profile.md`). That approved decision record remains authoritative where this ticket omits detail.

### Blocked by

02 - Show and find customers by their resolved identity; 03 - Reject another customer's identity-document reference on submission.

### Goal

A staff member with `CustomersRead` can select a customer from the general Customers list and understand their current account and non-sensitive submitted information, even when no profile exists.

### Context

The list now exposes the backend-resolved identity, and Tenant Management has a customer-owned document-reference rule. The existing rental summary is intentionally narrow; the onboarding dossier requires review authority, fails without a submitted profile and contains sensitive fields. The Storefront self-profile read serves the customer. None is a suitable general page payload. The Backoffice general Customers route currently allows onboarding-only actors to enter a list that would not give them general-profile access.

### What to build

Add the dedicated Tenant Management ordinary Customer Profile operation and shared response contract, guarded by `CustomersRead` and scoped by authenticated tenant. Build the read-only Backoffice detail route, route-critical ordinary loading, accessible list row/card links, and permission-aware Customers navigation. General Customers list/profile require `CustomersRead`; onboarding-only staff reach the separate pending-profiles workflow. Preserve the underlying backend list's other current consumers. Present a quiet, responsive main-information area and narrower account/status area using existing Backoffice conventions, with clear loading, not-found, forbidden and no-profile states.

### Required behavior

- Tenant Management resolves person/company/contact identity using Ticket 02's rule and resolved phone using submitted profile phone before account phone; the frontend chooses no field precedence. For a company without a usable company name, show an unavailable-company-name state and separately identified contact.
- The ordinary response includes routing ID; resolved identity, contact phone and account email; separate active and onboarding states; email-verification state; useful created/submitted/last-login times; submitted-profile presence; non-sensitive occupation/employer, acquisition and coarse city/region/country; review time and tenant-scoped reviewer label; safe `PASSWORD`/`GOOGLE` method labels where applicable; and a document-on-file indicator. Optional avatar presentation must not drive exposure of extra authentication internals.
- Reviewer label preference is name, then email, then unavailable if unresolved. A customer password hash may indicate `PASSWORD`, and linked Google identity may indicate `GOOGLE`; raw hash, provider account ID/profile JSON and session data never cross this response.
- Document on file means a **valid customer-owned stored reference**, without an R2 existence lookup. Invalid legacy references mean no on-file indication but do not break the page. This ticket does not fetch the file or advertise a nonfunctional open action.
- No birth date, exact street address, document number, tax ID, reference contacts, rejection reason, `identityDocumentPath` or raw profile snapshot enters this ordinary response or its route-loader cache.
- An account without a submitted profile succeeds and displays an intentional not-submitted state. `NOT_STARTED`, `PENDING`, `APPROVED`, `REJECTED` remain distinct, with rejected submitted information identified as submitted rather than approved. `isActive` remains independent. Inactive customers are readable; soft-deleted, nonexistent and foreign-tenant customers are not found.
- Onboarding-review authority alone or Rentals permission alone does not grant general-list or general-profile access. Onboarding-only navigation still reaches pending profiles. Historical retained customer reads and current review actions remain separate.

### Acceptance criteria

- A `CustomersRead` user selects an individual or company from the list and sees the resolved current identity, contact and non-sensitive sections; an onboarding-only user cannot open the general list/profile but can still enter pending review.
- A `NOT_STARTED` account without a profile renders valid account information and an explicit profile-not-submitted state rather than a 404; pending, approved and rejected states remain recognizably different.
- An inactive customer's profile loads, while a deleted/foreign/nonexistent customer is not found. The response and initial browser payload contain none of the sensitive fields or storage key.
- A reviewer with an available name/email receives the correct tenant-scoped label; password/Google methods are reported as bounded labels without authentication internals.
- A valid own-document reference is reported on file even if R2 no longer has the object; an invalid stored reference is not reported on file and does not prevent ordinary account reading.

### Testing and verification

Use backend **HTTP E2E** for tenant scoping, permission denial, state/profile absence, forbidden field exposure, reviewer fallback, bounded methods and on-file semantics; use backend **integration** only where real persistence semantics are better exercised there. Manually verify direct URL and list navigation, onboarding-only sidebar behavior, responsive sections and all lifecycle/empty states in the running Backoffice. Do not add Backoffice automated tests. Run affected workspace validation and the existing backend HTTP-authorization audit.

### Out of scope for this ticket

Do not fetch sensitive details or document bytes; their explicit interactions are Tickets 07 and 08. Do not add rental history, editing or onboarding actions to this profile, or repurpose the onboarding dossier as the ordinary read.

## 06 - Let onboarding reviewers deliberately open authorized documents without storage keys

### Parent

This ticket belongs to the **Backoffice Customer Profile** specification (`docs/backoffice-customer-profile.md`). That approved decision record remains authoritative where this ticket omits detail.

### Blocked by

03 - Reject another customer's identity-document reference on submission; 04 - Separate staff review and Storefront self-profile contracts without changing behavior.

### Goal

An onboarding reviewer explicitly opens an identity document for a non-deleted customer with a submitted profile. No browser-visible storage path, client-chosen object key or eager review-page document request remains.

### Context

The existing review page immediately embeds a document using a path from its browser-facing response. Its Backoffice route accepts a client-supplied path, checks it against the review response, then streams bytes from the private Customers R2 binding. The backend must instead authorize and resolve the key for a customer-ID-only request. Staff and Storefront response contracts have already been separated so removing the staff field does not change self-profile behavior.

### What to build

Introduce a narrow Tenant Management document-descriptor read for authenticated staff, available only to a Backoffice-held internal credential **in addition to** the staff session and permission check. For this slice its working authorization branch is `CustomersOnboardingManage`; structure the decision so Ticket 08 can add the separate general-profile branch without accepting a browser-selected branch. Revalidate the persisted customer's document key with Ticket 03's ownership rule. Replace the old Backoffice path-accepting document route with a customer-ID-only server route that requests the descriptor directly server-to-server, then fetches and streams that exact object through the existing private Customers R2 binding. Configure the Backoffice server-only internal credential; do not expose it through public environment variables or the normal browser backend proxy. Remove the storage path from staff-review browser responses and switch the review page to an explicit open action. Keep Storefront self-profile behavior intact.

### Required behavior

- Descriptor resolution needs the authenticated **tenant-user session**, an internal credential held by Backoffice, and `CustomersOnboardingManage`. It uses the session's tenant, excludes deleted/foreign customers and requires a submitted profile. It permits pending, approved and rejected submissions consistent with the existing dossier read. Session-only, token-only, unrelated-permission and cross-tenant requests cannot obtain the descriptor. It must not be marked public or returned through the browser-facing proxy.
- The browser requests only a customer ID. The descriptor/key never enters frontend API responses, route loaders, Query cache, logs or browser URLs. Backoffice must obtain the key from NestJS on each open, not trust a browser path. Remove the obsolete path-taking route rather than leaving an authorization bypass.
- A forged or malformed **stored** legacy key fails closed at resolution. The review page itself remains usable when the document reference is invalid or its R2 object is missing.
- R2 bytes flow R2 -> Backoffice -> browser, never through NestJS. Ordinary/review page load does not request document bytes. The reviewer clicks to open, with a clear unavailable result when R2 lacks the object.
- Only validated JPEG, PNG, WebP and PDF may render inline. Unsupported or mismatched content is refused or forced to download. Set safe server-derived content type, disposition and filename; use `private, no-store` and `nosniff`. None of these values is chosen by browser input.
- Existing staff review authority and pending-only approve/reject mutations remain unchanged. The staff review response no longer exposes `identityDocumentPath`; Storefront self-profile still behaves as before.

### Acceptance criteria

- A reviewer can open the document of a pending, approved or rejected non-deleted customer with a submitted profile by customer ID, but opening the dossier alone does not retrieve bytes.
- A browser request or normal backend proxy request cannot retrieve the descriptor, even with an otherwise authorized user session; internal credential without that session also fails. A foreign-tenant customer ID or malformed/cross-customer stored key yields no usable key.
- Neither the staff-review response nor the browser document URL contains an object path. The old objectPath-based staff route no longer works.
- A missing R2 object has a clear unavailable outcome; valid supported content has safe inline headers, and mismatched/unsupported content is not unsafely rendered. NestJS does not carry file bytes.
- Storefront self-profile and resubmission behavior remain unchanged.

### Testing and verification

Use backend **HTTP E2E** for staff session plus internal credential, reviewer permission, tenant isolation, lifecycle reach, missing/invalid profile or stored reference, non-public descriptor and staff-review response separation; include Storefront compatibility where affected. Backend-only tests **cannot** verify the Backoffice Worker or R2 response. Manually verify the running Backoffice server route, proxy denial, review-page no-eager-load behavior, missing objects, inline/unsupported files and response headers with real browser/network inspection. Do not add Backoffice automated tests.

### Out of scope for this ticket

General-profile document authority and its UI affordance belong to Ticket 08. Do not proxy bytes through NestJS, build generic file-management infrastructure or add a sensitive-read audit subsystem.

## 07 - Deliberately load and dismiss sensitive Customer Profile information

### Parent

This ticket belongs to the **Backoffice Customer Profile** specification (`docs/backoffice-customer-profile.md`). That approved decision record remains authoritative where this ticket omits detail.

### Blocked by

01 - Newly provisioned members do not receive privileged customer access; 05 - Open a safe general Customer Profile from the Customers list.

### Goal

A staff member holding both customer-read and sensitive-read permissions can intentionally view sensitive submitted information and then remove it from browser state. Ordinary profile viewing never fetches it.

### Context

The ordinary Customer Profile deliberately omits birth date, exact street address, document number, tax ID, reference contacts and rejection reason. The two necessary permissions are registered, and the general profile page exists. Reviewer authority is distinct and does not substitute for either permission on this operation.

### What to build

Add a separate tenant-scoped Tenant Management sensitive-profile read and shared response contract guarded by **both** `CustomersRead` and `CustomersSensitiveRead`. Integrate a permission-aware, explicit “load sensitive information” interaction into the general profile. The one deliberate fetch returns the agreed sensitive dataset; local privacy controls mask the number and collapse third-party references until independently revealed. Keep the response out of the ordinary route loader, SSR-prefetch, persisted storage and reusable cache when disclosure is closed. Cancel/discard in-flight responses on close, customer change and navigation away so old customer data cannot be displayed in a new context.

### Required behavior

- Backend authorization and tenant filtering determine access; UI capability checks are presentation only. Either missing permission, a foreign tenant, or a soft-deleted customer cannot return sensitive data.
- The dataset includes birth date, exact residential street address, document number, tax ID, both reference contacts (names, phones, relationships) and free-form rejection reason when applicable. A customer without a submitted profile is still a valid ordinary customer; the sensitive read must not turn ordinary page loading into an error.
- The complete sensitive dataset is requested by one explicit action, **not** by the ordinary page render or a route preload. After loading, the document number is masked by default with an explicit full reveal. Reference contacts stay collapsed with a clear third-party-information explanation until explicitly expanded. These additional controls are not separate authorizations.
- Closing disclosure, changing customer or leaving the route discards loaded sensitive data and prevents an outstanding response from repopulating it. Reopening requires another deliberate request. Never show the previous customer's response while loading the next.
- No `identityDocumentPath`, password hash, raw provider JSON or raw snapshot is added to this response. Reviewer-only users do not gain sensitive general-profile access through `CustomersOnboardingManage`.

### Acceptance criteria

- An ordinary `CustomersRead` actor can view the profile but cannot obtain the sensitive response, including by calling its URL directly. A `CustomersSensitiveRead` actor without `CustomersRead` is also denied; an actor with both can deliberately load it.
- Normal route loading returns none of the sensitive fields. After the explicit load, the document number starts masked and references are not expanded; deliberate reveals display the authorized data.
- Dismissing, navigating away or changing customer removes the fetched values from the page's browser state/cache. Reopening sends a new request; a late response for customer A cannot be shown on customer B's page.
- A rejected customer's free-form reason appears only after authorized sensitive loading. A foreign/deleted customer cannot be read through the sensitive operation.

### Testing and verification

Use backend **HTTP E2E** for all permission combinations, tenant/deletion boundaries and sensitive response exposure. Manually verify initial network silence, masking, reference expansion, dismissal, cache disposal, navigation and late-request handling in the running Backoffice. Backend-only tests do not prove browser-state disposal; do not add Backoffice automated tests.

### Out of scope for this ticket

Do not change onboarding review's privileged dossier, add document-byte access, introduce field-level backend permissions or build an audit subsystem.

## 08 - Deliberately open a Customer Profile identity document with document permission

### Parent

This ticket belongs to the **Backoffice Customer Profile** specification (`docs/backoffice-customer-profile.md`). That approved decision record remains authoritative where this ticket omits detail.

### Blocked by

01 - Newly provisioned members do not receive privileged customer access; 05 - Open a safe general Customer Profile from the Customers list; 06 - Let onboarding reviewers deliberately open authorized documents without storage keys.

### Goal

General-profile staff with both `CustomersRead` and `CustomersIdentityDocumentRead` can explicitly open the customer’s document using the secured customer-ID-only Backoffice route, without acquiring onboarding-review authority.

### Context

The ordinary profile reports only that a valid customer-owned reference is on file; it does not test R2 availability. The review workflow already uses the secure server-only descriptor and Backoffice/R2 streaming route from Ticket 06. The new permission was registered in Ticket 01 and is not a new default-member grant. General staff must not gain document access by virtue of `CustomersRead` alone.

### What to build

Extend Tenant Management's existing descriptor authorization to accept the **alternative** general-profile branch, `CustomersRead` **and** `CustomersIdentityDocumentRead`, while preserving `CustomersOnboardingManage` for reviewers. Backend code decides which branch permits a request; no browser flag or URL variant can choose weaker authorization. Provide a permission-aware, explicit open action on the general Customer Profile using the same customer-ID-only Backoffice server route, stream handling and file-presentation protections established by Ticket 06. Preserve existing review behavior. Complete the explicit current-tenant role-grant review as a rollout gate; do not infer or rewrite historical roles.

### Required behavior

- A general-profile user needs **both** permissions to obtain a descriptor or open the document. `CustomersRead` alone, document permission alone, Rentals authority alone or mere knowledge of an ID is insufficient. A reviewer with `CustomersOnboardingManage` still has the separate permitted path without being granted general-profile access.
- Require internal Backoffice credential plus authenticated staff session for **either** authorization branch. Continue trusted tenant scoping, soft-delete exclusion, submitted-profile requirement and customer-owned-key revalidation. General profile load never triggers a descriptor or R2 fetch.
- Use only the existing secured customer-ID-only Backoffice document route. The browser never sends or receives a key, and NestJS never proxies bytes. A missing R2 object yields an unavailable result without changing the ordinary profile's on-file indication.
- Document opening is deliberate and limited to supported safe file presentation. Invalid legacy keys and unsupported/mismatched content fail closed or use safe attachment behavior as already established. Do not reintroduce the old path-based route.
- Existing editable tenant roles are not automatically modified. For the current tenant, inspect and intentionally adjust persisted reviewer/sensitive/document grants before release; repeat per existing tenant at future rollout. Administrators retain existing all-permission behavior.

### Acceptance criteria

- A staff member with `CustomersRead` and `CustomersIdentityDocumentRead` can explicitly open a valid on-file document from the general profile; the initial profile request fetches neither descriptor nor file bytes.
- Each partial-permission actor is denied direct descriptor/document access. A reviewer-only actor can still explicitly open from onboarding review but cannot enter the general profile. Cross-tenant and soft-deleted IDs do not expose a document.
- The browser's request and responses contain no R2 object key; the internal endpoint rejects session-only and credential-only calls. A missing R2 object is reported as unavailable while the ordinary profile remains readable.
- The existing reviewer flow still works for submitted pending, approved and rejected profiles, and unsafe content is not rendered inline.
- Current-tenant privileged role grants have been explicitly reviewed and adjusted for rollout, without an automatic historical-role migration or a claim that deployment revoked old grants elsewhere.

### Testing and verification

Use backend **HTTP E2E** for the OR-of-authorizations rule, both required general permissions, reviewer compatibility, internal credential plus staff session, tenant isolation, lifecycle and key validation. Manually verify the general-profile click, network silence on page entry, missing-R2 and safe-file behavior, and the existing review route through the running Backoffice/Worker. These Worker/browser checks are not automatically covered by backend tests; add no Backoffice tests. Include affected workspace validation and the backend HTTP-authorization audit.

### Out of scope for this ticket

Do not change the sensitive-profile permission, grant document access to default members, create a generalized file service, edit customer data or add a generalized access-audit subsystem.

## Dependency graph

```text
01 (ready) ───────────────────────────────┐
  ├── 07 (also needs 05)                   │
  └── 08 (also needs 05 and 06)            │
02 (ready) ── 05 ── 07                     │
                  └── 08                   │
03 (ready) ─┬─ 05                          │
            └─ 06 ── 08                    │
04 (ready) ─── 06                          │
```

Initial ready frontier: **01, 02, 03 and 04** may proceed independently. After **02 and 03**, Ticket **05** is ready. After **03 and 04**, Ticket **06** is ready independently of 05. After **01 and 05**, Ticket **07** may proceed concurrently with Ticket 06. Ticket **08** waits only for **01, 05 and 06**; it need not wait for Ticket 07. Rollout grant review is an explicit release condition, not an invented permission migration or separate testing ticket.
