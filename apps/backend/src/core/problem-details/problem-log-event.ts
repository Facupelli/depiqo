// src/core/problem-details/problem-log-event.ts

import { Request } from 'express';

import { LogContext } from 'src/core/logger/log-context';
import { ProblemDetailsBody } from './problem-details';
import { ProblemException } from './problem.exception';
import { ResolvedProblemKind } from './resolve-exception-problem';

const isDev = process.env.NODE_ENV !== 'production';

export interface ProblemLogEventInput {
  exception: unknown;
  request: Request;
  status: number;
  problemDetails: ProblemDetailsBody;
  kind: ResolvedProblemKind;
}

export function buildProblemLogEvent(input: ProblemLogEventInput): Record<string, unknown> {
  const { exception, request, status, problemDetails, kind } = input;

  const requestContext = readAndClearRequestContext();

  const baseEvent = compactObject({
    ...requestContext,

    level: logLevelForStatus(status),
    event: 'http.error',

    requestId: problemDetails.requestId ?? requestContext.requestId,
    httpMethod: request.method,
    httpPath: request.originalUrl || request.url,
    httpStatus: status,

    problemKind: kind,
    problemType: problemDetails.type,
    problemTitle: problemDetails.title,
    problemDetail: problemDetails.detail,
    problemCode: problemDetails.code,
  });

  if (exception instanceof ProblemException) {
    return {
      ...baseEvent,
      ...problemExceptionFields(exception, problemDetails),
    };
  }

  return {
    ...baseEvent,
    ...thrownExceptionFields(exception, status),
  };
}

function problemExceptionFields(
  exception: ProblemException,
  problemDetails: ProblemDetailsBody,
): Record<string, unknown> {
  const applicationError = exception.getApplicationError();
  const metadata = exception.getMetadata();

  return compactObject({
    errorCode: applicationError?.code ?? String(problemDetails.code ?? problemDetails.type),
    errorMessage: applicationError?.message ?? problemDetails.detail,

    applicationErrorCode: applicationError?.code,
    applicationErrorMessage: applicationError?.message,
    applicationErrorContext: applicationError?.context,

    problemMetadata: metadata,
  });
}

function thrownExceptionFields(exception: unknown, status: number): Record<string, unknown> {
  if (exception instanceof Error) {
    return compactObject({
      errorCode: exception.constructor.name,
      errorMessage: exception.message,
      errorStack: shouldIncludeStack(status) ? exception.stack : undefined,
    });
  }

  return compactObject({
    errorCode: 'UnknownThrownValue',
    errorMessage: stringifyThrownValue(exception),
    thrownValueType: typeof exception,
  });
}

function stringifyThrownValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (
    value === undefined ||
    value === null ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint' ||
    typeof value === 'symbol'
  ) {
    return String(value);
  }

  return 'Non-error value was thrown.';
}

function shouldIncludeStack(status: number): boolean {
  return isDev || status >= 500;
}

function logLevelForStatus(status: number): 'debug' | 'info' | 'warn' | 'error' {
  if (status >= 500) {
    return 'error';
  }

  if (status === 401 || status === 403 || status === 429) {
    return 'warn';
  }

  if (status === 409) {
    return 'warn';
  }

  if (status >= 400) {
    return isDev ? 'debug' : 'info';
  }

  return 'info';
}

function readAndClearRequestContext(): Record<string, unknown> {
  const context = LogContext.flush();

  if (!context || typeof context !== 'object') {
    return {};
  }

  return context as Record<string, unknown>;
}

function compactObject(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined),
  );
}
