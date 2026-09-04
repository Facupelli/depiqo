import { PromotionActivation, PromotionEffectType } from 'src/generated/prisma/client';

export class GetPromotionsQuery {
  public readonly tenantId: string;
  public readonly isActive?: boolean;
  public readonly activation?: PromotionActivation;
  public readonly effectType?: PromotionEffectType;
  public readonly search?: string;

  constructor(props: {
    tenantId: string;
    isActive?: boolean;
    activation?: PromotionActivation;
    effectType?: PromotionEffectType;
    search?: string;
  }) {
    this.tenantId = props.tenantId;
    this.isActive = props.isActive;
    this.activation = props.activation;
    this.effectType = props.effectType;
    this.search = props.search;
  }
}
