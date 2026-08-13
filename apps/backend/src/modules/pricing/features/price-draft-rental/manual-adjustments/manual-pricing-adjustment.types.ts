export type TargetTotalAdjustmentDirection = 'INCREASE' | 'DECREASE' | 'NONE';

export type TargetTotalAdjustmentInput = {
  targetTotal: string;
};

export type TargetTotalAdjustmentResult = {
  targetTotal: string;
  previousTotal: string;
  direction: TargetTotalAdjustmentDirection;
  adjustmentTotal: string;
};

export type LineTargetTotalAllocation = {
  direction: TargetTotalAdjustmentDirection;
  amount: string;
};
