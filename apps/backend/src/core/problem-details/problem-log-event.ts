import { ZodValidationException } from 'nestjs-zod';
import { ZodError } from 'zod';

import { ProblemLogContext, ValidationIssueLogContext } from 'src/core/logger/log-context';

import { ProblemDetailsBody } from './problem-details';
import { ProblemException, ProblemExceptionApplicationError } from './problem.exception';
import { ResolvedProblemKind } from './resolve-exception-problem';

const MAX_LOGGED_VALIDATION_ISSUES = 20;
const MAX_VALIDATION_PATH_DEPTH = 10;
const MAX_VALIDATION_PATH_SEGMENT_LENGTH = 128;
const MAX_VALIDATION_MESSAGE_LENGTH = 512;

export interface ProblemLogInformation {
  context: ProblemLogContext;
  error: Error;
}

export function buildProblemLogInformation(input: {
  error: unknown;
  status: number;
  problemDetails: ProblemDetailsBody;
  kind: ResolvedProblemKind;
}): ProblemLogInformation {
  const { error, problemDetails, kind } = input;
  const applicationError = error instanceof ProblemException ? error.getApplicationError() : undefined;
  const metadata = error instanceof ProblemException ? error.getMetadata() : undefined;

  return {
    context: {
      kind,
      type: problemDetails.type,
      title: problemDetails.title,
      detail: problemDetails.detail,
      code: safeProblemCode(problemDetails.code),
      errorCode: applicationError?.code ?? errorCode(error),
      metadata,
      validationIssues: zodValidationIssues(error),
      application: applicationError ? compactApplicationError(applicationError) : undefined,
    },
    error: loggingError(error, applicationError),
  };
}

function zodValidationIssues(error: unknown): ValidationIssueLogContext[] | undefined {
  if (!(error instanceof ZodValidationException)) return undefined;

  const zodError = error.getZodError();
  if (!(zodError instanceof ZodError)) return undefined;

  const issues = zodError.issues.slice(0, MAX_LOGGED_VALIDATION_ISSUES).map((issue) => ({
    path: issue.path
      .slice(0, MAX_VALIDATION_PATH_DEPTH)
      .map((segment) => truncate(String(segment), MAX_VALIDATION_PATH_SEGMENT_LENGTH)),
    code: issue.code,
    message: truncate(issue.message, MAX_VALIDATION_MESSAGE_LENGTH),
  }));

  return issues.length > 0 ? issues : undefined;
}

function truncate(value: string, maximumLength: number): string {
  return Array.from(value).slice(0, maximumLength).join('');
}

function loggingError(error: unknown, applicationError?: ProblemExceptionApplicationError): Error {
  if (applicationError instanceof Error) {
    const cause = applicationError.cause ?? causeFromProblemException(error);
    attachCauseWhenMissing(applicationError, cause);
    return applicationError;
  }

  if (applicationError) {
    const cause = applicationError.cause ?? causeFromProblemException(error);
    const applicationLoggingError = new Error(applicationError.message, cause === undefined ? undefined : { cause });
    applicationLoggingError.name = 'ApplicationError';
    defineCode(applicationLoggingError, applicationError.code);
    return applicationLoggingError;
  }

  if (error instanceof Error) {
    attachCauseWhenMissing(error, causeFromProblemException(error));
    return error;
  }

  const nonErrorThrown = new Error(nonErrorMessage(error), { cause: error });
  nonErrorThrown.name = 'NonErrorThrown';
  return nonErrorThrown;
}

function causeFromProblemException(error: unknown): ProblemExceptionApplicationError['cause'] {
  return error instanceof ProblemException ? error.getCause() : undefined;
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

function safeProblemCode(value: ProblemDetailsBody['code']): string | number | undefined {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return undefined;
}

function errorCode(error: unknown): string {
  if (error instanceof Error) {
    return error.name || 'Error';
  }

  return 'UnknownThrownValue';
}

function nonErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error === null || error === undefined || typeof error === 'number' || typeof error === 'boolean') {
    return String(error);
  }
  return 'A non-Error value was thrown.';
}
