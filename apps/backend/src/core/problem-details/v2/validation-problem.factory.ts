import { HttpStatus } from '@nestjs/common';

import { createV2ProblemDetails } from './problem-details.factory';
import { InvalidParam, V2ProblemDetailsBody, V2ProblemDetailsExtensions } from './problem-details';

export interface CreateV2ValidationProblemInput {
  type: string;
  status?: number;
  detail?: string;
  instance?: string;
  traceId?: string;
  requestId?: string;
  invalidParams: InvalidParam[];
  extensions?: V2ProblemDetailsExtensions;
}

export function createV2ValidationProblem(input: CreateV2ValidationProblemInput): V2ProblemDetailsBody {
  return createV2ProblemDetails({
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
