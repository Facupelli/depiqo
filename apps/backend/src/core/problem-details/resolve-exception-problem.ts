import { HttpException, HttpStatus } from '@nestjs/common';
import { createProblemDetails } from './problem-details.factory';
import { ProblemDetailsBody } from './problem-details';
import { PlatformProblemTypes } from './platform-problem-types';
import { ProblemException } from './problem.exception';
import { createValidationProblem } from './validation-problem.factory';
import { httpProblemDefaults, safeHttpDetail } from './http-problem-defaults';
import { extractInvalidParams } from './validation-problem-validation';

export type ResolvedProblemKind = 'problem-exception' | 'validation' | 'http-exception' | 'unknown';

export interface ResolvedProblem {
  kind: ResolvedProblemKind;
  status: number;
  problemDetails: ProblemDetailsBody;
}

export function resolveExceptionProblem(exception: unknown, instance: string): ResolvedProblem {
  return (
    resolveProblemException(exception, instance) ??
    resolveValidationException(exception, instance) ??
    resolveHttpException(exception, instance) ??
    resolveUnknownException(instance)
  );
}

function resolveProblemException(exception: unknown, instance: string): ResolvedProblem | null {
  if (!(exception instanceof ProblemException)) {
    return null;
  }

  const status = exception.getStatus();
  const problemDetails = exception.getProblemDetails();

  return {
    kind: 'problem-exception',
    status,
    problemDetails: {
      ...problemDetails,
      status,
      instance: problemDetails.instance ?? instance,
    },
  };
}

function resolveValidationException(exception: unknown, instance: string): ResolvedProblem | null {
  if (!(exception instanceof HttpException)) {
    return null;
  }

  const invalidParams = extractInvalidParams(exception.getResponse());

  if (invalidParams.length === 0) {
    return null;
  }

  const status = exception.getStatus();

  return {
    kind: 'validation',
    status,
    problemDetails: createValidationProblem({
      type: PlatformProblemTypes.request.validationFailed,
      status,
      instance,
      invalidParams,
    }),
  };
}

function resolveHttpException(exception: unknown, instance: string): ResolvedProblem | null {
  if (!(exception instanceof HttpException)) {
    return null;
  }

  const status = exception.getStatus();
  const defaults = httpProblemDefaults(status);

  return {
    kind: 'http-exception',
    status,
    problemDetails: createProblemDetails({
      type: defaults.type,
      title: defaults.title,
      status,
      detail: safeHttpDetail(status, defaults.detail),
      instance,
    }),
  };
}

function resolveUnknownException(instance: string): ResolvedProblem {
  const status = HttpStatus.INTERNAL_SERVER_ERROR;

  return {
    kind: 'unknown',
    status,
    problemDetails: createProblemDetails({
      type: PlatformProblemTypes.system.internalServerError,
      title: 'Internal server error',
      status,
      detail: 'An unexpected error occurred. Please try again later.',
      instance,
    }),
  };
}
