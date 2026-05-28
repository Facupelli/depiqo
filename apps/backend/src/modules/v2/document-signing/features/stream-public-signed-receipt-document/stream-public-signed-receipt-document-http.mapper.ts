import { HttpStatus } from '@nestjs/common';

import { createV2ProblemType, V2PlatformProblemTypes, V2ProblemException } from 'src/core/problem-details/v2';

import {
  PublicReceiptExpiredError,
  PublicReceiptNotFoundError,
  PublicReceiptSignedArtifactMissingError,
  PublicReceiptTokenRequiredError,
} from '../../domain/errors/document-signing.errors';

export type StreamPublicSignedReceiptDocumentApplicationErrorCode =
  | 'InvalidReceiptToken'
  | 'ReceiptExpired'
  | 'SignedDocumentUnavailable'
  | 'Unexpected';

export interface StreamPublicSignedReceiptDocumentApplicationError {
  code: StreamPublicSignedReceiptDocumentApplicationErrorCode;
  message: string;
  cause?: unknown;
}

interface StreamPublicSignedReceiptDocumentProblemDefinition {
  type: string;
  title: string;
  status: number;
  detail: string;
}

const StreamPublicSignedReceiptDocumentProblemCatalog: Record<
  StreamPublicSignedReceiptDocumentApplicationErrorCode,
  StreamPublicSignedReceiptDocumentProblemDefinition
> = {
  InvalidReceiptToken: {
    type: createV2ProblemType('document-signing/invalid-receipt-token'),
    title: 'Invalid receipt token',
    status: HttpStatus.UNAUTHORIZED,
    detail: 'The signed document receipt token is invalid or missing.',
  },
  ReceiptExpired: {
    type: createV2ProblemType('document-signing/receipt-expired'),
    title: 'Receipt expired',
    status: HttpStatus.GONE,
    detail: 'The signed document receipt has expired.',
  },
  SignedDocumentUnavailable: {
    type: createV2ProblemType('document-signing/signed-document-unavailable'),
    title: 'Signed document unavailable',
    status: HttpStatus.CONFLICT,
    detail: 'The signed document is not available for this receipt.',
  },
  Unexpected: {
    type: V2PlatformProblemTypes.system.internalServerError,
    title: 'Internal server error',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    detail: 'An unexpected error occurred. Please try again later.',
  },
};

export function toStreamPublicSignedReceiptDocumentApplicationError(
  error: unknown,
): StreamPublicSignedReceiptDocumentApplicationError {
  if (error instanceof PublicReceiptTokenRequiredError || error instanceof PublicReceiptNotFoundError) {
    return {
      code: 'InvalidReceiptToken',
      message: 'Invalid receipt token.',
      cause: error,
    };
  }

  if (error instanceof PublicReceiptExpiredError) {
    return {
      code: 'ReceiptExpired',
      message: error.message,
      cause: error,
    };
  }

  if (error instanceof PublicReceiptSignedArtifactMissingError) {
    return {
      code: 'SignedDocumentUnavailable',
      message: error.message,
      cause: error,
    };
  }

  return {
    code: 'Unexpected',
    message: 'An unexpected error occurred.',
    cause: error,
  };
}

export function toStreamPublicSignedReceiptDocumentProblem(
  error: StreamPublicSignedReceiptDocumentApplicationError,
): V2ProblemException {
  const definition = StreamPublicSignedReceiptDocumentProblemCatalog[error.code];

  return V2ProblemException.from({
    type: definition.type,
    title: definition.title,
    status: definition.status,
    detail: definition.detail,
  });
}
