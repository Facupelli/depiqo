import { Result } from 'neverthrow';

export interface AssignPricingRatePlanToRentalOfferInput {
  tenantId: string;
  catalogRentalOfferId: string;
  ratePlanId: string;
}

export interface AssignPricingRatePlanToRentalOfferResult {
  rentalOfferPricingId: string;
  ratePlanId: string;
}

export type PricingRentalOfferPricingAssignmentErrorCode =
  | 'RentalOfferNotFound'
  | 'RatePlanNotFound'
  | 'RatePlanInactive';

export class PricingRentalOfferPricingAssignmentError extends Error {
  constructor(
    public readonly code: PricingRentalOfferPricingAssignmentErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'PricingRentalOfferPricingAssignmentError';
  }
}

export abstract class PricingRentalOfferPricingAssignment {
  abstract assignRatePlanToRentalOffer(
    input: AssignPricingRatePlanToRentalOfferInput,
  ): Promise<Result<AssignPricingRatePlanToRentalOfferResult, PricingRentalOfferPricingAssignmentError>>;
}
