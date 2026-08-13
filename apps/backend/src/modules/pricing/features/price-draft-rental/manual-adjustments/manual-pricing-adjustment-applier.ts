import { Money } from '../../../pricing-engine/money/money.value-object';
import { PricingResult, PricingResultLine } from '../../../pricing-engine/final/pricing-result.type';
import { ManualPricingAdjustmentInput, ManualPricingAdjustmentSnapshot } from './manual-pricing-adjustment.types';
import { TargetTotalAllocationService } from './target-total-allocation.service';
import { TargetTotalAllocationLineResult } from './target-total-allocation.types';

type ManualPricingAdjustmentApplierInput = {
  pricingResult: PricingResult;
  manualPricingAdjustment: ManualPricingAdjustmentInput;
  appliedAt: Date;
};

export type ManualPricingAdjustmentApplierResult = {
  pricingResult: PricingResult;
  manualPricingAdjustment: ManualPricingAdjustmentSnapshot;
};

export class ManualPricingAdjustmentApplier {
  constructor(private readonly targetTotalAllocator = new TargetTotalAllocationService()) {}

  apply(input: ManualPricingAdjustmentApplierInput): ManualPricingAdjustmentApplierResult {
    switch (input.manualPricingAdjustment.mode) {
      case 'TARGET_TOTAL':
        return this.applyTargetTotal(input);

      default:
        return this.assertNever(input.manualPricingAdjustment.mode);
    }
  }

  private applyTargetTotal(input: ManualPricingAdjustmentApplierInput): ManualPricingAdjustmentApplierResult {
    const { pricingResult, manualPricingAdjustment, appliedAt } = input;

    const allocation = this.targetTotalAllocator.allocate({
      currency: pricingResult.currency,
      targetTotal: manualPricingAdjustment.targetTotal,
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

      return this.applyLineAllocation({
        line,
        allocation: lineAllocation,
        manualPricingAdjustment,
        appliedAt,
      });
    });

    const finalTotal = Money.of(allocation.targetTotal, pricingResult.currency);

    return {
      pricingResult: {
        ...pricingResult,
        total: finalTotal.toSnapshotString(),
        lines: adjustedLines,
      },
      manualPricingAdjustment: {
        mode: 'TARGET_TOTAL',
        targetTotal: allocation.targetTotal,
        previousTotal: allocation.currentTotal,
        direction: allocation.direction,
        adjustmentTotal: allocation.adjustmentTotal,
        setByTenantUserId: manualPricingAdjustment.setByTenantUserId,
        setAtIso: appliedAt.toISOString(),
        reason: manualPricingAdjustment.reason,
      },
    };
  }

  private applyLineAllocation(input: {
    line: PricingResultLine;
    allocation: TargetTotalAllocationLineResult;
    manualPricingAdjustment: ManualPricingAdjustmentInput;
    appliedAt: Date;
  }): PricingResultLine {
    const { line, allocation, manualPricingAdjustment, appliedAt } = input;

    return {
      ...line,
      total: allocation.finalTotal,
      manualPricingAdjustment: {
        mode: 'TARGET_TOTAL_ALLOCATION',
        direction: allocation.adjustment.direction,
        amount: allocation.adjustment.amount,
        setByTenantUserId: manualPricingAdjustment.setByTenantUserId,
        setAtIso: appliedAt.toISOString(),
        reason: manualPricingAdjustment.reason,
      },
    };
  }

  private assertNever(value: never): never {
    throw new Error(`Unsupported manual pricing adjustment mode: ${String(value)}.`);
  }
}
