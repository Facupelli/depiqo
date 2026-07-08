import { Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DocumentSigningRequestStatus } from 'src/generated/prisma/client';
import { Result, err, ok } from 'neverthrow';

import {
  DocumentSigningRequestExpiredError,
  DocumentSigningRequestTokenNotFoundError,
  DocumentSigningRequestUnavailableError,
  SigningAcceptanceConfirmationRequiredError,
} from 'src/modules/document-signing/domain/errors/document-signing.errors';
import { DocumentSigningRequestRepository } from 'src/modules/document-signing/infrastructure/persistence/repositories/document-signing-request.repository';

import { PublicSigningSessionLoader } from '../../public-signing-session.loader';
import { AcceptPublicSigningSessionCommand } from './accept-public-signing-session.command';
import {
  AcceptPublicSigningError,
  AcceptPublicSigningInput,
  AcceptPublicSigningResult,
} from './accept-public-signing-session.contract';

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

    if (!input.accepted) {
      return err(new SigningAcceptanceConfirmationRequiredError());
    }

    let request;
    try {
      request = await this.publicSigningSessionLoader.loadRequiredPublicSession(input.rawToken);
    } catch (error) {
      if (
        error instanceof DocumentSigningRequestTokenNotFoundError ||
        error instanceof DocumentSigningRequestExpiredError ||
        error instanceof DocumentSigningRequestUnavailableError
      ) {
        return err(error);
      }

      throw error;
    }

    const signedAt = new Date();
    const signResult = request.markSigned({
      signedAt,
      signatureImageDataUrl: input.signatureImageDataUrl,
      acceptanceTextVersion: input.acceptanceTextVersion,
    });
    if (signResult.isErr()) {
      return err(signResult.error);
    }

    await this.documentSigningRequestRepository.save(request);

    return ok({
      requestId: request.id,
      status: DocumentSigningRequestStatus.SIGNED,
      signedAt,
    });
  }
}
