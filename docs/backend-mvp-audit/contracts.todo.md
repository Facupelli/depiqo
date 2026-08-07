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

#### [ ] Add Contracts-owned immutable artifact persistence

- **Priority:** P0
- **Goal:** Store each unsigned or signed PDF in object storage and create an immutable `V2ContractArtifact` row containing storage metadata, SHA-256 hash, and artifact kind.
- **Rules:** Preview PDFs are not persisted; existing artifacts are never updated; storage/database failure handling must leave no untraceable legal record or orphaned permanent object.
- **Likely anchors:** `RentalRemitoContractWriterService`, `ObjectStoragePort`, and `contract-artifacts.prisma`.
- **Acceptance criteria:** A persisted artifact can be streamed by its row's storage key and its recorded SHA-256 matches its bytes.

#### [ ] Persist the unsigned artifact during signing preparation

- **Priority:** P0
- **Goal:** Make signing preparation create the contract snapshot and immutable unsigned artifact together, then return the contract and artifact identity to the invitation flow.
- **Rules:** A resend reuses the current unsigned artifact instead of rerendering from mutable source data. Preview remains non-persistent.
- **Likely anchors:** `PrepareRentalRemitoForSigningHandler`, `RentalRemitoDocumentService`, and `V2ContractsPublicApi`.
- **Acceptance criteria:** A contract in `GENERATED` state has an unsigned artifact, and invitation creation receives its `unsignedArtifactId`.

#### [ ] Create signing requests in the V2 Contracts model

- **Priority:** P0
- **Goal:** Create `V2DocumentSigningRequest` records linked to `contractId` and `unsignedArtifactId`, then resolve tokens and stream unsigned PDFs through that relationship.
- **Rules:** New flows do not write `document_signing_requests`; each active request identifies the exact artifact the signer can review.
- **Likely anchors:** `SendSigningInvitationService`, `PublicSigningSessionLoader`, `StreamPublicUnsignedDocumentService`, and `signing.prisma`.
- **Acceptance criteria:** A public signing token resolves to a V2 request and streams the request's linked unsigned artifact.

#### [ ] Persist acceptance evidence and the signed artifact

- **Priority:** P0
- **Goal:** On acceptance, preserve the exact unsigned artifact/hash and acceptance-text snapshot, create an immutable signed PDF artifact with its own hash, link both from `V2DocumentSignatureAcceptance`, and mark the request/contract signed.
- **Rules:** Database lifecycle updates are transactional; object-storage failure handling follows the artifact-persistence policy; a signed PDF is never produced only in memory.
- **Likely anchors:** `AcceptPublicSigningSessionService`, `RentalRemitoDocumentService`, `signature-acceptance.prisma`, and `contract-artifacts.prisma`.
- **Acceptance criteria:** One acceptance traces from its signing request to immutable unsigned and signed artifacts with distinct hashes.

#### [ ] Serve signing summaries and public downloads from persisted V2 artifacts

- **Priority:** P0
- **Goal:** Make contract summaries and public unsigned/signed downloads read the V2 artifact chain rather than legacy request fields or a fresh render from current rental data.
- **Rules:** A signed download must stream the stored signed artifact, even after source rental, tenant, or template data changes.
- **Likely anchors:** `GetRentalContractSigningSummaryHandler`, `StreamPublicUnsignedDocumentService`, and `StreamPublicSignedDocumentService`.
- **Acceptance criteria:** Summary data reflects the actual signing flow and downloads remain byte-stable after later source mutations.

#### [ ] Cut over new writes and prove artifact traceability

- **Priority:** P0
- **Goal:** Stop new-flow writes to legacy signing storage, leave pre-cutover records untouched, and cover the new legal-record chain with integration and E2E tests.
- **Rules:** No legacy backfill or migration is required. Legacy behavior may be retired only in an explicit later change.
- **Suggested tests:** Artifact hash/storage integration test; generate-send-sign-download E2E; source-mutation-after-signing regression; storage/database failure and concurrent acceptance tests.
- **Acceptance criteria:** All newly generated contracts use only the V2 chain and accepted documents remain retrievable and unchanged.

### [ ] Regenerate contracts and mark re-signing required after relevant rental edits

- **Priority:** P0
- **Status:** Missing
- **MVP scenario:** Dates, customer, items, assets, accessories, delivery, or accepted price change after generation/signing.
- **Current evidence:** `V2ContractStatus.RESIGN_REQUIRED` exists; writer rejects regeneration only when SIGNED and otherwise overwrites snapshot/status. No Rental Commitment edit event consumer or mark-resign capability exists.
- **Gap:** Generated/signed documents can become stale with no lifecycle response.
- **Expected behavior:** Classify legally relevant rental changes, preserve old artifacts/acceptance, mark `RESIGN_REQUIRED`, invalidate obsolete active requests, and generate a new version on command.
- **Lifecycle rules:** Signed state is never silently downgraded; non-relevant changes do not force re-signing.
- **Owning module:** Contracts
- **Dependencies:** Confirmed-rental-edited event from Rental Commitment.
- **Side effects:** Contract status/version, request cancellation, new artifact, signing notification.
- **Acceptance criteria:** A relevant edit makes the old signed artifact preserved but no longer current and a replacement can be signed.
- **Suggested tests:** E2E signed-contract edit and re-sign flow plus irrelevant-edit test.

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
