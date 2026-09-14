import { randomUUID } from 'node:crypto';
import { TestingModule } from '@nestjs/testing';

import { PrismaService } from 'src/core/database/prisma.service';
import { AssetId } from '../domain/types/rental-commitment-ids';
import {
  createRentalCommitmentIntegrationContext,
  useIntegrationTestContext,
} from '../../../../test/support/integration-test-context';
import { createTestFixtures, TestFixtures } from '../../../../test/support/fixtures';
import { utcDate } from '../../../../test/support/time';
import { ConfirmRentalFixtures, RentalPeriodFixture } from '../features/confirm-rental/testing/confirm-rental.fixtures';
import { RentalAssetAllocationService } from './rental-asset-allocation.service';

const proposedPeriod = period(10, 12);

function period(startHour: number, endHour: number): RentalPeriodFixture {
  return { start: utcDate(2030, 1, 1, startHour), end: utcDate(2030, 1, 1, endHour) };
}

describe('RentalAssetAllocationService exact-asset availability integration', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let core: TestFixtures;
  let rentals: ConfirmRentalFixtures;
  let service: RentalAssetAllocationService;

  useIntegrationTestContext(async () => {
    moduleRef = await createRentalCommitmentIntegrationContext();
    prisma = moduleRef.get(PrismaService);
    core = createTestFixtures(prisma);
    rentals = new ConfirmRentalFixtures(prisma);
    service = moduleRef.get(RentalAssetAllocationService);
    return moduleRef;
  });

  async function setup() {
    const tenant = await core.createTenant();
    const branch = await core.createBranch({ tenantId: tenant.id });
    const currentRental = await rentals.createRental({
      tenantId: tenant.id,
      branchId: branch.id,
      period: period(8, 9),
    });
    const otherRental = await rentals.createRental({
      tenantId: tenant.id,
      branchId: branch.id,
      period: proposedPeriod,
    });
    return { tenant, branch, currentRental, otherRental };
  }

  async function conflicts(params: {
    tenantId: string;
    currentRentalId: string;
    assetIds: string[];
    proposed?: RentalPeriodFixture;
  }) {
    const targetPeriod = params.proposed ?? proposedPeriod;
    return service.findConflictingExactAssetIds({
      tenantId: params.tenantId,
      currentRentalId: params.currentRentalId,
      assetIds: params.assetIds as AssetId[],
      periodStart: targetPeriod.start,
      periodEnd: targetPeriod.end,
    });
  }

  it('returns no conflicts when the requested assets have no blocks', async () => {
    const s = await setup();

    await expect(
      conflicts({ tenantId: s.tenant.id, currentRentalId: s.currentRental.rentalId, assetIds: [randomUUID()] }),
    ).resolves.toEqual([]);
  });

  it.each(['EQUIPMENT', 'ACCESSORY'] as const)("reports another rental's overlapping %s block", async (blockType) => {
    const s = await setup();
    const assetId = randomUUID();
    await rentals.createActiveBlock({
      tenantId: s.tenant.id,
      rentalId: s.otherRental.rentalId,
      assetId,
      period: period(10, 11),
      blockType,
    });

    await expect(
      conflicts({ tenantId: s.tenant.id, currentRentalId: s.currentRental.rentalId, assetIds: [assetId] }),
    ).resolves.toEqual([assetId]);
  });

  it.each(['EQUIPMENT', 'ACCESSORY'] as const)("ignores this rental's own %s block", async (blockType) => {
    const s = await setup();
    const assetId = randomUUID();
    await rentals.createActiveBlock({
      tenantId: s.tenant.id,
      rentalId: s.currentRental.rentalId,
      assetId,
      period: period(10, 11),
      blockType,
    });

    await expect(
      conflicts({ tenantId: s.tenant.id, currentRentalId: s.currentRental.rentalId, assetIds: [assetId] }),
    ).resolves.toEqual([]);
  });

  it('ignores all of this rental own blocks when both block types are present', async () => {
    const s = await setup();
    const equipmentAssetId = randomUUID();
    const accessoryAssetId = randomUUID();
    await Promise.all([
      rentals.createActiveBlock({
        tenantId: s.tenant.id,
        rentalId: s.currentRental.rentalId,
        assetId: equipmentAssetId,
        period: period(10, 11),
        blockType: 'EQUIPMENT',
      }),
      rentals.createActiveBlock({
        tenantId: s.tenant.id,
        rentalId: s.currentRental.rentalId,
        assetId: accessoryAssetId,
        period: period(10, 11),
        blockType: 'ACCESSORY',
      }),
    ]);

    await expect(
      conflicts({
        tenantId: s.tenant.id,
        currentRentalId: s.currentRental.rentalId,
        assetIds: [equipmentAssetId, accessoryAssetId],
      }),
    ).resolves.toEqual([]);
  });

  it('ignores released blocks from another rental', async () => {
    const s = await setup();
    const assetId = randomUUID();
    await rentals.createActiveBlock({
      tenantId: s.tenant.id,
      rentalId: s.otherRental.rentalId,
      assetId,
      period: period(10, 11),
      releasedAt: utcDate(2030, 1, 1, 9),
    });

    await expect(
      conflicts({ tenantId: s.tenant.id, currentRentalId: s.currentRental.rentalId, assetIds: [assetId] }),
    ).resolves.toEqual([]);
  });

  it.each([
    ['non-overlapping before', period(8, 9)],
    ['touching proposed start', period(8, 10)],
    ['touching proposed end', period(12, 14)],
  ])('ignores another rental block that is %s', async (_name, blockPeriod) => {
    const s = await setup();
    const assetId = randomUUID();
    await rentals.createActiveBlock({
      tenantId: s.tenant.id,
      rentalId: s.otherRental.rentalId,
      assetId,
      period: blockPeriod,
    });

    await expect(
      conflicts({ tenantId: s.tenant.id, currentRentalId: s.currentRental.rentalId, assetIds: [assetId] }),
    ).resolves.toEqual([]);
  });

  it('is tenant-scoped even when another tenant has a block for the requested asset ID', async () => {
    const s = await setup();
    const otherTenant = await core.createTenant();
    const otherBranch = await core.createBranch({ tenantId: otherTenant.id });
    const otherTenantRental = await rentals.createRental({
      tenantId: otherTenant.id,
      branchId: otherBranch.id,
      period: proposedPeriod,
    });
    const assetId = randomUUID();
    await rentals.createActiveBlock({
      tenantId: otherTenant.id,
      rentalId: otherTenantRental.rentalId,
      assetId,
      period: period(10, 11),
    });

    await expect(
      conflicts({ tenantId: s.tenant.id, currentRentalId: s.currentRental.rentalId, assetIds: [assetId] }),
    ).resolves.toEqual([]);
  });

  it('returns conflicts only for requested asset IDs', async () => {
    const s = await setup();
    const requestedAssetId = randomUUID();
    const unrequestedAssetId = randomUUID();
    await Promise.all(
      [requestedAssetId, unrequestedAssetId].map((assetId) =>
        rentals.createActiveBlock({
          tenantId: s.tenant.id,
          rentalId: s.otherRental.rentalId,
          assetId,
          period: period(10, 11),
        }),
      ),
    );

    await expect(
      conflicts({
        tenantId: s.tenant.id,
        currentRentalId: s.currentRental.rentalId,
        assetIds: [requestedAssetId],
      }),
    ).resolves.toEqual([requestedAssetId]);
  });

  it('returns every conflicting requested asset', async () => {
    const s = await setup();
    const assetIds = [randomUUID(), randomUUID()];
    await Promise.all(
      assetIds.map((assetId) =>
        rentals.createActiveBlock({
          tenantId: s.tenant.id,
          rentalId: s.otherRental.rentalId,
          assetId,
          period: period(10, 11),
        }),
      ),
    );

    await expect(
      conflicts({ tenantId: s.tenant.id, currentRentalId: s.currentRental.rentalId, assetIds }),
    ).resolves.toEqual(expect.arrayContaining(assetIds));
  });

  it('returns safely for an empty asset list without deriving a PostgreSQL range', async () => {
    const s = await setup();

    await expect(
      service.findConflictingExactAssetIds({
        tenantId: s.tenant.id,
        currentRentalId: s.currentRental.rentalId,
        assetIds: [],
        periodStart: proposedPeriod.end,
        periodEnd: proposedPeriod.start,
      }),
    ).resolves.toEqual([]);
  });

  it('accepts the established Prisma transaction client', async () => {
    const s = await setup();

    await expect(
      prisma.client.$transaction((tx) =>
        service.findConflictingExactAssetIds({
          tenantId: s.tenant.id,
          currentRentalId: s.currentRental.rentalId,
          assetIds: [randomUUID() as AssetId],
          periodStart: proposedPeriod.start,
          periodEnd: proposedPeriod.end,
          tx,
        }),
      ),
    ).resolves.toEqual([]);
  });
});
