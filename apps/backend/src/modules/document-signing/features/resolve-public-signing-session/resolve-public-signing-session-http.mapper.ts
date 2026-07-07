import { GoneException, HttpStatus, UnauthorizedException } from '@nestjs/common';

import { ProblemException } from 'src/core/problem-details';

import {
  PublicSigningRequestExpiredError,
  PublicSigningRequestNotFoundError,
  PublicSigningRequestUnavailableError,
  PublicSigningTokenRequiredError,
} from '../../domain/errors/document-signing.errors';

export function mapResolvePublicSigningSessionHttpError(error: unknown): Error {
  if (error instanceof ProblemException) {
    return error;
  }

  if (error instanceof PublicSigningTokenRequiredError || error instanceof PublicSigningRequestNotFoundError) {
    return new UnauthorizedException('Invalid signing token.');
  }

  if (error instanceof PublicSigningRequestExpiredError) {
    return new GoneException(error.message);
  }

  if (error instanceof PublicSigningRequestUnavailableError) {
    return ProblemException.from({
      status: HttpStatus.CONFLICT,
      title: 'Signing Session Unavailable',
      detail: error.message,
      type: 'errors://v2-public-signing-session-unavailable',
      cause: error,
    });
  }

  return error as Error;
}
