import { randomUUID } from 'node:crypto';

import { TestingModule } from '@nestjs/testing';

import { PrismaService } from 'src/core/database/prisma.service';
import {
  createCatalogIntegrationContext,
  useIntegrationTestContext,
} from '../../../../test/support/integration-test-context';
import { createTestFixtures, TestFixtures } from '../../../../test/support/fixtures';

import { CatalogOfferingAuthoring } from './catalog-offering-authoring.public-api';

describe('CatalogOfferingAuthoring integration', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let fixtures: TestFixtures;
  let authoring: CatalogOfferingAuthoring;

  useIntegrationTestContext(async () => {
    moduleRef = await createCatalogIntegrationContext();
    prisma = moduleRef.get(PrismaService);
    fixtures = createTestFixtures(prisma);
    authoring = moduleRef.get(CatalogOfferingAuthoring);
    return moduleRef;
  });

  async function setup() {
    const tenant = await fixtures.createTenant();
    const branch = await fixtures.createBranch({ tenantId: tenant.id });
    const equipmentType = await prisma.client.v2EquipmentType.create({
      data: { tenantId: tenant.id, name: `Equipment ${randomUUID()}` },
    });
    return { tenant, branch, equipmentType };
  }

  async function createOffering(input: { tenantId: string; equipmentTypeId: string; branchIds: string[] }) {
    return authoring.createRentableItemOffering({
      tenantId: input.tenantId,
      name: `Rentable item ${randomUUID()}`,
      kind: 'SINGLE',
      requirements: [{ equipmentTypeId: input.equipmentTypeId, quantityPerItem: 1 }],
      branchIds: input.branchIds,
    });
  }

  it.each(['missing', 'cross-tenant'])(
    'rejects a %s Equipment Type reference without persisting a Catalog offering',
    async (reference) => {
      const current = await setup();
      const equipmentTypeId =
        reference === 'missing'
          ? randomUUID()
          : (
              await prisma.client.v2EquipmentType.create({
                data: {
                  tenantId: (await fixtures.createTenant()).id,
                  name: `Foreign equipment ${randomUUID()}`,
                },
              })
            ).id;

      const result = await createOffering({
        tenantId: current.tenant.id,
        equipmentTypeId,
        branchIds: [current.branch.id],
      });

      expect(result.isErr() && result.error.code).toBe('EquipmentTypeNotFound');
      expect(await prisma.client.v2RentableItem.count({ where: { tenantId: current.tenant.id } })).toBe(0);
      expect(await prisma.client.v2RentalOffer.count({ where: { tenantId: current.tenant.id } })).toBe(0);
    },
  );

  it.each(['missing', 'cross-tenant'])(
    'rejects a %s initial branch reference without persisting a Catalog offering',
    async (reference) => {
      const current = await setup();
      const branchId = reference === 'missing' ? randomUUID() : (await setup()).branch.id;

      const result = await createOffering({
        tenantId: current.tenant.id,
        equipmentTypeId: current.equipmentType.id,
        branchIds: [branchId],
      });

      expect(result.isErr() && result.error.code).toBe('BranchNotFound');
      expect(await prisma.client.v2RentableItem.count({ where: { tenantId: current.tenant.id } })).toBe(0);
      expect(await prisma.client.v2RentalOffer.count({ where: { tenantId: current.tenant.id } })).toBe(0);
    },
  );

  it.each([
    ['inactive', { isActive: false }, 'BranchInactive'],
    ['soft-deleted', { deletedAt: new Date() }, 'BranchDeleted'],
  ] as const)('rejects an %s branch reference', async (_state, overrides, expectedCode) => {
    const current = await setup();
    await prisma.client.v2Branch.update({ where: { id: current.branch.id }, data: overrides });

    const result = await createOffering({
      tenantId: current.tenant.id,
      equipmentTypeId: current.equipmentType.id,
      branchIds: [current.branch.id],
    });

    expect(result.isErr() && result.error.code).toBe(expectedCode);
    expect(await prisma.client.v2RentableItem.count({ where: { tenantId: current.tenant.id } })).toBe(0);
  });

  it('creates valid initial offers and adds the rentable item to another valid branch', async () => {
    const current = await setup();
    const additionalBranch = await fixtures.createBranch({ tenantId: current.tenant.id });

    const created = await createOffering({
      tenantId: current.tenant.id,
      equipmentTypeId: current.equipmentType.id,
      branchIds: [current.branch.id],
    });

    expect(created.isOk()).toBe(true);
    if (created.isErr()) return;
    expect(created.value.rentalOfferIds).toHaveLength(1);

    const added = await authoring.createRentalOfferForRentableItem({
      tenantId: current.tenant.id,
      rentableItemId: created.value.rentableItemId,
      branchId: additionalBranch.id,
    });

    expect(added.isOk()).toBe(true);
    if (added.isErr()) return;
    expect(
      await prisma.client.v2RentableItem.findUniqueOrThrow({ where: { id: created.value.rentableItemId } }),
    ).toEqual(expect.objectContaining({ status: 'DRAFT' }));
    expect(
      await prisma.client.v2RentalOffer.findMany({
        where: { tenantId: current.tenant.id, rentableItemId: created.value.rentableItemId },
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: created.value.rentalOfferIds[0], isVisible: true, isRentable: true }),
        expect.objectContaining({ id: added.value.rentalOfferId, isVisible: true, isRentable: true }),
      ]),
    );
  });

  it.each([
    ['missing', async () => randomUUID(), 'BranchNotFound'],
    ['cross-tenant', async () => (await setup()).branch.id, 'BranchNotFound'],
    [
      'inactive',
      async (current: Awaited<ReturnType<typeof setup>>) => {
        const branch = await fixtures.createBranch({ tenantId: current.tenant.id });
        await prisma.client.v2Branch.update({ where: { id: branch.id }, data: { isActive: false } });
        return branch.id;
      },
      'BranchInactive',
    ],
    [
      'soft-deleted',
      async (current: Awaited<ReturnType<typeof setup>>) => {
        const branch = await fixtures.createBranch({ tenantId: current.tenant.id });
        await prisma.client.v2Branch.update({ where: { id: branch.id }, data: { deletedAt: new Date() } });
        return branch.id;
      },
      'BranchDeleted',
    ],
  ] as const)('rejects a %s branch when adding an offer', async (_state, branchIdFor, expectedCode) => {
    const current = await setup();
    const created = await createOffering({
      tenantId: current.tenant.id,
      equipmentTypeId: current.equipmentType.id,
      branchIds: [current.branch.id],
    });
    if (created.isErr()) throw created.error;

    const result = await authoring.createRentalOfferForRentableItem({
      tenantId: current.tenant.id,
      rentableItemId: created.value.rentableItemId,
      branchId: await branchIdFor(current),
    });

    expect(result.isErr() && result.error.code).toBe(expectedCode);
    expect(
      await prisma.client.v2RentalOffer.count({
        where: { tenantId: current.tenant.id, rentableItemId: created.value.rentableItemId },
      }),
    ).toBe(1);
  });
});
