import type { Type } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Test, type TestingModule } from '@nestjs/testing';

import { AppConfigModule } from '../../../src/config/config.module';
import { DatabaseModule } from '../../../src/core/database/database.module';
import { IntegrationEventsModule } from '../../../src/core/domain/events/integration-events.module';
import { LoggerModule } from '../../../src/core/logger/logger.module';
import { SharedModule } from '../../../src/modules/shared/shared.module';

export interface ProviderOverride {
  provide: unknown;
  useValue: unknown;
}

export async function createNestIntegrationContext(
  rootModule: Type<unknown>,
  overrides: readonly ProviderOverride[] = [],
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
      rootModule,
    ],
  });

  for (const override of overrides) {
    builder = builder.overrideProvider(override.provide).useValue(override.useValue);
  }

  const moduleRef = await builder.compile();
  await moduleRef.init();
  return moduleRef;
}
