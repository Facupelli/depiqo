import { INestApplication } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';

import { AppModule } from '../../src/app.module';
import { ConfiguredAppResources, configureApp } from '../../src/configure-app';

export type E2ETestApp = {
  app: INestApplication;
  close(): Promise<void>;
};

export async function createE2ETestApp(): Promise<E2ETestApp> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();
  const resources = configureApp(app);

  try {
    await app.init();
  } catch (error) {
    try {
      await closeE2ETestApp(app, resources);
    } catch {
      // Preserve the application initialization error.
    }

    throw error;
  }

  return {
    app,
    close: () => closeE2ETestApp(app, resources),
  };
}

async function closeE2ETestApp(app: INestApplication, resources: ConfiguredAppResources): Promise<void> {
  try {
    await app.close();
  } finally {
    await resources.close();
  }
}
