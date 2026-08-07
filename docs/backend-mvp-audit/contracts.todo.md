# Contracts MVP TODO

## Existing capabilities

The module renders rental remito PDFs, creates/updates a contract snapshot, exposes signing summaries, prepares signing input, and marks contracts signing-requested/signed through a public API. Document Signing creates expiring hashed-token requests, stores unsigned PDFs, accepts signatures, produces signed output, and supports public unsigned/signed streaming.

## Missing or incomplete capabilities

### [ ] Persist generated unsigned artifacts in the Contracts model

- **Priority:** P0
- **Status:** Inconsistent
- **MVP scenario:** The exact PDF shown and accepted remains provable after templates or rental data change.
- **Current evidence:** `V2ContractArtifact` and signing requests require artifact references in v2 schema, but `RentalRemitoContractWriterService` only upserts contract snapshot/status; `DocumentSigning` also maintains its own legacy `DocumentSigningRequest` storage fields.
- **Gap:** Contract/document-signing persistence is split and the generated contract path does not clearly create the v2 artifact record that the documented legal model requires.
- **Expected behavior:** Contracts stores immutable artifact metadata/hash for every generated unsigned and signed PDF; signing requests reference that exact artifact.
- **Lifecycle rules:** Existing signed artifacts are never overwritten; regeneration creates a new artifact/version.
- **Owning module:** Contracts
- **Dependencies:** Object Storage and Document Signing integration.
- **Side effects:** Artifact rows, hashes, and storage objects.
- **Acceptance criteria:** A signing acceptance traces to one immutable unsigned hash and one signed artifact, downloadable after later regeneration.
- **Suggested tests:** Integration traceability test and E2E generate-sign-regenerate-download flow.
- **Decision recorded:** Contracts V2 is the sole legal/document source of truth for newly generated contracts. `document_signing_requests` is legacy operational storage, receives no new writes after cutover, and is not backfilled or migrated. See `apps/backend/src/modules/contracts/README.md`.

#### [x] Document V2 ownership and legacy compatibility boundary

- **Completed:** Defined the V2 Contracts tables as the authoritative legal-record model for newly generated contracts and defined the legacy table's no-backfill, no-new-writes cutover policy.
- **Documentation:** `apps/backend/src/modules/contracts/README.md`.

#### [x] Add Contracts-owned immutable artifact persistence

- **Priority:** P0
- **Completed:** Added `ContractArtifactPersistenceService`, which writes a traceable `PENDING_UPLOAD` artifact row before storage upload, marks successful uploads `AVAILABLE`, and marks upload failures `UPLOAD_FAILED`. Artifact hashes are required SHA-256 values.
- **Rules:** Preview PDFs are not persisted; existing artifacts are never updated; storage/database failure handling must leave no untraceable legal record or orphaned permanent object.
- **Implementation:** `ContractArtifactPersistenceService`, `ObjectStoragePort`, and `contract-artifacts.prisma`.
- **Acceptance criteria:** A persisted artifact can be streamed by its row's storage key and its recorded SHA-256 matches its bytes.

#### [x] Persist the unsigned artifact during signing preparation

- **Priority:** P0
- **Completed:** Signing preparation now reuses an available `UNSIGNED_PDF` artifact on resend, otherwise persists the rendered unsigned PDF before transitioning the contract to `GENERATED`. It returns `unsignedArtifactId` and the immutable document hash to the invitation flow.
- **Rules:** Preview remains non-persistent.
- **Implementation:** `PrepareRentalRemitoForSigningHandler`, `RentalRemitoContractWriterService`, `ContractArtifactPersistenceService`, and `V2ContractsPublicApi`.
- **Acceptance criteria:** A contract in `GENERATED` state has an unsigned artifact, and invitation creation receives its `unsignedArtifactId`.

#### [x] Create signing requests in the V2 Contracts model

