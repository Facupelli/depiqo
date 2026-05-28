import { HttpException } from '@nestjs/common';

import { createV2ProblemDetails } from './problem-details.factory';
import { V2ProblemDetailsBody, V2ProblemDetailsExtensions } from './problem-details';

export interface V2ProblemExceptionInput {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  traceId?: string;
  requestId?: string;
  extensions?: V2ProblemDetailsExtensions;
}

export class V2ProblemException extends HttpException {
  private readonly problemDetails: V2ProblemDetailsBody;

  static from(input: V2ProblemExceptionInput): V2ProblemException {
    return new V2ProblemException(input);
  }

  private constructor(input: V2ProblemExceptionInput) {
    const problemDetails = createV2ProblemDetails(input);

    super(problemDetails, input.status);

    this.problemDetails = problemDetails;
  }

  getProblemDetails(): V2ProblemDetailsBody {
    return { ...this.problemDetails };
  }
}
