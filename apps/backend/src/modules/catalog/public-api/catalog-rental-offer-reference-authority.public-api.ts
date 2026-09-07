import { Result } from 'neverthrow';

export interface ValidateCatalogRentalOfferReferenceInput {
  tenantId: string;
  rentalOfferId: string;
}

export class CatalogRentalOfferReferenceAuthorityError extends Error {
  readonly code = 'RentalOfferNotFound' as const;

  constructor(
    message: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'CatalogRentalOfferReferenceAuthorityError';
  }
}

export abstract class CatalogRentalOfferReferenceAuthority {
  abstract validateRentalOfferReference(
    input: ValidateCatalogRentalOfferReferenceInput,
  ): Promise<Result<void, CatalogRentalOfferReferenceAuthorityError>>;
}
