import { randomUUID } from 'node:crypto';
import { IncomingMessage, ServerResponse } from 'node:http';

import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { Options } from 'pino-http';

import { AppConfigModule } from 'src/config/config.module';
import { Env } from 'src/config/env.schema';

import { buildCanonicalCompletion, canonicalCompletionMessage } from './canonical-log.builder';
import { LoggingMiddleware } from './logging.middleware';
import { pinoErrorSerializer } from './pino-error.serializer';

const requestsWithLoggerProps = new WeakSet<IncomingMessage>();

@Global()
@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        pinoHttp: createPinoHttpOptions(config),
      }),
    }),
  ],
})
export class LoggerModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(LoggingMiddleware).forRoutes('*');
  }
}

function createPinoHttpOptions(config: ConfigService<Env, true>): Options {
  const isProduction = config.get('NODE_ENV') === 'production';

  return {
    level: config.get('LOG_LEVEL'),
    quietResLogger: true,
    genReqId: generateRequestId,
    customProps: requestLogProps,
    customLogLevel: (_request, response) => severityForStatus(response.statusCode),
    customSuccessObject: (request, response, value) => buildCanonicalCompletion(request, response, responseTime(value)),
    customErrorObject: (request, response, error, value) =>
      buildCanonicalCompletion(request, response, responseTime(value), error),
    customSuccessMessage: canonicalCompletionMessage,
    customErrorMessage: canonicalCompletionMessage,
    wrapSerializers: false,
    serializers: {
      req: () => undefined,
      res: () => undefined,
      err: pinoErrorSerializer,
    },
    ...(isProduction
      ? {}
      : {
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:HH:MM:ss',
              ignore: 'pid,hostname',
              messageKey: 'msg',
            },
          },
        }),
  };
}

function requestLogProps(request: IncomingMessage): { requestId: string } | Record<string, never> {
  if (requestsWithLoggerProps.has(request)) return {};
  requestsWithLoggerProps.add(request);
  return { requestId: String(request.id) };
}

function generateRequestId(request: IncomingMessage, _response: ServerResponse): string {
  const incoming = request.headers['x-request-id'];
  const candidate = Array.isArray(incoming) ? incoming[0] : incoming;

  if (candidate) {
    const normalized = candidate.trim();
    if (normalized.length > 0 && normalized.length <= 128 && !/[\r\n]/.test(normalized)) {
      return normalized;
    }
  }

  return `req_${randomUUID().replaceAll('-', '').slice(0, 16)}`;
}

function severityForStatus(status: number): 'info' | 'warn' | 'error' {
  if (status >= 500) return 'error';
  if (status >= 400) return 'warn';
  return 'info';
}

function responseTime(value: unknown): number {
  if (!value || typeof value !== 'object') return 0;
  const duration = (value as { responseTime?: unknown }).responseTime;
  return typeof duration === 'number' && Number.isFinite(duration) ? duration : 0;
}
