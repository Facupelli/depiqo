export type ManualPricingAdjustmentMode = 'TARGET_TOTAL';

export type ManualPricingAdjustmentDirection = 'INCREASE' | 'DECREASE' | 'NONE';

export type ManualPricingAdjustmentInput = {
  mode: ManualPricingAdjustmentMode;
  targetTotal: string;
  setByTenantUserId: string;
  reason?: string;
};

export type ManualPricingAdjustmentSnapshot = {
  mode: ManualPricingAdjustmentMode;
  targetTotal: string;
  previousTotal: string;
  direction: ManualPricingAdjustmentDirection;
  adjustmentTotal: string;
  setByTenantUserId: string;
  setAtIso: string;
  reason?: string;
};

export type LineManualPricingAdjustmentSnapshot = {
  mode: 'TARGET_TOTAL_ALLOCATION';
  direction: ManualPricingAdjustmentDirection;
  amount: string;
  setByTenantUserId: string;
  setAtIso: string;
  reason?: string;
};
