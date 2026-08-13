import { TargetTotalAdjustmentDirection } from './manual-pricing-adjustment.types';

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
  direction: TargetTotalAdjustmentDirection;
  adjustmentTotal: string;
  lines: TargetTotalAllocationLineResult[];
};

export type TargetTotalAllocationLineResult = {
  rentalSelectionId: string;
  previousTotal: string;
  finalTotal: string;
  adjustment: {
    direction: TargetTotalAdjustmentDirection;
    amount: string;
  };
};
