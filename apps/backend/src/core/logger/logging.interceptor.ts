import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Response } from 'express';
import { AppLogger } from './app-logger.service';
import { LogContext } from './log-context';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLogger) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const res = ctx.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      tap(() => {
        LogContext.set('httpStatus', res.statusCode);
        this.flush();
      }),
    );
  }

  private flush(): void {
    const log = LogContext.flush();
    if (log) {
      this.logger.canonical(log as Record<string, unknown>);
    }
  }
}
