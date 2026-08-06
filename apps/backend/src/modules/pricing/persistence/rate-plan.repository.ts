import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/core/database/prisma.service';

import { RatePlan } from '../domain/rate-plan.aggregate';
import { RatePlanMapper } from './rate-plan.mapper';

type RatePlanPersistenceClient = Pick<PrismaService['client'], 'v2RatePlan'>;

@Injectable()
export class RatePlanRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(
    id: string,
    tenantId: string,
    client: RatePlanPersistenceClient = this.prisma.client,
  ): Promise<RatePlan | null> {
    const record = await client.v2RatePlan.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { tiers: true },
    });

    return record ? RatePlanMapper.toDomain(record) : null;
  }

  async save(ratePlan: RatePlan, client: RatePlanPersistenceClient = this.prisma.client): Promise<void> {
    await client.v2RatePlan.upsert({
      where: { id: ratePlan.id },
      create: RatePlanMapper.toCreateData(ratePlan),
      update: {
        name: ratePlan.name,
        billingUnit: ratePlan.billingUnit,
        currency: ratePlan.currency.value,
        isActive: ratePlan.isActive,
        tiers: {
          deleteMany: {},
          create: ratePlan.tiers.map((tier) => ({
            id: tier.id,
            tenantId: tier.tenantId,
            fromUnit: tier.range.fromUnit,
            toUnit: tier.range.toUnit,
            pricePerUnit: tier.pricePerUnit.toString(),
          })),
        },
      },
    });
  }
}
