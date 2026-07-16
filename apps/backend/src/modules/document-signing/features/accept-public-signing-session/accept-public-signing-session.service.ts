import { Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DocumentSigningRequestStatus } from 'src/generated/prisma/client';
import { Result, err, ok } from 'neverthrow';

import { SigningAcceptanceIdentityRequiredError } from 'src/modules/document-signing/domain/errors/document-signing.errors';
import { DocumentSigningRequestRepository } from 'src/modules/document-signing/infrastructure/persistence/repositories/document-signing-request.repository';

import { PublicSigningSessionLoader } from '../../application/public-signing-session.loader';
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
  constructor(
    private readonly publicSigningSessionLoader: PublicSigningSessionLoader,
    private readonly documentSigningRequestRepository: DocumentSigningRequestRepository,
  ) {}

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

    const requestResult = await this.publicSigningSessionLoader.loadRequiredPublicSession(input.rawToken);
    if (requestResult.isErr()) {
      return err(
        acceptPublicSigningSessionError(
          mapPublicSessionErrorCode(requestResult.error.code),
          requestResult.error.message,
          requestResult.error,
          requestResult.error.context,
        ),
      );
    }

    const request = requestResult.value;

    const signedAt = new Date();
    const signResult = request.markSigned({
      signedAt,
      signatureImageDataUrl: input.signatureImageDataUrl,
      acceptanceTextVersion: input.acceptanceTextVersion,
    });
    if (signResult.isErr()) {
      const code =
        signResult.error instanceof SigningAcceptanceIdentityRequiredError
          ? 'document_signing.signing_identity_required'
          : 'document_signing.signing_request_conflict';

      return err(
        acceptPublicSigningSessionError(code, signResult.error.message, signResult.error, {
          ...context,
          requestId: request.id,
        }),
      );
    }

    await this.documentSigningRequestRepository.save(request);

    return ok({
      requestId: request.id,
      status: DocumentSigningRequestStatus.SIGNED,
      signedAt,
    });
  }
}

function mapPublicSessionErrorCode(code: string): AcceptPublicSigningError['code'] {
  switch (code) {
    case 'document_signing.signing_token_not_found':
    case 'document_signing.signing_request_expired':
    case 'document_signing.signing_request_unavailable':
    case 'document_signing.signing_request_conflict':
      return code;
    default:
      throw new Error(`Unsupported accept public signing session error code: ${code}`);
  }
}
