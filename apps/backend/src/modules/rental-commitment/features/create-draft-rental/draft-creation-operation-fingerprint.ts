import { createHash } from 'node:crypto';

import {
  CreateDraftRentalDeliveryDecisionsSchema,
  CreateDraftRentalManualPricingAdjustmentSchema,
} from '@repo/api-contracts';
import Decimal from 'decimal.js';

import { FulfillmentMethod } from '../../domain/rental-status';
import { CreateDraftRentalCommand } from './create-draft-rental.command';

/** Fingerprint caller intent, not mutable proposals or generated persistence facts. */
export function buildDraftCreationFingerprint(command: CreateDraftRentalCommand): string {
  const adjustment = CreateDraftRentalManualPricingAdjustmentSchema.safeParse(command.manualPricingAdjustment);
  const decisions = CreateDraftRentalDeliveryDecisionsSchema.safeParse(command.deliveryDecisions);

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
        // Omit for old requests so existing idempotency fingerprints remain replayable.
        ...(command.deliveryDecisions === undefined
          ? {}
          : {
              deliveryDecisions: decisions.success
                ? {
                    pricingAgreement:
                      decisions.data.pricingAgreement?.type === 'SET'
                        ? {
                            type: 'SET',
                            amount: new Decimal(decisions.data.pricingAgreement.amount).toFixed(),
                            reason: decisions.data.pricingAgreement.reason ?? null,
                          }
                        : (decisions.data.pricingAgreement ?? null),
                    policyException: decisions.data.policyException
                      ? { type: 'AUTHORIZE', reason: decisions.data.policyException.reason ?? null }
                      : null,
                    transportReservationMinutes: decisions.data.transportReservationMinutes ?? null,
                  }
                : command.deliveryDecisions,
            }),
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
