import { GoneException, HttpStatus, UnauthorizedException } from '@nestjs/common';

import { ProblemException } from 'src/core/exceptions/problem.exception';

import {
  PublicSigningRequestExpiredError,
  PublicSigningRequestNotFoundError,
  PublicSigningRequestUnavailableError,
  PublicSigningTokenRequiredError,
  PublicSigningUnsignedArtifactMissingError,
  SigningAcceptanceAlreadyCompletedError,
  SigningAcceptanceConfirmationRequiredError,
  SigningAcceptanceRenderFailedError,
  SigningAcceptanceSignatureRequiredError,
  SigningAcceptanceTextVersionInvalidError,
  SigningAcceptanceTextVersionRequiredError,
} from '../../domain/errors/document-signing.errors';

export function mapAcceptPublicSigningSessionHttpError(error: unknown): Error {
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
    error instanceof SigningAcceptanceAlreadyCompletedError
  ) {
    return new ProblemException(
      HttpStatus.CONFLICT,
      'Signing Session Unavailable',
      error.message,
      'errors://v2-public-signing-session-unavailable',
    );
  }

  if (
    error instanceof SigningAcceptanceConfirmationRequiredError ||
    error instanceof SigningAcceptanceSignatureRequiredError ||
    error instanceof SigningAcceptanceTextVersionRequiredError ||
    error instanceof SigningAcceptanceTextVersionInvalidError
  ) {
    return new ProblemException(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'Signing Acceptance Invalid',
      error.message,
      'errors://v2-signing-acceptance-invalid',
    );
  }

  if (error instanceof SigningAcceptanceRenderFailedError) {
    return new ProblemException(
      HttpStatus.BAD_GATEWAY,
      'Signed Document Rendering Failed',
      error.message,
      'errors://v2-signed-document-rendering-failed',
    );
  }

  return error as Error;
}
