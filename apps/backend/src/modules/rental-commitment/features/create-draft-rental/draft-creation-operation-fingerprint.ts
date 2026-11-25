import { createHash } from 'node:crypto';

import {
  CreateDraftRentalDeliveryDecisionsSchema,
  CreateDraftRentalManualPricingAdjustmentSchema,
} from '@repo/api-contracts';
import Decimal from 'decimal.js';

import { FulfillmentMethod } from '../../domain/rental-status';
import { CreateDraftRentalCommand } from './create-draft-rental.command';

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
        deliveryDetails: deliveryDestinationFingerprint(command),
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

function deliveryDestinationFingerprint(command: CreateDraftRentalCommand) {
  const destination = command.deliveryDetails;
  if (command.fulfillmentMethod !== FulfillmentMethod.Delivery || !destination) return null;
  if (destination.arrangement !== 'STAFF_ARRANGED') {
    return { arrangement: 'ROUTED', address: destination.address, locationId: destination.locationId };
  }
  return {
    arrangement: 'STAFF_ARRANGED',
    address: destination.address,
    geocoding: destination.geocoding
      ? {
          latitude: destination.geocoding.latitude,
          longitude: destination.geocoding.longitude,
          formattedAddress: destination.geocoding.formattedAddress ?? null,
          providerPlaceId: destination.geocoding.providerPlaceId ?? null,
        }
      : null,
  };
}
