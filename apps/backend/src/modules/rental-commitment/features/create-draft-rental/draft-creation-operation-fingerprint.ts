import { createHash } from 'node:crypto';

import { CreateDraftRentalManualPricingAdjustmentSchema } from '@repo/api-contracts';
import Decimal from 'decimal.js';

import { FulfillmentMethod } from '../../domain/rental-status';
import { CreateDraftRentalCommand } from './create-draft-rental.command';

/** Fingerprint caller intent, not mutable proposals or generated persistence facts. */
export function buildDraftCreationFingerprint(command: CreateDraftRentalCommand): string {
  const adjustment = CreateDraftRentalManualPricingAdjustmentSchema.safeParse(command.manualPricingAdjustment);

  return createHash('sha256')
    .update(
      JSON.stringify({
        tenantId: command.tenantId,
        tenantUserId: command.tenantUserId,
        branchId: command.branchId,
        rentalCustomerId: command.rentalCustomerId ?? null,
        period: {
          start: command.period.start.toISOString(),
          end: command.period.end.toISOString(),
        },
        selectedOffers: command.selectedOffers
          .map((selection) => ({ rentalOfferId: selection.rentalOfferId, quantity: selection.quantity }))
          .sort((a, b) => a.rentalOfferId.localeCompare(b.rentalOfferId)),
        fulfillmentMethod: command.fulfillmentMethod,
        deliveryDetails:
          command.fulfillmentMethod === FulfillmentMethod.Delivery && command.deliveryDetails
            ? { address: command.deliveryDetails.address, locationId: command.deliveryDetails.locationId }
            : null,
        notes: command.notes ?? null,
        insuranceSelected: command.insuranceSelected ?? false,
        // Invalid command input must still reach the existing pricing validation.
        manualPricingAdjustment: adjustment.success
          ? {
              mode: adjustment.data.mode,
              targetTotal: new Decimal(adjustment.data.targetTotal).toFixed(),
              reason: adjustment.data.reason ?? null,
            }
          : (command.manualPricingAdjustment ?? null),
      }),
    )
    .digest('hex');
}
