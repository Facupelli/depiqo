import { BadGatewayException, HttpStatus, NotFoundException } from '@nestjs/common';

import { ProblemException } from 'src/core/exceptions/problem.exception';
import {
  SigningInvitationEmailDeliveryFailedError,
  SigningInvitationCustomerProfileMissingError,
  SigningInvitationOrderNotFoundError,
  SigningInvitationOrderNotReadyError,
  SigningInvitationRecipientEmailRequiredError,
} from 'src/modules/document-signing/domain/errors/document-signing.errors';

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
      'errors://signing-invitation-not-allowed',
    );
  }

  if (error instanceof SigningInvitationEmailDeliveryFailedError) {
    return new BadGatewayException(error.message);
  }

  return error as Error;
}
