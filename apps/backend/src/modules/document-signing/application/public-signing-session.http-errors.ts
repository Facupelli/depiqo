import { HttpStatus } from '@nestjs/common';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';

import { PublicSigningSessionError, PublicSigningSessionErrorCode } from './public-signing-session.errors';

export function toPublicSigningSessionProblem(error: PublicSigningSessionError): ProblemException {
  const problem = publicSigningSessionProblemMap[error.code];

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

export const publicSigningSessionProblemMap = {
  'document_signing.signing_token_not_found': {
    type: createProblemType('document-signing/signing-token-not-found'),
    title: 'Signing token not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The signing session could not be found for the provided token.',
  },
  'document_signing.signing_request_expired': {
    type: createProblemType('document-signing/signing-request-expired'),
    title: 'Signing request expired',
    status: HttpStatus.GONE,
    detail: 'The signing request has expired.',
  },
  'document_signing.signing_request_unavailable': {
    type: createProblemType('document-signing/signing-request-unavailable'),
    title: 'Signing request unavailable',
    status: HttpStatus.CONFLICT,
    detail: 'The signing request is not available for this action.',
  },
  'document_signing.signing_request_conflict': {
    type: createProblemType('document-signing/signing-request-conflict'),
    title: 'Signing request conflict',
    status: HttpStatus.CONFLICT,
    detail: 'The signing request cannot be updated in its current state.',
  },
  'document_signing.receipt_token_not_found': {
    type: createProblemType('document-signing/receipt-token-not-found'),
    title: 'Receipt token not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The signed document receipt could not be found for the provided token.',
  },
  'document_signing.receipt_token_expired': {
    type: createProblemType('document-signing/receipt-token-expired'),
    title: 'Receipt token expired',
    status: HttpStatus.GONE,
    detail: 'The signed document receipt token has expired.',
  },
  'document_signing.signed_document_unavailable': {
    type: createProblemType('document-signing/signed-document-unavailable'),
    title: 'Signed document unavailable',
    status: HttpStatus.CONFLICT,
    detail: 'The signed document is not available for this signing request.',
  },
  'document_signing.customer_profile_missing': {
    type: createProblemType('document-signing/customer-profile-missing'),
    title: 'Customer profile missing',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The signed document cannot be prepared because the customer profile is incomplete.',
  },
  'document_signing.order_not_found': {
    type: createProblemType('document-signing/order-not-found'),
    title: 'Order not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The order for this signing request could not be found.',
  },
} satisfies Record<PublicSigningSessionErrorCode, { type: string; title: string; status: HttpStatus; detail: string }>;
