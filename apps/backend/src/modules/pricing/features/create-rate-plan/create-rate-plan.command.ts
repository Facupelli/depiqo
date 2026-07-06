import { V2BillingUnit } from 'src/generated/prisma/client';

export class CreateRatePlanCommand {
  public readonly tenantId: string;
  public readonly name: string;
  public readonly billingUnit: V2BillingUnit;
  public readonly currency: string;
  public readonly isActive: boolean;
  public readonly tiers: Array<{ fromUnit: number; toUnit?: number | null; pricePerUnit: string }>;

  constructor(props: {
    tenantId: string;
    name: string;
    billingUnit: V2BillingUnit;
    currency: string;
    isActive: boolean;
    tiers: Array<{ fromUnit: number; toUnit?: number | null; pricePerUnit: string }>;
  }) {
    this.tenantId = props.tenantId;
    this.name = props.name;
    this.billingUnit = props.billingUnit;
    this.currency = props.currency;
    this.isActive = props.isActive;
    this.tiers = props.tiers;
  }
}
