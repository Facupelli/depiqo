# Contracts Module

## Purpose

Contracts owns rental contract document generation, signing sessions, signature acceptance, signed document artifacts, public receipt/download access, and contract signing status.

It answers whether a contract has been generated, which exact document artifact was presented to the signer, whether a signing request was sent or viewed, whether the signer accepted the document, what signed PDF was produced, and whether a rental requires re-signing after changes.

Contracts protects the legal/document boundary of the system.

It does not own rental lifecycle. It derives documents from accepted rental facts owned by Rental Commitment and preserves the document/signing facts that must survive later rental, tenant, signer, pricing, or template changes.

Public API: `contracts.public-api.ts`

## Owns

```text
Contract records
Contract document numbers
Contract generation state
Contract snapshots used for document generation
Unsigned contract document artifacts
Signed contract document artifacts
Signing requests
Signing request tokens
Signing request lifecycle
Signature acceptance records
Signature evidence
Accepted document hashes
Signed document hashes
Public receipt/download tokens
Contract signing status
Re-signing requirement state
```

Examples of questions owned by Contracts:

```text
Has a contract been generated for this rental?
Which unsigned PDF was generated?
Was a signing request sent?
Was the signing request viewed?
Who was invited to sign?
Who accepted the contract?
When was the contract accepted?
Which exact unsigned document hash was accepted?
Which signed PDF artifact was produced?
Can the tenant-admin download the signed contract?
Does this rental require re-signing?
```

## Does Not Own

```text
Rental lifecycle
Rental confirmation
Rental status transitions
Rental selections
Rental demand lines
Assigned assets
Asset blocks
Accessory preparation decisions
Confirmed price snapshots
Owner split snapshots
Physical asset metadata
Current pricing rules
Rate plans
Tenant permissions
Tenant branch schedules
Tenant-user authentication
Notification delivery
```

Contracts may read accepted rental facts from Rental Commitment when generating a document, but it must not become the owner of those facts.

Contracts may use tenant signer configuration from Tenant Management when generating a document, but generated contracts must snapshot signer data.

Contracts may request Notifications to deliver signing links or receipts, but Notifications owns delivery concerns.

## Authoritative Persistence and Compatibility

For contracts generated after the artifact-persistence rollout, the Contracts V2 model is the sole legal/document source of truth:

```text
V2Contract
  -> V2ContractArtifact (immutable unsigned and signed files)
  -> V2DocumentSigningRequest (references the presented unsigned artifact)
  -> V2DocumentSignatureAcceptance (references the accepted unsigned and produced signed artifacts)
```

`V2ContractArtifact`, `V2DocumentSigningRequest`, and `V2DocumentSignatureAcceptance` own the contract document metadata, hashes, signing lifecycle, and acceptance evidence. An artifact's bytes, storage key, metadata, and hash are immutable once recorded. A replacement document is a new artifact, never an update to an existing artifact.

The existing `document_signing_requests` table is legacy operational storage. It is not a second legal-record model and must not receive new writes once the V2 signing path is available. Existing legacy records are outside this rollout: no backfill or migration is required. They may remain readable through legacy behavior until that behavior is explicitly retired.

Document Signing may continue to host public signing-token HTTP endpoints and notification delivery orchestration, but it must obtain and mutate contract signing state through the Contracts public API. It must not independently persist unsigned/signed contract files, signing requests, or acceptance evidence.

## Dependencies

Contracts may depend on Rental Commitment to read accepted rental facts needed to generate a contract document.

Contracts may depend on Tenant Management to read tenant branding, tenant configuration, tenant contract signer configuration, and permission context for admin actions.

Contracts may depend on Object Storage infrastructure to store unsigned PDFs, signed PDFs, signatures, and related artifacts.

Contracts may depend on Notifications to send signing links or signed-document messages.

Contracts should not depend on Pricing for current price calculation when generating a contract. The contract should use the accepted price snapshot from Rental Commitment.

