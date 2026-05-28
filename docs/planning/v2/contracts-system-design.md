# V2 Contracts and Signing Model

This document explains the purpose of the V2 contract/signing tables and how they work together to provide auditable proof that a rental contract document was signed.

The design separates four concepts that were previously mixed into a single signing/request-style model:

```text
V2Contract
  The logical/legal contract for a rental order.

V2ContractArtifact
  A concrete generated document file, such as the unsigned PDF or signed PDF.

V2DocumentSigningRequest
  The public signing invitation/session used by a signer to access and sign the document.

V2DocumentSignatureAcceptance
  The immutable audit proof that a signer accepted/signed a specific document artifact.
```

This split is inspired by Schema.org concepts, but it is not a direct copy:

```text
DigitalDocument
  -> V2Contract

MediaObject / encoding
  -> V2ContractArtifact

AgreeAction
  -> V2DocumentSignatureAcceptance

ActionStatus
  -> V2DocumentSigningRequestStatus
```

The important idea is that the document, its file representation, the signing invitation, and the signing act are different things.

---

## 1. V2Contract

`V2Contract` is the business/legal contract record for a rental order.

It answers:

```text
What contract exists for this rental?
What is its current lifecycle state?
What rental snapshot was used to generate it?
What legal/business document number identifies it?
```

Suggested model:

```prisma
enum V2ContractStatus {
  DRAFT
  GENERATED
  SIGNING_REQUESTED
  SIGNED
  RESIGN_REQUIRED
  VOID
}

model V2Contract {
  id             String           @id @default(uuid())
  tenantId       String           @map("tenant_id")
  rentalId       String           @map("rental_id")

  documentNumber String?          @map("document_number")
  status         V2ContractStatus @default(DRAFT)

  snapshot       Json             @default("{}")

  createdAt      DateTime         @default(now()) @map("created_at")
  updatedAt      DateTime         @updatedAt @map("updated_at")
  generatedAt    DateTime?        @map("generated_at")
  signedAt       DateTime?        @map("signed_at")
  voidedAt       DateTime?        @map("voided_at")

  artifacts       V2ContractArtifact[]
  signingRequests V2DocumentSigningRequest[]
  acceptances     V2DocumentSignatureAcceptance[]

  @@unique([tenantId, rentalId])
  @@unique([tenantId, documentNumber])
  @@index([tenantId, rentalId, status])
  @@map("v2_contracts")
}
```

### Status meaning

```text
DRAFT
  Contract record exists, but no generated PDF exists yet.

GENERATED
  An unsigned PDF artifact exists.

SIGNING_REQUESTED
  A signing invitation/session has been created or sent.

SIGNED
  A signature acceptance exists and a signed PDF artifact was produced.

RESIGN_REQUIRED
  The rental/contract inputs changed after generation or signing.
  A new signature is required before the contract is considered valid again.

VOID
  The contract was intentionally invalidated.
```

### Why `snapshot` lives here

The contract should be generated from a snapshot of the rental, tenant signer data, customer data, pricing, selections, assigned assets, delivery details, and legal text inputs.

Old contracts must not change if later:

```text
the rental is edited,
the customer profile changes,
the tenant signer changes,
the template changes,
pricing changes,
or assets are reassigned.
```

So `snapshot` is the contract-generation source at that moment in time.

---

## 2. V2ContractArtifact

`V2ContractArtifact` stores metadata for generated document files.

It replaces overloaded fields such as:

```text
documentKey
pdfStorageKey
pdfFileName
pdfContentType
pdfByteSize
documentHash
public signed/unsigned PDF metadata
```

Instead of storing one or many nullable file fields on `V2Contract` or `V2DocumentSigningRequest`, each file is represented as its own artifact.

Suggested model:

```prisma
enum V2ContractArtifactKind {
  UNSIGNED_PDF
  SIGNED_PDF
}

enum V2ContractArtifactVisibility {
  INTERNAL
  PUBLIC
}

model V2ContractArtifact {
  id         String                       @id @default(uuid())
  tenantId   String                       @map("tenant_id")
  contractId String                       @map("contract_id")

  kind       V2ContractArtifactKind
  visibility V2ContractArtifactVisibility @default(INTERNAL)

  storageKey  String @map("storage_key")
  fileName    String @map("file_name")
  contentType String @map("content_type")
  byteSize    Int    @map("byte_size")

  hashAlgorithm String? @map("hash_algorithm")
  documentHash  String? @map("document_hash")

  createdAt DateTime @default(now()) @map("created_at")

  contract V2Contract @relation(fields: [contractId], references: [id])

  acceptedAsUnsignedIn V2DocumentSignatureAcceptance[] @relation("UnsignedArtifactAccepted")
  producedAsSignedIn   V2DocumentSignatureAcceptance[] @relation("SignedArtifactProduced")

  @@index([tenantId, contractId, kind])
  @@index([tenantId, contractId, kind, visibility])
  @@map("v2_contract_artifacts")
}
```

