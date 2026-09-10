import { CatalogRentableItemKind, CatalogRentableItemStatus } from './catalog-rentable-item.types';

export interface GetCatalogEquipmentTypeRentalUsagesInput {
  tenantId: string;
  equipmentTypeIds: string[];
}

export interface CatalogEquipmentTypeRentalUsageOffer {
  rentalOfferId: string;
  branchId: string;
  isVisible: boolean;
  isRentable: boolean;
}

export interface CatalogEquipmentTypeRentalUsage {
  rentableItemId: string;
  name: string;
  imageUrl: string | null;
  categoryId: string | null;
  kind: CatalogRentableItemKind;
  status: CatalogRentableItemStatus;
  requirementQuantity: number;
  offers: CatalogEquipmentTypeRentalUsageOffer[];
}

export interface CatalogEquipmentTypeRentalUsagesResult {
  equipmentTypeId: string;
  usages: CatalogEquipmentTypeRentalUsage[];
}

export abstract class CatalogEquipmentTypeRentalUsages {
  abstract getUsages(
    input: GetCatalogEquipmentTypeRentalUsagesInput,
  ): Promise<CatalogEquipmentTypeRentalUsagesResult[]>;
}
