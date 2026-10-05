# Backoffice Customer Profile Specification

## Problem Statement

Backoffice staff need a general-purpose view of a rental customer’s **current account and submitted profile**. No existing customer read has that responsibility:

- The Customers list contains limited information for browsing.
- The customer summary is intentionally small and supports rental workflows.
- The onboarding dossier is a privileged review workflow, not ordinary customer browsing.
- The Storefront self-profile read serves the authenticated customer.
- Published customer facts are narrow capabilities for other backend modules, not a Backoffice page contract.

Customer information has different sensitivity levels. Routine identity, contact and account-state information should be available to staff with customer-read authority. Birth dates, exact residential addresses, identification and fiscal numbers, third-party reference contacts, rejection reasons and identity documents require more deliberate access. Hiding already-delivered fields in React would not protect them.

Tenant Management remains authoritative for current customer interpretation, tenant scoping and authorization. Backoffice already has a private Customers R2 binding suitable for serving file bytes. The feature must preserve those responsibilities rather than exposing persistence models or routing file bytes through NestJS.

## Solution

Create a read-only Customer Profile at `/dashboard/customers/:customerId`. The `CustomersRead`-gated Customers list at `/dashboard/customers` is its primary entry point. List rows and compact cards link to the profile; their displayed identity and search behavior agree with the backend-owned identity rule.

The page presents a resolved customer identity, email, resolved contact phone, active state, onboarding state and email-verification state prominently. Account activity, safe authentication-method labels, submitted professional and acquisition information, coarse location, and review metadata appear in a restrained, scannable layout. On desktop, primary information occupies the larger area and account/status context is secondary.

An individual is primarily identified by their resolved person name. A company is primarily identified by its resolved company name, with the associated person identified as its contact. If no usable company name exists, the page shows that the company name is unavailable and identifies the person as a contact, **not** as the company’s legal name. Tenant Management resolves these values; Backoffice does not implement field-precedence rules.

An account without a submitted profile loads normally. `NOT_STARTED` has a meaningful “profile not submitted” presentation rather than empty or failed sections. `PENDING`, `APPROVED` and `REJECTED` remain distinct onboarding states. Rejected submitted information is labelled with appropriate provenance rather than implied to be approved. `isActive` is shown separately from onboarding state. Inactive customers remain readable; soft-deleted customers are not available through this general profile.

Sensitive information is absent from the ordinary page response. Staff with both `CustomersRead` and `CustomersSensitiveRead` deliberately request it through a separate operation. That request loads the agreed sensitive dataset together. The document number remains masked by default after loading, and reference contacts remain collapsed until deliberately revealed. Those controls improve presentation privacy; they are not additional backend authorization boundaries. Loaded sensitive browser data is cleared when disclosure closes, the customer changes or the route is left.

The ordinary profile reports whether a valid customer-owned identity-document reference is **on file**. It does not load the document or assert that R2 still contains the object. Authorized staff deliberately open it through a separate customer-ID-based Backoffice route. If the object is missing, the open action reports that it is unavailable without breaking the profile.

The onboarding-review routes remain separate. Onboarding-only staff use the pending-profiles workflow rather than gaining general-profile access. The review dossier can still load its sensitive review fields under `CustomersOnboardingManage`, but its document bytes also require an explicit open action. Its browser response and document request stop exposing or accepting the storage path. Storefront self-profile behavior remains independent.

## User Stories

