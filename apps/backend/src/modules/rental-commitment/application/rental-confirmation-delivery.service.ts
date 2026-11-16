import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import type { ApplicationError } from 'src/core/errors/application-error';
import { DeliveryQuoteService } from 'src/modules/delivery/public-api/delivery-quote.public-api';

import type { RentalDeliveryDetails } from '../domain/rental.aggregate';
import { validateRentalDeliveryDetails } from '../domain/rental-delivery-details';
import {
  ACCEPTED_DELIVERY_SNAPSHOT_SCHEMA,
  ACCEPTED_DELIVERY_SNAPSHOT_VERSION,
  AcceptedDeliverySnapshot,
  AcceptedDeliverySnapshotData,
} from '../domain/value-objects/accepted-delivery-snapshot.value-object';
import type { RentalPeriod } from '../domain/value-objects/rental-period.value-object';
import { acceptedDeliverySnapshotFromQuote } from './accepted-delivery-snapshot.adapter';

export interface RentalConfirmationDeliveryError extends ApplicationError {
  code:
    | 'rental_commitment.invalid_rental_field'
    | 'rental_commitment.delivery_not_serviceable'
    | 'rental_commitment.delivery_review_required';
}

/** Read-only revalidation shared by the advisory summary and final confirmation. */
@Injectable()
export class RentalConfirmationDeliveryService {
  constructor(private readonly deliveryQuoteService: DeliveryQuoteService) {}

  async resolve(input: {
    tenantId: string;
    branchId: string;
    period: RentalPeriod;
    fulfillmentMethod: 'PICKUP' | 'DELIVERY';
    deliveryDetails?: RentalDeliveryDetails;
    existing?: AcceptedDeliverySnapshotData;
  }): Promise<Result<AcceptedDeliverySnapshot | undefined, RentalConfirmationDeliveryError>> {
    if (input.fulfillmentMethod === 'PICKUP') return ok(undefined);
    if (input.existing?.arrangement === 'STAFF_ARRANGED') {
      const accepted = AcceptedDeliverySnapshot.create(input.existing);
      if (accepted.isErr()) {
        return err({
          code: 'rental_commitment.invalid_rental_field',
          message: accepted.error.message,
          cause: accepted.error,
        });
      }
      const validation = validateRentalDeliveryDetails({ ...input, acceptedDelivery: accepted.value });
      if (validation.isErr()) {
        return err({
          code: 'rental_commitment.invalid_rental_field',
          message: validation.error.message,
          cause: validation.error,
          context: { field: validation.error.field },
        });
      }
      // These are already authorized persisted terms, not a new transportation proposal.
      return ok(accepted.value);
    }
    const details = input.deliveryDetails;
    if (
      !details ||
      details.formattedAddress === undefined ||
      details.latitude === undefined ||
      details.longitude === undefined
    ) {
      return err({
        code: 'rental_commitment.invalid_rental_field',
        message: 'Delivery rentals require resolved Delivery details.',
        context: { field: 'deliveryDetails' },
      });
    }
    const deliveryOutcome = await this.deliveryQuoteService.evaluate({
      tenantId: input.tenantId,
      branchId: input.branchId,
      customerLocation: {
        resolvedLocation: {
          formattedAddress: details.formattedAddress,
          latitude: details.latitude,
          longitude: details.longitude,
          providerPlaceId: details.providerPlaceId,
        },
      },
      rentalStart: input.period.start,
      rentalEnd: input.period.end,
    });
    if (!deliveryOutcome.transportValid) {
      return err({
        code: 'rental_commitment.delivery_not_serviceable',
        message: `Delivery is not serviceable: ${deliveryOutcome.reason}.`,
        context: { deliveryReason: deliveryOutcome.reason },
      });
    }
    const existing = input.existing;
    const policyException = existing?.policyException;
    const staffAgreement = existing?.staffAgreement;
    // Without configuration, retain the draft's validated explicit minutes, including zero.
    const minutes = deliveryOutcome.transportReservationMinutes ?? existing?.transportReservationMinutes;
    const destination = deliveryOutcome.resolvedCustomerLocation;
    const unauthorizedRestrictions = deliveryOutcome.restrictions.filter(
      (restriction) => !policyException?.overriddenRestrictions.includes(restriction),
    );
    // Revalidation can consume an authorization, never grant it or move it to a different scope.
    const exceptionScopeChanged =
      existing !== undefined &&
      policyException !== undefined &&
      (existing.branchId !== deliveryOutcome.branchId ||
        existing.resolvedDestination?.formattedAddress !== destination.formattedAddress ||
        existing.resolvedDestination?.latitude !== destination.latitude ||
        existing.resolvedDestination?.longitude !== destination.longitude ||
        existing.resolvedDestination?.providerPlaceId !== destination.providerPlaceId ||
        Date.parse(existing.delivery.scheduledAt) !== deliveryOutcome.deliveryScheduledAt.getTime() ||
        Date.parse(existing.collection.scheduledAt) !== deliveryOutcome.collectionScheduledAt.getTime() ||
        existing.transportReservationMinutes !== minutes);
    if (
      exceptionScopeChanged ||
      unauthorizedRestrictions.length ||
      minutes === undefined ||
      (!deliveryOutcome.quote && (!staffAgreement || !policyException)) ||
      (staffAgreement && deliveryOutcome.currency !== undefined && existing.currency !== deliveryOutcome.currency)
    ) {
      return err({
        code: 'rental_commitment.delivery_review_required',
        message:
          'Review the draft delivery terms, agree pricing where needed, and explicitly authorize the current restrictions and transportation scope before confirming.',
        context: {
          deliveryRestrictions: deliveryOutcome.restrictions,
          unauthorizedRestrictions,
          exceptionScopeChanged,
        },
      });
    }
    const snapshot: AcceptedDeliverySnapshotData = {
      ...(deliveryOutcome.quote
        ? acceptedDeliverySnapshotFromQuote(deliveryOutcome.quote)
        : {
            arrangement: 'ROUTED',
            schema: ACCEPTED_DELIVERY_SNAPSHOT_SCHEMA,
            version: ACCEPTED_DELIVERY_SNAPSHOT_VERSION,
            distanceMeters: deliveryOutcome.distanceMeters,
            delivery: { scheduledAt: deliveryOutcome.deliveryScheduledAt.toISOString() },
            collection: { scheduledAt: deliveryOutcome.collectionScheduledAt.toISOString() },
            currency: existing!.currency,
            transportReservationMinutes: minutes,
          }),
      branchId: deliveryOutcome.branchId,
      resolvedDestination: {
        formattedAddress: destination.formattedAddress,
        latitude: destination.latitude,
        longitude: destination.longitude,
        providerPlaceId: destination.providerPlaceId,
      },
      transportReservationMinutes: minutes,
      staffAgreement,
      policyException,
    };
    const validated = AcceptedDeliverySnapshot.create(snapshot);
    if (validated.isErr()) throw validated.error;
    return ok(validated.value);
  }
}
