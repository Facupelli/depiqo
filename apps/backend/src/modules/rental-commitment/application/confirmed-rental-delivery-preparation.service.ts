import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { err, ok, Result } from 'neverthrow';
import {
  CustomerLocationSelection,
  DeliveryProviderError,
  DeliveryQuoteService,
} from 'src/modules/delivery/public-api/delivery-quote.public-api';
import { Rental, RentalDeliveryDetails } from '../domain/rental.aggregate';
import {
  ACCEPTED_DELIVERY_SNAPSHOT_SCHEMA,
  ACCEPTED_DELIVERY_SNAPSHOT_VERSION,
  AcceptedDeliverySnapshot,
  AcceptedDeliverySnapshotData,
} from '../domain/value-objects/accepted-delivery-snapshot.value-object';
import {
  ConfirmedDeliveryDecisions,
  ConfirmedDeliveryDestination,
} from '../features/change-confirmed-rental-delivery/change-confirmed-rental-delivery.command';
import {
  ChangeConfirmedRentalDeliveryError,
  changeConfirmedRentalDeliveryError as failure,
  mapChangeConfirmedRentalDeliveryError,
} from '../features/change-confirmed-rental-delivery/change-confirmed-rental-delivery.errors';
import { acceptedDeliverySnapshotFromQuote } from './accepted-delivery-snapshot.adapter';

export interface PreparedConfirmedDelivery {
  deliveryDetails: RentalDeliveryDetails;
  acceptedDelivery: AcceptedDeliverySnapshot;
}

@Injectable()
export class ConfirmedRentalDeliveryPreparationService {
  constructor(private readonly delivery: DeliveryQuoteService) {}

