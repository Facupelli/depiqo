import { deriveBufferedAssetBlockPeriod } from './asset-block-period';
import { AcceptedDeliverySnapshot } from './value-objects/accepted-delivery-snapshot.value-object';
import { RentalPeriod } from './value-objects/rental-period.value-object';

export function deriveConfirmedAssetBlockPeriod(params: {
  participationPeriod: RentalPeriod;
  acceptedBeforeBufferMinutes: number;
  acceptedAfterBufferMinutes: number;
  acceptedDelivery?: AcceptedDeliverySnapshot;
  clampStartAt?: Date;
}): RentalPeriod {
  const acceptedTransportReservationMinutes = params.acceptedDelivery?.snapshot.transportReservationMinutes ?? 0;

  return deriveBufferedAssetBlockPeriod({
    participationPeriod: params.participationPeriod,
    beforeBufferMinutes: params.acceptedBeforeBufferMinutes + acceptedTransportReservationMinutes,
    afterBufferMinutes: params.acceptedAfterBufferMinutes + acceptedTransportReservationMinutes,
    clampStartAt: params.clampStartAt,
  });
}