Contracts should not depend on Asset Inventory for current asset facts when Rental Commitment already owns accepted assignment facts and snapshots needed for the document.

Contracts should not control Rental Commitment state transitions. If signing status should affect rental workflows, the interaction must be explicit through public APIs or events.

## Key Domain Concepts

### Contract

A contract is the logical/legal document record for one rental.

It tracks the document lifecycle and the snapshot used to generate legal document artifacts.

A contract is not the PDF file itself.

The contract record answers:

```text
Which rental is this contract for?
What is the contract status?
What document number identifies it?
Which snapshot was used to generate it?
When was it generated?
When was it signed?
Was it voided or marked as requiring re-signing?
```

### Contract Snapshot

The contract snapshot preserves the data used to generate the contract document.

It may include rental facts, tenant signer facts, customer facts, selected items, assigned assets, accessories, price snapshot, delivery details, legal text version, and template inputs.

The snapshot exists because later changes must not silently mutate already generated or signed documents.

### Contract Artifact

A contract artifact is a generated file representation of a contract.

Common artifact kinds:

```text
UNSIGNED_PDF
SIGNED_PDF
```

A contract artifact is the file metadata and proof metadata for a concrete document file.

It answers:

```text
Where is the file stored?
What file name was generated?
What content type does it have?
How many bytes does it contain?
What hash algorithm was used?
What is the document hash?
Was this the unsigned PDF or signed PDF?
```

The document hash proves which exact PDF was accepted.

### Signing Request

A signing request is the invitation/session that allows a signer to review and sign a specific unsigned contract artifact.

It answers:

```text
Who was invited to sign?
Which unsigned artifact were they expected to review?
Was the link sent?
Was it viewed?
Did it expire?
Was it cancelled?
Was it completed?
```

A signing request should point to the exact unsigned artifact being presented to the signer.

The signing token should be stored as a hash, not as a raw token.

After successful signing, the signing token should be invalidated or cleared so the signing action cannot be replayed.

### Signature Acceptance

A signature acceptance is the immutable audit proof that a signer accepted a specific document.

It answers:

```text
Who signed?
When did they sign?
What unsigned artifact did they accept?
What was the unsigned document hash?
What legal acceptance text did they accept?
What signature evidence was captured?
What signed artifact was produced?
What IP/user-agent evidence was captured?
```

The acceptance record should preserve both:

```text
acceptanceTextVersion
acceptanceTextSnapshot
```

The version identifies the legal wording version. The snapshot preserves the exact wording accepted at the time.

### Public Receipt / Download Token

A public receipt/download token is a read-only access token for downloading the signed document after signing.

It is separate from the signing token.

```text
Signing token
  Allows the signer to perform the signing action.

Receipt/download token
  Allows the signer to download the signed document after completion.
```

Public download tokens should be purpose-specific, expiring, revocable, and stored as hashes.

## Lifecycle / State Rules

Contract lifecycle meanings:

```text
DRAFT
  Contract record exists, but no generated document artifact exists yet.

GENERATED
  An unsigned document artifact exists.

SIGNING_REQUESTED
  A signing request exists or has been sent.

SIGNED
  A signature acceptance exists and a signed document artifact was produced.

RESIGN_REQUIRED
  The rental or document inputs changed after generation or signing.
  A new signature is required before the contract is considered up to date.

VOID
  The contract was intentionally invalidated.
```

Signing request lifecycle meanings:

```text
PENDING
  Request exists but has not been sent.

SENT
  Signing link has been sent.

VIEWED
  Signer opened the signing page.

SIGNED
  Signer completed the signing/acceptance flow.

EXPIRED
  The signing link expired.

CANCELLED
  The request was cancelled.

FAILED
  Sending or signing flow failed.
```

Rules:

