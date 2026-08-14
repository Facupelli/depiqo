import { PricingRatePlanBillingUnit } from '../../../pricing/public-api/pricing-rate-plan-authoring.public-api';

export type CreateRentalOfferWithPricingInput =
  | {
      mode: 'CREATE_RATE_PLAN';
      ratePlan: {
        name: string;
        billingUnit: PricingRatePlanBillingUnit;
        currency: string;
        tiers: Array<{ fromUnit: number; toUnit?: number | null; pricePerUnit: string }>;
      };
    }
  | {
      mode: 'REUSE_RATE_PLAN';
      ratePlanId: string;
    };

export class CreateRentalOfferWithPricingCommand {
  public readonly tenantId: string;
  public readonly rentableItemId: string;
  public readonly branchId: string;
  public readonly pricing: CreateRentalOfferWithPricingInput;

  constructor(props: {
    tenantId: string;
    rentableItemId: string;
    branchId: string;
    pricing: CreateRentalOfferWithPricingInput;
  }) {
    this.tenantId = props.tenantId;
    this.rentableItemId = props.rentableItemId;
    this.branchId = props.branchId;
    this.pricing = props.pricing;
  }
}
