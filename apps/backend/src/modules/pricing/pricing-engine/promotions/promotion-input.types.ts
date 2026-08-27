import type { LocalDate } from '@repo/api-contracts';

import { PromotionActivation, PromotionApplicationTarget, PromotionEffectType } from './promotion.types';

export type PromotionPricingInput = {
  id: string;
  tenantId: string;
  name: string;
  activation: PromotionActivation;
  priority: number;
  stackable: boolean;
  isActive: boolean;
  validFrom?: LocalDate | null;
  validUntil?: LocalDate | null;
  effectType: PromotionEffectType;
  effectValue: string;
  target: PromotionApplicationTarget;
  minOrderSubtotal?: string | null;
  minRentalUnits?: number | null;
  maxRentalUnits?: number | null;
  scopes: PromotionScopeInput[];
  exclusions: PromotionExclusionInput[];
};

export type PromotionScopeInput = {
  appliesToAll?: boolean;
  rentableItemId?: string | null;
  rentalOfferId?: string | null;
  categoryId?: string | null;
};

export type PromotionExclusionInput = {
  rentableItemId?: string | null;
  rentalOfferId?: string | null;
  categoryId?: string | null;
  rentableItemKind?: 'SINGLE' | 'PACKAGE' | null;
};
