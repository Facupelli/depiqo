import { ManualPricingAdjustmentDirection } from './manual-pricing-adjustment.types';

export type TargetTotalAllocationInput = {
  currency: string;
  targetTotal: string;
  lines: TargetTotalAllocationLineInput[];
};

export type TargetTotalAllocationLineInput = {
  rentalSelectionId: string;
  currentTotal: string;
};

export type TargetTotalAllocationResult = {
  currency: string;
  currentTotal: string;
  targetTotal: string;
  direction: ManualPricingAdjustmentDirection;
  adjustmentTotal: string;
  lines: TargetTotalAllocationLineResult[];
};

export type TargetTotalAllocationLineResult = {
  rentalSelectionId: string;
  previousTotal: string;
  finalTotal: string;
  adjustment: {
    direction: ManualPricingAdjustmentDirection;
    amount: string;
  };
};
