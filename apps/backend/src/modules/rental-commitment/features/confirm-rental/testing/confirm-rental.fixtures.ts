import { randomUUID } from 'node:crypto';

import { PrismaService } from 'src/core/database/prisma.service';
import { Prisma } from 'src/generated/prisma/client';
import { V2RentalStatus } from 'src/generated/prisma/enums';
import { ConfirmedPriceSnapshot } from '../../../domain/value-objects/confirmed-price-snapshot.value-object';

export interface RentalPeriodFixture {
  start: Date;
  end: Date;
}

export interface DemandFixtureInput {
  equipmentTypeId?: string;
  quantity?: number;
}

export interface RentalScenarioFixture {
  rentalId: string;
  selectionIds: string[];
  demandLineIds: string[];
  equipmentTypeIds: string[];
  priceSnapshot: Prisma.InputJsonValue;
}

export interface CandidateOverrides {
  branchId?: string;
  equipmentTypeId?: string;
  assetStatus?: 'ACTIVE' | 'INACTIVE' | 'RETIRED';
  ownershipKind?: 'TENANT_OWNED' | 'THIRD_PARTY';
  ownerId?: string | null;
  ownerContractSnapshot?: Prisma.InputJsonValue | null;
}

export class ConfirmRentalFixtures {
  constructor(private readonly prisma: PrismaService) {}

  async createRental(params: {
    tenantId: string;
    branchId: string;
    customerId?: string;
    period: RentalPeriodFixture;
    status?: V2RentalStatus;
    demands?: DemandFixtureInput[];
    priceSnapshot?: Prisma.InputJsonValue | null;
  }): Promise<RentalScenarioFixture> {
    const rentalId = randomUUID();
    const demands = params.demands ?? [{}];
    const selectionIds = demands.map(() => randomUUID());
    const demandLineIds = demands.map(() => randomUUID());
    const equipmentTypeIds = demands.map((demand) => demand.equipmentTypeId ?? randomUUID());
    const priceSnapshot = params.priceSnapshot === undefined ? this.priceSnapshot(selectionIds) : params.priceSnapshot;
    const persistedPriceSnapshot = priceSnapshot === null ? Prisma.JsonNull : priceSnapshot;
    const status = params.status ?? 'DRAFT';
    const wasConfirmed = status !== 'DRAFT' && status !== 'PENDING';
    const acceptedCustomerTotal = this.acceptedCustomerTotal(wasConfirmed, priceSnapshot);

    await this.prisma.client.$transaction(async (tx) => {
      const counter = await tx.v2RentalNumberCounter.upsert({
        where: { tenantId: params.tenantId },
        create: { tenantId: params.tenantId, lastIssuedNumber: 1 },
        update: { lastIssuedNumber: { increment: 1 } },
        select: { lastIssuedNumber: true },
      });

      await tx.v2Rental.create({
        data: {
          id: rentalId,
          tenantId: params.tenantId,
          rentalNumber: counter.lastIssuedNumber,
          branchId: params.branchId,
          customerId: params.customerId,
          status,
          confirmedAt: status === 'CONFIRMED' ? new Date() : undefined,
          fulfillmentMethod: 'PICKUP',
          periodStart: params.period.start,
          periodEnd: params.period.end,
          priceSnapshot: persistedPriceSnapshot,
          acceptedCustomerTotal,
          source: 'STAFF',
          selections: {
            create: selectionIds.map((id, index) => ({
              id,
              tenantId: params.tenantId,
              rentalOfferId: randomUUID(),
              rentableItemId: randomUUID(),
              rentableItemNameSnapshot: `Rental item ${index + 1}`,
              rentableItemKindSnapshot: 'SINGLE',
              quantity: 1,
            })),
          },
          demandLines: {
            create: demandLineIds.map((id, index) => ({
              id,
              tenantId: params.tenantId,
              rentalSelectionId: selectionIds[index],
              equipmentTypeId: equipmentTypeIds[index],
              equipmentTypeNameSnapshot: `Equipment type ${index + 1}`,
              quantity: demands[index].quantity ?? 1,
              removedQuantity: 0,
            })),
          },
        },
      });
    });

    return { rentalId, selectionIds, demandLineIds, equipmentTypeIds, priceSnapshot: priceSnapshot! };
  }