```text
A generated contract must have an unsigned artifact.
A signing request should reference the unsigned artifact that the signer is expected to review.
A signed contract must have a signature acceptance.
A signed contract should have a signed artifact.
A signing token must not be reusable for signing after successful acceptance.
A signed contract must not be silently downgraded to GENERATED.
If rental facts change after signing, mark re-signing required or use an explicit versioning flow.
Contract signing does not automatically make the rental immutable.
```

## Persistence Ownership

Contracts owns tables related to:

```text
contracts
contract artifacts
document signing requests
document signature acceptances
public contract access tokens
contract document numbers
contract signing status
```

Likely owned table concepts:

```text
v2_contracts
v2_contract_artifacts
v2_document_signing_requests
v2_document_signature_acceptances
v2_contract_public_access_tokens
```

Examples of external references:

```text
Contract.rentalId references a rental owned by Rental Commitment.
Contract.tenantId references a tenant owned by Tenant Management.
Contract snapshot may contain rental facts owned by Rental Commitment.
Contract snapshot may contain tenant signer facts owned by Tenant Management.
Signing requests may trigger notification delivery owned by Notifications.
```

## Important Invariants

Contracts owns document and signing truth, not rental lifecycle truth.

Rental Commitment owns accepted rental facts used for contract generation.

Generated contracts must use accepted rental facts and snapshots, not live Pricing rules.

Generated contracts must snapshot tenant signer data.

A contract artifact is the concrete generated file. A contract is the logical/legal document record.

A signing request is not the audit proof. Signature acceptance is the audit proof.

A signing request should point to the exact unsigned artifact the signer is expected to review.

A signature acceptance must preserve the unsigned artifact reference and unsigned document hash.

A signature acceptance must preserve the legal acceptance text snapshot.

A signed artifact should have its own hash because the signed PDF is a different binary file from the unsigned PDF.

Raw public tokens must not be stored. Store token hashes.

Signing tokens should be invalidated after signing.

Post-sign document downloads should use a separate public receipt/download token, not the signing token.

Signed contracts must not be silently downgraded to generated contracts.

Re-generating after signing must be explicit: either reject, mark `RESIGN_REQUIRED`, or use a versioned contract flow.

Contract signing does not automatically make the rental immutable.

If rental edits require re-signing, Contracts owns the re-signing status, but Rental Commitment still owns whether the rental edit is allowed.

## Events / Side Effects

Possible event categories include:

```text
Contract generated
Contract signing requested
Signing request viewed
Contract signed
Contract re-signing required
Contract voided
Signed document artifact created
Public receipt/download token created
```

Contracts may trigger side effects such as:

```text
Generate unsigned PDF
Store unsigned PDF artifact
Generate signing token
Request signing notification delivery
Record signature acceptance
Generate signed PDF
Store signed PDF artifact
Create public receipt/download token
```

Notifications owns actual delivery state and retry behavior.

Object storage adapters own storage mechanics, but Contracts owns the document artifact metadata and hash records.

## Common Mistakes

Do not store contract signing state as rental status.

Do not make a signed contract automatically lock the rental unless Rental Commitment explicitly owns that rule.

Do not generate contracts from current Pricing rules.

Do not generate contracts from current catalog definitions when confirmed rental snapshots are available.

Do not rely on live tenant signer configuration for old contracts.

Do not treat the signing request as the legal proof of signing.

Do not store raw public signing tokens.

Do not keep the signing token valid for signed PDF downloads.

Do not return object storage keys directly to the public UI.

Do not let a public download token grant signing capabilities.

Do not overwrite a signed contract artifact silently.

Do not downgrade `SIGNED` to `GENERATED` during prepare/regenerate flows.

Do not hide core audit fields only inside JSON provider data.

Do not make external provider metadata the only source of signing truth.

Do not let notification failure change contract signing truth unless the signing request itself failed.

## Related Docs

```text
apps/backend/docs/architecture/overview.md
apps/backend/docs/architecture/adr/
apps/backend/src/modules/tenant-management/README.md
apps/backend/src/modules/rental-commitment/README.md
contracts.public-api.ts
```
