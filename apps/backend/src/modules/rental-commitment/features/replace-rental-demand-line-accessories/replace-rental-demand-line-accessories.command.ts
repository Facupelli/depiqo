export type ReplaceRentalDemandLineAccessoryInput = { equipmentTypeId: string; quantity: number };

export class ReplaceRentalDemandLineAccessoriesCommand {
  constructor(
    public readonly props: {
      tenantId: string;
      rentalId: string;
      rentalDemandLineId: string;
      expectedVersion: number;
      accessories: ReplaceRentalDemandLineAccessoryInput[];
    },
  ) {}
}
