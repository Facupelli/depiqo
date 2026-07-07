import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { LogContext } from './log-context';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    // Respect incoming X-Request-ID from API gateway or upstream services,
    // or generate a new one. This enables distributed tracing.
    const requestId = (req.headers['x-request-id'] as string) ?? `req_${randomUUID().replace(/-/g, '').slice(0, 16)}`;

    LogContext.run(
      {
        requestId,
        httpMethod: req.method,
        httpPath: req.originalUrl || req.url,
        startedAt: Date.now(),
        dbQueries: 0,
        dbDurationMs: 0,
        cacheHits: 0,
        cacheMisses: 0,
      },
      () => next(),
    );
  }
}
