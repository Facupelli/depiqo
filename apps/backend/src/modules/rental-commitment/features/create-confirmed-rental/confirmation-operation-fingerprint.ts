import { createHash } from 'node:crypto';

import { RentalDeliveryDetails } from '../../domain/rental.aggregate';
import {
  CreateConfirmedRentalCommand,
  CreateConfirmedRentalOfferSelectionCommand,
} from './create-confirmed-rental.command';

/**
 * Deterministic fingerprint of the material confirmation intent carried by a
 * CreateConfirmedRentalCommand. Two commands with equal fingerprints represent
 * the same logical confirmation operation even if they arrive through
 * different transports or with equivalent-but-differently-encoded values.
 *
 * Server-derived outcomes (rental number, pricing snapshot, asset allocations)
 * and non-intent transport data (booking snapshots) are deliberately excluded:
 * they are either not supplied by the caller or must not affect replay
 * resolution.
 */
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

function normalizeDeliveryDetails(deliveryDetails?: RentalDeliveryDetails) {
  if (!deliveryDetails) return null;

  return { address: deliveryDetails.address };
}
