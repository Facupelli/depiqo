import { HttpStatus } from '@nestjs/common';

import { createProblemDetails } from './problem-details.factory';
import { InvalidParam, ProblemDetailsBody, ProblemDetailsExtensions } from './problem-details';

export interface CreateV2ValidationProblemInput {
  type: string;
  status?: number;
  detail?: string;
  instance?: string;
  traceId?: string;
  requestId?: string;
  invalidParams: InvalidParam[];
  extensions?: ProblemDetailsExtensions;
}

export function createValidationProblem(input: CreateV2ValidationProblemInput): ProblemDetailsBody {
  return createProblemDetails({
    type: input.type,
    title: 'Validation failed',
    status: input.status ?? HttpStatus.BAD_REQUEST,
    detail: input.detail ?? 'The request contains invalid parameters.',
    instance: input.instance,
    traceId: input.traceId,
    requestId: input.requestId,
    extensions: {
      ...input.extensions,
      'invalid-params': input.invalidParams,
    },
  });
}
