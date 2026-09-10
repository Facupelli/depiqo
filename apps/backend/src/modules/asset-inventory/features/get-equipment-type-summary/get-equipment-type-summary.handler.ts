import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { TenantCategoryTaxonomy } from 'src/modules/tenant-management/public-api/tenant-category-taxonomy.public-api';

import { getEquipmentTypeSummaryError, GetEquipmentTypeSummaryError } from './get-equipment-type-summary.errors';
import { GetEquipmentTypeSummaryQuery } from './get-equipment-type-summary.query';

export interface GetEquipmentTypeSummaryReadModel {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  categoryId: string | null;
  categoryName: string | null;
  activeAssetCount: number;
}

export type GetEquipmentTypeSummaryResult = Result<GetEquipmentTypeSummaryReadModel, GetEquipmentTypeSummaryError>;

@QueryHandler(GetEquipmentTypeSummaryQuery)
export class GetEquipmentTypeSummaryHandler implements IQueryHandler<
  GetEquipmentTypeSummaryQuery,
  GetEquipmentTypeSummaryResult
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantCategoryTaxonomy: TenantCategoryTaxonomy,
  ) {}

  async execute(query: GetEquipmentTypeSummaryQuery): Promise<GetEquipmentTypeSummaryResult> {
    const equipmentType = await this.prisma.client.v2EquipmentType.findFirst({
      where: {
        id: query.equipmentTypeId,
        tenantId: query.tenantId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        categoryId: true,
      },
    });

    if (!equipmentType) {
      return err(
        getEquipmentTypeSummaryError(
          'asset_inventory.equipment_type_not_found',
          `Equipment type "${query.equipmentTypeId}" was not found.`,
          undefined,
          { equipmentTypeId: query.equipmentTypeId },
        ),
      );
    }

    const [activeAssetCount, categories] = await Promise.all([
      this.prisma.client.v2Asset.count({
        where: {
          tenantId: query.tenantId,
          equipmentTypeId: query.equipmentTypeId,
          status: 'ACTIVE',
        },
      }),
      equipmentType.categoryId
        ? this.tenantCategoryTaxonomy.getCategoryDisplayFacts({
            tenantId: query.tenantId,
            categoryIds: [equipmentType.categoryId],
          })
        : Promise.resolve([]),
    ]);

    return ok({
      id: equipmentType.id,
      name: equipmentType.name,
      description: equipmentType.description,
      imageUrl: equipmentType.imageUrl,
      categoryId: equipmentType.categoryId,
      categoryName: equipmentType.categoryId
        ? (categories.find((category) => category.id === equipmentType.categoryId)?.name ?? null)
        : null,
      activeAssetCount,
    });
  }
}
