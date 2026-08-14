import { UpdatePromotionExclusionDto, UpdatePromotionScopeDto } from '@repo/api-contracts';
import { PromotionActivation, PromotionApplicationTarget, PromotionEffectType } from 'src/generated/prisma/client';

export class UpdatePromotionCommand {
  public readonly tenantId: string;
  public readonly promotionId: string;
  public readonly name: string;
  public readonly activation: PromotionActivation;
  public readonly priority: number;
  public readonly stackable: boolean;
  public readonly isActive: boolean;
  public readonly validFrom?: string;
  public readonly validUntil?: string;
  public readonly effectType: PromotionEffectType;
  public readonly effectValue: string;
  public readonly target: PromotionApplicationTarget;
  public readonly minOrderSubtotal?: string;
  public readonly minRentalUnits?: number;
  public readonly maxRentalUnits?: number;
  public readonly scopes: UpdatePromotionScopeDto[];
  public readonly exclusions: UpdatePromotionExclusionDto[];

  constructor(props: {
    tenantId: string;
    promotionId: string;
    name: string;
    activation: PromotionActivation;
    priority: number;
    stackable: boolean;
    isActive: boolean;
    validFrom?: string;
    validUntil?: string;
    effectType: PromotionEffectType;
    effectValue: string;
    target: PromotionApplicationTarget;
    minOrderSubtotal?: string;
    minRentalUnits?: number;
    maxRentalUnits?: number;
    scopes: UpdatePromotionScopeDto[];
    exclusions: UpdatePromotionExclusionDto[];
  }) {
    this.tenantId = props.tenantId;
    this.promotionId = props.promotionId;
    this.name = props.name;
    this.activation = props.activation;
    this.priority = props.priority;
    this.stackable = props.stackable;
    this.isActive = props.isActive;
    this.validFrom = props.validFrom;
    this.validUntil = props.validUntil;
    this.effectType = props.effectType;
    this.effectValue = props.effectValue;
    this.target = props.target;
    this.minOrderSubtotal = props.minOrderSubtotal;
    this.minRentalUnits = props.minRentalUnits;
    this.maxRentalUnits = props.maxRentalUnits;
    this.scopes = props.scopes;
    this.exclusions = props.exclusions;
  }
}
