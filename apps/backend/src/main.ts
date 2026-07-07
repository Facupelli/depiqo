import { NestFactory, Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ZodValidationPipe } from 'nestjs-zod';
import { ProblemDetailsFilter } from './core/problem-details';
import { AppLogger } from './core/logger/app-logger.service';
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

const PORT = process.env.PORT ?? 3000;

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  const logger = app.get(AppLogger);
  app.useLogger(logger);

  const isProduction = process.env.NODE_ENV === 'production';
  const sessionSecret = process.env.SESSION_SECRET;
  const databaseUrl = process.env.DATABASE_URL;

  if (isProduction) {
    app.set('trust proxy', 1);
  }

  const allowedOrigins = getAllowedOrigins();

  app.enableCors({
    credentials: true,
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS origin not allowed: ${origin}`), false);
    },
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
    exposedHeaders: [],
    maxAge: 60 * 60,
  });

  const PgSession = connectPgSimple(session);

  app.use(
    session({
      name: SESSION_COOKIE_NAME,
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      rolling: false,
      store: new PgSession({
        conString: databaseUrl,
        tableName: 'session',
        createTableIfMissing: false,
        ttl: SESSION_TTL_SECONDS,
      }),
      cookie: {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
        maxAge: SESSION_MAX_AGE_MS,
      },
    }),
  );

  app.use(passport.initialize());
  app.use(passport.session());

  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(new ProblemDetailsFilter(logger));
  app.useGlobalInterceptors(new TransformInterceptor(new Reflector()));

  await app.listen(PORT);
  logger.log(`Application started on port ${PORT}`, 'Bootstrap');
}

bootstrap();

function getAllowedOrigins(): Set<string> {
  const rawOrigins = process.env.CORS_ALLOWED_ORIGINS ?? '';

  return new Set(
    rawOrigins
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}
