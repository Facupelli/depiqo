import { Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Result, err, ok } from 'neverthrow';

import { SigningDocumentType } from 'src/generated/prisma/client';
import { V2DocumentSigningRequestStatus } from 'src/generated/prisma/enums';

import {
  PublicSigningSessionLoader,
  PublicSigningSessionLoaderError,
} from '../../application/public-signing-session.loader';
import { SigningAcceptanceTextService } from '../../application/signing-acceptance-text.service';
import { GetPublicSigningSessionResult } from './get-public-signing-session.result';
import { GetPublicSigningSessionQuery } from './get-public-signing-session.query';

export type GetPublicSigningSessionQueryError = PublicSigningSessionLoaderError;

@Injectable()
@QueryHandler(GetPublicSigningSessionQuery)
export class GetPublicSigningSessionService implements IQueryHandler<
  GetPublicSigningSessionQuery,
  Result<GetPublicSigningSessionResult, GetPublicSigningSessionQueryError>
> {
  constructor(
    private readonly publicSigningSessionLoader: PublicSigningSessionLoader,
    private readonly acceptanceTextService: SigningAcceptanceTextService,
  ) {}

  async execute(
    query: GetPublicSigningSessionQuery,
  ): Promise<Result<GetPublicSigningSessionResult, GetPublicSigningSessionQueryError>> {
    const sessionResult = await this.publicSigningSessionLoader.load({
      rawToken: query.rawToken,
      allowedStatuses: [V2DocumentSigningRequestStatus.SENT, V2DocumentSigningRequestStatus.VIEWED],
      markViewed: true,
    });

    if (sessionResult.isErr()) {
      return err(sessionResult.error);
    }

    const session = sessionResult.value;
    const acceptanceText = this.acceptanceTextService.getCurrentAcceptanceText();

    return ok({
      requestId: session.id,
      documentType: SigningDocumentType.RENTAL_AGREEMENT,
      status: session.status,
      expiresAt: session.expiresAt,
      signedAt: session.signedAt,
      document: {
        // TODO: fix documentNumber in session
        documentNumber: resolveDocumentNumber(session.providerData, ''),
        displayFileName: session.unsignedArtifact.fileName,
        contentType: session.unsignedArtifact.contentType,
        byteSize: session.unsignedArtifact.byteSize,
        sha256: session.unsignedArtifact.documentHash,
        hashAlgorithm: session.unsignedArtifact.hashAlgorithm,
      },
      signer: {
        name: session.signerName,
        email: session.signerEmail,
        phone: session.signerPhone,
      },
      acceptance: {
        textVersion: acceptanceText.version,
        textSnapshot: acceptanceText.text,
      },
    });
  }
}

function resolveDocumentNumber(providerData: unknown, fallback: string | null): string | null {
  if (!providerData || typeof providerData !== 'object') {
    return fallback;
  }

  const value = (providerData as { documentNumber?: unknown }).documentNumber;

  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}
