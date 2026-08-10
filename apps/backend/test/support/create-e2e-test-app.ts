import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';

import { AppModule } from '../../src/app.module';
import { ConfiguredAppResources, configureApp } from '../../src/configure-app';
import { EmailDeliveryPort } from '../../src/modules/notifications/application/ports/email-delivery.port';
import { ObjectStoragePort } from '../../src/modules/object-storage/application/ports/object-storage.port';
import { CustomHostnameProvider } from '../../src/modules/tenant-management/application/ports/custom-hostname-provider.port';
import { GoogleIdentityVerifier } from '../../src/modules/tenant-management/auth/shared/google/google-identity-verifier.port';
import {
  FakeCustomHostnameProvider,
  FakeEmailDeliveryPort,
  FakeGoogleIdentityVerifier,
  FakeObjectStoragePort,
} from './external-infrastructure/fakes';

export type E2ETestExternals = {
  emailDelivery: FakeEmailDeliveryPort;
  objectStorage: FakeObjectStoragePort;
  customHostname: FakeCustomHostnameProvider;
  googleIdentity: FakeGoogleIdentityVerifier;
};

export type E2ETestApp = {
  app: INestApplication;
  externals: E2ETestExternals;
  close(): Promise<void>;
};

export async function createE2ETestApp(options: { databaseUrl?: string } = {}): Promise<E2ETestApp> {
  const externals: E2ETestExternals = {
    emailDelivery: new FakeEmailDeliveryPort(),
    objectStorage: new FakeObjectStoragePort(),
    customHostname: new FakeCustomHostnameProvider(),
    googleIdentity: new FakeGoogleIdentityVerifier(),
  };
  let builder = Test.createTestingModule({ imports: [AppModule] });
  if (options.databaseUrl) {
    const values = { ...process.env, DATABASE_URL: options.databaseUrl };
    builder = builder.overrideProvider(ConfigService).useValue({
      get: (key: string, defaultValue?: unknown) => values[key] ?? defaultValue,
    });
  }

  const moduleRef = await builder
    .overrideProvider(EmailDeliveryPort)
    .useValue(externals.emailDelivery)
    .overrideProvider(ObjectStoragePort)
    .useValue(externals.objectStorage)
    .overrideProvider(CustomHostnameProvider)
    .useValue(externals.customHostname)
    .overrideProvider(GoogleIdentityVerifier)
    .useValue(externals.googleIdentity)
    .compile();
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
    externals,
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
