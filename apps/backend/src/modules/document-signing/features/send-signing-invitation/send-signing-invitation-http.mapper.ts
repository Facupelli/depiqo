import { HttpStatus } from '@nestjs/common';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';

import { SendSigningInvitationError, SendSigningInvitationErrorCode } from './send-signing-invitation.errors';

export function mapSendSigningInvitationHttpError(error: SendSigningInvitationError): ProblemException {
  const problem = sendSigningInvitationProblemMap[error.code];

  return ProblemException.from({
    problemDetails: createProblemDetails({
      type: problem.type,
      title: problem.title,
      status: problem.status,
      detail: problem.detail,
      extensions: { code: error.code },
    }),
    applicationError: error,
    cause: error.cause,
  });
}

const sendSigningInvitationProblemMap = {
  'document_signing.order_not_found': {
    type: createProblemType('document-signing/order-not-found'),
    title: 'Order not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The order could not be found.',
  },
  'document_signing.order_not_ready': {
    type: createProblemType('document-signing/order-not-ready'),
    title: 'Order not ready for signing',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The order is not ready for signing.',
  },
  'document_signing.customer_profile_missing': {
    type: createProblemType('document-signing/customer-profile-missing'),
    title: 'Customer profile missing',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The customer profile is incomplete for signing.',
  },
  'document_signing.recipient_email_required': {
    type: createProblemType('document-signing/recipient-email-required'),
    title: 'Recipient email required',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'A recipient email is required before a signing invitation can be sent.',
  },
  'document_signing.invitation_delivery_failed': {
    type: createProblemType('document-signing/invitation-delivery-failed'),
    title: 'Invitation delivery failed',
    status: HttpStatus.BAD_GATEWAY,
    detail: 'The signing invitation could not be delivered.',
  },
  'document_signing.signing_request_conflict': {
    type: createProblemType('document-signing/signing-request-conflict'),
    title: 'Signing request conflict',
    status: HttpStatus.CONFLICT,
    detail: 'The signing request cannot be updated in its current state.',
  },
} satisfies Record<SendSigningInvitationErrorCode, { type: string; title: string; status: HttpStatus; detail: string }>;
