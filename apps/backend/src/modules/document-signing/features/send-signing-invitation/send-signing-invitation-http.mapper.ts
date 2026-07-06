import { BadGatewayException, HttpStatus, NotFoundException } from '@nestjs/common';

import { ProblemException } from 'src/core/exceptions/problem.exception';

import {
  SigningInvitationCustomerProfileMissingError,
  SigningInvitationEmailDeliveryFailedError,
  SigningInvitationOrderNotFoundError,
  SigningInvitationOrderNotReadyError,
  SigningInvitationRecipientEmailRequiredError,
} from '../../domain/errors/document-signing.errors';

export function mapSendSigningInvitationHttpError(error: unknown): Error {
  if (error instanceof ProblemException) {
    return error;
  }

  if (error instanceof SigningInvitationOrderNotFoundError) {
    return new NotFoundException(error.message);
  }

  if (
    error instanceof SigningInvitationCustomerProfileMissingError ||
    error instanceof SigningInvitationOrderNotReadyError ||
    error instanceof SigningInvitationRecipientEmailRequiredError
  ) {
    return new ProblemException(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'Signing Invitation Not Allowed',
      error.message,
      'errors://v2-signing-invitation-not-allowed',
    );
  }

  if (error instanceof SigningInvitationEmailDeliveryFailedError) {
    return new BadGatewayException(error.message);
  }

  return error as Error;
}
