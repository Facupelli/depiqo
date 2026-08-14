# Contracts Module

Contracts owns the complete V2 rental contract signing lifecycle: Remito preparation, unsigned artifact generation, signing-request creation, invitation orchestration, public signing sessions, signature acceptance, signed artifacts, public receipt/download access, and re-signing state.

Contracts derives documents from accepted rental facts owned by Rental Commitment and preserves the document and signing facts that must survive later changes.

Contracts currently exposes no module-to-module public capability. Its V2 invitation and public signing routes are Contracts-owned application behavior, implemented directly by Contracts use cases.

## Domain Concepts

### Contract

A `Contract` is the logical/legal document record for one rental.

It tracks the contract lifecycle and the snapshot used to generate its document artifacts.

A contract is not the PDF file itself.

### Contract Snapshot

A contract snapshot preserves the data used to generate the contract document.

It may contain rental facts, tenant signer facts, customer facts, selected items, assigned assets, accessories, accepted pricing, delivery details, legal text version, and template inputs.

Later changes must not silently alter the facts represented by an already generated or signed contract.

### Contract Artifact

A `ContractArtifact` is a concrete generated file representation of a contract.

Common artifact kinds are:

```text
UNSIGNED_PDF
SIGNED_PDF
```

Artifacts preserve file metadata and proof metadata, including their document hash.

The unsigned document hash identifies the exact document presented to and accepted by the signer.

Unsigned and signed PDFs are different artifacts and have independent hashes.

### Signing Request

A `SigningRequest` is the invitation/session allowing a signer to review and sign a specific unsigned contract artifact.

It references the exact unsigned artifact the signer is expected to review.

Signing tokens must be stored as hashes rather than raw tokens and must no longer be usable for signing after successful acceptance.

### Signature Acceptance

A `SignatureAcceptance` is the immutable audit proof that a signer accepted a specific document.

It preserves the signer and signing time together with the exact unsigned artifact, its document hash, signature evidence, acceptance wording, and the resulting signed artifact.

The acceptance record preserves both:

```text
acceptanceTextVersion
acceptanceTextSnapshot
```

The version identifies the legal wording version. The snapshot preserves the exact wording accepted at signing time.

A signing request is not the legal proof of signing; the signature acceptance is.

### Public Receipt / Download Token

A public receipt/download token provides read-only access to the signed document after signing.

It is separate from the signing token:

```text
Signing token
  Allows the signer to perform the signing action.

Receipt/download token
  Allows access to the signed document after completion.
```

Public download tokens must be purpose-specific, expiring, revocable, and stored as hashes.

They must not grant signing capabilities.

## Lifecycle

Contract states:

```text
DRAFT
  Contract exists but no generated artifact exists.

GENERATED
  An unsigned artifact exists.

SIGNING_REQUESTED
  A signing request exists or has been sent.

SIGNED
  A signature acceptance exists and a signed artifact was produced.

RESIGN_REQUIRED
  Rental or document inputs changed and a new signature is required.

VOID
  The contract was intentionally invalidated.
```

Signing request states:

```text
PENDING
  Request exists but has not been sent.

SENT
  Signing link has been sent.

VIEWED
  Signer opened the signing page.

SIGNED
  Signer completed the acceptance flow.

EXPIRED
  Signing link expired.

CANCELLED
  Request was cancelled.

FAILED
  Sending or signing flow failed.
```

A generated contract must have an unsigned artifact.

A signed contract must have a signature acceptance and should have a signed artifact.

A signed contract must not be silently downgraded to `GENERATED`.

Regeneration after signing must be explicit: reject it, mark the contract `RESIGN_REQUIRED`, or use an explicit versioned contract flow.

Contract signing does not automatically make the rental immutable.

If rental edits require re-signing, Contracts owns the re-signing status while Rental Commitment owns whether the rental edit itself is allowed.

## Business Rules

Generated contracts must use accepted rental facts and snapshots rather than current Pricing rules or current catalog definitions.

Generated contracts must snapshot tenant signer data rather than relying on later live tenant configuration.

Contract artifacts are immutable once recorded. Their bytes, storage key, metadata, and hash must not be overwritten. A replacement document is represented by a new artifact.

A signature acceptance must preserve the unsigned artifact reference and unsigned document hash.

A signature acceptance must preserve the legal acceptance text snapshot.

Core signing/audit facts must not exist only inside provider-specific JSON metadata.

External provider metadata must not become the sole source of signing truth.

Raw public tokens must not be persisted.

The signing token must be invalidated or cleared after successful signing.

Post-sign document access must use the separate receipt/download token rather than the signing token.

Object storage keys must not be returned directly to the public UI.

Notification delivery failure must not change contract signing truth unless the signing request itself failed.

## Boundaries

Rental Commitment owns rental lifecycle, confirmation, selections, demand lines, assignments, blocks, and accepted rental snapshots.

Contracts composes the provider-owned Rental Commitment capabilities it needs to generate documents, including current lifecycle facts, accepted pricing facts, committed selections/demand, and physical assignments. Remito composition joins committed demand and accessory-selection snapshots with their assigned Asset references, then obtains current serial numbers from Asset Inventory display facts. It does not become their owner.

Contracts must not use live Pricing calculations or current Asset Inventory data when accepted rental snapshots already contain the facts required for the document.

Tenant Management owns current tenant configuration, branding, signer configuration, permissions, branch concerns, and customer profiles. Contracts composes the individual published current facts it needs while preparing a document, but generated contracts snapshot the signer data they use.

Notifications owns message delivery and retry behavior. Contracts may request delivery of signing links or signed-document messages while remaining authoritative over signing state.

Object storage infrastructure owns storage mechanics. Contracts owns the artifact records, metadata, and document hashes.

Contracts does not control Rental Commitment state transitions. Any interaction between signing state and rental workflow must happen explicitly through public APIs or events.

Contracts owns Remito preparation, signing-request creation, invitation orchestration, public signing-session HTTP use cases, acceptance, signed artifacts, and receipts.

## Persistence / Compatibility

For contracts generated after the artifact-persistence rollout, the Contracts V2 model is the sole legal/document source of truth:

```text
V2Contract
  -> V2ContractArtifact
  -> V2DocumentSigningRequest
  -> V2DocumentSignatureAcceptance
```

`V2ContractArtifact`, `V2DocumentSigningRequest`, and `V2DocumentSignatureAcceptance` own document metadata, hashes, signing lifecycle, and acceptance evidence.

Contracts owns persistence for contract records, artifacts, signing requests, signature acceptances, public contract access tokens, document numbers, and signing status.

## References

- `apps/backend/docs/architecture/overview.md`
- `apps/backend/docs/architecture/adr/`
- `apps/backend/src/modules/tenant-management/README.md`
- `apps/backend/src/modules/rental-commitment/README.md`
