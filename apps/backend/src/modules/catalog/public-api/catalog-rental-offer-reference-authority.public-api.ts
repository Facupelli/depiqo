import type { ApplicationErrorContext } from 'src/core/errors/application-error';

import { Result } from 'neverthrow';

export interface ValidateCatalogRentalOfferReferenceInput {
  tenantId: string;
  rentalOfferId: string;
}

export class CatalogRentalOfferReferenceAuthorityError extends Error {
  readonly code = 'RentalOfferNotFound' as const;

  constructor(
    message: string,
    public readonly context?: ApplicationErrorContext,
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
