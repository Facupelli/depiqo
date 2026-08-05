import { AsyncLocalStorage } from 'node:async_hooks';

export interface ProblemLogContext {
  kind: string;
  type: string;
  title: string;
  detail: string;
  code?: string | number;
  errorCode?: string;
  metadata?: Record<string, unknown>;
  application?: {
    code: string;
    message: string;
    context?: Record<string, unknown>;
  };
}

export interface RequestLogContext {
  requestId: string;

  userId?: string;
  userRole?: string;

  dbQueries: number;
  dbDurationMs: number;
  cacheHits: number;
  cacheMisses: number;
  domainEventsPublished?: number;
  domainEventNames?: string[];
  domainEventPublishFailures?: number;
  domainEventHandlerFailures?: number;

  problem?: ProblemLogContext;
}

export const REQUEST_LOG_CONTEXT = Symbol('depiqo.requestLogContext');

interface RequestWithLogContext {
  [REQUEST_LOG_CONTEXT]?: RequestLogContext;
}

const store = new AsyncLocalStorage<RequestLogContext>();

/**
 * Accumulates DEPIQO-specific request data. HTTP completion and log emission
 * are owned by pino-http, not by this context.
 */
export class LogContext {
  static run(log: RequestLogContext, fn: () => void): void {
    store.run(log, fn);
  }

  static attach(request: object, log: RequestLogContext): void {
    (request as RequestWithLogContext)[REQUEST_LOG_CONTEXT] = log;
  }

  static forRequest(request: object): RequestLogContext | undefined {
    return (request as RequestWithLogContext)[REQUEST_LOG_CONTEXT];
  }

  static set<K extends keyof RequestLogContext>(key: K, value: RequestLogContext[K]): void {
    const log = store.getStore();
    if (log) {
      log[key] = value;
    }
  }

  static increment(
    key:
      | 'dbQueries'
      | 'dbDurationMs'
      | 'cacheHits'
      | 'cacheMisses'
      | 'domainEventsPublished'
      | 'domainEventPublishFailures'
      | 'domainEventHandlerFailures',
    by = 1,
  ): void {
    const log = store.getStore();
    if (log) {
      log[key] = (log[key] ?? 0) + by;
    }
  }

  static get<K extends keyof RequestLogContext>(key: K): RequestLogContext[K] | undefined {
    return store.getStore()?.[key];
  }
}
