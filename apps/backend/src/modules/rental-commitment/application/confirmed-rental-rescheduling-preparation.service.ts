import { Injectable } from '@nestjs/common';
import type { PreviewConfirmedRentalPeriodResponseDto } from '@repo/api-contracts';
import Decimal from 'decimal.js';
import { createHash } from 'node:crypto';
import { err, ok, Result } from 'neverthrow';

import { DomainException } from 'src/core/exceptions/domain.exception';
import {
  DeliveryEvaluationOutcome,
  DeliveryProviderError,
  DeliveryQuoteLeg,
  DeliveryQuoteService,
} from 'src/modules/delivery/public-api/delivery-quote.public-api';

import { deriveBufferedAssetBlockPeriod } from '../domain/asset-block-period';
import { Rental } from '../domain/rental.aggregate';
import {
  ACCEPTED_DELIVERY_SNAPSHOT_SCHEMA,
  ACCEPTED_DELIVERY_SNAPSHOT_VERSION,
  AcceptedDeliverySnapshot,
  AcceptedDeliverySnapshotData,
} from '../domain/value-objects/accepted-delivery-snapshot.value-object';
import { RentalPeriod } from '../domain/value-objects/rental-period.value-object';
import {
  mapRescheduleConfirmedRentalPeriodError,
  RescheduleConfirmedRentalPeriodError,
  rescheduleConfirmedRentalPeriodError as failure,
} from '../features/reschedule-confirmed-rental-period/reschedule-confirmed-rental-period.errors';
import { acceptedDeliverySnapshotFromQuote } from './accepted-delivery-snapshot.adapter';

export interface ConfirmedRentalReschedulingPreparation {
  period: RentalPeriod;
  preview: PreviewConfirmedRentalPeriodResponseDto;
  // Proposed terms are not an accepted snapshot until all decisions have been checked.
  deliveryTerms?: AcceptedDeliverySnapshotData;
}

export interface ConfirmedRentalReschedulingDecisions {
  reviewIdentity?: string;
  policyException?: { type: 'AUTHORIZE'; reason?: string };
  acceptReusedTransportReservationMinutes?: true;
}

type ReviewRequirement = PreviewConfirmedRentalPeriodResponseDto['requirements'][number];

/** One read-only evaluation/composition path for preview and authoritative rescheduling. */
@Injectable()
export class ConfirmedRentalReschedulingPreparationService {
  constructor(private readonly delivery: DeliveryQuoteService) {}