### Artifact kinds

```text
UNSIGNED_PDF
  The generated PDF before signing.
  This is the document the signer sees and accepts.

SIGNED_PDF
  The final PDF after signature/acceptance evidence has been applied.
```

### Why hashes matter

`documentHash` allows the system to prove which exact PDF bytes were signed or accepted.

Recommended default:

```text
hashAlgorithm = SHA-256
documentHash = SHA-256 hash of the PDF bytes
```

The signing acceptance should reference the unsigned artifact and copy its hash. This lets the audit record answer:

```text
Which exact unsigned document did the signer accept?
```

The signed artifact should also have its own hash, because the final PDF is a different binary file.

### Public vs internal files

If the system stores separate public copies, use:

```text
UNSIGNED_PDF / PUBLIC
SIGNED_PDF / PUBLIC
```

If the system only stores private files and generates signed URLs, `visibility` can still exist but may always be `INTERNAL` initially.

---

## 3. V2DocumentSigningRequest

`V2DocumentSigningRequest` represents the signing invitation/session.

It is not the signature proof itself. It is the mechanism that allows a signer to access and sign a contract.

It answers:

```text
Who was invited to sign?
What token/session gives them access?
Was the signing link sent, viewed, expired, cancelled, or signed?
```

Suggested model:

```prisma
enum V2DocumentSigningRequestStatus {
  PENDING
  SENT
  VIEWED
  SIGNED
  EXPIRED
  CANCELLED
  FAILED
}

model V2DocumentSigningRequest {
  id         String                         @id @default(uuid())
  tenantId   String                         @map("tenant_id")
  contractId String                         @map("contract_id")
  rentalId   String                         @map("rental_id")

  signerName  String  @map("signer_name")
  signerEmail String? @map("signer_email")
  signerPhone String? @map("signer_phone")

  tokenHash String? @unique @map("token_hash")

  status V2DocumentSigningRequestStatus @default(PENDING)

  providerData Json @default("{}") @map("provider_data")

  sentAt      DateTime? @map("sent_at")
  viewedAt    DateTime? @map("viewed_at")
  signedAt    DateTime? @map("signed_at")
  expiresAt   DateTime? @map("expires_at")
  cancelledAt DateTime? @map("cancelled_at")
  failedAt    DateTime? @map("failed_at")

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  contract   V2Contract @relation(fields: [contractId], references: [id])
  acceptance V2DocumentSignatureAcceptance?

  @@index([tenantId, rentalId, status])
  @@index([tenantId, contractId, status])
  @@index([contractId])
  @@map("v2_document_signing_requests")
}
```

### Token handling

The public signing URL should contain a random raw token.

The database should store only:

```text
tokenHash
```

Never store the raw token.

Example flow:

```text
Generate raw token
  -> send raw token in public URL
  -> store hash(raw token) in tokenHash
```

When the signer opens the link:

```text
hash(received token)
  -> find signing request by tokenHash
```

### Status meaning

```text
PENDING
  Request exists but has not been sent yet.

SENT
  Signing link has been sent.

VIEWED
  Signer opened the public signing page.

SIGNED
  Signer completed acceptance/signature.

EXPIRED
  Link expired.

CANCELLED
  Tenant or system cancelled the request.

FAILED
  Sending/signing provider flow failed.
```

### Provider data

`providerData` is only integration metadata.

Example:

```json
{
  "provider": "docuseal",
  "submissionId": "...",
  "templateId": "...",
  "signerId": "..."
}
```

It should not be the only audit source of truth. The local system should still store its own artifacts, hashes, signer snapshot, acceptance text, timestamps, and evidence.

---

## 4. V2DocumentSignatureAcceptance

`V2DocumentSignatureAcceptance` is the core audit-proof table.

It represents the act of a signer accepting/signing a specific document artifact. In Schema.org terms, this is the local equivalent of an `AgreeAction`.

It answers:

```text
Who signed?
What exact document did they accept?
When did they accept it?
From what IP/device context?
What legal acceptance text did they agree to?
What signature evidence was captured?
What signed PDF was produced?
```

Suggested model:

