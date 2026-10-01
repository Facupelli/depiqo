export interface UpdateRentalOfferVisibilityAndRentabilityProps {
  showInStore?: boolean;
  isRentable?: boolean;
}

export class UpdateRentalOfferVisibilityAndRentabilityCommand {
  constructor(
    public readonly tenantId: string,
    public readonly rentalOfferId: string,
    public readonly props: UpdateRentalOfferVisibilityAndRentabilityProps,
  ) {}
}
