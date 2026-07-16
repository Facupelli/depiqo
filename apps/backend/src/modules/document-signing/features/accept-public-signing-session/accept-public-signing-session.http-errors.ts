import { HttpStatus } from '@nestjs/common';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';

import {
  AcceptPublicSigningSessionError,
  AcceptPublicSigningSessionErrorCode,
} from './accept-public-signing-session.errors';

export function toAcceptPublicSigningSessionProblem(error: AcceptPublicSigningSessionError): ProblemException {
  const problem = acceptPublicSigningSessionProblemMap[error.code];

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

const acceptPublicSigningSessionProblemMap = {
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
    detail: 'The signing request is not available for signing.',
  },
  'document_signing.signing_request_conflict': {
    type: createProblemType('document-signing/signing-request-conflict'),
    title: 'Signing request conflict',
    status: HttpStatus.CONFLICT,
    detail: 'The signing request cannot be accepted in its current state.',
  },
  'document_signing.acceptance_confirmation_required': {
    type: createProblemType('document-signing/acceptance-confirmation-required'),
    title: 'Acceptance confirmation required',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'Signing acceptance requires explicit confirmation from the signer.',
  },
  'document_signing.signing_identity_required': {
    type: createProblemType('document-signing/signing-identity-required'),
    title: 'Signing identity required',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'Signing acceptance requires signer identity evidence.',
  },
} satisfies Record<
  AcceptPublicSigningSessionErrorCode,
  { type: string; title: string; status: HttpStatus; detail: string }
>;
