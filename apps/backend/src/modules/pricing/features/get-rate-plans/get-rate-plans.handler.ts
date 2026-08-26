import type { GetRatePlansResponseDto } from '@repo/api-contracts';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { PrismaService } from 'src/core/database/prisma.service';

import { GetRatePlansQuery } from './get-rate-plans.query';

export type GetRatePlansResult = GetRatePlansResponseDto;

@QueryHandler(GetRatePlansQuery)
export class GetRatePlansHandler implements IQueryHandler<GetRatePlansQuery, GetRatePlansResult> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetRatePlansQuery): Promise<GetRatePlansResult> {
    const ratePlans = await this.prisma.client.v2RatePlan.findMany({
      where: {
        tenantId: query.tenantId,
        deletedAt: null,
        ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
      },
      select: {
        id: true,
        name: true,
        billingUnit: true,
        currency: true,
        isActive: true,
        _count: { select: { tiers: true } },
      },
      orderBy: { name: 'asc' },
    });

    return ratePlans.map((ratePlan) => ({
      id: ratePlan.id,
      name: ratePlan.name,
      billingUnit: ratePlan.billingUnit,
      currency: ratePlan.currency,
      isActive: ratePlan.isActive,
      tierCount: ratePlan._count.tiers,
    }));
  }
}
