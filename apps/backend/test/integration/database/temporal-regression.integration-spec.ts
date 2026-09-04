import { randomUUID } from 'node:crypto';

import { Test, TestingModule } from '@nestjs/testing';
import { useIntegrationTestContext } from '../../support/integration-test-context';
import { Prisma } from 'src/generated/prisma/client';

import { AppConfigModule } from '../../../src/config/config.module';
import { PrismaService } from '../../../src/core/database/prisma.service';
import { prismaDateToLocalDate } from '../../../src/core/temporal/local-date';
import { SharedModule } from '../../../src/modules/shared/shared.module';
import { TenantConfig } from '../../../src/modules/tenant-management/domain/value-objects/tenant-config.value-object';
import { createTestFixtures, TestFixtures } from '../../support/fixtures';

const acceptedPricingSnapshot = {
  schema: 'v2.rental-price-snapshot',
  version: 3,
  calculatedAtIso: '2026-01-01T00:00:00.000Z',
  context: 'CONFIRMED',
  calculated: {
    currency: 'USD',
    subtotal: '0.00',
    discountTotal: '0.00',
    total: '0.00',
    chargedDays: 0,
    lines: [],
    appliedPromotions: [],
    durationPolicySnapshot: {
      timezone: 'UTC',
      dailyBillingPolicy: 'IGNORE_PARTIAL_DAY',
      weekendCountsAsOne: false,
      minimumChargedDays: 0,
    },
  },
  final: {
    currency: 'USD',
    subtotal: '0.00',
    discountTotal: '0.00',
    total: '0.00',
    chargedDays: 0,
    lines: [],
    appliedPromotions: [],
    durationPolicySnapshot: {
      timezone: 'UTC',
      dailyBillingPolicy: 'IGNORE_PARTIAL_DAY',
      weekendCountsAsOne: false,
      minimumChargedDays: 0,
    },
  },
  insurance: { applied: false, amount: '0.00' },
  totalBeforeInsurance: '0.00',
  total: '0.00',
} satisfies Prisma.InputJsonObject;

