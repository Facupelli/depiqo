import { randomUUID } from 'node:crypto';

import { TestingModule } from '@nestjs/testing';

import { PrismaService } from 'src/core/database/prisma.service';
import {
  createCatalogIntegrationContext,
  useIntegrationTestContext,
} from '../../../../test/support/integration-test-context';
import { createTestFixtures, TestFixtures } from '../../../../test/support/fixtures';

import { CatalogSelectionResolution } from './catalog-selection-resolution.public-api';

describe('CatalogSelectionResolution requirement outcomes integration', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let fixtures: TestFixtures;
  let resolution: CatalogSelectionResolution;

  useIntegrationTestContext(async () => {
    moduleRef = await createCatalogIntegrationContext();
    prisma = moduleRef.get(PrismaService);
    fixtures = createTestFixtures(prisma);
    resolution = moduleRef.get(CatalogSelectionResolution);
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

  async function offer(params: {
    tenantId: string;
    branchId: string;
    equipmentTypeId: string;
    isRentable?: boolean;
    itemStatus?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
    quantityPerItem?: number;
  }) {
    const item = await prisma.client.v2RentableItem.create({
      data: {
        tenantId: params.tenantId,
        name: `Item ${randomUUID()}`,
        kind: 'SINGLE',
        status: params.itemStatus ?? 'ACTIVE',
        requirements: {
          create: {
            tenantId: params.tenantId,
            equipmentTypeId: params.equipmentTypeId,
            quantityPerItem: params.quantityPerItem ?? 1,
          },
        },
      },
    });
    return prisma.client.v2RentalOffer.create({
      data: {
        tenantId: params.tenantId,
        branchId: params.branchId,
        rentableItemId: item.id,
        isRentable: params.isRentable ?? true,
      },
    });
  }

  it('classifies every requested offer exactly once in a mixed batch', async () => {
    const current = await setup();
    const valid = await offer({
      tenantId: current.tenant.id,
      branchId: current.branch.id,
      equipmentTypeId: current.equipmentType.id,
    });
    const unrentable = await offer({
      tenantId: current.tenant.id,
      branchId: current.branch.id,
      equipmentTypeId: current.equipmentType.id,
      isRentable: false,
    });
    const inactive = await offer({
      tenantId: current.tenant.id,
      branchId: current.branch.id,
      equipmentTypeId: current.equipmentType.id,
      itemStatus: 'DRAFT',
    });
    const missingId = randomUUID();
    const requestedIds = [valid.id, missingId, unrentable.id, inactive.id];

    const result = await resolution.resolveSelectedRentalOfferRequirements({
      tenantId: current.tenant.id,
      branchId: current.branch.id,
      rentalOfferIds: requestedIds,
    });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;
    expect(result.value.resolvedOffers.map((entry) => entry.rentalOfferId)).toEqual([valid.id]);
    expect(result.value.unavailableOffers).toEqual([
      { rentalOfferId: missingId, code: 'RentalOfferNotFound' },
      { rentalOfferId: unrentable.id, code: 'RentalOfferNotRentable' },
      {
        rentalOfferId: inactive.id,
        code: 'RentableItemNotActive',
        rentableItemId: inactive.rentableItemId,
      },
    ]);
    expect(
      [
        ...result.value.resolvedOffers.map((entry) => entry.rentalOfferId),
        ...result.value.unavailableOffers.map((entry) => entry.rentalOfferId),
      ].sort(),
    ).toEqual([...requestedIds].sort());
  });

  it.each(['wrong branch', 'foreign tenant'] as const)('classifies a %s offer as not found', async (kind) => {
    const current = await setup();
    const other = await setup();
    const branchId =
      kind === 'wrong branch' ? (await fixtures.createBranch({ tenantId: current.tenant.id })).id : other.branch.id;
    const owner = kind === 'wrong branch' ? current : other;
    const unavailable = await offer({
      tenantId: owner.tenant.id,
      branchId,
      equipmentTypeId: owner.equipmentType.id,
    });

    const result = await resolution.resolveSelectedRentalOfferRequirements({
      tenantId: current.tenant.id,
      branchId: current.branch.id,
      rentalOfferIds: [unavailable.id],
    });

    expect(result._unsafeUnwrap().unavailableOffers).toEqual([
      { rentalOfferId: unavailable.id, code: 'RentalOfferNotFound' },
    ]);
  });

  it('keeps invalid fulfillment definition as a whole-call error', async () => {
    const current = await setup();
    const invalid = await offer({
      tenantId: current.tenant.id,
      branchId: current.branch.id,
      equipmentTypeId: current.equipmentType.id,
      quantityPerItem: 0,
    });

    const result = await resolution.resolveSelectedRentalOfferRequirements({
      tenantId: current.tenant.id,
      branchId: current.branch.id,
      rentalOfferIds: [invalid.id],
    });

    expect(result.isErr() && result.error.code).toBe('InvalidFulfillmentDefinition');
  });
});
