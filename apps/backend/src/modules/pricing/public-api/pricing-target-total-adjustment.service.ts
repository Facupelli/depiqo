import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { TargetTotalAllocationService } from '../features/price-draft-rental/manual-adjustments/target-total-allocation.service';
import { InvalidPricingInputError } from '../pricing-engine/errors/pricing.errors';
import {
  PricingTargetTotalAdjustment,
  PricingTargetTotalAdjustmentError,
  PricingTargetTotalAdjustmentRequest,
  PricingTargetTotalAdjustmentResult,
} from './pricing-target-total-adjustment.public-api';

@Injectable()
export class PricingTargetTotalAdjustmentService extends PricingTargetTotalAdjustment {
  private readonly allocator = new TargetTotalAllocationService();

  allocate(
    input: PricingTargetTotalAdjustmentRequest,
  ): Result<PricingTargetTotalAdjustmentResult, PricingTargetTotalAdjustmentError> {
    try {
      const allocation = this.allocator.allocate({
        currency: input.currency,
        targetTotal: input.targetTotal,
        lines: input.lines.map((line) => ({
          rentalSelectionId: line.lineReference,
          currentTotal: line.currentTotal,
        })),
      });

      return ok({
        currentTotal: allocation.currentTotal,
        targetTotal: allocation.targetTotal,
        direction: allocation.direction,
        adjustmentTotal: allocation.adjustmentTotal,
        lines: allocation.lines.map((line) => ({
          lineReference: line.rentalSelectionId,
          previousTotal: line.previousTotal,
          finalTotal: line.finalTotal,
          direction: line.adjustment.direction,
          adjustmentAmount: line.adjustment.amount,
        })),
      });
    } catch (error) {
      if (error instanceof InvalidPricingInputError) {
        return err(new PricingTargetTotalAdjustmentError(error.message, { cause: error }));
      }
      throw error;
    }
  }
}