describe('temporal PostgreSQL regression coverage', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let fixtures: TestFixtures;

  useIntegrationTestContext(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule, SharedModule],
      providers: [PrismaService],
    }).compile();
    await moduleRef.init();
    prisma = moduleRef.get(PrismaService);
    fixtures = createTestFixtures(prisma);
    return moduleRef;
  });

  it('preserves absolute instants through Prisma TIMESTAMPTZ columns and matching asset-block bounds', async () => {
    const tenant = await fixtures.createTenant();
    const branch = await fixtures.createBranch({ tenantId: tenant.id });
    const periodStart = new Date('2026-08-10T13:00:00.000Z');
    const periodEnd = new Date('2026-08-10T16:45:00.000Z');
    const confirmedAt = new Date('2026-08-10T13:05:00.000Z');
    const rental = await prisma.client.$transaction(async (tx) => {
      const counter = await tx.v2RentalNumberCounter.upsert({
        where: { tenantId: tenant.id },
        create: { tenantId: tenant.id, lastIssuedNumber: 1 },
        update: { lastIssuedNumber: { increment: 1 } },
        select: { lastIssuedNumber: true },
      });

      return tx.v2Rental.create({
        data: {
          tenantId: tenant.id,
          rentalNumber: counter.lastIssuedNumber,
          branchId: branch.id,
          status: 'CONFIRMED',
          fulfillmentMethod: 'PICKUP',
          periodStart,
          periodEnd,
          priceSnapshot: acceptedPricingSnapshot,
          acceptedCustomerTotal: acceptedPricingSnapshot.total,
          confirmedAt,
          cancelledAt: null,
        },
      });
    });

    const read = await prisma.client.v2Rental.findUniqueOrThrow({ where: { id: rental.id } });
    expect(read.periodStart.getTime()).toBe(periodStart.getTime());
    expect(read.periodEnd.getTime()).toBe(periodEnd.getTime());
    expect(read.confirmedAt?.getTime()).toBe(confirmedAt.getTime());
    expect(read.cancelledAt).toBeNull();

    await prisma.client.$executeRaw(Prisma.sql`
      INSERT INTO v2_asset_blocks (id, tenant_id, rental_id, asset_id, period, block_type, created_at)
      VALUES (
        ${randomUUID()}, ${tenant.id}, ${rental.id}, ${randomUUID()},
        tstzrange(${periodStart}, ${periodEnd}, '[)'), 'EQUIPMENT'::"V2AssetBlockType", ${confirmedAt}
      )
    `);

    const bounds = await prisma.client.$queryRaw<Array<{ lower: Date; upper: Date }>>(Prisma.sql`
      SELECT lower(period) AS lower, upper(period) AS upper
      FROM v2_asset_blocks
      WHERE rental_id = ${rental.id}
    `);
    expect(bounds).toHaveLength(1);
    expect(bounds[0].lower.getTime()).toBe(periodStart.getTime());
    expect(bounds[0].upper.getTime()).toBe(periodEnd.getTime());
  });

  it.each(['Pacific/Auckland', 'America/New_York'])(
    'keeps instant reads, range overlap, and lifecycle comparisons invariant in a %s session',
    async (timezone) => {
      const tenant = await fixtures.createTenant();
      const branch = await fixtures.createBranch({ tenantId: tenant.id });
      const start = new Date('2026-11-01T05:30:00.000Z');
      const end = new Date('2026-11-01T06:30:00.000Z');
      const confirmedAt = new Date('2026-11-01T05:45:00.000Z');
      const rental = await prisma.client.$transaction(async (tx) => {
        const counter = await tx.v2RentalNumberCounter.upsert({
          where: { tenantId: tenant.id },
          create: { tenantId: tenant.id, lastIssuedNumber: 1 },
          update: { lastIssuedNumber: { increment: 1 } },
          select: { lastIssuedNumber: true },
        });

        return tx.v2Rental.create({
          data: {
            tenantId: tenant.id,
            rentalNumber: counter.lastIssuedNumber,
            branchId: branch.id,
            status: 'CONFIRMED',
            fulfillmentMethod: 'PICKUP',
            periodStart: start,
            periodEnd: end,
            priceSnapshot: acceptedPricingSnapshot,
            acceptedCustomerTotal: acceptedPricingSnapshot.total,
            confirmedAt,
          },
        });
      });
      await prisma.client.$executeRaw(Prisma.sql`
        INSERT INTO v2_asset_blocks (id, tenant_id, rental_id, asset_id, period, block_type, created_at)
        VALUES (${randomUUID()}, ${tenant.id}, ${rental.id}, ${randomUUID()}, tstzrange(${start}, ${end}, '[)'),
          'EQUIPMENT'::"V2AssetBlockType", ${confirmedAt})
      `);

      const rows = await prisma.client.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET LOCAL TIME ZONE '${timezone}'`);
        return tx.$queryRaw<Array<{ periodStart: string; overlaps: boolean; lifecycleMatches: boolean }>>(Prisma.sql`
          SELECT to_char(r.period_start AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "periodStart",
            EXISTS (
              SELECT 1 FROM v2_asset_blocks b
              WHERE b.rental_id = r.id
                AND b.period && tstzrange(${'2026-11-01T06:00:00Z'}::timestamptz, ${'2026-11-01T07:00:00Z'}::timestamptz, '[)')
            ) AS overlaps,
            r.confirmed_at > ${'2026-11-01T05:40:00Z'}::timestamptz AS "lifecycleMatches"
          FROM v2_rentals r WHERE r.id = ${rental.id}
        `);
      });

      expect(rows).toHaveLength(1);
      expect(new Date(rows[0].periodStart).getTime()).toBe(start.getTime());
      expect(rows[0]).toMatchObject({ overlaps: true, lifecycleMatches: true });
    },
  );

  it('keeps PostgreSQL DATE values stable across a non-UTC database session', async () => {
    const tenant = await fixtures.createTenant({
      config: { ...TenantConfig.default().toPlainObject(), timezone: 'America/New_York' },
    });
    const branch = await fixtures.createBranch({ tenantId: tenant.id });
    const { customer } = await fixtures.createRentalCustomer({ tenantId: tenant.id });
    const localDate = new Date('1990-03-15T00:00:00.000Z');

    await prisma.client.v2CustomerProfile.create({
      data: {
        customerId: customer.id,
        fullName: 'Test Customer',
        phone: '123',
        birthDate: localDate,
        documentNumber: '123',
        identityDocumentPath: 'test',
        address: 'Test',
        city: 'Test',
        stateRegion: 'Test',
        country: 'Test',
        occupation: 'Test',
        contact1Name: 'One',
        contact1Relationship: 'Friend',
        contact2Name: 'Two',
        contact2Relationship: 'Friend',
      },
    });
    await prisma.client.v2BranchSchedule.create({
      data: {
        branchId: branch.id,
        type: 'PICKUP',
        specificDate: new Date('2026-03-08T00:00:00.000Z'),
        openTime: 540,
        closeTime: 600,
        slotIntervalMinutes: 30,
      },
    });
    const promotion = await prisma.client.v2Promotion.create({
      data: {
        tenantId: tenant.id,
        name: 'Date stable',
        effectType: 'PERCENTAGE_OFF',
        effectValue: '10',
        validFrom: new Date('2026-03-08T00:00:00.000Z'),
        validUntil: new Date('2026-11-01T00:00:00.000Z'),
      },
    });
    await prisma.client.v2Coupon.create({
      data: {
        tenantId: tenant.id,
        promotionId: promotion.id,
        code: 'DATE-STABLE',
        validFrom: new Date('2026-03-08T00:00:00.000Z'),
        validUntil: new Date('2026-11-01T00:00:00.000Z'),
      },
    });

    const dates = await prisma.client.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET LOCAL TIME ZONE 'Pacific/Auckland'");
      return tx.$queryRaw<
        Array<{
          birthDate: string;
          specificDate: string;
          promotionFrom: string;
          promotionUntil: string;
          couponFrom: string;
          couponUntil: string;
        }>
      >(Prisma.sql`
        SELECT cp.birth_date::text AS "birthDate", bs.specific_date::text AS "specificDate",
          p.valid_from::text AS "promotionFrom", p.valid_until::text AS "promotionUntil",
          c.valid_from::text AS "couponFrom", c.valid_until::text AS "couponUntil"
        FROM v2_customer_profiles cp
        CROSS JOIN v2_branch_schedules bs
        CROSS JOIN v2_promotions p
        CROSS JOIN v2_coupons c
        WHERE cp.customer_id = ${customer.id} AND bs.branch_id = ${branch.id} AND p.id = ${promotion.id} AND c.code = 'DATE-STABLE'
      `);
    });

    expect(dates).toEqual([
      {
        birthDate: '1990-03-15',
        specificDate: '2026-03-08',
        promotionFrom: '2026-03-08',
        promotionUntil: '2026-11-01',
        couponFrom: '2026-03-08',
        couponUntil: '2026-11-01',
      },
    ]);
    const profile = await prisma.client.v2CustomerProfile.findUniqueOrThrow({ where: { customerId: customer.id } });
    expect(prismaDateToLocalDate(profile.birthDate)).toBe('1990-03-15');
  });
});
