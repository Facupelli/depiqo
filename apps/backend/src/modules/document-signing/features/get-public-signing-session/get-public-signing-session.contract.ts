import { DocumentSigningRequestStatus, SigningDocumentType } from 'src/generated/prisma/client';

export interface PublicSigningSessionReadModel {
  requestId: string;
  documentType: SigningDocumentType;
  status: DocumentSigningRequestStatus;
  expiresAt: Date;
  document: {
    documentNumber: string;
    displayFileName: string;
    contentType: string;
    byteSize: number;
    sha256: string;
  };
  prefilledSigner: {
    fullName: string | null;
    documentNumber: string | null;
  };
}
