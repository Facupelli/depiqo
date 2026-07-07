import { GoneException, HttpStatus, UnauthorizedException } from '@nestjs/common';

import { ProblemException } from 'src/core/problem-details';

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
    return ProblemException.from({
      status: HttpStatus.CONFLICT,
      title: 'Signing Session Unavailable',
      detail: error.message,
      type: 'errors://v2-public-signing-session-unavailable',
      cause: error,
    });
  }

  if (
    error instanceof SigningAcceptanceConfirmationRequiredError ||
    error instanceof SigningAcceptanceSignatureRequiredError ||
    error instanceof SigningAcceptanceTextVersionRequiredError ||
    error instanceof SigningAcceptanceTextVersionInvalidError
  ) {
    return ProblemException.from({
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      title: 'Signing Acceptance Invalid',
      detail: error.message,
      type: 'errors://v2-signing-acceptance-invalid',
      cause: error,
    });
  }

  if (error instanceof SigningAcceptanceRenderFailedError) {
    return ProblemException.from({
      status: HttpStatus.BAD_GATEWAY,
      title: 'Signed Document Rendering Failed',
      detail: error.message,
      type: 'errors://v2-signed-document-rendering-failed',
      cause: error,
    });
  }

  return error as Error;
}
