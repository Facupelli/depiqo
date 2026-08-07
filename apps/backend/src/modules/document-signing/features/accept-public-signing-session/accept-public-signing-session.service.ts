import { Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DocumentSigningRequestStatus } from 'src/generated/prisma/client';
import { Result, err, ok } from 'neverthrow';

import { V2ContractsPublicApi } from 'src/modules/contracts/public-api/contracts.public-api';
import { AcceptPublicSigningSessionCommand } from './accept-public-signing-session.command';
import {
  AcceptPublicSigningError,
  AcceptPublicSigningInput,
  AcceptPublicSigningResult,
} from './accept-public-signing-session.contract';
import { acceptPublicSigningSessionError } from './accept-public-signing-session.errors';

@Injectable()
@CommandHandler(AcceptPublicSigningSessionCommand)
export class AcceptPublicSigningSessionService implements ICommandHandler<
  AcceptPublicSigningSessionCommand,
  Result<AcceptPublicSigningResult, AcceptPublicSigningError>
> {
  constructor(private readonly contracts: V2ContractsPublicApi) {}

  async execute(
    command: AcceptPublicSigningSessionCommand,
  ): Promise<Result<AcceptPublicSigningResult, AcceptPublicSigningError>> {
    const input: AcceptPublicSigningInput = {
      rawToken: command.rawToken,
      signatureImageDataUrl: command.signatureImageDataUrl,
      acceptanceTextVersion: command.acceptanceTextVersion,
      accepted: command.accepted,
    };

    const context = { useCase: 'AcceptPublicSigningSession' };

    if (!input.accepted) {
      return err(
        acceptPublicSigningSessionError(
          'document_signing.acceptance_confirmation_required',
          'Signing acceptance requires explicit confirmation from the signer.',
          undefined,
          context,
        ),
      );
    }

    const signResult = await this.contracts.acceptPublicRentalRemitoSigning({
      rawToken: input.rawToken,
      signatureImageDataUrl: input.signatureImageDataUrl,
      acceptanceTextVersion: input.acceptanceTextVersion,
      acceptedIpAddress: command.acceptedIpAddress,
      acceptedUserAgent: command.acceptedUserAgent,
    });
    if (signResult.isErr()) {
      return err(
        acceptPublicSigningSessionError(
          mapPublicSessionErrorCode(signResult.error.code),
          signResult.error.message,
          signResult.error,
          context,
        ),
      );
    }

    return ok({
      requestId: signResult.value.requestId,
      status: DocumentSigningRequestStatus.SIGNED,
      signedAt: signResult.value.signedAt.toISOString(),
      downloadUrl: `/document-signing/public/receipts/signed-pdf?token=${encodeURIComponent(signResult.value.receiptToken)}`,
      receiptTokenExpiresAt: signResult.value.receiptTokenExpiresAt.toISOString(),
    });
  }
}

function mapPublicSessionErrorCode(
  code: 'SigningTokenNotFound' | 'SigningRequestExpired' | 'SigningRequestUnavailable',
): AcceptPublicSigningError['code'] {
  switch (code) {
    case 'SigningTokenNotFound':
      return 'document_signing.signing_token_not_found';
    case 'SigningRequestExpired':
      return 'document_signing.signing_request_expired';
    case 'SigningRequestUnavailable':
      return 'document_signing.signing_request_unavailable';
  }
}
