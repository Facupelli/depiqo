import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import { LogContext, RequestLogContext } from './log-context';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const context: RequestLogContext = {
      dbQueries: 0,
      dbDurationMs: 0,
      cacheHits: 0,
      cacheMisses: 0,
    };

    LogContext.attach(req, context);
    LogContext.run(context, next);
  }
}
