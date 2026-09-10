import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import {
  EquipmentTypeReferenceAuthority,
  EquipmentTypeReferenceAuthorityError,
} from 'src/modules/asset-inventory/public-api/equipment-type-reference-authority.public-api';
import {
  CatalogEquipmentTypeRentalUsage,
  CatalogEquipmentTypeRentalUsages,
} from 'src/modules/catalog/public-api/catalog-equipment-type-rental-usages.public-api';
import { CatalogRentableItemStatus } from 'src/modules/catalog/public-api/catalog-rentable-item.types';
import {
  PricingRentalOfferStartingPriceFact,
  PricingRentalOfferStartingPriceFacts,
} from 'src/modules/pricing/public-api/pricing-rental-offer-starting-price-facts.public-api';
import {
  BranchFact,
  BranchFacts,
  BranchFactsError,
} from 'src/modules/tenant-management/public-api/branch-facts.public-api';
import { TenantCategoryTaxonomy } from 'src/modules/tenant-management/public-api/tenant-category-taxonomy.public-api';

import { OfferingManagementStartingPrice, selectStartingPrice } from '../../application/select-starting-price';
import {
  GetEquipmentTypeRentalUsagesError,
  getEquipmentTypeRentalUsagesError,
} from './get-equipment-type-rental-usages.errors';
import { GetEquipmentTypeRentalUsagesQuery } from './get-equipment-type-rental-usages.query';

interface RentalUsageBase {
  rentableItemId: string;
  name: string;
  imageUrl: string | null;
  categoryId: string | null;
  categoryName: string | null;
  status: CatalogRentableItemStatus;
  requirementQuantity: number;
}

export interface IndividualRentalUsage extends RentalUsageBase {
  kind: 'SINGLE';
  startingPrice: OfferingManagementStartingPrice | null;
  offers: Array<{
    rentalOfferId: string;
    branchId: string;
    branchName: string | null;
    isVisible: boolean;
    isRentable: boolean;
    pricing: {
      configured: boolean;
      startingPrice: OfferingManagementStartingPrice | null;
    };
  }>;
}

export interface ComboRentalUsage extends RentalUsageBase {
  kind: 'PACKAGE' | 'KIT' | 'BUNDLE';
}

export interface GetEquipmentTypeRentalUsagesReadModel {
  equipmentTypeId: string;
  individuals: IndividualRentalUsage[];
  combos: ComboRentalUsage[];
}

export type GetEquipmentTypeRentalUsagesResult = Result<
  GetEquipmentTypeRentalUsagesReadModel,
  GetEquipmentTypeRentalUsagesError
>;

@QueryHandler(GetEquipmentTypeRentalUsagesQuery)
export class GetEquipmentTypeRentalUsagesHandler implements IQueryHandler<
  GetEquipmentTypeRentalUsagesQuery,
  GetEquipmentTypeRentalUsagesResult
