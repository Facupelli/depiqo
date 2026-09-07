import { V2BillingUnit } from 'src/generated/prisma/client';

export class CreatePricingForRentalOfferCommand {
  public readonly tenantId: string;
  public readonly catalogRentalOfferId: string;
  public readonly ratePlan: {
    name: string;
    billingUnit: V2BillingUnit;
    currency: string;
    tiers: Array<{ fromUnit: number; toUnit?: number | null; pricePerUnit: string }>;
  };

  constructor(props: {
    tenantId: string;
    catalogRentalOfferId: string;
    ratePlan: {
      name: string;
      billingUnit: V2BillingUnit;
      currency: string;
      tiers: Array<{ fromUnit: number; toUnit?: number | null; pricePerUnit: string }>;
    };
  }) {
    this.tenantId = props.tenantId;
    this.catalogRentalOfferId = props.catalogRentalOfferId;
    this.ratePlan = props.ratePlan;
  }
}