- **Priority:** P0
- **Completed:** Signing invitations create `V2DocumentSigningRequest` records linked to the prepared contract and immutable unsigned artifact. Public session resolution and unsigned PDF streaming now use the V2 request-artifact relationship only.
- **Rules:** New flows do not write `document_signing_requests`; each active request identifies the exact artifact the signer can review.
- **Implementation:** `SendSigningInvitationService`, `V2ContractsPublicApi`, `PublicV2SigningSessionLoader`, and `StreamPublicUnsignedDocumentService`.
- **Acceptance criteria:** A public signing token resolves to a V2 request and streams the request's linked unsigned artifact.

#### [x] Persist acceptance evidence and the signed artifact

- **Priority:** P0
- **Completed:** Public acceptance now uses the V2 Contracts request-artifact chain only. It pins and verifies server-owned `rental-remito-v1` legal text, captures IP/user-agent evidence, persists the acceptance snapshot with both artifact IDs and hashes, and transactionally marks the request and contract signed.
- **Rules:** The signed PDF is created by overlaying the submitted signature in the reserved customer-signature block of every stored unsigned-PDF page. It never re-renders current rental data. Object-storage persistence follows the artifact-persistence policy before the transactional lifecycle transition.
- **Implementation:** `AcceptPublicSigningSessionService`, `V2ContractsPublicApi`, `RentalRemitoSignedArtifactService`, `V2DocumentSignatureAcceptance`, and `V2ContractArtifact`.
- **Acceptance criteria:** One acceptance traces from its signing request to immutable unsigned and signed artifacts with distinct hashes.

#### [x] Serve signing summaries and public downloads from persisted V2 artifacts

- **Priority:** P0
- **Completed:** Signing summaries now resolve artifacts through the V2 request and acceptance chain. Public signed downloads use a server-generated, expiring receipt token and stream the acceptance's persisted `SIGNED_PDF`; signing tokens remain limited to review and acceptance.
- **Rules:** A signed download streams the stored signed artifact, even after source rental, tenant, or template data changes. The receipt token is stored only as a hash and remains usable for repeated downloads until expiry or revocation.
- **Implementation:** `GetRentalContractSigningSummaryHandler`, `V2ContractsPublicApi`, `StreamPublicSignedDocumentService`, and the backoffice signed-PDF proxy.
- **Acceptance criteria:** Summary data reflects the actual signing flow and downloads remain byte-stable after later source mutations.

#### [x] Cut over new writes and prove artifact traceability

- **Priority:** P0
- **Completed:** The new rental-remito flow writes only the Contracts V2 chain: immutable artifacts, V2 signing requests, and V2 acceptance records. The unused legacy public-session loader and its legacy `document_signing_requests` upsert path were removed. Remaining legacy handlers are read-only compatibility code for pre-cutover records.
- **Rules:** No legacy backfill or migration is required. Legacy behavior may be retired only in an explicit later change.
- **Testing:** Deferred by request. Suggested coverage remains artifact hash/storage integration; generate-send-sign-download E2E; source-mutation-after-signing regression; storage/database failure and concurrent acceptance tests.
- **Acceptance criteria:** All newly generated contracts use only the V2 chain and accepted documents remain retrievable and unchanged.

### [ ] Regenerate contracts and mark re-signing required after relevant rental edits

- **Priority:** P0
- **Status:** Decomposed - cross-module lifecycle change; do not implement as one change.
- **MVP scenario:** Dates, customer, items, assets, accessories, delivery, or accepted price change after generation/signing.
- **Current evidence:** `V2ContractStatus.RESIGN_REQUIRED` exists; writer rejects regeneration only when SIGNED and otherwise overwrites snapshot/status. No Rental Commitment edit event consumer or mark-resign capability exists. `EditConfirmedRentalHandler` and `ReplaceConfirmedRentalAssetHandler` currently reject edits when the contract is `GENERATED`, `SIGNING_REQUESTED`, or `SIGNED`; accessory assignment bypasses Contracts entirely. `ConfirmedRentalEditedEvent` has no change classification and is emitted only by the aggregate's two confirmed-edit paths.
- **Gap:** Generated/signed documents can become stale with no lifecycle response. The current one-contract-per-rental schema and mutable `V2Contract.snapshot` also do not define a current version versus prior legal versions. An asynchronous post-commit event alone leaves a race in which an obsolete invitation could be accepted after the rental edit commits but before invalidation.
- **Expected behavior:** Classify legally relevant rental changes, preserve old artifacts/acceptance, mark `RESIGN_REQUIRED`, invalidate obsolete active requests, and generate a new version on command.
- **Lifecycle rules:** Signed state is never silently downgraded; non-relevant changes do not force re-signing.
- **Owning module:** Contracts
- **Dependencies:** Confirmed-rental-edited event from Rental Commitment.
- **Side effects:** Contract status/version, request cancellation, new artifact, signing notification.
- **Acceptance criteria:** A relevant edit makes the old signed artifact preserved but no longer current and a replacement can be signed.
- **Suggested tests:** E2E signed-contract edit and re-sign flow plus irrelevant-edit test.

