import { HttpStatus } from '@nestjs/common';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';

import {
  SendRentalRemitoSigningInvitationError,
  SendRentalRemitoSigningInvitationErrorCode,
} from './send-rental-remito-signing-invitation.errors';

export function mapSendRentalRemitoSigningInvitationHttpError(
  error: SendRentalRemitoSigningInvitationError,
): ProblemException {
  const problem = sendRentalRemitoSigningInvitationProblemMap[error.code];

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

const sendRentalRemitoSigningInvitationProblemMap = {
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
    detail: 'The rental must be confirmed before it can be sent for signing.',
  },
  'document_signing.customer_profile_missing': {
    type: createProblemType('document-signing/customer-profile-missing'),
    title: 'Customer profile missing',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The customer needs a name and identity document before the rental can be sent for signing.',
  },
  'document_signing.tenant_signer_missing': {
    type: createProblemType('document-signing/tenant-signer-missing'),
    title: 'Contract signer missing',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'Configure an active contract signer for the business before sending the rental for signing.',
  },
  'document_signing.branch_context_missing': {
    type: createProblemType('document-signing/branch-context-missing'),
    title: 'Rental branch unavailable',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The rental branch is unavailable. Review the rental branch before sending it for signing.',
  },
  'document_signing.price_snapshot_invalid': {
    type: createProblemType('document-signing/price-snapshot-invalid'),
    title: 'Accepted price incomplete',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The rental needs a complete accepted price before it can be sent for signing.',
  },
  'document_signing.contract_already_signed': {
    type: createProblemType('document-signing/contract-already-signed'),
    title: 'Contract already signed',
    status: HttpStatus.CONFLICT,
    detail: 'The contract has already been signed and cannot be regenerated for signing.',
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
} satisfies Record<
  SendRentalRemitoSigningInvitationErrorCode,
  { type: string; title: string; status: HttpStatus; detail: string }
>;