  async createCandidate(params: {
    tenantId: string;
    branchId: string;
    equipmentTypeId: string;
    assetId?: string;
    overrides?: CandidateOverrides;
  }): Promise<string> {
    const assetId = params.assetId ?? randomUUID();
    const overrides = params.overrides ?? {};

    const equipmentTypeId = overrides.equipmentTypeId ?? params.equipmentTypeId;
    const ownerId = overrides.ownerId ?? (overrides.ownershipKind === 'THIRD_PARTY' ? randomUUID() : null);

    await this.prisma.client.v2EquipmentType.createMany({
      data: { id: equipmentTypeId, tenantId: params.tenantId, name: `Equipment ${equipmentTypeId}` },
      skipDuplicates: true,
    });

    if (ownerId !== null) {
      await this.prisma.client.v2AssetOwner.createMany({
        data: { id: ownerId, tenantId: params.tenantId, name: `Owner ${ownerId}` },
        skipDuplicates: true,
      });

      const snapshot = overrides.ownerContractSnapshot;
      if (snapshot) {
        if (
          typeof snapshot !== 'object' ||
          !('contractId' in snapshot) ||
          typeof snapshot.contractId !== 'string' ||
          (snapshot.basis !== 'GROSS' && snapshot.basis !== 'NET')
        ) {
          throw new Error('Candidate fixture requires valid owner contract facts.');
        }

        await this.prisma.client.v2OwnerContract.createMany({
          data: {
            id: snapshot.contractId,
            tenantId: params.tenantId,
            ownerId,
            basis: snapshot.basis,
            ownerShare: String(snapshot.ownerShare),
            rentalShare: String(snapshot.rentalShare),
            validFrom: new Date(0),
          },
          skipDuplicates: true,
        });
      }
    }

    await this.prisma.client.v2Asset.create({
      data: {
        id: assetId,
        tenantId: params.tenantId,
        branchId: overrides.branchId ?? params.branchId,
        equipmentTypeId,
        status: overrides.assetStatus ?? 'ACTIVE',
        ownerId,
      },
    });

    return assetId;
  }

  async createActiveBlock(params: {
    tenantId: string;
    rentalId: string;
    assetId: string;
    period: RentalPeriodFixture;
    releasedAt?: Date;
    blockType?: 'EQUIPMENT' | 'ACCESSORY';
  }): Promise<string> {
    const id = randomUUID();
    const range = `[${params.period.start.toISOString()},${params.period.end.toISOString()})`;

    await this.prisma.client.$executeRaw`
      INSERT INTO v2_asset_blocks (id, tenant_id, rental_id, asset_id, period, block_type, released_at)
      VALUES (${id}, ${params.tenantId}, ${params.rentalId}, ${params.assetId}, ${range}::tstzrange, ${params.blockType ?? 'EQUIPMENT'}, ${params.releasedAt ?? null})
    `;

    return id;
  }

  private acceptedCustomerTotal(
    wasConfirmed: boolean,
    priceSnapshot: Prisma.InputJsonValue | null,
  ): string | undefined {
    if (!wasConfirmed) return undefined;

    const acceptedPrice = ConfirmedPriceSnapshot.create(priceSnapshot);
    if (acceptedPrice.isErr()) throw acceptedPrice.error;

    return acceptedPrice.value.snapshot.total;
  }

  priceSnapshot(selectionIds: readonly string[]): Prisma.InputJsonValue {
    const lines = selectionIds.map((rentalSelectionId) => ({
      rentalSelectionId,
      rentalOfferId: `offer-${rentalSelectionId}`,
      rentableItemId: `item-${rentalSelectionId}`,
      rentableItemName: 'Equipment',
      quantity: 1,
      chargedUnits: 1,
      billingUnit: 'DAY' as const,
      pricePerUnit: '100.00',
      subtotal: '100.00',
      discountTotal: '0.00',
      total: '100.00',
      appliedAdjustments: [],
    }));
    const payload = {
      currency: 'USD',
      subtotal: '100.00',
      discountTotal: '0.00',
      total: '100.00',
      chargedDays: 1,
      lines,
      appliedPromotions: [],
      durationPolicySnapshot: {
        timezone: 'UTC',
        dailyBillingPolicy: 'IGNORE_PARTIAL_DAY' as const,
        weekendCountsAsOne: false,
        minimumChargedDays: 0,
      },
    };

    return {
      schema: 'v2.rental-price-snapshot',
      version: 3,
      calculatedAtIso: '2030-01-01T00:00:00.000Z',
      context: 'DRAFT',
      calculated: payload,
      final: payload,
      insurance: { applied: false, amount: '0.00' },
      totalBeforeInsurance: '100.00',
      total: '100.00',
    };
  }
}