```prisma
model V2DocumentSignatureAcceptance {
  id               String @id @default(uuid())
  tenantId         String @map("tenant_id")
  contractId       String @map("contract_id")
  signingRequestId String @unique @map("signing_request_id")

  signerName  String  @map("signer_name")
  signerEmail String? @map("signer_email")
  signerPhone String? @map("signer_phone")

  signatureImageDataUrl String? @map("signature_image_data_url")
  signatureStorageKey   String? @map("signature_storage_key")
  signatureContentType  String? @map("signature_content_type")
  signatureByteSize     Int?    @map("signature_byte_size")

  acceptanceTextVersion  String @map("acceptance_text_version")
  acceptanceTextSnapshot String @map("acceptance_text_snapshot")

  unsignedArtifactId String  @map("unsigned_artifact_id")
  signedArtifactId   String? @map("signed_artifact_id")

  unsignedDocumentHash String  @map("unsigned_document_hash")
  signedDocumentHash   String? @map("signed_document_hash")
  hashAlgorithm        String  @default("SHA-256") @map("hash_algorithm")

  acceptedAt        DateTime @map("accepted_at")
  acceptedIpAddress String?  @map("accepted_ip_address")
  acceptedUserAgent String?  @map("accepted_user_agent")

  evidence Json @default("{}")

  createdAt DateTime @default(now()) @map("created_at")

  contract       V2Contract               @relation(fields: [contractId], references: [id])
  signingRequest V2DocumentSigningRequest @relation(fields: [signingRequestId], references: [id])

  unsignedArtifact V2ContractArtifact  @relation("UnsignedArtifactAccepted", fields: [unsignedArtifactId], references: [id])
  signedArtifact   V2ContractArtifact? @relation("SignedArtifactProduced", fields: [signedArtifactId], references: [id])

  @@index([tenantId, contractId])
  @@index([tenantId, acceptedAt])
  @@map("v2_document_signature_acceptances")
}
```

### Why this table exists

This table is the auditable proof that signing happened.

`V2DocumentSigningRequest.signedAt` is useful for status, but not enough for auditability.

The acceptance record should preserve:

```text
signer identity snapshot
unsigned document artifact id
unsigned document hash
acceptance text version
acceptance text snapshot
signature evidence
timestamp
IP address
user agent
signed artifact id/hash
```

### Acceptance text

Store both:

```text
acceptanceTextVersion
acceptanceTextSnapshot
```

The version helps identify the legal wording version.

The snapshot preserves the exact text accepted at the time.

This matters because the global acceptance text may change later.

### Signature image

For MVP, `signatureImageDataUrl` may be acceptable if signatures are small.

For a cleaner file-storage design, prefer:

```text
signatureStorageKey
signatureContentType
signatureByteSize
```

Either way, the signature data belongs to the acceptance record, not to the signing request.

### Evidence JSON

`evidence` is optional structured extra data for audit purposes.

Possible fields:

```json
{
  "tokenHashUsed": "...",
  "publicSigningSessionId": "...",
  "checkboxes": {
    "acceptedTerms": true,
    "confirmedIdentity": true
  },
  "browser": {
    "language": "es-AR",
    "timezone": "America/Argentina/San_Juan"
  }
}
```

Avoid putting required core audit fields only inside JSON. Important fields should stay as columns.

---

## 5. Required Prisma inverse relations

Because `V2DocumentSignatureAcceptance` has two named relations to `V2ContractArtifact`, the artifact model needs inverse relation fields.

```prisma
model V2ContractArtifact {
  // ...

  acceptedAsUnsignedIn V2DocumentSignatureAcceptance[] @relation("UnsignedArtifactAccepted")
  producedAsSignedIn   V2DocumentSignatureAcceptance[] @relation("SignedArtifactProduced")
}
```

These are arrays because an artifact may theoretically be referenced by multiple acceptances in future flows, such as multiple signers or re-sign attempts.

The complete relation shape is:

```prisma
model V2Contract {
  // ...
  artifacts       V2ContractArtifact[]
  signingRequests V2DocumentSigningRequest[]
  acceptances     V2DocumentSignatureAcceptance[]
}

model V2DocumentSigningRequest {
  // ...
  contract   V2Contract @relation(fields: [contractId], references: [id])
  acceptance V2DocumentSignatureAcceptance?
}

model V2ContractArtifact {
  // ...
  contract V2Contract @relation(fields: [contractId], references: [id])

  acceptedAsUnsignedIn V2DocumentSignatureAcceptance[] @relation("UnsignedArtifactAccepted")
  producedAsSignedIn   V2DocumentSignatureAcceptance[] @relation("SignedArtifactProduced")
}

model V2DocumentSignatureAcceptance {
  // ...
  contract       V2Contract               @relation(fields: [contractId], references: [id])
  signingRequest V2DocumentSigningRequest @relation(fields: [signingRequestId], references: [id])

  unsignedArtifact V2ContractArtifact  @relation("UnsignedArtifactAccepted", fields: [unsignedArtifactId], references: [id])
  signedArtifact   V2ContractArtifact? @relation("SignedArtifactProduced", fields: [signedArtifactId], references: [id])
}
```

---

## 6. Lifecycle flows

