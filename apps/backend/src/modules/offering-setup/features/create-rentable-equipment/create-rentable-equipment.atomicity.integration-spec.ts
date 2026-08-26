import { randomUUID } from 'node:crypto';

import { TestingModule } from '@nestjs/testing';
import { err, ok } from 'neverthrow';

import { IntegrationEventPublisher } from 'src/core/domain/events/integration-event.publisher';
import { PrismaService } from 'src/core/database/prisma.service';
import { AssetCreatedIntegrationEvent } from 'src/modules/asset-inventory/public-api/events/asset-created.integration-event';
import {
  EquipmentTypeReferenceAuthority,
  EquipmentTypeReferenceAuthorityError,
} from 'src/modules/asset-inventory/public-api/equipment-type-reference-authority.public-api';
import {
  createOfferingSetupIntegrationContext,
  useIntegrationTestContext,
} from '../../../../../test/support/integration-test-context';
import { createTestFixtures, TestFixtures } from '../../../../../test/support/fixtures';
import { CreateRentableEquipmentCommand } from './create-rentable-equipment.command';
import { CreateRentableEquipmentHandler } from './create-rentable-equipment.handler';

describe('CreateRentableEquipment atomicity integration', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let fixtures: TestFixtures;
  let handler: CreateRentableEquipmentHandler;
  let publishSpy: jest.SpyInstance;
  let validateEquipmentTypeReferences: jest.Mock;

  useIntegrationTestContext(async () => {
    validateEquipmentTypeReferences = jest.fn();
    moduleRef = await createOfferingSetupIntegrationContext([
      { provide: EquipmentTypeReferenceAuthority, useValue: { validateEquipmentTypeReferences } },
    ]);
    prisma = moduleRef.get(PrismaService);
    fixtures = createTestFixtures(prisma);
    handler = moduleRef.get(CreateRentableEquipmentHandler);
    const publisher = moduleRef.get(IntegrationEventPublisher);
    publishSpy = jest.spyOn(publisher, 'publish');
    return moduleRef;
  });

  function buildCommand(tenantId: string, branchId: string): CreateRentableEquipmentCommand {
    return new CreateRentableEquipmentCommand({
      tenantId,
      name: `Atomicity Camera ${randomUUID()}`,
      imageUrl: 'https://images.example.com/atomicity-camera.webp',
      kind: 'SINGLE',
      quantityPerItem: 1,
      assets: [{ branchId }],
    });
  }

  async function expectNoSurvivingRecords(tenantId: string): Promise<void> {
    await expect(prisma.client.v2EquipmentType.count({ where: { tenantId } })).resolves.toBe(0);
    await expect(prisma.client.v2Asset.count({ where: { tenantId } })).resolves.toBe(0);
    await expect(prisma.client.v2RentableItem.count({ where: { tenantId } })).resolves.toBe(0);
    await expect(prisma.client.v2RentableItemRequirement.count({ where: { tenantId } })).resolves.toBe(0);
    await expect(prisma.client.v2RentalOffer.count({ where: { tenantId } })).resolves.toBe(0);
  }

  async function expectNoPublishedEvents(): Promise<void> {
    expect(publishSpy).not.toHaveBeenCalled();
  }

  it('rolls back Inventory writes when Catalog returns a typed failure', async () => {
    const tenant = await fixtures.createTenant();
    const branch = await fixtures.createBranch({ tenantId: tenant.id });
    validateEquipmentTypeReferences.mockResolvedValue(
      err({
        code: 'EquipmentTypeReferenceNotFound',
        message: 'Equipment type was not found.',
        equipmentTypeId: 'missing-id',
      } satisfies EquipmentTypeReferenceAuthorityError),
    );

    const result = await handler.execute(buildCommand(tenant.id, branch.id));

    expect(result.isErr()).toBe(true);
    if (result.isOk()) return;
    expect(result.error.code).toBe('offering_setup.invalid_equipment');

    // The reference authority is invoked during the Catalog phase, after the
    // real Inventory writes have executed inside the outer transaction.
    expect(validateEquipmentTypeReferences).toHaveBeenCalledTimes(1);

    await expectNoSurvivingRecords(tenant.id);
    await expectNoPublishedEvents();
  });

  it('rolls back Inventory writes and publishes nothing when Catalog throws unexpectedly', async () => {
    const tenant = await fixtures.createTenant();
    const branch = await fixtures.createBranch({ tenantId: tenant.id });
    validateEquipmentTypeReferences.mockRejectedValue(new Error('unexpected catalog infrastructure failure'));

    await expect(handler.execute(buildCommand(tenant.id, branch.id))).rejects.toThrow(
      'unexpected catalog infrastructure failure',
    );

    await expectNoSurvivingRecords(tenant.id);
    await expectNoPublishedEvents();
  });

  it('persists all records and publishes AssetCreated when the workflow succeeds', async () => {
    const tenant = await fixtures.createTenant();
    const branch = await fixtures.createBranch({ tenantId: tenant.id });
    validateEquipmentTypeReferences.mockResolvedValue(ok(undefined));

    const result = await handler.execute(buildCommand(tenant.id, branch.id));

    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;

    await expect(
      prisma.client.v2EquipmentType.count({ where: { id: result.value.equipmentTypeId, tenantId: tenant.id } }),
    ).resolves.toBe(1);
    await expect(
      prisma.client.v2Asset.count({ where: { id: { in: result.value.assetIds }, tenantId: tenant.id } }),
    ).resolves.toBe(result.value.assetIds.length);
    await expect(
      prisma.client.v2RentableItem.count({ where: { id: result.value.rentableItemId, tenantId: tenant.id } }),
    ).resolves.toBe(1);
    await expect(prisma.client.v2RentableItemRequirement.count({ where: { tenantId: tenant.id } })).resolves.toBe(1);
    await expect(
      prisma.client.v2RentalOffer.count({ where: { id: { in: result.value.rentalOfferIds }, tenantId: tenant.id } }),
    ).resolves.toBe(result.value.rentalOfferIds.length);

    expect(publishSpy).toHaveBeenCalledTimes(1);
    const publishedEvents = publishSpy.mock.calls[0][0] as readonly unknown[];
    const assetCreatedEvents = publishedEvents.filter((event) => event instanceof AssetCreatedIntegrationEvent);
    expect(assetCreatedEvents).toHaveLength(1);
  });
});
