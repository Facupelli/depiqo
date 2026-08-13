import { RentalPriceSnapshotContext, RentalPriceSnapshotV1 } from '../public-api/rental-price-snapshot.type';
import { PricingResult } from '../pricing-engine/final/pricing-result.type';
import { ManualPricingAdjustmentSnapshot } from '../features/price-draft-rental/manual-adjustments/manual-pricing-adjustment.types';

type RentalPriceSnapshotFactoryInput = {
  context: RentalPriceSnapshotContext;
  calculatedAt: Date;
  calculated: PricingResult;
  final: PricingResult;
  manualPricingAdjustment?: ManualPricingAdjustmentSnapshot;
};

export class RentalPriceSnapshotFactory {
  create(input: RentalPriceSnapshotFactoryInput): RentalPriceSnapshotV1 {
    return {
      schema: 'v2.rental-price-snapshot',
      version: 1,
      calculatedAtIso: input.calculatedAt.toISOString(),
      context: input.context,
      calculated: input.calculated,
      final: input.final,
      ...(input.manualPricingAdjustment ? { manualPricingAdjustment: input.manualPricingAdjustment } : {}),
    };
  }
}
