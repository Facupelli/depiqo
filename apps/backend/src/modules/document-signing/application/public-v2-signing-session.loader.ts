import { Injectable } from '@nestjs/common';
import { Result, err, ok } from 'neverthrow';

import {
  PublicRentalRemitoSigningSession,
  V2ContractsPublicApi,
} from 'src/modules/contracts/public-api/contracts.public-api';

import { publicSigningSessionError, PublicSigningSessionError } from './public-signing-session.errors';

@Injectable()
export class PublicV2SigningSessionLoader {
  constructor(private readonly contracts: V2ContractsPublicApi) {}

  async loadRequiredPublicSession(
    rawToken: string,
  ): Promise<Result<PublicRentalRemitoSigningSession, PublicSigningSessionError>> {
    const result = await this.contracts.resolvePublicRentalRemitoSigningSession(rawToken);
    if (result.isOk()) return ok(result.value);

    return err(toPublicSigningSessionError(result.error));
  }
}

export function toPublicSigningSessionError(error: {
  code: 'SigningTokenNotFound' | 'SigningRequestExpired' | 'SigningRequestUnavailable';
  message: string;
}): PublicSigningSessionError {
  switch (error.code) {
    case 'SigningTokenNotFound':
      return publicSigningSessionError('document_signing.signing_token_not_found', error.message, error);
    case 'SigningRequestExpired':
      return publicSigningSessionError('document_signing.signing_request_expired', error.message, error);
    case 'SigningRequestUnavailable':
      return publicSigningSessionError('document_signing.signing_request_unavailable', error.message, error);
  }
}
