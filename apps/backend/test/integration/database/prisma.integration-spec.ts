import { Test } from '@nestjs/testing';

import { AppConfigModule } from '../../../src/config/config.module';
import { PrismaService } from '../../../src/core/database/prisma.service';
import { SharedModule } from '../../../src/modules/shared/shared.module';
import { integrationConfigServiceProvider, useIntegrationTestContext } from '../../support/integration-test-context';

describe('Prisma database integration', () => {
  let prisma: PrismaService;

  useIntegrationTestContext(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule, SharedModule],
      providers: [integrationConfigServiceProvider(), PrismaService],
    }).compile();
    await moduleRef.init();
    prisma = moduleRef.get(PrismaService);
    return moduleRef;
  });

  it('persists and reads data through the real Prisma provider', async () => {
    const created = await prisma.client.billingUnit.create({
      data: { label: 'Day', durationMinutes: 1440, sortOrder: 1 },
    });

    await expect(prisma.client.billingUnit.findUnique({ where: { id: created.id } })).resolves.toMatchObject({
      label: 'Day',
      durationMinutes: 1440,
    });
  });

  it('starts with data from the previous test removed', async () => {
    await expect(prisma.client.billingUnit.count()).resolves.toBe(0);
  });
});
