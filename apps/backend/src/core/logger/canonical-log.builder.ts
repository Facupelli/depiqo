import { IncomingMessage, ServerResponse } from 'node:http';

import { LogContext } from './log-context';
import { readRequestId } from './request-id';

interface ExpressRequest extends IncomingMessage {
  originalUrl?: string;
}

export function buildCanonicalCompletion(
  request: IncomingMessage,
  response: ServerResponse,
  responseTime: number,
  error?: Error,
) {
  const context = LogContext.forRequest(request);
  const requestId = readRequestId(request);

  return compact({
    type: 'canonical',
    requestId,
    requestIdInvariantViolation: requestId === undefined ? true : undefined,
    httpMethod: request.method,
    httpPath: requestPath(request),
    httpStatus: response.statusCode,
    durationMs: responseTime,

    userId: context?.userId,
    userRole: context?.userRole,

    dbQueries: context?.dbQueries,
    dbDurationMs: context?.dbDurationMs,
    cacheHits: context?.cacheHits,
    cacheMisses: context?.cacheMisses,
    integrationEventsPublished: context?.integrationEventsPublished,
    integrationEventNames: context?.integrationEventNames,
    integrationEventPublishFailures: context?.integrationEventPublishFailures,
    authorizationRequirement: context?.deniedAuthorizationRequirement,

    errorCode: context?.problem?.errorCode,
    problemKind: context?.problem?.kind,
    problemType: context?.problem?.type,
    problemTitle: context?.problem?.title,
    problemDetail: context?.problem?.detail,
    problemCode: context?.problem?.code,
    problemMetadata: context?.problem?.metadata,
    validationIssues: context?.problem?.validationIssues,
    application: context?.problem?.application,

    err: error,
  });
}

export function canonicalCompletionMessage(request: IncomingMessage, response: ServerResponse): string {
  return `${request.method ?? 'HTTP'} ${requestPath(request)} -> ${response.statusCode}`;
}

export function requestPath(request: IncomingMessage): string {
  // SAFETY: The logger receives requests from Nest HTTP middleware, which uses Express request objects for this application.
  const expressRequest = request as ExpressRequest;
  const url = expressRequest.originalUrl ?? request.url ?? '/';
  const queryIndex = url.indexOf('?');
  return queryIndex === -1 ? url : url.slice(0, queryIndex);
}

type Compact<T extends object> = {
  [K in keyof T as undefined extends T[K] ? never : K]: T[K];
} & {
  [K in keyof T as undefined extends T[K] ? K : never]?: Exclude<T[K], undefined>;
};

function compact<T extends object>(value: T): Compact<T> {
  // SAFETY: Object.fromEntries only removes entries whose runtime value is undefined; every retained key/value pair comes from the input shape.
  return Object.fromEntries(Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)) as Compact<T>;
}