  async prepare(input: {
    rental: Rental;
    expectedVersion: number;
    periodStart: Date;
    periodEnd: Date;
  }): Promise<Result<ConfirmedRentalReschedulingPreparation, RescheduleConfirmedRentalPeriodError>> {
    const { rental } = input;
    if (rental.version !== input.expectedVersion) {
      return err(failure('rental_commitment.rental_version_conflict', 'The rental was modified.'));
    }
    let period: RentalPeriod;
    try {
      period = new RentalPeriod(input.periodStart, input.periodEnd);
    } catch (error) {
      if (!(error instanceof DomainException)) throw error;
      return err(failure('rental_commitment.invalid_rental_period', error.message, error));
    }
    const eligibility = rental.validateConfirmedPeriodReschedule({ period, operationTime: new Date() });
    if (eligibility.isErr()) return err(mapRescheduleConfirmedRentalPeriodError(eligibility.error));

    const pricing = rental.confirmedPriceSnapshot?.snapshot;
    if (!pricing) throw new Error('Confirmed rental has no accepted equipment pricing.');
    const buffer = rental.requireAcceptedAssetBuffer();
    const reservationPeriod = (
      minutes: number,
    ): Result<{ start: string; end: string }, RescheduleConfirmedRentalPeriodError> => {
      try {
        const block = deriveBufferedAssetBlockPeriod({
          participationPeriod: period,
          beforeBufferMinutes: buffer.beforeBufferMinutes + minutes,
          afterBufferMinutes: buffer.afterBufferMinutes + minutes,
        });
        return ok({ start: block.start.toISOString(), end: block.end.toISOString() });
      } catch (error) {
        if (!(error instanceof DomainException)) throw error;
        return err(
          failure(
            'rental_commitment.invalid_rescheduling_delivery_input',
            'Reservation minutes produce an invalid reservation period.',
            error,
          ),
        );
      }
    };
    const preview: PreviewConfirmedRentalPeriodResponseDto = {
      rentalId: rental.id,
      expectedVersion: rental.version,
      period: { start: period.start.toISOString(), end: period.end.toISOString() },
      reviewIdentity: null,
      currency: pricing.final.currency,
      proposedAcceptedCustomerTotal: new Decimal(pricing.total).toString(),
      reservationPeriod: null,
      delivery: null,
      requirements: [],
    };
    if (rental.fulfillmentMethod === 'PICKUP') {
      const reservation = reservationPeriod(0);
      if (reservation.isErr()) return err(reservation.error);
      preview.reservationPeriod = reservation.value;
      return ok({ period, preview });
    }

    const existing = rental.acceptedDelivery;
    const details = rental.deliveryDetails;
    if (
      !existing ||
      existing.snapshot.arrangement !== 'ROUTED' ||
      !details ||
      details.formattedAddress === undefined ||
      details.latitude === undefined ||
      details.longitude === undefined
    ) {
      return err(
        failure('rental_commitment.invalid_rescheduling_delivery_input', 'Accepted delivery details are required.'),
      );
    }
    let evaluation: DeliveryEvaluationOutcome;
    try {
      evaluation = await this.delivery.evaluate({
        tenantId: rental.tenantId,
        branchId: rental.branchId,
        customerLocation: {
          resolvedLocation: {
            formattedAddress: details.formattedAddress,
            latitude: details.latitude,
            longitude: details.longitude,
            providerPlaceId: details.providerPlaceId,
          },
        },
        rentalStart: period.start,
        rentalEnd: period.end,
      });
    } catch (error) {
      if (!(error instanceof DeliveryProviderError)) throw error;
      return err(
        failure(
          'rental_commitment.delivery_evaluation_unavailable',
          'Delivery routing is temporarily unavailable. Retry the preview before saving.',
          error,
        ),
      );
    }
    if (!evaluation.transportValid) {
      return err(
        failure(
          'rental_commitment.delivery_technical_failure',
          `Transportation evaluation failed: ${evaluation.reason}.`,
          undefined,
          { deliveryReason: evaluation.reason },
        ),
      );
    }

    const previous = existing.snapshot;
    const minutes = evaluation.transportReservationMinutes ?? previous.transportReservationMinutes;
    if (minutes !== undefined && (!Number.isSafeInteger(minutes) || minutes < 0)) {
      return err(
        failure(
          'rental_commitment.invalid_rescheduling_delivery_input',
          'Transportation minutes must be a non-negative safe integer.',
        ),
      );
    }
    const restrictions = [...new Set(evaluation.restrictions)].sort();
    const agreement = previous.staffAgreement;
    const quote = evaluation.quote;
    const quoteTerms = quote ? acceptedDeliverySnapshotFromQuote(quote) : undefined;
    const reference = quote
      ? {
          currency: quote.currency,
          distanceMeters: quote.distanceMeters,
          delivery: calculatedLeg(quote.delivery),
          collection: calculatedLeg(quote.collection),
          total: money(quote.deliveryTotal),
        }
      : null;
    const effective =
      agreement?.amount ?? (quote?.currency === pricing.final.currency ? quote.deliveryTotal : undefined);
    const requirements: ReviewRequirement[] = [];
    const reusingMinutes = evaluation.transportReservationMinutes === undefined && minutes !== undefined;
    if (restrictions.length) requirements.push('POLICY_EXCEPTION_AUTHORIZATION_REQUIRED');
    if (reusingMinutes) requirements.push('REUSED_TRANSPORT_RESERVATION_MINUTES_ACCEPTANCE_REQUIRED');
    if (minutes === undefined) requirements.push('TRANSPORT_RESERVATION_MINUTES_REQUIRED');
    if (!quoteTerms && !agreement) requirements.push('STAFF_AGREEMENT_REQUIRED');
    if (!quoteTerms && !restrictions.length) requirements.push('AUTOMATIC_QUOTE_OR_POLICY_RESTRICTION_REQUIRED');
    if (
      previous.currency !== pricing.final.currency ||
      (evaluation.currency !== undefined && evaluation.currency !== pricing.final.currency) ||
      (quoteTerms !== undefined && quoteTerms.currency !== pricing.final.currency)
    )
      requirements.push('CURRENCY_MISMATCH');

    preview.proposedAcceptedCustomerTotal =
      effective === undefined ? null : new Decimal(pricing.total).plus(effective).toString();
    if (minutes !== undefined) {
      const reservation = reservationPeriod(minutes);
      if (reservation.isErr()) return err(reservation.error);
      preview.reservationPeriod = reservation.value;
    }
    preview.requirements = requirements;
    preview.delivery = {
      currentEffectiveCharge: money(existing.effectiveDeliveryCharge),
      currentPricingSource: agreement ? 'STAFF_AGREEMENT' : 'AUTOMATIC',
      proposedCalculatedReference: reference,
      proposedEffectiveCharge: effective === undefined ? null : money(effective),
      staffAgreementPreserved: agreement !== undefined,
      effectiveChargeDifference:
        effective === undefined ? null : new Decimal(effective).minus(existing.effectiveDeliveryCharge).toString(),
      policyRestrictions: restrictions,
      requiresExceptionAuthorization: restrictions.length > 0,
      transportReservationMinutes: minutes ?? null,
      requiresExplicitMinuteAcceptance: reusingMinutes,
    };

    const destination = evaluation.resolvedCustomerLocation;
    const scope = {
      branchId: evaluation.branchId,
      resolvedDestination: {
        formattedAddress: destination.formattedAddress,
        latitude: destination.latitude,
        longitude: destination.longitude,
        providerPlaceId: destination.providerPlaceId,
      },
      distanceMeters: evaluation.distanceMeters,
      deliveryScheduledAt: evaluation.deliveryScheduledAt.toISOString(),
      collectionScheduledAt: evaluation.collectionScheduledAt.toISOString(),
      evaluatedCurrency: evaluation.currency ?? null,
    };
    // Explicitly select material facts. Authorization/agreement attribution and calculatedAt are not review inputs.
    preview.reviewIdentity = `v1:${createHash('sha256')
      .update(
        JSON.stringify({
          tenantId: rental.tenantId,
          preview,
          scope,
          acceptedEquipmentTotal: money(pricing.total),
          acceptedAssetBuffer: {
            beforeBufferMinutes: buffer.beforeBufferMinutes,
            afterBufferMinutes: buffer.afterBufferMinutes,
          },
        }),
      )
      .digest('hex')}`;
    const deliveryTerms: AcceptedDeliverySnapshotData | undefined =
      minutes === undefined
        ? undefined
        : {
            ...(quoteTerms ?? {
              arrangement: 'ROUTED',
              schema: ACCEPTED_DELIVERY_SNAPSHOT_SCHEMA,
              version: ACCEPTED_DELIVERY_SNAPSHOT_VERSION,
              distanceMeters: evaluation.distanceMeters,
              delivery: { scheduledAt: scope.deliveryScheduledAt },
              collection: { scheduledAt: scope.collectionScheduledAt },
              currency: previous.currency,
              transportReservationMinutes: minutes,
            }),
            branchId: scope.branchId,
            resolvedDestination: scope.resolvedDestination,
            transportReservationMinutes: minutes,
            staffAgreement: agreement,
            // Never carry a previous exception into the newly evaluated scope.
            policyException: undefined,
          };
    return ok({ period, preview, deliveryTerms });
  }

