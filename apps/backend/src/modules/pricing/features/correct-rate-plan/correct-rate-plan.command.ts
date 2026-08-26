import { V2BillingUnit } from 'src/generated/prisma/client';

export class CorrectRatePlanCommand {
  public readonly tenantId: string;
  public readonly ratePlanId: string;
  public readonly name: string;
  public readonly billingUnit: V2BillingUnit;
  public readonly currency: string;
  public readonly tiers: Array<{ fromUnit: number; toUnit?: number | null; pricePerUnit: string }>;
  public readonly expectedAffectedRentalOfferIds: string[];

  constructor(props: {
    tenantId: string;
    ratePlanId: string;
    name: string;
    billingUnit: V2BillingUnit;
    currency: string;
    tiers: Array<{ fromUnit: number; toUnit?: number | null; pricePerUnit: string }>;
    expectedAffectedRentalOfferIds: string[];
  }) {
    this.tenantId = props.tenantId;
    this.ratePlanId = props.ratePlanId;
    this.name = props.name;
    this.billingUnit = props.billingUnit;
    this.currency = props.currency;
    this.tiers = props.tiers;
    this.expectedAffectedRentalOfferIds = props.expectedAffectedRentalOfferIds;
  }
}
