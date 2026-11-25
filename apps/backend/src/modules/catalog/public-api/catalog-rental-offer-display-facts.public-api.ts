export interface GetCatalogRentalOfferDisplayFactsInput {
  tenantId: string;
  rentalOfferIds: string[];
}

export interface CatalogRentalOfferDisplayFact {
  id: string;
  branchId: string;
  rentableItemId: string;
  rentableItemName: string;
  showInStore: boolean;
  isRentable: boolean;
}

export abstract class CatalogRentalOfferDisplayFacts {
  abstract getByIds(input: GetCatalogRentalOfferDisplayFactsInput): Promise<CatalogRentalOfferDisplayFact[]>;
}
