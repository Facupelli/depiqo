import { HttpException } from '@nestjs/common';

import { createProblemDetails } from './problem-details.factory';
import { ProblemDetailsBody, ProblemDetailsExtensions } from './problem-details';

export interface ProblemExceptionInput {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  traceId?: string;
  requestId?: string;
  extensions?: ProblemDetailsExtensions;
}

export class ProblemException extends HttpException {
  private readonly problemDetails: ProblemDetailsBody;

  static from(input: ProblemExceptionInput): ProblemException {
    return new ProblemException(input);
  }

  private constructor(input: ProblemExceptionInput) {
    const problemDetails = createProblemDetails(input);

    super(problemDetails, input.status);

    this.problemDetails = problemDetails;
  }

  getProblemDetails(): ProblemDetailsBody {
    return { ...this.problemDetails };
  }
}