1. As staff with `CustomersRead`, I can open a customer from the general Customers list and view a dedicated current Customer Profile.
2. As staff without `CustomersRead`, I cannot use the general Customers list or general profile merely because I have Rentals or onboarding permissions.
3. As onboarding-only staff, I can reach the separate pending-profiles workflow without being led to general customer rows that I cannot open.
4. As staff, I see an individual primarily identified by a backend-resolved person name.
5. As staff, I see a company primarily identified by its backend-resolved company name and can identify its contact person.
6. As staff viewing a company without a usable company name, I see an unavailable-company-name state and a contact person, not a person mislabelled as the business.
7. As staff, I see a resolved contact name and phone without having to decide between account and submitted-profile fields myself.
8. As staff, I see submitted person name and phone take precedence when a profile exists, with account identity and phone used when it does not.
9. As staff viewing a rejected customer, I can distinguish submitted information from approved information.
10. As staff, I find account email and contact phone readily.
11. As staff, I see account active state and onboarding state as independent concepts.
12. As staff, I can open a `NOT_STARTED` customer and understand that a profile has not been submitted.
13. As staff, I see `PENDING` represented as awaiting review, with a submission time when available.
14. As staff, I see `APPROVED` clearly, with review metadata as secondary context.
15. As staff, I see `REJECTED` as an onboarding state, not an application error; its free-form reason is not in the ordinary response.
16. As staff, I can open an existing customer with no submitted profile without receiving a profile-not-found failure.
17. As authorized staff, I can still read an inactive customer.
18. As staff, I cannot browse a soft-deleted customer through the normal Customers list or profile; historical retained-customer behavior remains separate.
19. As staff, I can tell whether the customer’s email is verified.
20. As staff, I can see useful account dates, including last login when available.
21. As staff, I see useful professional and acquisition information when submitted, without fiscal identifiers appearing in the ordinary response.
22. As staff, I see city, region and country without automatically receiving the exact residential street address.
23. As staff, I see a meaningful reviewer label when available: staff name, then email if unnamed, then an unavailable label if that staff member cannot be resolved.
24. As staff, I see bounded login methods such as `PASSWORD` and `GOOGLE`, not authentication records, hashes or provider account IDs.
25. As ordinary customer-read staff, I do not receive the sensitive dataset on initial page load.
26. As staff with both required permissions, I can explicitly load sensitive information; a staff member missing either permission cannot.
27. As authorized staff, I can then see the birth date, exact street address and tax ID when present.
28. As authorized staff, I initially see a masked document number after sensitive data loads and can explicitly reveal its full value.
29. As authorized staff, I see that reference contacts contain third-party information and explicitly expand them to view name, phone and relationship.
30. As authorized staff, I can see a rejection reason through the sensitive operation when applicable.
31. As staff, I do not mistake masking or collapsing fetched values for a separate authorization check.
32. As staff, closing sensitive disclosure, changing customer or leaving the route removes the loaded sensitive data from the page’s browser state/cache; reopening requires another deliberate request.
33. As staff, I can see that an identity document is on file without downloading it during ordinary profile loading.
34. As appropriately authorized staff, I can explicitly open the document from the general profile.
35. As an onboarding reviewer, I can explicitly open the document from the separate review dossier; opening the dossier alone does not retrieve document bytes.
36. As staff, I understand that “on file” means a valid stored reference, not confirmed R2 availability.
37. As staff, I receive a clear unavailable outcome if a referenced R2 object is missing when I open it; the ordinary profile remains usable.
38. As staff, an invalid stored document reference prevents document access without preventing the ordinary profile from loading.
39. As a customer submitting onboarding information, I cannot attach another customer’s document key as my identity document.
40. As staff, descriptor resolution rechecks customer ownership even for a reference already stored in an older profile.
41. As a tenant user, knowing a customer ID does not grant access to another tenant’s profile, sensitive data or document.
42. As authorized staff, I may view validated JPEG, PNG, WebP or PDF documents inline.
43. As staff, an unsupported or mismatched document is refused or served as an attachment rather than rendered inline under an unsafe type.
44. As staff, my browser never supplies, chooses or receives the R2 object key for a Backoffice document view.
45. As an onboarding reviewer, I retain review and document authority for non-deleted customers with submitted profiles, including approved and rejected submissions, without acquiring general-profile access implicitly.
46. As a Storefront customer, I retain the existing self-profile behavior when the staff review contract is separated.
47. As staff, searching the Customers list by a person or displayed company identity finds the corresponding customer, including a submitted full name when that is the displayed identity.
48. As staff, I do not see raw storage paths, provider profile JSON, session internals or reviewer IDs presented as profile information.

## Implementation Decisions

### Domain ownership and read responsibilities

