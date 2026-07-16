import { createHash } from 'crypto';

import { Injectable } from '@nestjs/common';
import { Result, err, ok } from 'neverthrow';

import { DocumentSigningRequestStatus } from 'src/generated/prisma/client';
import { DocumentSigningRequest } from '../domain/entities/document-signing-request.entity';
import { publicSigningSessionError, PublicSigningSessionError } from './public-signing-session.errors';
import { DocumentSigningRequestRepository } from '../infrastructure/persistence/repositories/document-signing-request.repository';

@Injectable()
export class PublicSigningSessionLoader {
  constructor(private readonly documentSigningRequestRepository: DocumentSigningRequestRepository) {}

  async loadRequiredPublicSession(
    rawToken: string,
  ): Promise<Result<DocumentSigningRequest, PublicSigningSessionError>> {
    const sessionResult = await this.loadRequiredSessionByToken(rawToken);
    if (sessionResult.isErr()) {
      return err(sessionResult.error);
    }

    const request = sessionResult.value;
    const context = { requestId: request.id, status: request.currentStatus };
    const now = new Date();

    if (
      request.currentStatus === DocumentSigningRequestStatus.PENDING &&
      request.expiresOn.getTime() <= now.getTime()
    ) {
      const expireResult = request.expire(now);
      if (expireResult.isErr()) {
        return err(
          publicSigningSessionError(
            'document_signing.signing_request_conflict',
            expireResult.error.message,
            expireResult.error,
            context,
          ),
        );
      }

      await this.documentSigningRequestRepository.save(request);
      return err(
        publicSigningSessionError(
          'document_signing.signing_request_expired',
          `Document signing request '${request.id}' has expired.`,
          undefined,
          context,
        ),
      );
    }

    if (request.currentStatus === DocumentSigningRequestStatus.EXPIRED) {
      return err(
        publicSigningSessionError(
          'document_signing.signing_request_expired',
          `Document signing request '${request.id}' has expired.`,
          undefined,
          context,
        ),
      );
    }

    if (
      request.currentStatus === DocumentSigningRequestStatus.SIGNED ||
      request.currentStatus === DocumentSigningRequestStatus.VOIDED
    ) {
      return err(
        publicSigningSessionError(
          'document_signing.signing_request_unavailable',
          `Document signing request '${request.id}' is not available for public signing because it is '${request.currentStatus}'.`,
          undefined,
          context,
        ),
      );
    }

    return ok(request);
  }

  async loadRequiredSignedPublicSession(
    rawToken: string,
  ): Promise<Result<DocumentSigningRequest, PublicSigningSessionError>> {
    const sessionResult = await this.loadRequiredSessionByToken(rawToken);
    if (sessionResult.isErr()) {
      return err(sessionResult.error);
    }

    const request = sessionResult.value;
    if (request.currentStatus !== DocumentSigningRequestStatus.SIGNED) {
      return err(
        publicSigningSessionError(
          'document_signing.signing_request_unavailable',
          `Document signing request '${request.id}' is not available because it is '${request.currentStatus}'.`,
          undefined,
          { requestId: request.id, status: request.currentStatus },
        ),
      );
    }

    return ok(request);
  }

  private async loadRequiredSessionByToken(
    rawToken: string,
  ): Promise<Result<DocumentSigningRequest, PublicSigningSessionError>> {
    const normalizedToken = rawToken.trim();
    if (normalizedToken.length === 0) {
      return err(publicSigningSessionError('document_signing.signing_token_not_found', 'Signing token was not found.'));
    }

    const request = await this.documentSigningRequestRepository.findByTokenHash(hashString(normalizedToken));
    if (!request) {
      return err(publicSigningSessionError('document_signing.signing_token_not_found', 'Signing token was not found.'));
    }

    return ok(request);
  }
}

function hashString(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
