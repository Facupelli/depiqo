import { randomUUID } from 'node:crypto';

import { TestingModule } from '@nestjs/testing';

import { PrismaService } from 'src/core/database/prisma.service';
import {
  createOfferingSetupIntegrationContext,
  useIntegrationTestContext,
} from '../../../../../test/support/integration-test-context';
import { createTestFixtures, TestFixtures } from '../../../../../test/support/fixtures';
import { CreateEquipmentCommand } from './create-equipment.command';
import { CreateEquipmentHandler } from './create-equipment.handler';

describe('CreateEquipment integration', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let fixtures: TestFixtures;
  let handler: CreateEquipmentHandler;

  useIntegrationTestContext(async () => {
    moduleRef = await createOfferingSetupIntegrationContext();
    prisma = moduleRef.get(PrismaService);
    fixtures = createTestFixtures(prisma);
    handler = moduleRef.get(CreateEquipmentHandler);
    return moduleRef;
  });

  it('creates only an equipment type when both optional inputs are absent', async () => {
    const tenant = await fixtures.createTenant();
    const result = await handler.execute(
      new CreateEquipmentCommand({
        tenantId: tenant.id,
        equipment: { name: `Equipment ${randomUUID()}` },
      }),
    );

    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    expect(result.value.assetIds).toEqual([]);
    expect(result.value.standaloneRental).toBeNull();
    await expect(prisma.client.v2RentableItem.count({ where: { tenantId: tenant.id } })).resolves.toBe(0);
  });

  it('creates an equipment type with assets without creating Catalog state', async () => {
    const tenant = await fixtures.createTenant();
    const branch = await fixtures.createBranch({ tenantId: tenant.id });
    const result = await handler.execute(
      new CreateEquipmentCommand({
        tenantId: tenant.id,
        equipment: { name: `Equipment ${randomUUID()}` },
        assets: [{ branchId: branch.id }],
      }),
    );

    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    expect(result.value.assetIds).toHaveLength(1);
    expect(result.value.standaloneRental).toBeNull();
    await expect(prisma.client.v2RentableItem.count({ where: { tenantId: tenant.id } })).resolves.toBe(0);
  });

  it('creates a SINGLE standalone rental with the new equipment type x1 and explicit commercial branches', async () => {
    const tenant = await fixtures.createTenant();
    const commercialBranch = await fixtures.createBranch({ tenantId: tenant.id });
    const equipmentImageUrl = 'https://images.example.com/equipment.webp';
    const rentalImageUrl = 'https://images.example.com/rental.webp';
    const result = await handler.execute(
      new CreateEquipmentCommand({
        tenantId: tenant.id,
        equipment: { name: `Equipment ${randomUUID()}`, imageUrl: equipmentImageUrl },
        standaloneRental: {
          name: `Rental ${randomUUID()}`,
          imageUrl: rentalImageUrl,
          branchIds: [commercialBranch.id],
        },
      }),
    );

    expect(result.isOk()).toBe(true);
    if (result.isErr() || !result.value.standaloneRental) return;
    expect(result.value.assetIds).toEqual([]);
    await expect(
      prisma.client.v2RentableItem.findUniqueOrThrow({
        where: { id: result.value.standaloneRental.rentableItemId },
        select: {
          kind: true,
          imageUrl: true,
          requirements: { select: { equipmentTypeId: true, quantityPerItem: true } },
        },
      }),
    ).resolves.toEqual({
      kind: 'SINGLE',
      imageUrl: rentalImageUrl,
      requirements: [{ equipmentTypeId: result.value.equipmentTypeId, quantityPerItem: 1 }],
    });
    await expect(
      prisma.client.v2RentalOffer.findMany({
        where: { id: { in: result.value.standaloneRental.rentalOfferIds } },
        select: { branchId: true },
      }),
    ).resolves.toEqual([{ branchId: commercialBranch.id }]);
  });

  it('keeps physical Asset and commercial RentalOffer branches independent', async () => {
    const tenant = await fixtures.createTenant();
    const physicalBranch = await fixtures.createBranch({ tenantId: tenant.id });
    const commercialBranch = await fixtures.createBranch({ tenantId: tenant.id });
    const result = await handler.execute(
      new CreateEquipmentCommand({
        tenantId: tenant.id,
        equipment: { name: `Equipment ${randomUUID()}` },
        assets: [{ branchId: physicalBranch.id }],
        standaloneRental: { name: `Rental ${randomUUID()}`, branchIds: [commercialBranch.id] },
      }),
    );

    expect(result.isOk()).toBe(true);
    if (result.isErr() || !result.value.standaloneRental) return;
    await expect(
      prisma.client.v2Asset.findUniqueOrThrow({ where: { id: result.value.assetIds[0] }, select: { branchId: true } }),
    ).resolves.toEqual({ branchId: physicalBranch.id });
    await expect(
      prisma.client.v2RentalOffer.findMany({
        where: { id: { in: result.value.standaloneRental.rentalOfferIds } },
        select: { branchId: true },
      }),
    ).resolves.toEqual([{ branchId: commercialBranch.id }]);
  });
});