Tenant Management owns current Rental Customer identity, submitted-profile interpretation, lifecycle, customer authentication facts, reviewer resolution, tenant scoping and staff authorization. It may read the models it owns to construct these responses. Other bounded contexts must not read Tenant Management persistence to construct this feature.

Introduce a **dedicated ordinary Backoffice Customer Profile read responsibility** and a separate sensitive read. Do not expand the rental-oriented summary, onboarding dossier, Storefront self-profile read or published `RentalCustomerProfileFacts` into the general page contract. Historical retained-customer facts do not make soft-deleted customers generally browsable.

The feature does not become authoritative over customer facts preserved in historical Rentals or Contracts artifacts.

### Customer identity semantics

Tenant Management supplies distinct resolved primary display identity, company identity where available, and contact-person identity. Backoffice does not choose precedence among `firstName`/`lastName`, submitted `fullName`, account `companyName`, submitted `businessName` and submitted professional `company`.

Use the established profile-facts precedent: submitted `fullName` precedes account first/last name for the person; for a company, submitted `businessName` precedes account `companyName`. Submitted professional `company` is employer/professional information, **not** company-account identity. A company without a usable company name receives an unavailable company label and a separately identified contact person.

Submitted phone precedes account phone for the resolved current contact when a submitted profile exists; otherwise use account phone. Keep the provenance of submitted information understandable, particularly for rejected profiles. List display and tenant-scoped list search must align with resolved person and company identity; search includes applicable submitted full name and account/submitted company names while retaining person-name search. Do not extend this work into unrelated customer-read refactoring.

### Ordinary profile operation

`CustomersRead` guards the ordinary, tenant-scoped profile operation. It contains useful operational information: customer identifier for routing; resolved identity and contact; account email; resolved phone; `isActive`; onboarding status; email-verification state; useful creation, submission and last-login dates; submitted-profile presence; non-sensitive occupation/employer and acquisition information; city, region and country; review date and resolved reviewer label where available; bounded authentication methods; and whether a valid document reference is on file. Avatar information may be used if useful to the established Backoffice presentation.

The operation does **not** contain birth date, exact street address, document number, tax ID, reference contacts, free-form rejection reason or document storage path. An existing account with no profile succeeds and communicates profile absence. Inactive accounts remain readable. Foreign-tenant, nonexistent and soft-deleted customers are not found.

Authentication methods are product labels, not serialized auth identities. Password availability must account for local authentication being represented by a password hash rather than necessarily by a `LOCAL` auth-identity row. Google may be represented by a linked Google identity. The browser never receives the hash or provider internals.

Resolve a reviewer within the customer’s tenant. Use staff name, then staff email, then an unavailable label. Do not require `TeamRead` solely to show this bounded review label.

### Sensitive-profile operation

A separate backend operation requires **both** `CustomersRead` and `CustomersSensitiveRead`. It returns birth date, exact residential street address, document number, tax ID, reference contacts and rejection reason when applicable. It must not be loaded with the ordinary profile or merely hidden by React.

One explicit “load sensitive information” action fetches this dataset. Following the fetch, the document number starts masked and requires an explicit reveal; reference contacts start collapsed and require an explicit reveal with an explanation of their third-party nature. These are presentation/privacy controls after authorization, not additional data-access operations.

Do not prefetch this operation in route loaders or SSR, persist it to browser storage, or retain its response as reusable page cache after disclosure closes, the customer changes or the route is left. Cancel/discard in-flight results so a previous customer’s sensitive data cannot appear in a new context. Reopening disclosure requires another deliberate request.

### Permissions, provisioning and rollout

The permissions have separate meanings:

- `CustomersRead`: general Customers list and ordinary Customer Profile.
- `CustomersOnboardingManage`: existing onboarding review and its authorized document branch; not general-profile authority.
- `CustomersSensitiveRead`: sensitive profile access **together with** `CustomersRead`.
- `CustomersIdentityDocumentRead`: general-profile document access **together with** `CustomersRead`.

Newly provisioned default member roles receive **none** of `CustomersOnboardingManage`, `CustomersSensitiveRead` or `CustomersIdentityDocumentRead`. Administrators retain all registered permissions under existing Administrator semantics.

