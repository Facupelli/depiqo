import { err, ok, Result } from 'neverthrow';

import { RentalInvalidFieldError } from './errors/rental-commitment.errors';
import type { RentalDeliveryDetails } from './rental.aggregate';
import { FulfillmentMethod } from './rental-status';
import type { AcceptedDeliverySnapshot } from './value-objects/accepted-delivery-snapshot.value-object';
import type { RentalPeriod } from './value-objects/rental-period.value-object';

export function validateRentalDeliveryDetails(input: {
  fulfillmentMethod: `${FulfillmentMethod}`;
  deliveryDetails?: RentalDeliveryDetails;
  acceptedDelivery?: AcceptedDeliverySnapshot;
  period: RentalPeriod;
  branchId: string;
}): Result<void, RentalInvalidFieldError> {
  const details = input.deliveryDetails;
  if (input.fulfillmentMethod !== FulfillmentMethod.Delivery) {
    return details
      ? err(new RentalInvalidFieldError('deliveryDetails', 'only delivery rentals can have delivery details'))
      : ok(undefined);
  }
  if (!details) {
    return err(new RentalInvalidFieldError('deliveryDetails', 'delivery rentals require delivery details'));
  }
  if (details.address.trim() === '' || details.address !== details.address.trim()) {
    return err(new RentalInvalidFieldError('deliveryDetails.address', 'delivery address must be a trimmed string'));
  }
  if (
    details.formattedAddress !== undefined &&
    (details.formattedAddress.trim() === '' || details.formattedAddress !== details.formattedAddress.trim())
  ) {
    return err(
      new RentalInvalidFieldError(
        'deliveryDetails.formattedAddress',
        'formatted delivery address must be a trimmed string',
      ),
    );
  }
  const { latitude, longitude, formattedAddress, providerPlaceId } = details;
  if ((latitude === undefined) !== (longitude === undefined)) {
    return err(new RentalInvalidFieldError('deliveryDetails', 'coordinates must be supplied together'));
  }
  if (latitude !== undefined && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) {
    return err(new RentalInvalidFieldError('deliveryDetails.latitude', 'must be between -90 and 90'));
  }
  if (longitude !== undefined && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)) {
    return err(new RentalInvalidFieldError('deliveryDetails.longitude', 'must be between -180 and 180'));
  }

  const terms = input.acceptedDelivery?.snapshot;
  if (terms) {
    if (
      Date.parse(terms.delivery.scheduledAt) !== input.period.start.getTime() ||
      Date.parse(terms.collection.scheduledAt) !== input.period.end.getTime()
    ) {
      return err(new RentalInvalidFieldError('acceptedDelivery', 'scheduled times must match the rental period'));
    }
    if (terms.arrangement === 'ROUTED') {
      if (latitude === undefined || longitude === undefined || !formattedAddress) {
        return err(
          new RentalInvalidFieldError('deliveryDetails', 'ROUTED delivery requires resolved coordinates and address'),
        );
      }
      const destination = terms.resolvedDestination;
      if (
        (terms.branchId !== undefined && terms.branchId !== input.branchId) ||
        (destination !== undefined &&
          (destination.formattedAddress !== formattedAddress ||
            destination.latitude !== latitude ||
            destination.longitude !== longitude ||
            destination.providerPlaceId !== providerPlaceId))
      ) {
        return err(
          new RentalInvalidFieldError('acceptedDelivery', 'must match the rental branch and delivery destination'),
        );
      }
    }
  }
  return ok(undefined);
}
