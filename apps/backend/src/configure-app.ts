import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ZodValidationPipe } from 'nestjs-zod';

import { Env } from './config/env.schema';
import { ProblemDetailsFilter } from './core/problem-details';
import { TransformInterceptor } from './core/response/transform.interceptor';
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_MS,
  SESSION_TTL_SECONDS,
} from './modules/tenant-management/auth/shared/session/auth-session.constants';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import passport = require('passport');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const session = require('express-session');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const connectPgSimple = require('connect-pg-simple');

export type ConfigureAppOptions = {
  allowedOrigins?: ReadonlySet<string>;
};

export type ConfiguredAppResources = {
  close(): Promise<void>;
};

export function configureApp(app: NestExpressApplication, options: ConfigureAppOptions = {}): ConfiguredAppResources {
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  const isProduction = config.get('NODE_ENV') === 'production';
  const allowedOrigins = options.allowedOrigins ?? new Set<string>();

  app.enableCors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      return callback(new Error(`CORS origin not allowed: ${origin}`), false);
    },
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
    exposedHeaders: [],
    maxAge: 60 * 60,
  });

  const PgSession = connectPgSimple(session);
  const sessionStore = new PgSession({
    conString: config.get('DATABASE_URL'),
    tableName: 'session',
    createTableIfMissing: false,
    ttl: SESSION_TTL_SECONDS,
  });
  app.use(
    session({
      name: SESSION_COOKIE_NAME,
      secret: config.get('SESSION_SECRET'),
      resave: false,
      saveUninitialized: false,
      rolling: false,
      store: sessionStore,
      cookie: {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
        domain: undefined,
        maxAge: SESSION_MAX_AGE_MS,
      },
    }),
  );

  app.use(passport.initialize());
  app.use(passport.session());
  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(new ProblemDetailsFilter(isProduction));
  app.useGlobalInterceptors(new TransformInterceptor(new Reflector()));

  return {
    close: async () => sessionStore.close(),
  };
}
