import { Test } from '@nestjs/testing';

import { AppConfigModule } from '../../../src/config/config.module';
import { PrismaService } from '../../../src/core/database/prisma.service';
import { SharedModule } from '../../../src/modules/shared/shared.module';

describe('Prisma database integration', () => {
  it('persists and reads data through the real Prisma provider', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule, SharedModule],
      providers: [PrismaService],
    }).compile();

    await moduleRef.init();
    try {
      const prisma = moduleRef.get(PrismaService);
      const created = await prisma.client.billingUnit.create({
        data: { label: 'Day', durationMinutes: 1440, sortOrder: 1 },
      });

      await expect(prisma.client.billingUnit.findUnique({ where: { id: created.id } })).resolves.toMatchObject({
        label: 'Day',
        durationMinutes: 1440,
      });
    } finally {
      await moduleRef.close();
    }
  });

  it('starts with data from the previous test removed', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule, SharedModule],
      providers: [PrismaService],
    }).compile();

    await moduleRef.init();
    try {
      const prisma = moduleRef.get(PrismaService);
      await expect(prisma.client.billingUnit.count()).resolves.toBe(0);
    } finally {
      await moduleRef.close();
    }
  });
});
