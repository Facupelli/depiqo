# Contracts

Contracts turns rental facts into document artifacts and owns the resulting rental agreements, signing state, acceptance evidence, and post-signing document access. It does not own the rental commitment itself.

The signed Rental Remito is the legally binding rental agreement used by the product. It contains the relevant rental-owner/tenant and customer information, rental equipment, rental period, pricing information, and a legal annex containing the contractual terms of the rental. Contract/signing state is separate from Rental Commitment lifecycle state.

## Domain concepts

### Rental Contract / Remito

The Rental Remito is the rental agreement associated with a rental and the contractual document presented to the customer for signing.

The logical contract/document state is distinct from the concrete rendered document artifact. Contracts can also produce document previews/budgets for draft rentals; those documents are not the signed Rental Remito.

### Contract Artifact

A Contract Artifact is the concrete rendered document associated with the logical contract.

- The unsigned artifact is the exact agreement presented for review and acceptance.
- The signed artifact is the resulting signed document.
- A replacement or regenerated document is a new artifact, not a mutation of a previous historical artifact.

The exact document presented to the signer must remain identifiable so acceptance evidence can be tied to those exact bytes.

### Signing Request

A Signing Request grants a recipient access to review and accept a particular unsigned rental agreement artifact. It is not itself proof that the agreement was accepted.

### Signature Acceptance

Signature Acceptance is the preserved evidence that a particular rental agreement artifact was accepted. It remains tied to the exact unsigned artifact presented to the signer.

Acceptance evidence may preserve the acknowledgement wording presented during signing and document identity/hash information needed to identify the accepted artifact. Versioning acknowledgement text versions the signing acknowledgement text only; it does not version the complete legal annex.

## Historical document semantics

A generated rental agreement is a historical rendering of the facts presented to the signer. It must preserve those facts well enough to remain understandable after mutable source information changes elsewhere.

Those facts can include:

- the parties represented in the agreement;
- equipment and quantities;
- serial or reference information represented in the document;
- rental period;
- accepted price presentation;
- insurance information;
- tenant signer facts;
- legal terms presented in the document.

Later rental changes must not rewrite previously generated or signed artifacts. If an edit requires a new agreement, the new document is a new historical artifact, and previous artifacts and acceptance evidence remain historical.

## Signing and receipt access

Signing access and post-signing receipt/download access serve different purposes:

- Signing access allows review and acceptance of a particular unsigned artifact. After successful signing, that signing credential must no longer authorize another acceptance.
- Receipt access is read-only access to the resulting signed artifact.

## Rental edits and re-signing

Rental Commitment owns whether and how a rental may be edited. Contracts owns the consequences of an edit for existing rental agreements and signing state.

An edit may invalidate the current document/signing state and require generation and acceptance of a new agreement. Previously generated and signed artifacts, together with their acceptance evidence, remain historical rather than being rewritten.

Signing a Rental Remito does not make Rental Commitment itself immutable. Rental Commitment remains authoritative for whether rental changes are allowed; Contracts owns the resulting document and signing consequences.

## Tenant signer facts

Tenant Management owns current Tenant Contract Signer configuration. Contracts preserves the signer facts represented in a generated rental agreement so later Tenant Management changes do not reinterpret the historical document.

## Boundaries

- Rental Commitment owns rental lifecycle and accepted rental facts; Contracts turns those facts into rental agreements and owns document/signing truth.
- Tenant Management owns current tenant, customer, and signer facts; Contracts preserves the facts represented in a generated agreement.
- Asset Inventory owns current physical asset facts; document artifacts preserve the equipment facts represented when generated.
