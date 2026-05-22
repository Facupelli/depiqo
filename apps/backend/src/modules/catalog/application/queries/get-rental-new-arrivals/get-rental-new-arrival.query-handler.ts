import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import { Injectable } from '@nestjs/common';
import { GetNewArrivalsQuery } from './get-rental-new-arrival.query';
import { PrismaService } from 'src/core/database/prisma.service';
import { GetTenantConfigQuery } from 'src/modules/tenant/public/queries/get-tenant-config.query';
import { RentalItemKind } from '@repo/types';

type TenantConfigReadModel = {
  newArrivalsWindowDays: number;
};

type NewArrivalReadModel = Array<{
  id: string;
  name: string;
  imageUrl: string;
  category: { id: string; name: string } | null;
  publishedAt: Date;
  billingUnit: { label: string };
  pricingPreview: { pricePerUnit: number; fromUnit: number } | null;
}>;

@Injectable()
@QueryHandler(GetNewArrivalsQuery)
export class GetNewArrivalsQueryHandler implements IQueryHandler<GetNewArrivalsQuery, NewArrivalReadModel> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queryBus: QueryBus,
  ) {}

  async execute(query: GetNewArrivalsQuery): Promise<NewArrivalReadModel> {
    const { locationId, tenantId } = query;

    const config = await this.queryBus.execute<GetTenantConfigQuery, TenantConfigReadModel | null>(
      new GetTenantConfigQuery(tenantId),
    );

    if (!config) {
      return [];
    }

    const windowDays = config.newArrivalsWindowDays;
    const since = new Date();
    since.setDate(since.getDate() - windowDays);

    const productTypes = await this.prisma.client.productType.findMany({
      where: {
        tenantId,
        kind: RentalItemKind.PRIMARY,
        retiredAt: null,
        excludeFromNewArrivals: false,
        publishedAt: { not: null, gte: since },
      },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        category: {
          select: { id: true, name: true },
        },
        publishedAt: true,
        billingUnit: {
          select: { label: true },
        },
        pricingTiers: {
          where: locationId ? { OR: [{ locationId }, { locationId: null }] } : { locationId: null },
          orderBy: [{ locationId: 'desc' }, { fromUnit: 'asc' }],
          take: 1,
          select: {
            pricePerUnit: true,
            fromUnit: true,
          },
        },
      },
      orderBy: { publishedAt: 'desc' },
    });

    return productTypes.map((pt) => ({
      id: pt.id,
      name: pt.name,
      imageUrl: pt.imageUrl ?? '',
      category: pt.category,
      publishedAt: pt.publishedAt!,
      billingUnit: pt.billingUnit,
      pricingPreview: pt.pricingTiers[0]
        ? {
            pricePerUnit: Number(pt.pricingTiers[0].pricePerUnit),
            fromUnit: pt.pricingTiers[0].fromUnit,
          }
        : null,
    }));
  }
}