**Do not automatically rewrite existing tenant-role grants.** Existing non-admin roles are editable and may have been renamed; persistence does not reliably identify which were originally provisioned defaults. Grants for the current tenant are reviewed and adjusted explicitly during rollout. Repeat that review when rolling the feature out to other existing tenants. Until adjusted, an existing role with `CustomersOnboardingManage` retains its existing dossier authority; the new default-member rule does not retroactively revoke it.

### General Customers and onboarding review

The Backoffice’s general `/dashboard/customers` list and `/dashboard/customers/:customerId` profile are `CustomersRead` experiences. Onboarding-only staff use the separate pending-profiles routes. The underlying customer-list backend capability may continue serving the existing review list and rental customer selector under their existing permissions; that does not grant access to the general Backoffice Customers page.

The onboarding-review workflow, its approval/rejection operations and its `CustomersOnboardingManage` authority remain separate. The general profile contains no onboarding mutation.

### Review-contract separation

The staff review response and Storefront authenticated-customer self-profile response must become independent contracts. The Storefront response retains its existing behavior; separating the presently shared schema is not permission to change the Storefront experience.

Ordinary and staff-review browser responses stop exposing `identityDocumentPath`. The review UI stops building a URL from a path or passing an object path from the browser. Provide review-facing document presence information instead. Raw reviewer IDs are not presentation values.

### Identity-document trust and authorization

Document access has a genuinely **server-to-server descriptor** step. Tenant Management authorizes the authenticated staff member against the trusted tenant and resolves the current customer-owned object. The request must include both the staff session and a Backoffice-held internal credential. The descriptor must not be obtainable through the normal browser-facing backend proxy or appear in browser responses, route-loader data, frontend Query cache or logs.

The backend applies the authorization rule; the browser does not select a branch:

- General profile: `CustomersRead` **and** `CustomersIdentityDocumentRead`.
- Onboarding review: `CustomersOnboardingManage`.

Review document access remains available for a non-deleted customer with a submitted profile across the review states permitted by the existing dossier read, including approved and rejected. Knowing a customer ID or possessing one of these permissions in another tenant is insufficient.

The browser requests the Backoffice document route using the customer ID only. It neither supplies nor receives the object key. Do not classify the descriptor endpoint as public merely to allow an internal credential; staff-session and permission enforcement remain mandatory.

### Identity-document transport

NestJS/Tenant Management performs customer lookup, lifecycle checks, permission enforcement and document resolution. The Backoffice server uses its existing private Customers R2 binding to fetch **only** the authorized object and stream bytes to the browser. File bytes travel R2 to Backoffice to browser, **not** through NestJS. This is an intentional split between domain authorization and the existing file-data infrastructure.

Remove the older Backoffice route’s client-supplied-path behavior rather than retaining a second document access path.

### Document-reference integrity

The Storefront upload pattern places a customer’s identity document within that customer’s document-key namespace. The authenticated customer’s profile submission must reject a reference outside their own expected namespace. Descriptor resolution independently revalidates a stored reference before allowing a fetch; previously stored data is not trusted merely because it is in the database.

A malformed or cross-customer legacy reference fails closed for document access. It does not make the ordinary customer account/profile unreadable.

### Document-on-file semantics and presentation

“Identity document on file” means Tenant Management holds a **valid customer-owned stored reference**. It does not guarantee that the R2 object exists now. Ordinary profile reads perform no R2 existence lookup. Availability is determined on explicit open, when a missing object produces a clear unavailable response.

The permitted inline types are validated JPEG, PNG, WebP and PDF. Use safe content-type and content-disposition handling, `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff` and a safe server-derived filename. Unsupported or mismatched content is refused or forced to download rather than rendered inline. Browser input does not control the key, content type, disposition or filename.

### Review document behavior

The existing dossier may retrieve sensitive review fields when an authorized reviewer opens it. Unlike the current automatic image/PDF preview, **document bytes are retrieved only after an explicit open action**. Reviewer document access retains the existing non-deleted, submitted-profile reach across `PENDING`, `APPROVED` and `REJECTED`, while approval/rejection actions retain their existing pending-only rules.

