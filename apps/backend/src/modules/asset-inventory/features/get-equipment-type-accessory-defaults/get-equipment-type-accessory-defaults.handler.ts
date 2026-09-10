import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { TenantCategoryTaxonomy } from 'src/modules/tenant-management/public-api/tenant-category-taxonomy.public-api';

import {
  getEquipmentTypeAccessoryDefaultsError,
  GetEquipmentTypeAccessoryDefaultsError,
} from './get-equipment-type-accessory-defaults.errors';
import { GetEquipmentTypeAccessoryDefaultsQuery } from './get-equipment-type-accessory-defaults.query';

export interface EquipmentTypeAccessoryDefaultReadModel {
  accessoryEquipmentTypeId: string;
  name: string;
  imageUrl: string | null;
  categoryId: string | null;
  categoryName: string | null;
  defaultQuantity: number;
}

export type GetEquipmentTypeAccessoryDefaultsResult = Result<
  EquipmentTypeAccessoryDefaultReadModel[],
  GetEquipmentTypeAccessoryDefaultsError
>;

@QueryHandler(GetEquipmentTypeAccessoryDefaultsQuery)
export class GetEquipmentTypeAccessoryDefaultsHandler implements IQueryHandler<
  GetEquipmentTypeAccessoryDefaultsQuery,
  GetEquipmentTypeAccessoryDefaultsResult
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantCategoryTaxonomy: TenantCategoryTaxonomy,
  ) {}

  async execute(query: GetEquipmentTypeAccessoryDefaultsQuery): Promise<GetEquipmentTypeAccessoryDefaultsResult> {
    const equipmentType = await this.prisma.client.v2EquipmentType.findFirst({
      where: {
        id: query.equipmentTypeId,
        tenantId: query.tenantId,
      },
      select: { id: true },
    });

    if (!equipmentType) {
      return err(
        getEquipmentTypeAccessoryDefaultsError(
          'asset_inventory.equipment_type_not_found',
          `Equipment type "${query.equipmentTypeId}" was not found.`,
          undefined,
          { equipmentTypeId: query.equipmentTypeId },
        ),
      );
    }

    const accessoryDefaults = await this.prisma.client.v2EquipmentTypeAccessoryDefault.findMany({
      where: {
        tenantId: query.tenantId,
        equipmentTypeId: query.equipmentTypeId,
        accessoryEquipmentType: { tenantId: query.tenantId },
      },
      select: {
        accessoryEquipmentTypeId: true,
        quantity: true,
        accessoryEquipmentType: {
          select: {
            name: true,
            imageUrl: true,
            categoryId: true,
          },
        },
      },
      orderBy: [{ accessoryEquipmentType: { name: 'asc' } }, { accessoryEquipmentTypeId: 'asc' }],
    });

    const categoryIds = [
      ...new Set(
        accessoryDefaults
          .map((accessoryDefault) => accessoryDefault.accessoryEquipmentType.categoryId)
          .filter((categoryId): categoryId is string => categoryId !== null),
      ),
    ];
    const categories =
      categoryIds.length > 0
        ? await this.tenantCategoryTaxonomy.getCategoryDisplayFacts({
            tenantId: query.tenantId,
            categoryIds,
          })
        : [];
    const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));

    return ok(
      accessoryDefaults.map((accessoryDefault) => ({
        accessoryEquipmentTypeId: accessoryDefault.accessoryEquipmentTypeId,
        name: accessoryDefault.accessoryEquipmentType.name,
        imageUrl: accessoryDefault.accessoryEquipmentType.imageUrl,
        categoryId: accessoryDefault.accessoryEquipmentType.categoryId,
        categoryName: accessoryDefault.accessoryEquipmentType.categoryId
          ? (categoryNameById.get(accessoryDefault.accessoryEquipmentType.categoryId) ?? null)
          : null,
        defaultQuantity: accessoryDefault.quantity,
      })),
    );
  }
}
