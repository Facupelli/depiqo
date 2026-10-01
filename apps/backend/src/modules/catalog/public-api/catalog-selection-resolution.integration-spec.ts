import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';

import { TestingModule } from '@nestjs/testing';
import { QueryBus } from '@nestjs/cqrs';

import { PrismaService } from 'src/core/database/prisma.service';
import { GetStorefrontRentalOffersQuery } from '../features/get-storefront-rental-offers/get-storefront-rental-offers.query';
import { GetStorefrontRentalOffersResult } from '../features/get-storefront-rental-offers/get-storefront-rental-offers.handler';
import { SearchRentalOffersQuery } from '../features/search-rental-offers/search-rental-offers.query';
import { SearchRentalOffersResult } from '../features/search-rental-offers/search-rental-offers.handler';
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
  let queries: QueryBus;

  useIntegrationTestContext(async () => {
    moduleRef = await createCatalogIntegrationContext();
    prisma = moduleRef.get(PrismaService);
    fixtures = createTestFixtures(prisma);
    resolution = moduleRef.get(CatalogSelectionResolution);
    queries = moduleRef.get(QueryBus);
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
    archived?: boolean;
    showInStore?: boolean;
    quantityPerItem?: number;
  }) {
    const item = await prisma.client.v2RentableItem.create({
      data: {
        tenantId: params.tenantId,
        name: `Item ${randomUUID()}`,
        kind: 'SINGLE',
        archivedAt: params.archived ? new Date() : null,
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
        showInStore: params.showInStore ?? false,
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
      showInStore: false,
    });
    const unrentable = await offer({
      tenantId: current.tenant.id,
      branchId: current.branch.id,
      equipmentTypeId: current.equipmentType.id,
      showInStore: true,
      isRentable: false,
    });
    const archived = await offer({
      tenantId: current.tenant.id,
      branchId: current.branch.id,
      equipmentTypeId: current.equipmentType.id,
      archived: true,
      showInStore: true,
    });
    const missingId = randomUUID();
    const requestedIds = [valid.id, missingId, unrentable.id, archived.id];

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
        rentalOfferId: archived.id,
        code: 'RentableItemArchived',
        rentableItemId: archived.rentableItemId,
      },
    ]);
    expect(
      [
        ...result.value.resolvedOffers.map((entry) => entry.rentalOfferId),
        ...result.value.unavailableOffers.map((entry) => entry.rentalOfferId),
      ].sort(),
    ).toEqual([...requestedIds].sort());

    const storefront = await queries.execute<GetStorefrontRentalOffersQuery, GetStorefrontRentalOffersResult>(
      new GetStorefrontRentalOffersQuery(current.tenant.id, current.branch.id, 1, 20),
    );
    expect(storefront.data.map((entry) => entry.id)).toEqual([unrentable.id]);
    const staff = await queries.execute<SearchRentalOffersQuery, SearchRentalOffersResult>(
      new SearchRentalOffersQuery(current.tenant.id, current.branch.id, 1, 20),
    );
    expect(staff.data.map((entry) => entry.id)).toEqual([valid.id]);

    const hiddenSelection = await resolution.resolveSelectedRentalOffers({
      tenantId: current.tenant.id,
      branchId: current.branch.id,
      selectedOffers: [{ rentalOfferId: valid.id, quantity: 1 }],
    });
    expect(hiddenSelection.isOk()).toBe(true);
    const archivedSelection = await resolution.resolveSelectedRentalOffers({
      tenantId: current.tenant.id,
      branchId: current.branch.id,
      selectedOffers: [{ rentalOfferId: archived.id, quantity: 1 }],
    });
    expect(archivedSelection.isErr() && archivedSelection.error.code).toBe('RentableItemArchived');
    const unrentableSelection = await resolution.resolveSelectedRentalOffers({
      tenantId: current.tenant.id,
      branchId: current.branch.id,
      selectedOffers: [{ rentalOfferId: unrentable.id, quantity: 1 }],
    });
    expect(unrentableSelection.isErr() && unrentableSelection.error.code).toBe('RentalOfferNotRentable');
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
