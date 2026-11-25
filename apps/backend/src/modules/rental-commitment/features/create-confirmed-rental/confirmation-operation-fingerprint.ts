import { createHash } from 'node:crypto';

import {
  CreateConfirmedRentalCommand,
  CreateConfirmedRentalDeliveryDetailsCommand,
  CreateConfirmedRentalOfferSelectionCommand,
} from './create-confirmed-rental.command';

export function buildConfirmationFingerprint(command: CreateConfirmedRentalCommand): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        tenantId: command.tenantId,
        branchId: command.branchId,
        rentalCustomerId: command.rentalCustomerId,
        period: {
          start: command.period.start.toISOString(),
          end: command.period.end.toISOString(),
        },
        selectedOffers: normalizeSelectedOffers(command.selectedOffers),
        fulfillmentMethod: command.fulfillmentMethod,
        deliveryDetails: normalizeDeliveryDetails(command.deliveryDetails),
        notes: command.notes ?? null,
        insuranceSelected: command.insuranceSelected ?? false,
      }),
    )
    .digest('hex');
}

function normalizeSelectedOffers(
  selectedOffers: readonly CreateConfirmedRentalOfferSelectionCommand[],
): Array<{ rentalOfferId: string; quantity: number }> {
  return [...selectedOffers]
    .map((selection) => ({ rentalOfferId: selection.rentalOfferId, quantity: selection.quantity }))
    .sort((a, b) => a.rentalOfferId.localeCompare(b.rentalOfferId));
}

function normalizeDeliveryDetails(deliveryDetails?: CreateConfirmedRentalDeliveryDetailsCommand) {
  if (!deliveryDetails) return null;

  return { address: deliveryDetails.address, locationId: deliveryDetails.locationId };
}