#### [ ] 1. Define the legal-change contract and versioning policy

- Decide the canonical change categories emitted by Rental Commitment for every confirmed-rental mutation that can affect a remito: period, customer, selections/quantities, assigned assets, accessories, fulfillment/delivery, and accepted price. Explicitly decide whether notes, insurance, and branch are legal inputs.
- Contracts owns the policy that maps those categories to `RESIGN_REQUIRED`; Rental Commitment continues to own edit validity.
- Define the version model before coding: how the current generation is identified, how a generated snapshot/document number relates to its artifacts and requests, and how prior signed versions remain auditable despite the single `V2Contract` row and mutable snapshot.
- Define the concurrency guarantee. A relevant rental edit must make its old active signing request impossible to accept before the edit command reports success, not merely eventually cancelled by an async listener.
- **Exit criteria:** approved lifecycle and concurrency design, including status transitions from `GENERATED`, `SIGNING_REQUESTED`, `SIGNED`, and `RESIGN_REQUIRED`.

#### [ ] 2. Publish complete, classified rental-change facts

- Extend or replace `ConfirmedRentalEditedEvent` with stable change categories and the rental revision/version needed for idempotency and ordering.
- Ensure all relevant confirmed-rental write paths publish it after a successful transaction: confirmed edit details, operational edit, assigned-asset replacement, and accessory changes. Customer changes currently have no confirmed-rental edit path, so add its event coverage only when that capability exists.
- Remove the existing contract-status edit blocks only as part of the coordinated invalidation flow from subtask 3. Retain pickup-time, rental-version, availability, and other Rental Commitment rules.
- **Exit criteria:** one public integration event accurately describes each legally relevant mutation and irrelevant mutations remain distinguishable.

#### [ ] 3. Add Contracts re-sign invalidation with race-safe request revocation

- Add a Contracts application capability and public API for a classified rental change. It must atomically record the new current/re-sign-required state and cancel every active V2 signing request for the obsolete artifact, clearing or otherwise invalidating signing capability as required by the approved concurrency design.
- Make public session resolution and acceptance reject obsolete requests and prevent acceptance from moving `RESIGN_REQUIRED` back to `SIGNED`.
- Preserve existing artifacts, signing requests, acceptance evidence, and receipt behavior. Never overwrite signed artifacts or mutate historical acceptance evidence.
- Consume the Rental Commitment event for recovery/idempotency and observability, but do not rely on its asynchronous delivery for the pre-success invalidation guarantee.
- **Exit criteria:** relevant edits are allowed and leave Contracts in `RESIGN_REQUIRED`; all obsolete signing links are unusable; duplicate/out-of-order notifications are safe.

#### [ ] 4. Implement explicit regeneration and replacement signing

- Change signing preparation/regeneration to generate a new immutable unsigned artifact from the accepted post-edit rental facts only when the contract is `RESIGN_REQUIRED`, while retaining ordinary resend behavior for the current unchanged artifact.
- Persist the new current snapshot/version according to subtask 1. Do not reuse a prior artifact, overwrite the prior snapshot/version, or silently downgrade a signed legal version.
- Allow a replacement invitation only for the regenerated current artifact. Existing send/resend behavior must not revive a cancelled obsolete request.
- Update signing summaries and admin-facing status data so staff can see that re-signing is required and which version is current.
- **Exit criteria:** a relevant edit followed by explicit regeneration and invitation produces a distinct artifact and can be signed, while the old signed artifact remains downloadable through its existing receipt token.

