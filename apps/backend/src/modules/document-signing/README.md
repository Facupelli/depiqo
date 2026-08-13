# Document Signing Module

Document Signing retains legacy signing support only.

It owns the legacy `document_signing_requests` persistence model, its entity, repository, mapper, legacy signing-summary queries, and latest-signed legacy query behavior. Those records remain readable for compatibility until an explicit legacy retirement effort.

Contracts owns the V2 rental Remito signing lifecycle, including unsigned artifact preparation, signing-request creation, invitation orchestration and delivery requests, public signing sessions, acceptance, signed artifacts, and receipts.

Do not add V2 signing writes, invitation orchestration, or Contract signing-state behavior to this module.
