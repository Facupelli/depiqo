import { V2BillingUnit } from 'src/generated/prisma/client';

export class CreateRatePlanAndAttachToRentalOfferCommand {
  public readonly tenantId: string;
  public readonly catalogRentalOfferId: string;
  public readonly name: string;
  public readonly billingUnit: V2BillingUnit;
  public readonly currency: string;
  public readonly tiers: Array<{ fromUnit: number; toUnit?: number | null; pricePerUnit: string }>;

  constructor(props: {
    tenantId: string;
    catalogRentalOfferId: string;
    name: string;
    billingUnit: V2BillingUnit;
    currency: string;
    tiers: Array<{ fromUnit: number; toUnit?: number | null; pricePerUnit: string }>;
  }) {
    this.tenantId = props.tenantId;
    this.catalogRentalOfferId = props.catalogRentalOfferId;
    this.name = props.name;
    this.billingUnit = props.billingUnit;
    this.currency = props.currency;
    this.tiers = props.tiers;
  }
}
