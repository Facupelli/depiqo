import { ProblemLogContext } from 'src/core/logger/log-context';

import { ProblemDetailsBody } from './problem-details';
import { ProblemException, ProblemExceptionApplicationError } from './problem.exception';
import { ResolvedProblemKind } from './resolve-exception-problem';

export interface ProblemLogInformation {
  context: ProblemLogContext;
  error: Error;
}

export function buildProblemLogInformation(input: {
  exception: unknown;
  status: number;
  problemDetails: ProblemDetailsBody;
  kind: ResolvedProblemKind;
}): ProblemLogInformation {
  const { exception, problemDetails, kind } = input;
  const applicationError = exception instanceof ProblemException ? exception.getApplicationError() : undefined;
  const metadata = exception instanceof ProblemException ? exception.getMetadata() : undefined;

  return {
    context: {
      kind,
      type: problemDetails.type,
      title: problemDetails.title,
      detail: problemDetails.detail,
      code: safeProblemCode(problemDetails.code),
      errorCode: applicationError?.code ?? errorCode(exception),
      metadata,
      application: applicationError ? compactApplicationError(applicationError) : undefined,
    },
    error: loggingError(exception, applicationError),
  };
}

function loggingError(exception: unknown, applicationError?: ProblemExceptionApplicationError): Error {
  if (applicationError instanceof Error) {
    const cause = applicationError.cause ?? causeFromProblemException(exception);
    attachCauseWhenMissing(applicationError, cause);
    return applicationError;
  }

  if (applicationError) {
    const cause = applicationError.cause ?? causeFromProblemException(exception);
    const error = new Error(applicationError.message, cause === undefined ? undefined : { cause });
    error.name = 'ApplicationError';
    defineCode(error, applicationError.code);
    return error;
  }

  if (exception instanceof Error) {
    attachCauseWhenMissing(exception, causeFromProblemException(exception));
    return exception;
  }

  const error = new Error(nonErrorMessage(exception), { cause: exception });
  error.name = 'NonErrorThrown';
  return error;
}

function causeFromProblemException(exception: unknown): unknown {
  return exception instanceof ProblemException ? exception.getCause() : undefined;
}

function attachCauseWhenMissing(error: Error, cause: unknown): void {
  if (cause === undefined || error.cause !== undefined) return;

  Object.defineProperty(error, 'cause', {
    value: cause,
    configurable: true,
    writable: true,
  });
}

function defineCode(error: Error, code: string): void {
  Object.defineProperty(error, 'code', {
    value: code,
    configurable: true,
    writable: true,
  });
}

function compactApplicationError(
  error: ProblemExceptionApplicationError,
): NonNullable<ProblemLogContext['application']> {
  return {
    code: error.code,
    message: error.message,
    ...(error.context ? { context: error.context } : {}),
  };
}

function safeProblemCode(value: unknown): string | number | undefined {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return undefined;
}

function errorCode(exception: unknown): string {
  if (exception instanceof Error) {
    return exception.name || 'Error';
  }

  return 'UnknownThrownValue';
}

function nonErrorMessage(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return 'A non-Error value was thrown.';
}
