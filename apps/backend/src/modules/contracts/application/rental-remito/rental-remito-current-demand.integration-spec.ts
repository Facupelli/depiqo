import { CommandBus } from '@nestjs/cqrs';
import { TestingModule } from '@nestjs/testing';

import { PrismaService } from 'src/core/database/prisma.service';
import { V2ContractArtifactKind, V2ContractArtifactStorageStatus, V2ContractStatus } from 'src/generated/prisma/enums';
import { RemoveConfirmedPackageDemandLineCommand } from 'src/modules/rental-commitment/features/remove-confirmed-package-demand-line/remove-confirmed-package-demand-line.command';
import { ConfirmRentalFixtures } from 'src/modules/rental-commitment/features/confirm-rental/testing/confirm-rental.fixtures';
import {
  createContractsIntegrationContext,
  useIntegrationTestContext,
} from '../../../../../test/support/integration-test-context';
import { createTestFixtures, TestFixtures } from '../../../../../test/support/fixtures';
import { RentalRemitoReadModelLoader } from './rental-remito-read-model.loader';

describe('Rental Remito current committed demand integration', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let bus: CommandBus;
  let core: TestFixtures;
  let rentals: ConfirmRentalFixtures;

  useIntegrationTestContext(async () => {
    moduleRef = await createContractsIntegrationContext();
    prisma = moduleRef.get(PrismaService);
    bus = moduleRef.get(CommandBus);
    core = createTestFixtures(prisma);
    rentals = new ConfirmRentalFixtures(prisma);
    return moduleRef;
  });

  it('prepares only current package equipment after one child is removed and preserves the prior artifact', async () => {
    const tenant = await core.createTenant();
    const branch = await core.createBranch({ tenantId: tenant.id });
    const { customer } = await core.createRentalCustomer({ tenantId: tenant.id });
    const { user } = await core.createTenantUser({ tenantId: tenant.id });
    const period = {
      start: new Date('2030-01-02T10:00:00.000Z'),
      end: new Date('2030-01-03T10:00:00.000Z'),
    };
    const rental = await rentals.createRental({
      tenantId: tenant.id,
      branchId: branch.id,
      customerId: customer.id,
      period,
      status: 'CONFIRMED',
      demands: [{}, {}, {}],
    });
    const selectionId = rental.selectionIds[0];

    await prisma.client.$transaction(async (tx) => {
      await tx.v2RentalDemandLine.updateMany({
        where: { rentalId: rental.rentalId },
        data: { rentalSelectionId: selectionId },
      });
      await tx.v2RentalSelection.deleteMany({
        where: { rentalId: rental.rentalId, id: { not: selectionId } },
      });
      await tx.v2RentalSelection.update({
        where: { id: selectionId },
        data: { rentableItemKindSnapshot: 'PACKAGE', quantity: 1 },
      });
      await tx.v2Rental.update({
        where: { id: rental.rentalId },
        data: { acceptedBeforeBufferMinutes: 0, acceptedAfterBufferMinutes: 0 },
      });
      for (const [index, name] of ['Demand A', 'Demand B', 'Demand C'].entries()) {
        await tx.v2RentalDemandLine.update({
          where: { id: rental.demandLineIds[index] },
          data: { equipmentTypeNameSnapshot: name },
        });
      }
    });

    for (let index = 0; index < rental.demandLineIds.length; index += 1) {
      await prisma.client.v2EquipmentType.create({
        data: { id: rental.equipmentTypeIds[index], tenantId: tenant.id, name: `Demand ${index + 1}` },
      });
      const asset = await prisma.client.v2Asset.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          equipmentTypeId: rental.equipmentTypeIds[index],
          serialNumber: `SERIAL-${index + 1}`,
        },
      });
      await rentals.createCandidate({
        tenantId: tenant.id,
        branchId: branch.id,
        equipmentTypeId: rental.equipmentTypeIds[index],
        assetId: asset.id,
      });
      await prisma.client.v2AssignedAsset.create({
        data: {
          tenantId: tenant.id,
          rentalId: rental.rentalId,
          rentalDemandLineId: rental.demandLineIds[index],
          assetId: asset.id,
          ownershipSnapshot: { kind: 'TENANT_OWNED' },
          effectiveFrom: period.start,
        },
      });
      await rentals.createActiveBlock({ tenantId: tenant.id, rentalId: rental.rentalId, assetId: asset.id, period });
    }

    const contract = await prisma.client.v2Contract.create({
      data: {
        tenantId: tenant.id,
        rentalId: rental.rentalId,
        status: V2ContractStatus.GENERATED,
        snapshot: { equipmentLines: ['Demand A', 'Demand B', 'Demand C'] },
      },
    });
    const artifact = await prisma.client.v2ContractArtifact.create({
      data: {
        tenantId: tenant.id,
        contractId: contract.id,
        kind: V2ContractArtifactKind.UNSIGNED_PDF,
        storageStatus: V2ContractArtifactStorageStatus.AVAILABLE,
        storageKey: `contracts/${contract.id}/historical.pdf`,
        fileName: 'historical.pdf',
        contentType: 'application/pdf',
        byteSize: 10,
        hashAlgorithm: 'SHA-256',
        documentHash: 'historical-document-hash',
      },
    });
    const artifactBefore = await prisma.client.v2ContractArtifact.findUniqueOrThrow({ where: { id: artifact.id } });
    const rentalBefore = await prisma.client.v2Rental.findUniqueOrThrow({ where: { id: rental.rentalId } });
    const removedDemandAssignment = await prisma.client.v2AssignedAsset.findFirstOrThrow({
      where: { rentalDemandLineId: rental.demandLineIds[1], effectiveUntil: null },
      select: { assetId: true },
    });

    const result = await bus.execute(
      new RemoveConfirmedPackageDemandLineCommand({
        tenantId: tenant.id,
        tenantUserId: user.id,
        rentalId: rental.rentalId,
        demandLineId: rental.demandLineIds[1],
        expectedVersion: rentalBefore.version,
        quantity: 1,
        releaseAssetIds: [removedDemandAssignment.assetId],
      }),
    );
    if (result.isErr()) throw result.error;
    expect(result.isOk()).toBe(true);

    const currentExtraAsset = await prisma.client.v2Asset.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        equipmentTypeId: rental.equipmentTypeIds[0],
        serialNumber: 'SERIAL-1-CURRENT-EXTRA',
      },
    });
    const endedExtraAsset = await prisma.client.v2Asset.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        equipmentTypeId: rental.equipmentTypeIds[0],
        serialNumber: 'SERIAL-1-ENDED',
      },
    });
    await prisma.client.v2AssignedAsset.createMany({
      data: [
        {
          tenantId: tenant.id,
          rentalId: rental.rentalId,
          rentalDemandLineId: rental.demandLineIds[0],
          assetId: currentExtraAsset.id,
          ownershipSnapshot: { kind: 'TENANT_OWNED' },
          effectiveFrom: period.start,
        },
        {
          tenantId: tenant.id,
          rentalId: rental.rentalId,
          rentalDemandLineId: rental.demandLineIds[0],
          assetId: endedExtraAsset.id,
          ownershipSnapshot: { kind: 'TENANT_OWNED' },
          effectiveFrom: period.start,
          effectiveUntil: new Date(period.start.getTime() + 1_000),
        },
      ],
    });
    await prisma.client.v2RentalDemandLine.update({
      where: { id: rental.demandLineIds[0] },
      data: { quantity: 3, removedQuantity: 1 },
    });

    const source = await moduleRef.get(RentalRemitoReadModelLoader).load(tenant.id, rental.rentalId);
    expect(source.isOk()).toBe(true);
    if (source.isOk()) {
      expect(source.value.equipmentLines).toHaveLength(2);
      expect(source.value.equipmentLines).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: rental.demandLineIds[0],
            name: 'Demand A',
            quantity: 2,
            serialNumbers: expect.arrayContaining(['SERIAL-1', 'SERIAL-1-CURRENT-EXTRA']),
          }),
          { id: rental.demandLineIds[2], name: 'Demand C', quantity: 1, serialNumbers: ['SERIAL-3'] },
        ]),
      );
      expect(
        source.value.equipmentLines.find((line) => line.id === rental.demandLineIds[0])?.serialNumbers,
      ).toHaveLength(2);
      expect(source.value.equipmentLines.some((line) => line.id === rental.demandLineIds[1])).toBe(false);
    }

    expect(await prisma.client.v2ContractArtifact.findUniqueOrThrow({ where: { id: artifact.id } })).toEqual(
      artifactBefore,
    );
    expect(await prisma.client.v2Contract.findUniqueOrThrow({ where: { id: contract.id } })).toEqual(
      expect.objectContaining({ status: V2ContractStatus.DRAFT, snapshot: contract.snapshot }),
    );
  });
});
