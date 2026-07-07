import { Injectable, NestInterceptor, ExecutionContext, CallHandler, HttpException, HttpStatus } from '@nestjs/common';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { Response } from 'express';
import { ProblemException } from 'src/core/problem-details';
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
      catchError((err: unknown) => {
        const status = err instanceof HttpException ? err.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

        LogContext.set('httpStatus', status);
        this.enrichError(err);

        this.flush();
        return throwError(() => err);
      }),
    );
  }

  private enrichError(err: unknown): void {
    if (err instanceof ProblemException) {
      const problemDetails = err.getProblemDetails();

      LogContext.set('problemType', problemDetails.type);
      LogContext.set('problemTitle', problemDetails.title);
      LogContext.set('problemDetail', problemDetails.detail);
      return;
    }

    LogContext.set('errorCode', err instanceof Error ? err.constructor.name : 'UnknownError');
    LogContext.set('errorMessage', err instanceof Error ? err.message : String(err));
  }

  private flush(): void {
    const log = LogContext.flush();
    if (log) {
      this.logger.canonical(log as Record<string, unknown>);
    }
  }
}