#### [ ] 5. Prove the lifecycle end to end

- Add focused unit/integration coverage for legal-change classification, status transitions, request cancellation, idempotency, and concurrent edit-versus-acceptance behavior.
- Add E2E coverage for generated and signed contract edits across each supported relevant mutation path, regenerate-send-sign flow, old-artifact retention/download, and an irrelevant edit that keeps the current request valid.
- **Exit criteria:** the acceptance criteria above pass without relying on timing-sensitive async event delivery.

### [ ] Replace expired, failed, or cancelled signing requests explicitly

- **Priority:** P1
- **Status:** Partial
- **MVP scenario:** Staff resends a link after expiry or delivery failure.
- **Current evidence:** Sending expires stale pending requests, refreshes same-document pending requests, or voids changed documents under a lock; schema supports failed/cancelled states, but no explicit cancel/replace/retry endpoint or scheduler marks elapsed requests expired.
- **Gap:** Recovery depends on another send attempt and failed delivery state/operability is unclear.
- **Expected behavior:** Staff can cancel and replace active requests; expiry is observable without requiring a resend; failed delivery remains retryable with audit history.
- **Lifecycle rules:** Only one active request per contract artifact; signed requests cannot be replaced as unsigned actions.
- **Owning module:** Contracts
- **Dependencies:** Notifications delivery attempts.
- **Side effects:** Request status/token invalidation and replacement invitation.
- **Acceptance criteria:** Expired/failed/cancelled requests are visible and replacement tokens invalidate previous signing capability.
- **Suggested tests:** Time-based expiry, explicit cancel/replace, delivery failure retry, and concurrent resend tests.

### [ ] Void contracts and revoke public access

- **Priority:** P1
- **Status:** Missing
- **MVP scenario:** A cancelled rental or legally invalid document must be voided while its evidence remains retained.
- **Current evidence:** `V2ContractStatus.VOID`, `voidedAt`, request cancellation, and receipt-token fields exist; no void/revoke application capability exists.
- **Gap:** Contracts and public download/signing tokens cannot be administratively invalidated.
- **Expected behavior:** Authorized voiding records reason/time/actor, cancels active signing requests, revokes purpose-specific public tokens, and preserves artifacts and acceptance evidence.
- **Lifecycle rules:** Void is terminal for that contract version; a replacement uses explicit version/regeneration policy.
- **Owning module:** Contracts
- **Dependencies:** Rental cancellation event and authorization.
- **Side effects:** Token revocation and optional signer notification.
- **Acceptance criteria:** Voided contracts remain internally auditable but no token permits signing or revoked public download.
- **Suggested tests:** E2E cancellation-to-void, signed void retention, and token revocation tests.

### [ ] Remove cross-context live reads from contract generation

- **Priority:** P1
- **Status:** Inconsistent
- **MVP scenario:** A contract is generated from accepted facts rather than current mutable source records.
- **Current evidence:** `rental-remito-read-model.loader.ts` contains multiple `v2-contract-boundaries` TODOs and directly reads Rental Commitment, Tenant Management, and related Prisma models.
- **Gap:** Contracts bypasses public APIs and may combine current customer/signer/configuration with accepted rental facts inconsistently.
- **Expected behavior:** Rental Commitment supplies an accepted contract source snapshot and Tenant Management supplies current signer input only for initial generation, which Contracts then snapshots.
- **Lifecycle rules:** Regeneration is explicit; old snapshots/artifacts never follow live changes.
- **Owning module:** Contracts
- **Dependencies:** Rental Commitment and Tenant Management public read contracts.
- **Side effects:** None beyond reliable snapshot creation.
- **Acceptance criteria:** Contracts does not directly query foreign write models and generated snapshots are stable under later source changes.
- **Suggested tests:** Public-contract tests and E2E mutation-after-generation preservation.
