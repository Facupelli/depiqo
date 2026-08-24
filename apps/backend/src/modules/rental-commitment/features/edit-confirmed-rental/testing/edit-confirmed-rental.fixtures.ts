import { randomUUID } from 'node:crypto';

import { PrismaService } from 'src/core/database/prisma.service';
import { Prisma } from 'src/generated/prisma/client';

import { ConfirmRentalFixtures, RentalPeriodFixture } from '../../confirm-rental/testing/confirm-rental.fixtures';

export class EditConfirmedRentalFixtures {
  private readonly rentals: ConfirmRentalFixtures;

  constructor(private readonly prisma: PrismaService) {
    this.rentals = new ConfirmRentalFixtures(prisma);
  }

  async createOffer(params: {
    tenantId: string;
    branchId: string;
    equipmentTypeId?: string;
    quantityPerItem?: number;
    pricePerDay?: string;
  }) {
    const equipmentType = params.equipmentTypeId
      ? await this.prisma.client.v2EquipmentType.findUniqueOrThrow({ where: { id: params.equipmentTypeId } })
      : await this.prisma.client.v2EquipmentType.create({
          data: { tenantId: params.tenantId, name: `Equipment ${randomUUID()}` },
        });
    const item = await this.prisma.client.v2RentableItem.create({
      data: {
        tenantId: params.tenantId,
        name: `Item ${randomUUID()}`,
        kind: 'SINGLE',
        status: 'ACTIVE',
        requirements: {
          create: {
            tenantId: params.tenantId,
            equipmentTypeId: equipmentType.id,
            quantityPerItem: params.quantityPerItem ?? 1,
          },
        },
      },
    });
    const offer = await this.prisma.client.v2RentalOffer.create({
      data: {
        tenantId: params.tenantId,
        branchId: params.branchId,
        rentableItemId: item.id,
        isVisible: true,
        isRentable: true,
      },
    });
    const ratePlan = await this.prisma.client.v2RatePlan.create({
      data: {
        tenantId: params.tenantId,
        name: `Daily ${randomUUID()}`,
        billingUnit: 'DAY',
        currency: 'USD',
        tiers: {
          create: { tenantId: params.tenantId, fromUnit: 1, pricePerUnit: params.pricePerDay ?? '100.00' },
        },
      },
    });
    await this.prisma.client.v2RentalOfferPricing.create({
      data: { tenantId: params.tenantId, catalogRentalOfferId: offer.id, ratePlanId: ratePlan.id },
    });
    return { equipmentType, item, offer, ratePlan };
  }

  async createConfirmedRental(params: {
    tenantId: string;
    branchId: string;
    customerId: string;
    period: RentalPeriodFixture;
    offerId: string;
    equipmentTypeId: string;
    assetId?: string;
    quantity?: number;
  }) {
    const quantity = params.quantity ?? 1;
    const rental = await this.rentals.createRental({
      tenantId: params.tenantId,
      branchId: params.branchId,
      customerId: params.customerId,
      period: params.period,
      status: 'CONFIRMED',
      demands: [{ equipmentTypeId: params.equipmentTypeId, quantity }],
    });
    await this.prisma.client.v2RentalSelection.update({
      where: { id: rental.selectionIds[0] },
      data: { rentalOfferId: params.offerId, quantity },
    });
    const assetIds: string[] = [];
    for (let index = 0; index < quantity; index += 1) {
      const assetId =
        index === 0 && params.assetId
          ? params.assetId
          : await this.rentals.createCandidate({
              tenantId: params.tenantId,
              branchId: params.branchId,
              equipmentTypeId: params.equipmentTypeId,
            });
      if (index === 0 && params.assetId) {
        const exists = await this.prisma.client.v2RentalAssetCandidate.findUnique({
          where: { tenantId_assetId: { tenantId: params.tenantId, assetId } },
        });
        if (!exists) {
          await this.rentals.createCandidate({
            tenantId: params.tenantId,
            branchId: params.branchId,
            equipmentTypeId: params.equipmentTypeId,
            assetId,
          });
        }
      }
      assetIds.push(assetId);
      await this.prisma.client.v2AssignedAsset.create({
        data: {
          tenantId: params.tenantId,
          rentalId: rental.rentalId,
          rentalDemandLineId: rental.demandLineIds[0],
          assetId,
          effectiveFrom: params.period.start,
        },
      });
      await this.rentals.createActiveBlock({
        tenantId: params.tenantId,
        rentalId: rental.rentalId,
        assetId,
        period: params.period,
      });
    }
    return { ...rental, assetIds };
  }

  createCandidate(params: Parameters<ConfirmRentalFixtures['createCandidate']>[0]) {
    return this.rentals.createCandidate(params);
  }

  createActiveBlock(params: Parameters<ConfirmRentalFixtures['createActiveBlock']>[0]) {
    return this.rentals.createActiveBlock(params);
  }

  async persistedState(rentalId: string) {
    const rental = await this.prisma.client.v2Rental.findUniqueOrThrow({
      where: { id: rentalId },
      include: {
        selections: { orderBy: { id: 'asc' } },
        demandLines: { orderBy: { id: 'asc' } },
        assignedAssets: { orderBy: { id: 'asc' } },
        ownerSplits: { orderBy: { id: 'asc' } },
        deliveryDetails: true,
      },
    });
    const blocks = await this.prisma.client.$queryRaw<
      Array<{
        id: string;
        tenantId: string;
        rentalId: string;
        assetId: string;
        period: string;
        blockType: string;
        createdAt: Date;
        releasedAt: Date | null;
      }>
    >(Prisma.sql`
      SELECT id, tenant_id AS "tenantId", rental_id AS "rentalId", asset_id AS "assetId",
             period::text AS period, block_type::text AS "blockType", created_at AS "createdAt",
             released_at AS "releasedAt"
      FROM v2_asset_blocks WHERE rental_id = ${rentalId} ORDER BY id
    `);
    return { rental, blocks };
  }
}
