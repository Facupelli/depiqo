import { EventEmitterModule } from '@nestjs/event-emitter';
import { CqrsModule } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';

import { AppConfigModule } from '../../src/config/config.module';
import { DatabaseModule } from '../../src/core/database/database.module';
import { IntegrationEventsModule } from '../../src/core/domain/events/integration-events.module';
import { LoggerModule } from '../../src/core/logger/logger.module';
import { CatalogModule } from '../../src/modules/catalog/catalog.module';
import { RentalCommitmentModule } from '../../src/modules/rental-commitment/rental-commitment.module';
import { OfferingSetupModule } from '../../src/modules/offering-setup/offering-setup.module';
import { PricingModule } from '../../src/modules/pricing/pricing.module';
import { SharedModule } from '../../src/modules/shared/shared.module';

type Closable = { close(): Promise<void> };

export interface ProviderOverride {
  provide: unknown;
  useValue: unknown;
}

/** Registers one shared integration context for the enclosing spec. */
export function useIntegrationTestContext<T extends Closable>(createContext: () => Promise<T>): void {
  let context: T | undefined;

  beforeAll(async () => {
    context = await createContext();
  });

  afterAll(async () => {
    await context?.close();
  });
}

/**
 * Compiles the real Rental Commitment module graph without creating an HTTP
 * application or running configureApp().
 */
export async function createCatalogIntegrationContext(): Promise<TestingModule> {
  const moduleRef = await Test.createTestingModule({
    imports: [
      SharedModule,
      LoggerModule,
      AppConfigModule,
      DatabaseModule,
      EventEmitterModule.forRoot(),
      IntegrationEventsModule,
      CqrsModule.forRoot(),
      CatalogModule,
    ],
  }).compile();

  await moduleRef.init();
  return moduleRef;
}

export async function createPricingIntegrationContext(): Promise<TestingModule> {
  const moduleRef = await Test.createTestingModule({
    imports: [
      SharedModule,
      LoggerModule,
      AppConfigModule,
      DatabaseModule,
      EventEmitterModule.forRoot(),
      IntegrationEventsModule,
      CqrsModule.forRoot(),
      PricingModule,
    ],
  }).compile();

  await moduleRef.init();
  return moduleRef;
}

export async function createOfferingSetupIntegrationContext(
  overrides: ProviderOverride[] = [],
): Promise<TestingModule> {
  let builder = Test.createTestingModule({
    imports: [
      SharedModule,
      LoggerModule,
      AppConfigModule,
      DatabaseModule,
      EventEmitterModule.forRoot(),
      IntegrationEventsModule,
      CqrsModule.forRoot(),
      OfferingSetupModule,
    ],
  });

  for (const override of overrides) {
    builder = builder.overrideProvider(override.provide as any).useValue(override.useValue);
  }

  const moduleRef = await builder.compile();

  await moduleRef.init();
  return moduleRef;
}

export async function createRentalCommitmentIntegrationContext(): Promise<TestingModule> {
  const moduleRef = await Test.createTestingModule({
    imports: [
      SharedModule,
      LoggerModule,
      AppConfigModule,
      DatabaseModule,
      EventEmitterModule.forRoot(),
      IntegrationEventsModule,
      CqrsModule.forRoot(),
      RentalCommitmentModule,
    ],
  }).compile();

  await moduleRef.init();
  return moduleRef;
}
