export interface GetCatalogRentalOfferDisplayFactsInput {
  tenantId: string;
  rentalOfferIds: string[];
}

export interface CatalogRentalOfferDisplayFact {
  id: string;
  branchId: string;
  rentableItemId: string;
  rentableItemName: string;
  isVisible: boolean;
  isRentable: boolean;
}

export abstract class CatalogRentalOfferDisplayFacts {
  /** Returns only offers belonging to the tenant; unknown IDs are omitted. */
  abstract getByIds(input: GetCatalogRentalOfferDisplayFactsInput): Promise<CatalogRentalOfferDisplayFact[]>;
}
