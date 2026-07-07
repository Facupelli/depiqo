import { Injectable, LoggerService } from '@nestjs/common';
import pino, { Logger } from 'pino';
import { LogContext } from './log-context';

const isDev = process.env.NODE_ENV !== 'production';

/**
 * AppLogger wraps Pino and implements NestJS's LoggerService interface.
 *
 * It automatically injects requestId from AsyncLocalStorage into every log
 * line, so that individual trace logs can be correlated with canonical logs
 * using a simple query: `requestId = "req_abc123"`.
 */
@Injectable()
export class AppLogger implements LoggerService {
  private readonly pino: Logger;

  constructor() {
    this.pino = pino({
      level: process.env.LOG_LEVEL ?? 'info',
      ...(isDev
        ? {
            transport: {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'SYS:HH:MM:ss',
                ignore: 'pid,hostname',
                messageKey: 'msg',
              },
            },
          }
        : {
            // Production: raw JSON, one line per log entry
            formatters: {
              level(label) {
                return { level: label };
              },
            },
          }),
    });
  }

  private getBase(context?: string): Record<string, unknown> {
    const base: Record<string, unknown> = {};
    const requestId = LogContext.get('requestId');
    if (requestId) base.requestId = requestId;
    if (context) base.context = context;
    return base;
  }

  log(message: string, context?: string): void {
    this.pino.info(this.getBase(context), message);
  }

  error(message: string, trace?: string, context?: string): void {
    this.pino.error({ ...this.getBase(context), trace }, message);
  }

  warn(message: string, context?: string): void {
    this.pino.warn(this.getBase(context), message);
  }

  debug(message: string, context?: string): void {
    this.pino.debug(this.getBase(context), message);
  }

  verbose(message: string, context?: string): void {
    this.pino.trace(this.getBase(context), message);
  }

  /**
   * Emit the canonical log line for the current request.
   * Called once per request by the LoggingInterceptor.
   */
  canonical(log: Record<string, unknown>): void {
    this.pino.info({ ...log, type: 'canonical' }, `${log.httpMethod} ${log.httpPath} -> ${log.httpStatus}`);
  }
}
