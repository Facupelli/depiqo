import { createHash } from 'crypto';

import { Injectable } from '@nestjs/common';

import { DocumentSigningRequestStatus } from 'src/generated/prisma/client';
import { DocumentSigningRequest } from '../domain/entities/document-signing-request.entity';
import {
  DocumentSigningRequestExpiredError,
  DocumentSigningRequestTokenNotFoundError,
  DocumentSigningRequestUnavailableError,
} from '../domain/errors/document-signing.errors';
import { DocumentSigningRequestRepository } from '../infrastructure/persistence/repositories/document-signing-request.repository';

@Injectable()
export class PublicSigningSessionLoader {
  constructor(private readonly documentSigningRequestRepository: DocumentSigningRequestRepository) {}

  async loadRequiredPublicSession(rawToken: string): Promise<DocumentSigningRequest> {
    const normalizedToken = rawToken.trim();
    if (normalizedToken.length === 0) {
      throw new DocumentSigningRequestTokenNotFoundError();
    }

    const request = await this.documentSigningRequestRepository.findByTokenHash(hashString(normalizedToken));
    if (!request) {
      throw new DocumentSigningRequestTokenNotFoundError();
    }

    const now = new Date();
    if (request.currentStatus === DocumentSigningRequestStatus.PENDING && request.expiresOn.getTime() <= now.getTime()) {
      const expireResult = request.expire(now);
      if (expireResult.isErr()) {
        throw expireResult.error;
      }

      await this.documentSigningRequestRepository.save(request);
      throw new DocumentSigningRequestExpiredError(request.id);
    }

    if (request.currentStatus === DocumentSigningRequestStatus.EXPIRED) {
      throw new DocumentSigningRequestExpiredError(request.id);
    }

    if (
      request.currentStatus === DocumentSigningRequestStatus.SIGNED ||
      request.currentStatus === DocumentSigningRequestStatus.VOIDED
    ) {
      throw new DocumentSigningRequestUnavailableError(request.id, request.currentStatus);
    }

    return request;
  }

  async loadRequiredSignedPublicSession(rawToken: string): Promise<DocumentSigningRequest> {
    const request = await this.loadRequiredSessionByToken(rawToken);

    if (request.currentStatus !== DocumentSigningRequestStatus.SIGNED) {
      throw new DocumentSigningRequestUnavailableError(request.id, request.currentStatus);
    }

    return request;
  }

  private async loadRequiredSessionByToken(rawToken: string): Promise<DocumentSigningRequest> {
    const normalizedToken = rawToken.trim();
    if (normalizedToken.length === 0) {
      throw new DocumentSigningRequestTokenNotFoundError();
    }

    const request = await this.documentSigningRequestRepository.findByTokenHash(hashString(normalizedToken));
    if (!request) {
      throw new DocumentSigningRequestTokenNotFoundError();
    }

    return request;
  }
}

function hashString(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
