import { HttpStatus } from '@nestjs/common';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';

export function extractBearerToken(authorization?: string): string {
  const [scheme, token] = authorization?.trim().split(/\s+/, 2) ?? [];

  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    throw ProblemException.from({
      problemDetails: createProblemDetails({
        type: createProblemType('document-signing/signing-token-required'),
        title: 'Signing token required',
        status: HttpStatus.UNAUTHORIZED,
        detail: 'Authorization header must contain a Bearer signing token.',
        extensions: { code: 'document_signing.signing_token_required' },
      }),
      applicationError: {
        code: 'document_signing.signing_token_required',
        message: 'Authorization header must contain a Bearer signing token.',
      },
    });
  }

  return token;
}
