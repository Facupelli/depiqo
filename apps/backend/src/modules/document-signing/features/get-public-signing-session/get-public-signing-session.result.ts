import { V2DocumentSigningRequestStatus } from 'src/generated/prisma/enums';
import { SigningDocumentType } from 'src/generated/prisma/client';

export interface GetPublicSigningSessionResult {
  requestId: string;
  documentType: SigningDocumentType;
  status: V2DocumentSigningRequestStatus;
  expiresAt: Date | null;
  signedAt: Date | null;
  document: {
    documentNumber: string | null;
    displayFileName: string;
    contentType: string;
    byteSize: number;
    sha256: string | null;
    hashAlgorithm: string | null;
  };
  signer: {
    name: string;
    email: string | null;
    phone: string | null;
  };
  acceptance: {
    textVersion: string;
    textSnapshot: string;
  };
}
