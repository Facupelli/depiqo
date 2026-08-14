import { Rental } from '../../domain/rental.aggregate';
import { EditConfirmedRentalCommand } from './edit-confirmed-rental.command';

export type ConfirmedRentalEditImpact = 'NONE' | 'DETAILS' | 'OPERATIONAL';

export function classifyConfirmedRentalEdit(
  rental: Rental,
  props: EditConfirmedRentalCommand['props'],
): ConfirmedRentalEditImpact {
  if (
    rental.branchId !== props.branchId ||
    rental.period.start.getTime() !== props.period.start.getTime() ||
    rental.period.end.getTime() !== props.period.end.getTime() ||
    !hasSameOfferQuantities(rental, props)
  ) {
    return 'OPERATIONAL';
  }

  if (
    rental.fulfillmentMethod !== props.fulfillmentMethod ||
    rental.notes !== props.notes ||
    rental.insuranceSelected !== props.insuranceSelected ||
    !hasSameDeliveryDetails(rental.deliveryDetails, props.deliveryDetails) ||
    props.manualPricingAdjustment !== null
  ) {
    return 'DETAILS';
  }

  return 'NONE';
}

function hasSameOfferQuantities(rental: Rental, props: EditConfirmedRentalCommand['props']): boolean {
  const existing = rental.selections.map((selection) => `${selection.rentalOfferId}:${selection.quantity}`).sort();
  const submitted = props.selectedOffers.map((selection) => `${selection.rentalOfferId}:${selection.quantity}`).sort();

  return existing.length === submitted.length && existing.every((value, index) => value === submitted[index]);
}

function hasSameDeliveryDetails(
  left: Rental['deliveryDetails'],
  right: EditConfirmedRentalCommand['props']['deliveryDetails'],
): boolean {
  return (
    left?.addressLine1 === right?.addressLine1 &&
    left?.addressLine2 === right?.addressLine2 &&
    left?.city === right?.city &&
    left?.state === right?.state &&
    left?.postalCode === right?.postalCode &&
    left?.country === right?.country &&
    left?.contactName === right?.contactName &&
    left?.contactPhone === right?.contactPhone &&
    left?.notes === right?.notes
  );
}
