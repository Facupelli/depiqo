import { GoneException, HttpStatus, UnauthorizedException } from '@nestjs/common';

import { ProblemException } from 'src/core/exceptions/problem.exception';

import {
  PublicSigningRequestExpiredError,
  PublicSigningRequestNotFoundError,
  PublicSigningRequestUnavailableError,
  PublicSigningTokenRequiredError,
  PublicSigningUnsignedArtifactHashMissingError,
  PublicSigningUnsignedArtifactMissingError,
} from '../../domain/errors/document-signing.errors';

export function mapGetPublicSigningSessionHttpError(error: unknown): Error {
  if (error instanceof ProblemException) {
    return error;
  }

  if (error instanceof PublicSigningTokenRequiredError || error instanceof PublicSigningRequestNotFoundError) {
    return new UnauthorizedException('Invalid signing token.');
  }

  if (error instanceof PublicSigningRequestExpiredError) {
    return new GoneException(error.message);
  }

  if (
    error instanceof PublicSigningRequestUnavailableError ||
    error instanceof PublicSigningUnsignedArtifactMissingError ||
    error instanceof PublicSigningUnsignedArtifactHashMissingError
  ) {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'Signing Session Unavailable',
      error.message,
      'errors://v2-public-signing-session-unavailable',
    );
  }

  return error as Error;
}