### Auditing and scope

No generalized sensitive-read or document-access audit subsystem is introduced. Existing authentication auditing does not provide an audit trail for these reads, and this specification does not claim otherwise. Keep the operations clearly delimited so auditing can be added if subsequently required.

This release is read-only from the general Customer Profile. Submission-time key validation is a narrow correction to the existing customer submission boundary, not a Backoffice editing capability.

## Testing Decisions

**Approved testing seams:** new automated tests are limited to backend **E2E and integration** tests. Add no Backoffice automated tests or new browser-test framework. Tests accompany the backend implementation slice whose externally observable behavior they protect, rather than forming a separate testing project.

1. **Backend HTTP E2E seam.** Use the repository’s established authenticated tenant/session, Supertest and disposable-database E2E pattern. Verify response data and status codes for ordinary versus sensitive permissions; reviewer compatibility; tenant isolation; customer absence, inactivity and deletion; no-profile behavior; submission-time and resolution-time key rejection; invalid legacy references; internal credential **plus** staff session for descriptors; denial through the normal browser-facing access path; staff review responses without storage paths; Storefront response compatibility; and identity/list-search consistency. Exercise actual role provisioning through registration and effective permissions: new default members lack the three privileged grants, while Administrators retain them. Assert behavior and exposure, not which handler or helper implemented it.
2. **Backend application/integration seam, only where warranted.** Use the existing real-Prisma/PostgreSQL integration pattern for a backend behavior that cannot be adequately protected by the HTTP scenarios alone, such as tenant-scoped list-search persistence semantics. Do not add lower-level implementation-detail tests by default.

**Manual runtime verification, not Backoffice automated tests:** verify list and review navigation, responsive profile states, deliberate sensitive loading and disposal, masking and reference disclosure, and deliberate document opening in the actual applications. Verify the Backoffice server’s credential forwarding and key containment, missing R2 objects, supported inline files, unsupported/mismatched files and response headers through the running route. Backend-only tests cannot assert those Worker/browser behaviors; this limitation must not be misrepresented as automated coverage. Run the existing backend HTTP-authorization audit and affected workspace validation during implementation.

## Out of Scope

- Editing account or submitted-profile information from Backoffice.
- Changing active/inactive state.
- Approving or rejecting onboarding from the general Customer Profile.
- Password, credential, session or authentication-provider management.
- Rental history, lifetime-value or financial analytics.
- CRM notes, customer activity timelines or contract history.
- Backoffice identity-document upload or replacement.
- General customer-document management or a generalized private-file service.
- Proxying customer-document bytes through NestJS.
- A generalized sensitive-access audit subsystem.
- Replacing the rental customer summary, other unrelated customer reads, published cross-module `RentalCustomerProfileFacts`, or retained historical-customer capabilities.
- Replacing the onboarding-review workflow or the Storefront self-profile experience.
- Automatically rewriting historical tenant-role grants.
- A new Backoffice automated-test suite or browser-test framework.

## Further Notes

This is the **first specification and decision record** for this feature. It records the repository audit and subsequent decisions, not a reconciliation with a prior implementation or ticket set.

Two rollout facts are especially important:

- Changing default-member provisioning protects **new** roles only. Historically provisioned member roles have no reliable immutable marker after role edits or renames. Existing grants require explicit review for the current tenant and for any additional existing tenant at rollout.
- A valid stored document reference is not proof that R2 still holds the object. Ordinary reads remain independent of R2; retrieval errors belong to the deliberate open flow.

The existing staff review and Storefront self-profile contracts currently share a schema even though their future privacy requirements differ. Separate them without silently changing Storefront behavior. The existing Backoffice document route accepts a browser path and immediately embeds previews; that behavior must not remain as a compatibility bypass after the new flow is introduced.

Future sessions must implement against this decision record rather than silently reinterpret it. If current repository behavior reveals a genuine incompatibility, surface it and revisit the specification explicitly before changing an agreed boundary.
