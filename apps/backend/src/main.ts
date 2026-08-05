import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { Env } from './config/env.schema';
import { configureApp } from './configure-app';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  const logger = app.get(Logger);
  app.useLogger(logger);

  const config = app.get<ConfigService<Env, true>>(ConfigService);
  if (config.get('NODE_ENV') === 'production') app.set('trust proxy', 1);

  const resources = configureApp(app, {
    allowedOrigins: getAllowedOrigins(config.get('CORS_ALLOWED_ORIGINS')),
  });
  registerShutdownSignals(app, resources.close);

  const port = config.get('PORT');
  await app.listen(port);
  logger.log(`Application started on port ${port}`, 'Bootstrap');
}

void bootstrap();

function registerShutdownSignals(app: NestExpressApplication, closeResources: () => Promise<void>): void {
  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    await app.close();
    await closeResources();
  };

  process.once('SIGINT', () => void shutdown());
  process.once('SIGTERM', () => void shutdown());
}

function getAllowedOrigins(rawOrigins: string): Set<string> {
  return new Set(
    rawOrigins
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}
