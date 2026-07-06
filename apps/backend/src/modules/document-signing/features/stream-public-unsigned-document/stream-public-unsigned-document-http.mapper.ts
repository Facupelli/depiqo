import { GoneException, HttpStatus, UnauthorizedException } from '@nestjs/common';

import { ProblemException } from 'src/core/exceptions/problem.exception';

import {
  PublicSigningRequestExpiredError,
  PublicSigningRequestNotFoundError,
  PublicSigningRequestUnavailableError,
  PublicSigningTokenRequiredError,
  PublicSigningUnsignedArtifactMissingError,
} from '../../domain/errors/document-signing.errors';

export function mapStreamPublicUnsignedDocumentHttpError(error: unknown): Error {
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
    error instanceof PublicSigningUnsignedArtifactMissingError
  ) {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'Signing Document Unavailable',
      error.message,
      'errors://v2-public-signing-document-unavailable',
    );
  }

  return error as Error;
}