  accept(input: {
    prepared: ConfirmedRentalReschedulingPreparation;
    decisions: ConfirmedRentalReschedulingDecisions;
    tenantUserId: string;
    operationTime: Date;
  }): Result<AcceptedDeliverySnapshot | undefined, RescheduleConfirmedRentalPeriodError> {
    const { prepared, decisions } = input;
    const delivery = prepared.preview.delivery;
    if (!delivery) return ok(undefined);
    if (!decisions.reviewIdentity || decisions.reviewIdentity !== prepared.preview.reviewIdentity) {
      return err(
        failure(
          'rental_commitment.delivery_review_required',
          'Preview the current delivery consequences before rescheduling.',
        ),
      );
    }
    if (delivery.requiresExceptionAuthorization && !decisions.policyException) {
      return err(
        failure(
          'rental_commitment.delivery_exception_authorization_required',
          'Explicitly authorize the current delivery restrictions.',
        ),
      );
    }
    if (
      decisions.policyException &&
      (decisions.policyException.type !== 'AUTHORIZE' ||
        (decisions.policyException.reason !== undefined && !decisions.policyException.reason.trim()))
    ) {
      return err(failure('rental_commitment.invalid_rescheduling_delivery_input', 'Invalid exception authorization.'));
    }
    if (delivery.requiresExplicitMinuteAcceptance && decisions.acceptReusedTransportReservationMinutes !== true) {
      return err(
        failure(
          'rental_commitment.invalid_rescheduling_delivery_input',
          'Explicitly accept the reused transportation reservation minutes.',
        ),
      );
    }
    const blockers = prepared.preview.requirements.filter(
      (requirement) =>
        requirement !== 'POLICY_EXCEPTION_AUTHORIZATION_REQUIRED' &&
        requirement !== 'REUSED_TRANSPORT_RESERVATION_MINUTES_ACCEPTANCE_REQUIRED',
    );
    if (blockers.length || !prepared.deliveryTerms) {
      return err(
        failure(
          'rental_commitment.invalid_rescheduling_delivery_input',
          'Resolve the delivery requirements before rescheduling.',
          undefined,
          { requirements: blockers },
        ),
      );
    }
    const snapshot = AcceptedDeliverySnapshot.create({
      ...prepared.deliveryTerms,
      // Irrelevant authorization input is safely ignored when no restrictions apply.
      policyException: delivery.requiresExceptionAuthorization
        ? {
            overriddenRestrictions: delivery.policyRestrictions,
            reason: decisions.policyException?.reason?.trim(),
            authorizedBy: input.tenantUserId,
            authorizedAt: input.operationTime.toISOString(),
          }
        : undefined,
    });
    if (snapshot.isErr()) return err(mapRescheduleConfirmedRentalPeriodError(snapshot.error));
    return ok(snapshot.value);
  }
}

function money(value: string): string {
  return new Decimal(value).toString();
}

function calculatedLeg(leg: DeliveryQuoteLeg) {
  return {
    scheduledAt: leg.scheduledAt.toISOString(),
    serviceLevel: leg.serviceLevel,
    basePrice: money(leg.basePrice),
    surcharge: money(leg.surcharge),
    total: money(leg.total),
  };
}