### Flow A: Generate contract

Command:

```text
PrepareRentalContractForSigning
```

Steps:

```text
1. Load the rental.
2. Build contract snapshot from rental, tenant signer, customer, selections, pricing, delivery, assigned assets, etc.
3. Create or update V2Contract.
4. Generate unsigned PDF from the snapshot.
5. Store PDF in object storage.
6. Compute SHA-256 hash of the PDF bytes.
7. Create V2ContractArtifact(kind = UNSIGNED_PDF).
8. Mark V2Contract.status = GENERATED.
9. Set V2Contract.generatedAt.
```

Important invariant:

```text
Do not blindly downgrade a SIGNED contract to GENERATED.
```

If the rental changes after signing, prefer:

```text
mark RESIGN_REQUIRED
```

or reject with a domain error requiring explicit re-sign flow.

### Flow B: Send signing invitation

Command:

```text
SendSigningInvitation
```

Steps:

```text
1. Validate contract status is GENERATED or RESIGN_REQUIRED with a fresh unsigned artifact.
2. Validate an unsigned PDF artifact exists.
3. Generate random public signing token.
4. Store tokenHash on V2DocumentSigningRequest.
5. Create or update signing request with status SENT.
6. Send email/WhatsApp/public signing link.
7. Mark contract status = SIGNING_REQUESTED.
```

### Flow C: Open public signing page

Query:

```text
GetPublicSigningSessionByToken
```

Steps:

```text
1. Hash received token.
2. Find signing request by tokenHash.
3. Validate status is SENT or VIEWED.
4. Validate expiresAt.
5. Mark viewedAt if first view.
6. Return signer info, contract summary, unsigned PDF access URL, and acceptance text.
```

Do not expose storage keys directly. Return a temporary signed URL or stream through the backend.

### Flow D: Accept/sign document

Command:

```text
AcceptPublicSigningSession
```

Steps:

```text
1. Hash token and load signing request.
2. Validate request status and expiry.
3. Load contract.
4. Load unsigned PDF artifact.
5. Validate/resolve acceptance text version and snapshot.
6. Store signature image if applicable.
7. Create V2DocumentSignatureAcceptance with:
   - signer snapshot
   - request id
   - unsignedArtifactId
   - unsignedDocumentHash
   - acceptance text version/snapshot
   - IP/user agent
   - acceptedAt
   - evidence
8. Generate signed PDF by applying signature/acceptance evidence.
9. Store signed PDF artifact.
10. Compute signed PDF hash.
11. Update acceptance with signedArtifactId and signedDocumentHash.
12. Mark signing request SIGNED and signedAt.
13. Mark contract SIGNED and signedAt.
```

### Flow E: Audit/proof view

Query:

```text
GetContractSigningProof
```

Returns:

```ts
type ContractSigningProof = {
  contractId: string;
  documentNumber?: string;
  status: 'SIGNED';
  signer: {
    name: string;
    email?: string;
    phone?: string;
  };
  acceptedAt: string;
  acceptedIpAddress?: string;
  acceptedUserAgent?: string;
  acceptanceTextVersion: string;
  acceptanceTextSnapshot: string;
  unsignedDocumentHash: string;
  signedDocumentHash?: string;
  signedPdfFileName?: string;
};
```

---

## 7. Design rules

### Rule 1: Signing request is not the audit proof

`V2DocumentSigningRequest` tracks the invitation/session lifecycle.

`V2DocumentSignatureAcceptance` is the immutable signing proof.

### Rule 2: Contract is not the PDF file

`V2Contract` is the logical/legal document.

`V2ContractArtifact` is the generated file representation.

### Rule 3: Store hashes for proof

Store hashes for both unsigned and signed artifacts.

At minimum, the acceptance must preserve the unsigned document hash.

### Rule 4: Snapshot legal text

Do not only store `acceptanceTextVersion`.

Store the actual `acceptanceTextSnapshot` too.

### Rule 5: Do not store raw public tokens

Store `tokenHash`.

The raw token should only exist in the outbound signing URL and incoming request.

### Rule 6: Do not let generated contracts overwrite signed contracts silently

If a signed contract needs changes, use `RESIGN_REQUIRED` or create a versioned contract flow.

### Rule 7: Keep provider data secondary

External provider metadata can live in `providerData`, but your own audit proof should be first-class in your schema.

---

## 8. Summary

The final model is:

```text
V2Contract
  Legal/business contract for one rental.

V2ContractArtifact
  Generated document file metadata and hashes.

V2DocumentSigningRequest
  Public signing invitation/session.

V2DocumentSignatureAcceptance
  Immutable proof that a signer accepted a specific document.
```

This gives the system an auditable answer to:

```text
Who signed what, when, and with what evidence?
```
