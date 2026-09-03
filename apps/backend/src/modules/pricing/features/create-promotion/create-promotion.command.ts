import { CreatePromotionExclusionDto, CreatePromotionScopeDto } from '@repo/api-contracts';
import { PromotionActivation, PromotionEffectType } from 'src/generated/prisma/client';

export class CreatePromotionCommand {
  public readonly tenantId: string;
  public readonly name: string;
  public readonly activation: PromotionActivation;
  public readonly priority: number;
  public readonly stackable: boolean;
  public readonly isActive: boolean;
  public readonly validFrom?: string;
  public readonly validUntil?: string;
  public readonly effectType: PromotionEffectType;
  public readonly effectValue: string;
  public readonly minOrderSubtotal?: string;
  public readonly minRentalUnits?: number;
  public readonly maxRentalUnits?: number;
  public readonly scopes: CreatePromotionScopeDto[];
  public readonly exclusions: CreatePromotionExclusionDto[];

  constructor(props: {
    tenantId: string;
    name: string;
    activation: PromotionActivation;
    priority: number;
    stackable: boolean;
    isActive: boolean;
    validFrom?: string;
    validUntil?: string;
    effectType: PromotionEffectType;
    effectValue: string;
    minOrderSubtotal?: string;
    minRentalUnits?: number;
    maxRentalUnits?: number;
    scopes: CreatePromotionScopeDto[];
    exclusions: CreatePromotionExclusionDto[];
  }) {
    this.tenantId = props.tenantId;
    this.name = props.name;
    this.activation = props.activation;
    this.priority = props.priority;
    this.stackable = props.stackable;
    this.isActive = props.isActive;
    this.validFrom = props.validFrom;
    this.validUntil = props.validUntil;
    this.effectType = props.effectType;
    this.effectValue = props.effectValue;
    this.minOrderSubtotal = props.minOrderSubtotal;
    this.minRentalUnits = props.minRentalUnits;
    this.maxRentalUnits = props.maxRentalUnits;
    this.scopes = props.scopes;
    this.exclusions = props.exclusions;
  }
}
