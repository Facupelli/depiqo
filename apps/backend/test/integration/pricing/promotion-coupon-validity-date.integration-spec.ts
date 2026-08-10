import { Test, TestingModule } from '@nestjs/testing';
import { integrationConfigServiceProvider, useIntegrationTestContext } from '../../support/integration-test-context';

import { AppConfigModule } from '../../../src/config/config.module';
import { PrismaService } from '../../../src/core/database/prisma.service';
import { SharedModule } from '../../../src/modules/shared/shared.module';
import { prismaDateToLocalDate } from '../../../src/core/temporal/local-date';

describe('V2 promotion and coupon validity DATE persistence', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;

  useIntegrationTestContext(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule, SharedModule],
      providers: [integrationConfigServiceProvider(), PrismaService],
    }).compile();
    await moduleRef.init();
    prisma = moduleRef.get(PrismaService);
    return moduleRef;
  });

  it('uses PostgreSQL DATE columns and preserves a legacy timestamp wall-clock date', async () => {
    const columns = await prisma.client.$queryRaw<
      Array<{ table_name: string; column_name: string; data_type: string }>
    >`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('v2_promotions', 'v2_coupons')
        AND column_name IN ('valid_from', 'valid_until')
      ORDER BY table_name, column_name
    `;

    expect(columns).toEqual([
      { table_name: 'v2_coupons', column_name: 'valid_from', data_type: 'date' },
      { table_name: 'v2_coupons', column_name: 'valid_until', data_type: 'date' },
      { table_name: 'v2_promotions', column_name: 'valid_from', data_type: 'date' },
      { table_name: 'v2_promotions', column_name: 'valid_until', data_type: 'date' },
    ]);

    const converted = await prisma.client.$queryRaw<Array<{ local_date: string }>>`
      SELECT (TIMESTAMP '2026-08-10 13:30:00'::date)::text AS local_date
    `;

    expect(converted).toEqual([{ local_date: '2026-08-10' }]);
  });

  it('maps persisted DATE values to local-date keys using UTC components', async () => {
    const promotion = await prisma.client.v2Promotion.create({
      data: {
        tenantId: 'tenant-1',
        name: 'Local date promotion',
        effectType: 'PERCENTAGE_OFF',
        effectValue: '10',
        validFrom: new Date('2026-08-10T00:00:00.000Z'),
        validUntil: new Date('2026-08-10T00:00:00.000Z'),
      },
    });

    expect(prismaDateToLocalDate(promotion.validFrom!)).toBe('2026-08-10');
    expect(prismaDateToLocalDate(promotion.validUntil!)).toBe('2026-08-10');
  });
});
