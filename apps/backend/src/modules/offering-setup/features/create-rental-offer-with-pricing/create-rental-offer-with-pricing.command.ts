import { V2BillingUnit } from 'src/generated/prisma/client';

export type CreateRentalOfferWithPricingInput =
  | {
      mode: 'CREATE_RATE_PLAN';
      ratePlan: {
        name: string;
        billingUnit: V2BillingUnit;
        currency: string;
        tiers: Array<{ fromUnit: number; toUnit?: number | null; pricePerUnit: string }>;
      };
    }
  | {
      mode: 'ATTACH_EXISTING_RATE_PLAN';
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
