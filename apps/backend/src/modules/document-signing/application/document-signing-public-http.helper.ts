import { ConflictException, GoneException, HttpStatus, NotFoundException } from '@nestjs/common';

import { ProblemException } from 'src/core/exceptions/problem.exception';
import {
  DocumentSigningRequestStatusTransitionNotAllowedError,
  DocumentSigningRequestExpiredError,
  DocumentSigningRequestTokenNotFoundError,
  DocumentSigningRequestUnavailableError,
} from 'src/modules/document-signing/domain/errors/document-signing.errors';

type MapDocumentSigningPublicHttpErrorOptions = {
  signingRequestUnavailableAsProblemException?: boolean;
};

export function extractBearerToken(authorization?: string): string {
  const [scheme, token] = authorization?.trim().split(/\s+/, 2) ?? [];

  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    throw new ProblemException(
      HttpStatus.UNAUTHORIZED,
      'Signing Token Required',
      'Authorization header must contain a Bearer signing token.',
      'errors://signing-token-required',
    );
  }

  return token;
}

export function mapDocumentSigningPublicHttpError(
  error: unknown,
  options: MapDocumentSigningPublicHttpErrorOptions = {},
): Error {
  if (error instanceof ProblemException) {
    return error;
  }

  if (error instanceof DocumentSigningRequestTokenNotFoundError) {
    return new NotFoundException(error.message);
  }

  if (error instanceof DocumentSigningRequestExpiredError) {
    return new GoneException(error.message);
  }

  if (error instanceof DocumentSigningRequestUnavailableError) {
    if (options.signingRequestUnavailableAsProblemException) {
      return new ProblemException(
        HttpStatus.CONFLICT,
        'Signing Request Unavailable',
        error.message,
        'errors://signing-request-unavailable',
      );
    }

    return new ConflictException(error.message);
  }

  if (error instanceof DocumentSigningRequestStatusTransitionNotAllowedError) {
    return new ConflictException(error.message);
  }

  return error as Error;
}
