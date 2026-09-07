import type { ListEquipmentTypesResponseDto, ListEquipmentTypesStartingPriceDto } from '@repo/api-contracts';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import Decimal from 'decimal.js';
import { err, ok, Result } from 'neverthrow';

import { EquipmentTypePageFacts } from 'src/modules/asset-inventory/public-api/equipment-type-page-facts.public-api';
import {
  CatalogEquipmentTypeRentalFact,
  CatalogEquipmentTypeRentalFacts,
} from 'src/modules/catalog/public-api/catalog-equipment-type-rental-facts.public-api';
import {
  PricingRentalOfferStartingPriceFact,
  PricingRentalOfferStartingPriceFacts,
} from 'src/modules/pricing/public-api/pricing-rental-offer-starting-price-facts.public-api';
import { BranchFacts, BranchFactsError } from 'src/modules/tenant-management/public-api/branch-facts.public-api';
import { TenantCategoryTaxonomy } from 'src/modules/tenant-management/public-api/tenant-category-taxonomy.public-api';

import { ListEquipmentTypesError, listEquipmentTypesError } from './list-equipment-types.errors';
import { ListEquipmentTypesQuery } from './list-equipment-types.query';

export type ListEquipmentTypesResult = Result<ListEquipmentTypesResponseDto, ListEquipmentTypesError>;

@QueryHandler(ListEquipmentTypesQuery)
export class ListEquipmentTypesHandler implements IQueryHandler<ListEquipmentTypesQuery, ListEquipmentTypesResult> {
  constructor(
    private readonly equipmentTypePageFacts: EquipmentTypePageFacts,
    private readonly catalogEquipmentTypeRentalFacts: CatalogEquipmentTypeRentalFacts,
    private readonly pricingRentalOfferStartingPriceFacts: PricingRentalOfferStartingPriceFacts,
    private readonly branchFacts: BranchFacts,
    private readonly tenantCategoryTaxonomy: TenantCategoryTaxonomy,
  ) {}

  async execute(query: ListEquipmentTypesQuery): Promise<ListEquipmentTypesResult> {
    if (query.branchId) {
      const branchResult = await this.branchFacts.getBranchFacts({
        tenantId: query.tenantId,
        branchId: query.branchId,
      });
      if (branchResult.isErr()) {
        return err(translateBranchFactsError(branchResult.error, query));
      }
    }

    const page = await this.equipmentTypePageFacts.getPage({
      tenantId: query.tenantId,
      search: query.search,
      categoryId: query.categoryId,
      branchId: query.branchId,
      page: query.page,
      pageSize: query.pageSize,
    });

    if (page.items.length === 0) {
      return ok({ data: [], total: page.total, page: page.page, pageSize: page.pageSize });
    }

    const equipmentTypeIds = page.items.map(({ id }) => id);
    const categoryIds = [...new Set(page.items.flatMap(({ categoryId }) => (categoryId === null ? [] : [categoryId])))];
    const [categories, catalogFacts] = await Promise.all([
      this.tenantCategoryTaxonomy.getCategoryDisplayFacts({ tenantId: query.tenantId, categoryIds }),
      this.catalogEquipmentTypeRentalFacts.getFacts({
        tenantId: query.tenantId,
        equipmentTypeIds,
        branchId: query.branchId,
      }),
    ]);

    const categoryById = new Map(categories.map((category) => [category.id, category]));
    const catalogFactsByEquipmentTypeId = new Map(catalogFacts.map((facts) => [facts.equipmentTypeId, facts]));
    const rentalOfferIds = [
      ...new Set(catalogFacts.flatMap(({ standaloneRentalOfferIds }) => standaloneRentalOfferIds)),
    ];
    const pricingFacts =
      rentalOfferIds.length === 0
        ? []
        : await this.pricingRentalOfferStartingPriceFacts.getFacts({
            tenantId: query.tenantId,
            rentalOfferIds,
          });
    const pricingFactByOfferId = new Map(pricingFacts.map((facts) => [facts.rentalOfferId, facts]));

    return ok({
      data: page.items.map((equipmentType) => {
        const category = equipmentType.categoryId ? categoryById.get(equipmentType.categoryId) : undefined;
        const rentalFacts = catalogFactsByEquipmentTypeId.get(equipmentType.id) ?? emptyRentalFacts(equipmentType.id);

        return {
          id: equipmentType.id,
          name: equipmentType.name,
          imageUrl: equipmentType.imageUrl,
          category: category ? { id: category.id, name: category.name } : null,
          activeUnitCount: equipmentType.activeUnitCount,
          selectedBranchUnitCount: equipmentType.selectedBranchUnitCount,
          rentalSummary: {
            standaloneCount: rentalFacts.standaloneCount,
            comboCount: rentalFacts.comboCount,
            startingPrice: selectStartingPrice(rentalFacts.standaloneRentalOfferIds, pricingFactByOfferId),
          },
        };
      }),
      total: page.total,
      page: page.page,
      pageSize: page.pageSize,
    });
  }
}

function emptyRentalFacts(equipmentTypeId: string): CatalogEquipmentTypeRentalFact {
  return { equipmentTypeId, standaloneCount: 0, comboCount: 0, standaloneRentalOfferIds: [] };
}

function selectStartingPrice(
  rentalOfferIds: string[],
  pricingFactByOfferId: Map<string, PricingRentalOfferStartingPriceFact>,
): ListEquipmentTypesStartingPriceDto | null {
  const candidates = rentalOfferIds.flatMap((id) => {
    const candidate = pricingFactByOfferId.get(id);
    return candidate ? [candidate] : [];
  });
  if (candidates.length === 0) return null;

  const currencies = new Set(candidates.map(({ currency }) => currency));
  const billingUnits = new Set(candidates.map(({ billingUnit }) => billingUnit));
  if (currencies.size !== 1 || billingUnits.size !== 1) return null;

  const lowest = candidates.reduce((current, candidate) =>
    new Decimal(candidate.amount).lessThan(new Decimal(current.amount)) ? candidate : current,
  );
  return {
    amount: lowest.amount,
    currency: lowest.currency,
    billingUnit: lowest.billingUnit,
  };
}

function translateBranchFactsError(error: BranchFactsError, query: ListEquipmentTypesQuery): ListEquipmentTypesError {
  switch (error.code) {
    case 'BranchNotFound':
      return listEquipmentTypesError(
        'offering_management.equipment_types.branch_not_found',
        `Branch "${query.branchId}" was not found.`,
        error,
        { useCase: 'ListEquipmentTypes', tenantId: query.tenantId, branchId: query.branchId },
      );
    case 'TenantConfigurationInvalid':
      throw error;
  }

  const exhaustiveCheck: never = error;
  throw exhaustiveCheck;
}
