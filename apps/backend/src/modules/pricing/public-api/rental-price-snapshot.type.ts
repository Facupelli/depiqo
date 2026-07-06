import { ManualPricingAdjustmentSnapshot } from '../features/price-draft-rental/manual-adjustments/manual-pricing-adjustment.types';
import { PricingResult } from '../pricing-engine/final/pricing-result.type';

export const RENTAL_PRICE_SNAPSHOT_SCHEMA = 'v2.rental-price-snapshot';
export const RENTAL_PRICE_SNAPSHOT_VERSION = 1;

export type RentalPriceSnapshotContext = 'DRAFT' | 'CONFIRMED' | 'CONFIRM_DRAFT' | 'REPRICE';

export type RentalPriceSnapshotV1 = {
  schema: typeof RENTAL_PRICE_SNAPSHOT_SCHEMA;
  version: typeof RENTAL_PRICE_SNAPSHOT_VERSION;
  calculatedAtIso: string;
  context: RentalPriceSnapshotContext;
  calculated: PricingResult;
  final: PricingResult;
  manualPricingAdjustment?: ManualPricingAdjustmentSnapshot;
};
