import { randomUUID } from 'node:crypto';

import { TestingModule } from '@nestjs/testing';

import { PrismaService } from 'src/core/database/prisma.service';
import {
  createOfferingSetupIntegrationContext,
  useIntegrationTestContext,
} from '../../../../../test/support/integration-test-context';
import { createTestFixtures, TestFixtures } from '../../../../../test/support/fixtures';
import { CreateRentableEquipmentCommand } from './create-rentable-equipment.command';
import { CreateRentableEquipmentHandler } from './create-rentable-equipment.handler';

describe('CreateRentableEquipment integration', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let fixtures: TestFixtures;
  let handler: CreateRentableEquipmentHandler;

  useIntegrationTestContext(async () => {
    moduleRef = await createOfferingSetupIntegrationContext();
    prisma = moduleRef.get(PrismaService);
    fixtures = createTestFixtures(prisma);
    handler = moduleRef.get(CreateRentableEquipmentHandler);
    return moduleRef;
  });

  it('copies the product image to the equipment type and rentable item', async () => {
    const tenant = await fixtures.createTenant();
    const branch = await fixtures.createBranch({ tenantId: tenant.id });
    const imageUrl = 'https://images.example.com/sony-fx3.webp';

    const result = await handler.execute(
      new CreateRentableEquipmentCommand({
        tenantId: tenant.id,
        name: `Sony FX3 Camera ${randomUUID()}`,
        imageUrl,
        kind: 'SINGLE',
        quantityPerItem: 1,
        assets: [{ branchId: branch.id }],
      }),
    );

    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;

    await expect(
      prisma.client.v2EquipmentType.findUniqueOrThrow({
        where: { id: result.value.equipmentTypeId },
        select: { imageUrl: true },
      }),
    ).resolves.toEqual({ imageUrl });
    await expect(
      prisma.client.v2RentableItem.findUniqueOrThrow({
        where: { id: result.value.rentableItemId },
        select: { imageUrl: true },
      }),
    ).resolves.toEqual({ imageUrl });
  });
});