> {
  constructor(
    private readonly equipmentTypeReferenceAuthority: EquipmentTypeReferenceAuthority,
    private readonly catalogEquipmentTypeRentalUsages: CatalogEquipmentTypeRentalUsages,
    private readonly pricingRentalOfferStartingPriceFacts: PricingRentalOfferStartingPriceFacts,
    private readonly branchFacts: BranchFacts,
    private readonly tenantCategoryTaxonomy: TenantCategoryTaxonomy,
  ) {}

  async execute(query: GetEquipmentTypeRentalUsagesQuery): Promise<GetEquipmentTypeRentalUsagesResult> {
    const validation = await this.equipmentTypeReferenceAuthority.validateEquipmentTypeReferences({
      tenantId: query.tenantId,
      equipmentTypeIds: [query.equipmentTypeId],
    });
    if (validation.isErr()) return err(translateEquipmentTypeError(validation.error, query));

    const catalogResults = await this.catalogEquipmentTypeRentalUsages.getUsages({
      tenantId: query.tenantId,
      equipmentTypeIds: [query.equipmentTypeId],
    });
    const usages =
      catalogResults.find(({ equipmentTypeId }) => equipmentTypeId === query.equipmentTypeId)?.usages ?? [];
    const individualUsages = usages.filter((usage) => usage.kind === 'SINGLE');
    const rentalOfferIds = [
      ...new Set(individualUsages.flatMap((usage) => usage.offers.map((offer) => offer.rentalOfferId))),
    ];
    const branchIds = [...new Set(individualUsages.flatMap((usage) => usage.offers.map((offer) => offer.branchId)))];
    const categoryIds = [...new Set(usages.flatMap(({ categoryId }) => (categoryId === null ? [] : [categoryId])))];

    const [pricingFacts, branches, categories] = await Promise.all([
      rentalOfferIds.length === 0
        ? Promise.resolve([])
        : this.pricingRentalOfferStartingPriceFacts.getFacts({ tenantId: query.tenantId, rentalOfferIds }),
      branchIds.length === 0 ? Promise.resolve([]) : this.loadBranches(query, branchIds),
      categoryIds.length === 0
        ? Promise.resolve([])
        : this.tenantCategoryTaxonomy.getCategoryDisplayFacts({ tenantId: query.tenantId, categoryIds }),
    ]);

    const pricingByOfferId = new Map(pricingFacts.map((fact) => [fact.rentalOfferId, fact]));
    const branchById = new Map(branches.map((branch) => [branch.branchId, branch]));
    const categoryById = new Map(categories.map((category) => [category.id, category]));
    const individuals: IndividualRentalUsage[] = [];
    const combos: ComboRentalUsage[] = [];

    for (const usage of usages) {
      const base = {
        rentableItemId: usage.rentableItemId,
        name: usage.name,
        imageUrl: usage.imageUrl,
        categoryId: usage.categoryId,
        categoryName: usage.categoryId ? (categoryById.get(usage.categoryId)?.name ?? null) : null,
        status: usage.status,
        requirementQuantity: usage.requirementQuantity,
      };

      switch (usage.kind) {
        case 'SINGLE': {
          const offers = usage.offers.map((offer) => {
            const pricing = pricingByOfferId.get(offer.rentalOfferId);
            return {
              ...offer,
              branchName: branchById.get(offer.branchId)?.displayName ?? null,
              pricing: {
                configured: pricing !== undefined,
                startingPrice: pricing ? toStartingPrice(pricing) : null,
              },
            };
          });
          offers.sort(compareOffers);
          individuals.push({
            ...base,
            kind: usage.kind,
            startingPrice: selectStartingPrice(
              offers.map(({ rentalOfferId }) => rentalOfferId),
              pricingByOfferId,
            ),
            offers,
          });
          break;
        }
        case 'PACKAGE':
        case 'KIT':
        case 'BUNDLE':
          combos.push({ ...base, kind: usage.kind });
          break;
        default: {
          const exhaustiveCheck: never = usage.kind;
          throw exhaustiveCheck;
        }
      }
    }

    individuals.sort(compareUsages);
    combos.sort(compareUsages);
    return ok({ equipmentTypeId: query.equipmentTypeId, individuals, combos });
  }

  private async loadBranches(query: GetEquipmentTypeRentalUsagesQuery, branchIds: string[]): Promise<BranchFact[]> {
    const result = await this.branchFacts.getBranchFactsBatch({ tenantId: query.tenantId, branchIds });
    if (result.isErr()) throwBranchFactsError(result.error);
    return result.value;
  }
}

function toStartingPrice(fact: PricingRentalOfferStartingPriceFact): OfferingManagementStartingPrice {
  return { amount: fact.amount, currency: fact.currency, billingUnit: fact.billingUnit };
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareUsages(
  left: Pick<CatalogEquipmentTypeRentalUsage, 'name' | 'rentableItemId'>,
  right: Pick<CatalogEquipmentTypeRentalUsage, 'name' | 'rentableItemId'>,
): number {
  return compareText(left.name, right.name) || compareText(left.rentableItemId, right.rentableItemId);
}

function compareOffers(
  left: IndividualRentalUsage['offers'][number],
  right: IndividualRentalUsage['offers'][number],
): number {
  return (
    compareText(left.branchName ?? left.rentalOfferId, right.branchName ?? right.rentalOfferId) ||
    compareText(left.rentalOfferId, right.rentalOfferId)
  );
}

function translateEquipmentTypeError(
  error: EquipmentTypeReferenceAuthorityError,
  query: GetEquipmentTypeRentalUsagesQuery,
): GetEquipmentTypeRentalUsagesError {
  switch (error.code) {
    case 'EquipmentTypeReferenceNotFound':
      return getEquipmentTypeRentalUsagesError(
        'offering_management.equipment_type_not_found',
        `Equipment type "${query.equipmentTypeId}" was not found.`,
        error,
        { useCase: 'GetEquipmentTypeRentalUsages', tenantId: query.tenantId, equipmentTypeId: query.equipmentTypeId },
      );
  }

  return assertNeverEquipmentTypeErrorCode(error.code);
}

function assertNeverEquipmentTypeErrorCode(code: never): never {
  throw new Error(`Unhandled EquipmentTypeReferenceAuthority error code: ${String(code)}`);
}

function throwBranchFactsError(error: BranchFactsError): never {
  switch (error.code) {
    case 'BranchNotFound':
      throw new Error('A Catalog Rental Offer references a branch that could not be resolved.', { cause: error });
    case 'TenantConfigurationInvalid':
      throw new Error('Tenant branch configuration is invalid.', { cause: error });
  }

  const exhaustiveCheck: never = error;
  throw exhaustiveCheck;
}
