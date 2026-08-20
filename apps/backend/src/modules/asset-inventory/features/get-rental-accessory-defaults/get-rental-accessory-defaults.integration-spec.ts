import { randomUUID } from 'node:crypto';

import { CommandBus } from '@nestjs/cqrs';
import { TestingModule } from '@nestjs/testing';

import { PrismaService } from 'src/core/database/prisma.service';
import { V2RentalStatus } from 'src/generated/prisma/enums';
import { AssignRentalAccessoriesCommand } from 'src/modules/rental-commitment/features/assign-rental-accessories/assign-rental-accessories.command';
import { AssignRentalAccessoriesResult } from 'src/modules/rental-commitment/features/assign-rental-accessories/assign-rental-accessories.handler';
import { ConfirmRentalFixtures } from 'src/modules/rental-commitment/features/confirm-rental/testing/confirm-rental.fixtures';
import {
  createRentalCommitmentIntegrationContext,
  useIntegrationTestContext,
} from '../../../../../test/support/integration-test-context';
import { createTestFixtures, TestFixtures } from '../../../../../test/support/fixtures';
import { utcDate } from '../../../../../test/support/time';
import { GetRentalAccessoryDefaultsHandler } from './get-rental-accessory-defaults.handler';
import { GetRentalAccessoryDefaultsQuery } from './get-rental-accessory-defaults.query';

describe('GetRentalAccessoryDefaults integration', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let commandBus: CommandBus;
  let core: TestFixtures;
  let rentals: ConfirmRentalFixtures;
  let handler: GetRentalAccessoryDefaultsHandler;

  useIntegrationTestContext(async () => {
    moduleRef = await createRentalCommitmentIntegrationContext();
    prisma = moduleRef.get(PrismaService);
    commandBus = moduleRef.get(CommandBus);
    core = createTestFixtures(prisma);
    rentals = new ConfirmRentalFixtures(prisma);
    handler = new GetRentalAccessoryDefaultsHandler(prisma);
    return moduleRef;
  });

  async function scenario(ownerContractSnapshot: Record<string, unknown> | null) {
    const tenant = await core.createTenant();
    const branch = await core.createBranch({ tenantId: tenant.id });
    const sourceEquipmentType = await prisma.client.v2EquipmentType.create({
      data: { tenantId: tenant.id, name: `Source ${randomUUID()}` },
    });
    const accessoryEquipmentType = await prisma.client.v2EquipmentType.create({
      data: { tenantId: tenant.id, name: `Accessory ${randomUUID()}` },
    });
    const rental = await rentals.createRental({
      tenantId: tenant.id,
      branchId: branch.id,
      status: V2RentalStatus.CONFIRMED,
      period: { start: utcDate(2030, 1, 1, 10), end: utcDate(2030, 1, 2, 10) },
      demands: [{ equipmentTypeId: sourceEquipmentType.id }],
    });

    await prisma.client.v2EquipmentTypeAccessoryDefault.create({
      data: {
        tenantId: tenant.id,
        equipmentTypeId: sourceEquipmentType.id,
        accessoryEquipmentTypeId: accessoryEquipmentType.id,
        quantity: 1,
      },
    });

    await rentals.createCandidate({
      tenantId: tenant.id,
      branchId: branch.id,
      equipmentTypeId: accessoryEquipmentType.id,
      overrides: {
        ownershipKind: 'THIRD_PARTY',
        ownerId: randomUUID(),
        ownerContractSnapshot,
      },
    });

    return { tenant, branch, rental, sourceEquipmentType, accessoryEquipmentType };
  }

  it('does not count a third-party candidate without an owner contract snapshot', async () => {
    const s = await scenario(null);

    const result = await handler.execute(new GetRentalAccessoryDefaultsQuery(s.tenant.id, s.rental.rentalId));

    expect(result.isOk() && result.value.suggestions).toHaveLength(1);
    if (result.isErr()) return;
    expect(result.value.suggestions[0].availableCount).toBe(0);
  });

  it('returns one shared count for every suggestion of the same accessory equipment type', async () => {
    const s = await scenario({ ownerId: randomUUID() });
    const secondSourceEquipmentType = await prisma.client.v2EquipmentType.create({
      data: { tenantId: s.tenant.id, name: `Second source ${randomUUID()}` },
    });
    const secondSelection = await prisma.client.v2RentalSelection.create({
      data: {
        id: randomUUID(),
        tenantId: s.tenant.id,
        rentalId: s.rental.rentalId,
        rentalOfferId: randomUUID(),
        rentableItemId: randomUUID(),
        rentableItemNameSnapshot: `Second rental item ${randomUUID()}`,
        rentableItemKindSnapshot: 'SINGLE',
        quantity: 1,
      },
    });
    const secondDemandLine = await prisma.client.v2RentalDemandLine.create({
      data: {
        id: randomUUID(),
        tenantId: s.tenant.id,
        rentalId: s.rental.rentalId,
        rentalSelectionId: secondSelection.id,
        equipmentTypeId: secondSourceEquipmentType.id,
        equipmentTypeNameSnapshot: secondSourceEquipmentType.name,
        quantity: 1,
      },
    });
    await prisma.client.v2EquipmentTypeAccessoryDefault.create({
      data: {
        tenantId: s.tenant.id,
        equipmentTypeId: secondSourceEquipmentType.id,
        accessoryEquipmentTypeId: s.accessoryEquipmentType.id,
        quantity: 1,
      },
    });

    const result = await handler.execute(new GetRentalAccessoryDefaultsQuery(s.tenant.id, s.rental.rentalId));

    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    expect(result.value.suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceRentalDemandLineId: s.rental.demandLineIds[0],
          accessoryEquipmentTypeId: s.accessoryEquipmentType.id,
          availableCount: 1,
        }),
        expect.objectContaining({
          sourceRentalDemandLineId: secondDemandLine.id,
          accessoryEquipmentTypeId: s.accessoryEquipmentType.id,
          availableCount: 1,
        }),
      ]),
    );
  });

  it('counts a third-party candidate with an owner contract snapshot and the assignment succeeds', async () => {
    const ownerId = randomUUID();
    const s = await scenario({
      ownerId,
      contractId: randomUUID(),
      ownerShare: 0.4,
      rentalShare: 0.6,
      basis: 'NET',
    });

    const defaults = await handler.execute(new GetRentalAccessoryDefaultsQuery(s.tenant.id, s.rental.rentalId));

    expect(defaults.isOk() && defaults.value.suggestions[0].availableCount).toBe(1);
    if (defaults.isErr()) return;

    const result = await commandBus.execute<AssignRentalAccessoriesCommand, AssignRentalAccessoriesResult>(
      new AssignRentalAccessoriesCommand({
        tenantId: s.tenant.id,
        rentalId: s.rental.rentalId,
        accessories: [
          {
            sourceRentalDemandLineId: s.rental.demandLineIds[0],
            equipmentTypeId: s.accessoryEquipmentType.id,
            quantity: 1,
          },
        ],
      }),
    );

    expect(result.isOk()).toBe(true);
  });
});
