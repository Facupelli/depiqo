import { IncomingMessage, ServerResponse } from 'node:http';

import { LogContext } from './log-context';

interface ExpressRequest extends IncomingMessage {
  originalUrl?: string;
}

export function buildCanonicalCompletion(
  request: IncomingMessage,
  response: ServerResponse,
  responseTime: number,
  error?: Error,
): Record<string, unknown> {
  const context = LogContext.forRequest(request);

  return compact({
    type: 'canonical',
    requestId: context?.requestId ?? requestId(request),
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

    errorCode: context?.problem?.errorCode,
    problemKind: context?.problem?.kind,
    problemType: context?.problem?.type,
    problemTitle: context?.problem?.title,
    problemDetail: context?.problem?.detail,
    problemCode: context?.problem?.code,
    problemMetadata: context?.problem?.metadata,
    application: context?.problem?.application,

    err: error,
  });
}

export function canonicalCompletionMessage(request: IncomingMessage, response: ServerResponse): string {
  return `${request.method ?? 'HTTP'} ${requestPath(request)} -> ${response.statusCode}`;
}

export function requestPath(request: IncomingMessage): string {
  const expressRequest = request as ExpressRequest;
  const url = expressRequest.originalUrl ?? request.url ?? '/';
  const queryIndex = url.indexOf('?');
  return queryIndex === -1 ? url : url.slice(0, queryIndex);
}

function requestId(request: IncomingMessage): string | undefined {
  const id = request.id;
  return typeof id === 'string' || typeof id === 'number' ? String(id) : undefined;
}

function compact(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([, entryValue]) => entryValue !== undefined));
}