  async prepare(input: {
    rental: Rental;
    tenantUserId: string;
    destination?: ConfirmedDeliveryDestination;
    decisions: ConfirmedDeliveryDecisions;
  }): Promise<Result<PreparedConfirmedDelivery, ChangeConfirmedRentalDeliveryError>> {
    const { rental, destination, decisions } = input;
    const eligible = rental.validateConfirmedDeliveryChange(new Date());
    if (eligible.isErr()) return err(mapChangeConfirmedRentalDeliveryError(eligible.error));
    const previous = rental.acceptedDelivery!.snapshot;
    const arrangement = destination?.arrangement ?? previous.arrangement;
    const transition = arrangement !== previous.arrangement;
    const currency = rental.confirmedPriceSnapshot!.snapshot.final.currency;
    const invalid = (message: string) => err(failure('rental_commitment.invalid_rental_field', message));
    const minutes = decisions.transportReservationMinutes;
    if (minutes !== undefined && (!Number.isSafeInteger(minutes) || minutes < 0))
      return invalid('Transportation minutes must be a non-negative safe integer.');
    const agreementDecision = decisions.pricingAgreement;
    if (transition && agreementDecision?.type === 'KEEP')
      return invalid('Arrangement transitions cannot carry over a previous agreement.');
    if (agreementDecision?.type === 'KEEP' && !previous.staffAgreement)
      return invalid('KEEP requires an existing agreement.');
    if (agreementDecision?.type === 'SET') {
      const validated = rental.acceptedDelivery!.changeAgreement({
        agreement: agreementDecision,
        tenantUserId: input.tenantUserId,
        operationTime: new Date(),
      });
      if (validated.isErr()) return err(mapChangeConfirmedRentalDeliveryError(validated.error));
    }
    const operationTime = new Date().toISOString();
    let staffAgreement = transition ? undefined : previous.staffAgreement;
    if (agreementDecision?.type === 'SET') {
      staffAgreement = {
        amount: new Decimal(agreementDecision.amount).toFixed(2),
        reason: agreementDecision.reason?.trim() || undefined,
        agreedBy: input.tenantUserId,
        agreedAt: operationTime,
      };
    } else if (agreementDecision?.type === 'CLEAR') {
      staffAgreement = undefined;
    }

    const finish = (details: RentalDeliveryDetails, terms: AcceptedDeliverySnapshotData) => {
      const accepted = AcceptedDeliverySnapshot.create(terms);
      return accepted.isErr()
        ? err(mapChangeConfirmedRentalDeliveryError(accepted.error))
        : ok({ deliveryDetails: details, acceptedDelivery: accepted.value });
    };
    if (arrangement === 'STAFF_ARRANGED') {
      if (decisions.policyException) return invalid('Staff-arranged delivery has no policy exceptions.');
      if (transition && (agreementDecision?.type !== 'SET' || minutes === undefined))
        return invalid('Switching to staff-arranged delivery requires a new SET agreement and explicit minutes.');
      if (!staffAgreement) return invalid('Staff-arranged delivery requires an agreement and cannot use CLEAR.');
      const details =
        destination?.arrangement === 'STAFF_ARRANGED'
          ? { address: destination.address, ...destination.geocoding }
          : rental.deliveryDetails!;
      return finish(details, {
        schema: ACCEPTED_DELIVERY_SNAPSHOT_SCHEMA,
        version: ACCEPTED_DELIVERY_SNAPSHOT_VERSION,
        arrangement: 'STAFF_ARRANGED',
        delivery: { scheduledAt: rental.period.start.toISOString() },
        collection: { scheduledAt: rental.period.end.toISOString() },
        currency,
        staffAgreement,
        transportReservationMinutes: minutes ?? previous.transportReservationMinutes,
      });
    }

    const details = rental.deliveryDetails!;
    let customerLocation: CustomerLocationSelection | undefined =
      destination?.arrangement === 'ROUTED'
        ? { address: destination.address, locationId: destination.locationId }
        : undefined;
    if (
      !destination &&
      previous.arrangement === 'ROUTED' &&
      details.formattedAddress !== undefined &&
      details.latitude !== undefined &&
      details.longitude !== undefined
    ) {
      customerLocation = {
        resolvedLocation: {
          formattedAddress: details.formattedAddress,
          latitude: details.latitude,
          longitude: details.longitude,
          providerPlaceId: details.providerPlaceId,
        },
      };
    }
    if (!customerLocation || (transition && destination?.arrangement !== 'ROUTED'))
      return invalid('Routed delivery requires a location selection or an existing routed destination.');
    const minutesChanged = minutes !== undefined && minutes !== previous.transportReservationMinutes;
    if (previous.arrangement === 'ROUTED' && !destination && !minutesChanged && !decisions.policyException) {
      return finish(details, { ...previous, staffAgreement });
    }

    try {
      const evaluation = await this.delivery.evaluate({
        tenantId: rental.tenantId,
        branchId: rental.branchId,
        customerLocation,
        rentalStart: rental.period.start,
        rentalEnd: rental.period.end,
      });
      if (!evaluation.transportValid)
        return err(
          failure(
            'rental_commitment.delivery_not_serviceable',
            'Delivery transportation is not technically valid.',
            undefined,
            { deliveryReason: evaluation.reason },
          ),
        );
      const location = evaluation.resolvedCustomerLocation;
      const nextDetails = { address: destination?.address ?? details.address, ...location };
      if (!transition && previous.staffAgreement && !agreementDecision)
        return invalid('Changed routed conditions require an explicit SET, KEEP or CLEAR agreement decision.');
      if (evaluation.restrictions.length && decisions.policyException?.type !== 'AUTHORIZE')
        return err(
          failure(
            'rental_commitment.delivery_not_serviceable',
            'Explicit policy exception authorization is required.',
            undefined,
            { deliveryRestrictions: evaluation.restrictions },
          ),
        );
      if (evaluation.currency !== undefined && evaluation.currency !== currency)
        return invalid('Delivery and accepted equipment pricing must use the same currency.');
      const proposedMinutes =
        minutes ?? (transition ? evaluation.transportReservationMinutes : previous.transportReservationMinutes);
      if (proposedMinutes === undefined)
        return invalid('Explicit transportation minutes are required without configured minutes.');
      if (
        evaluation.transportReservationMinutes !== undefined &&
        proposedMinutes !== evaluation.transportReservationMinutes
      )
        return invalid('Explicitly select the current configured transportation minutes.');
      const reference = evaluation.quote ? acceptedDeliverySnapshotFromQuote(evaluation.quote) : undefined;
      if (reference && reference.currency !== currency)
        return invalid('Delivery quotation currency differs from accepted equipment pricing.');
      return finish(nextDetails, {
        ...(reference ?? {
          schema: ACCEPTED_DELIVERY_SNAPSHOT_SCHEMA,
          version: ACCEPTED_DELIVERY_SNAPSHOT_VERSION,
          arrangement: 'ROUTED' as const,
          currency,
          distanceMeters: evaluation.distanceMeters,
          delivery: { scheduledAt: evaluation.deliveryScheduledAt.toISOString() },
          collection: { scheduledAt: evaluation.collectionScheduledAt.toISOString() },
          transportReservationMinutes: proposedMinutes,
        }),
        branchId: rental.branchId,
        resolvedDestination: location,
        transportReservationMinutes: proposedMinutes,
        staffAgreement,
        policyException: evaluation.restrictions.length
          ? {
              overriddenRestrictions: [...new Set(evaluation.restrictions)],
              reason: decisions.policyException?.reason,
              authorizedBy: input.tenantUserId,
              authorizedAt: operationTime,
            }
          : undefined,
      });
    } catch (error) {
      if (!(error instanceof DeliveryProviderError)) throw error;
      return err(
        failure(
          'rental_commitment.delivery_evaluation_unavailable',
          'Delivery routing is temporarily unavailable.',
          error,
        ),
      );
    }
  }
}
