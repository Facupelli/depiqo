import { Prisma } from 'src/generated/prisma/client';

import { DocumentSigningRequest } from 'src/modules/document-signing/domain/entities/document-signing-request.entity';

export class DocumentSigningRequestMapper {
  static toDomain(record: Prisma.DocumentSigningRequestGetPayload<Record<string, never>>): DocumentSigningRequest {
    return DocumentSigningRequest.reconstitute({
      id: record.id,
      tenantId: record.tenantId,
      orderId: record.orderId,
      customerId: record.customerId,
      documentType: record.documentType,
      documentNumber: record.documentNumber,
      recipientEmail: record.recipientEmail,
      tokenHash: record.tokenHash,
      documentHash: record.documentHash,
      pdfStorageKey: record.pdfStorageKey,
      pdfFileName: record.pdfFileName,
      pdfContentType: record.pdfContentType,
      pdfByteSize: record.pdfByteSize,
      status: record.status,
      expiresAt: record.expiresAt,
      signedAt: record.signedAt,
      signerFullName: record.signerFullName,
      signerDocumentNumber: record.signerDocumentNumber,
      signatureImageDataUrl: record.signatureImageDataUrl,
      acceptanceTextVersion: record.acceptanceTextVersion,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toPersistence(request: DocumentSigningRequest): Prisma.DocumentSigningRequestUncheckedCreateInput {
    return {
      id: request.id,
      tenantId: request.tenantId,
      orderId: request.orderId,
      customerId: request.customerId,
      documentType: request.documentType,
      documentNumber: request.documentNumber,
      recipientEmail: request.currentRecipientEmail,
      tokenHash: request.currentTokenHash,
      documentHash: request.documentHash,
      pdfStorageKey: request.currentPdfStorageKey,
      pdfFileName: request.currentPdfFileName,
      pdfContentType: request.currentPdfContentType,
      pdfByteSize: request.currentPdfByteSize,
      status: request.currentStatus,
      expiresAt: request.expiresOn,
      signedAt: request.signedOn,
      signerFullName: request.currentSignerFullName,
      signerDocumentNumber: request.currentSignerDocumentNumber,
      signatureImageDataUrl: request.currentSignatureImageDataUrl,
      acceptanceTextVersion: request.currentAcceptanceTextVersion,
      createdAt: request.createdAt,
      updatedAt: request.updatedOn,
    };
  }
}
