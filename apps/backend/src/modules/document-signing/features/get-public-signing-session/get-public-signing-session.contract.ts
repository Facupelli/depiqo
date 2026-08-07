import { SigningDocumentType } from 'src/generated/prisma/client';

export interface PublicSigningSessionReadModel {
  requestId: string;
  documentType: SigningDocumentType;
  status: 'PENDING' | 'SENT' | 'VIEWED';
  expiresAt: string;
  signedAt: null;
  document: {
    documentNumber: string;
    displayFileName: string;
    contentType: string;
    byteSize: number;
    sha256: string;
    hashAlgorithm: 'SHA-256';
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
