import type { AcceptedDeliveryDto, RentalDeliveryDetailsDto } from '@repo/api-contracts';

import { AcceptedDeliverySnapshot } from '../domain/value-objects/accepted-delivery-snapshot.value-object';

export function toAcceptedDeliveryResponse(accepted: AcceptedDeliverySnapshot): AcceptedDeliveryDto {
  const data = accepted.snapshot;
  const common = {
    currency: data.currency,
    delivery: data.delivery,
    collection: data.collection,
    staffAgreement: data.staffAgreement,
    transportReservationMinutes: data.transportReservationMinutes,
    effectiveDeliveryCharge: accepted.effectiveDeliveryCharge,
  };
  if (data.arrangement === 'STAFF_ARRANGED') {
    return { ...common, arrangement: data.arrangement, staffAgreement: data.staffAgreement };
  }
  return {
    ...common,
    arrangement: data.arrangement,
    distanceMeters: data.distanceMeters,
    deliveryTotal: data.deliveryTotal,
    branchId: data.branchId,
    resolvedDestination: data.resolvedDestination,
    policyException: data.policyException,
  };
}

export function toDeliveryDetailsResponse(
  details: {
    address: string;
    formattedAddress: string | null;
    latitude: number | null;
    longitude: number | null;
    providerPlaceId: string | null;
  } | null,
): RentalDeliveryDetailsDto | null {
  if (!details) return null;
  return {
    address: details.address,
    formattedAddress: details.formattedAddress ?? undefined,
    latitude: details.latitude ?? undefined,
    longitude: details.longitude ?? undefined,
    providerPlaceId: details.providerPlaceId ?? undefined,
  };
}
