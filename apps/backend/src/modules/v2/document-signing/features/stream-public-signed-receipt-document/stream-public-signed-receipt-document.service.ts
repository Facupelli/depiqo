import { Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Result, err, ok } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { V2ContractArtifactKind } from 'src/generated/prisma/enums';

import { SigningPdfStorageService } from '../../application/signing-pdf-storage.service';
import { SigningReceiptTokenService } from '../../application/signing-receipt-token.service';
import {
  PublicReceiptExpiredError,
  PublicReceiptNotFoundError,
  PublicReceiptSignedArtifactMissingError,
  PublicReceiptTokenRequiredError,
} from '../../domain/errors/document-signing.errors';
import { StreamPublicSignedReceiptDocumentResult } from './stream-public-signed-receipt-document.result';
import { StreamPublicSignedReceiptDocumentQuery } from './stream-public-signed-receipt-document.query';

export type StreamPublicSignedReceiptDocumentQueryError =
  | PublicReceiptTokenRequiredError
  | PublicReceiptNotFoundError
  | PublicReceiptExpiredError
  | PublicReceiptSignedArtifactMissingError;

@Injectable()
@QueryHandler(StreamPublicSignedReceiptDocumentQuery)
export class StreamPublicSignedReceiptDocumentService implements IQueryHandler<
  StreamPublicSignedReceiptDocumentQuery,
  Result<StreamPublicSignedReceiptDocumentResult, StreamPublicSignedReceiptDocumentQueryError>
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly receiptTokenService: SigningReceiptTokenService,
    private readonly signingPdfStorageService: SigningPdfStorageService,
  ) {}

  async execute(
    query: StreamPublicSignedReceiptDocumentQuery,
  ): Promise<Result<StreamPublicSignedReceiptDocumentResult, StreamPublicSignedReceiptDocumentQueryError>> {
    const rawReceiptToken = normalizeToken(query.rawReceiptToken);

    if (!rawReceiptToken) {
      return err(new PublicReceiptTokenRequiredError());
    }

    const receiptTokenHash = this.receiptTokenService.hashToken(rawReceiptToken);
    const now = new Date();

    const acceptance = await this.prisma.client.v2DocumentSignatureAcceptance.findUnique({
      where: {
        receiptTokenHash,
      },
      include: {
        signedArtifact: {
          select: {
            id: true,
            kind: true,
            storageKey: true,
            fileName: true,
            contentType: true,
            byteSize: true,
          },
        },
      },
    });

    if (!acceptance) {
      return err(new PublicReceiptNotFoundError());
    }

    if (acceptance.receiptTokenExpiresAt && acceptance.receiptTokenExpiresAt.getTime() <= now.getTime()) {
      return err(new PublicReceiptExpiredError());
    }

    if (!acceptance.signedArtifact || acceptance.signedArtifact.kind !== V2ContractArtifactKind.SIGNED_PDF) {
      return err(new PublicReceiptSignedArtifactMissingError());
    }

    const stream = await this.signingPdfStorageService.streamPdf(acceptance.signedArtifact.storageKey);

    await this.prisma.client.v2DocumentSignatureAcceptance.update({
      where: {
        id: acceptance.id,
      },
      data: {
        receiptDownloadedAt: now,
      },
    });

    return ok({
      stream,
      fileName: acceptance.signedArtifact.fileName,
      contentType: acceptance.signedArtifact.contentType,
      byteSize: acceptance.signedArtifact.byteSize,
    });
  }
}

function normalizeToken(value: string | null | undefined): string | null {
  const normalized = value?.trim();

  return normalized && normalized.length > 0 ? normalized : null;
}
