import { BadGatewayException, HttpStatus, NotFoundException } from '@nestjs/common';

import { ProblemException } from 'src/core/problem-details';

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
    return ProblemException.from({
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      title: 'Signing Invitation Not Allowed',
      detail: error.message,
      type: 'errors://v2-signing-invitation-not-allowed',
      cause: error,
    });
  }

  if (error instanceof SigningInvitationEmailDeliveryFailedError) {
    return new BadGatewayException(error.message);
  }

  return error as Error;
}
