import { HttpException } from '@nestjs/common';

import type { ApplicationErrorContext } from 'src/core/errors/application-error';

import { createProblemDetails } from './problem-details.factory';
import { ProblemDetailsBody, ProblemDetailsExtensions } from './problem-details';

export interface ProblemExceptionApplicationError {
  code: string;
  message: string;
  cause?: unknown;
  context?: ApplicationErrorContext;
}

export type ProblemExceptionMetadata = ApplicationErrorContext;

interface LegacyProblemExceptionInput {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  traceId?: string;
  requestId?: string;
  extensions?: ProblemDetailsExtensions;
  applicationError?: ProblemExceptionApplicationError;
  cause?: unknown;
  metadata?: ProblemExceptionMetadata;
}

interface StructuredProblemExceptionInput {
  problemDetails: ProblemDetailsBody;
  applicationError?: ProblemExceptionApplicationError;
  cause?: unknown;
  metadata?: ProblemExceptionMetadata;
}

export type ProblemExceptionInput = LegacyProblemExceptionInput | StructuredProblemExceptionInput;

export class ProblemException extends HttpException {
  private readonly problemDetails: ProblemDetailsBody;
  private readonly applicationError?: ProblemExceptionApplicationError;
  private readonly causeValue?: unknown;
  private readonly metadata?: ProblemExceptionMetadata;

  static from(input: ProblemExceptionInput): ProblemException {
    return new ProblemException(input);
  }

  private constructor(input: ProblemExceptionInput) {
    const problemDetails = normalizeProblemDetails(input);

    super(problemDetails, problemDetails.status);

    this.problemDetails = problemDetails;
    this.applicationError = input.applicationError;
    this.causeValue = input.cause ?? input.applicationError?.cause;
    this.metadata = input.metadata;
  }

  getProblemDetails(): ProblemDetailsBody {
    return { ...this.problemDetails };
  }

  getApplicationError(): ProblemExceptionApplicationError | undefined {
    if (!this.applicationError) return undefined;
    if (this.applicationError instanceof Error) return this.applicationError;

    return {
      ...this.applicationError,
      context: this.applicationError.context ? { ...this.applicationError.context } : undefined,
    };
  }

  getCause(): ProblemExceptionApplicationError['cause'] {
    return this.causeValue;
  }

  getMetadata(): ProblemExceptionMetadata | undefined {
    return this.metadata ? { ...this.metadata } : undefined;
  }
}

function normalizeProblemDetails(input: ProblemExceptionInput): ProblemDetailsBody {
  if ('problemDetails' in input) {
    return withApplicationErrorCode(input.problemDetails, input.applicationError);
  }

  return createProblemDetails({
    ...input,
    extensions: withApplicationErrorCode(input.extensions ?? {}, input.applicationError),
  });
}

function withApplicationErrorCode(
  problemDetailsOrExtensions: ProblemDetailsBody,
  applicationError?: ProblemExceptionApplicationError,
): ProblemDetailsBody;
function withApplicationErrorCode(
  problemDetailsOrExtensions: ProblemDetailsExtensions,
  applicationError?: ProblemExceptionApplicationError,
): ProblemDetailsExtensions;
function withApplicationErrorCode(
  problemDetailsOrExtensions: ProblemDetailsBody | ProblemDetailsExtensions,
  applicationError?: ProblemExceptionApplicationError,
): ProblemDetailsBody | ProblemDetailsExtensions {
  if (!applicationError || Object.prototype.hasOwnProperty.call(problemDetailsOrExtensions, 'code')) {
    return { ...problemDetailsOrExtensions };
  }

  return {
    ...problemDetailsOrExtensions,
    code: applicationError.code,
  };
}
