import { PricingResult, PricingResultLine } from '../../../pricing-engine/final/pricing-result.type';
import { Money } from '../../../pricing-engine/money/money.value-object';
import { TargetTotalAllocationService } from './target-total-allocation.service';
import { TargetTotalAllocationLineResult } from './target-total-allocation.types';
import { TargetTotalAdjustmentInput, TargetTotalAdjustmentResult } from './manual-pricing-adjustment.types';

type ManualPricingAdjustmentApplierInput = {
  pricingResult: PricingResult;
  targetTotalAdjustment: TargetTotalAdjustmentInput;
};

export type ManualPricingAdjustmentApplierResult = {
  pricingResult: PricingResult;
  targetTotalAdjustment: TargetTotalAdjustmentResult;
};

export class ManualPricingAdjustmentApplier {
  constructor(private readonly targetTotalAllocator = new TargetTotalAllocationService()) {}

  apply(input: ManualPricingAdjustmentApplierInput): ManualPricingAdjustmentApplierResult {
    const { pricingResult, targetTotalAdjustment } = input;
    const allocation = this.targetTotalAllocator.allocate({
      currency: pricingResult.currency,
      targetTotal: targetTotalAdjustment.targetTotal,
      lines: pricingResult.lines.map((line) => ({
        rentalSelectionId: line.rentalSelectionId,
        currentTotal: line.total,
      })),
    });

    const allocationsBySelectionId = new Map(allocation.lines.map((line) => [line.rentalSelectionId, line]));
    const adjustedLines = pricingResult.lines.map((line) => {
      const lineAllocation = allocationsBySelectionId.get(line.rentalSelectionId);
      if (!lineAllocation) {
        throw new Error(`Missing target-total allocation for rental selection "${line.rentalSelectionId}".`);
      }

      return this.applyLineAllocation(line, lineAllocation);
    });

    const finalTotal = Money.of(allocation.targetTotal, pricingResult.currency);

    return {
      pricingResult: {
        ...pricingResult,
        total: finalTotal.toSnapshotString(),
        lines: adjustedLines,
      },
      targetTotalAdjustment: {
        targetTotal: allocation.targetTotal,
        previousTotal: allocation.currentTotal,
        direction: allocation.direction,
        adjustmentTotal: allocation.adjustmentTotal,
      },
    };
  }

  private applyLineAllocation(line: PricingResultLine, allocation: TargetTotalAllocationLineResult): PricingResultLine {
    return {
      ...line,
      total: allocation.finalTotal,
      targetTotalAllocation: {
        direction: allocation.adjustment.direction,
        amount: allocation.adjustment.amount,
      },
    };
  }
}
