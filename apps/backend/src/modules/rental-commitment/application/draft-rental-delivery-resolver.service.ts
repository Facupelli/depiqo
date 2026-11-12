import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { err, ok, Result } from 'neverthrow';

import {
  DeliveryQuoteService,
  ResolvedCustomerLocation,
} from 'src/modules/delivery/public-api/delivery-quote.public-api';

import { RentalInvalidFieldError } from '../domain/errors/rental-commitment.errors';
import { RentalDeliveryDetails } from '../domain/rental.aggregate';
import {
  ACCEPTED_DELIVERY_SNAPSHOT_SCHEMA,
  ACCEPTED_DELIVERY_SNAPSHOT_VERSION,
  AcceptedDeliverySnapshot,
  AcceptedDeliverySnapshotData,
} from '../domain/value-objects/accepted-delivery-snapshot.value-object';
import { RentalPeriod } from '../domain/value-objects/rental-period.value-object';
import { acceptedDeliverySnapshotFromQuote } from './accepted-delivery-snapshot.adapter';
import type {
  RentalProposalDeliveryDestination,
  RentalProposalResolutionError,
} from './rental-proposal-resolver.service';

export interface DraftRentalDeliveryDecisions {
  pricingAgreement?: { type: 'SET'; amount: string; reason?: string } | { type: 'CLEAR' } | { type: 'KEEP' };
  policyException?: { type: 'AUTHORIZE'; reason?: string };
  transportReservationMinutes?: number;
}

export interface ExistingDraftDelivery {
  branchId: string;
  period: RentalPeriod;
  details: RentalDeliveryDetails;
  snapshot: AcceptedDeliverySnapshotData;
}

export interface DraftRentalDeliveryIntent {
  tenantUserId: string;
  decisions?: DraftRentalDeliveryDecisions;
  existing?: ExistingDraftDelivery;
}

type DraftDeliveryInput = DraftRentalDeliveryIntent & {
  tenantId: string;
  branchId: string;
  period: RentalPeriod;
  destination: RentalProposalDeliveryDestination;
  pricingCurrency: string;
};

type DraftDeliveryTerms = {
  deliveryDetails: RentalDeliveryDetails;
  deliverySnapshot: AcceptedDeliverySnapshotData;
};

/** Draft-only orchestration. Preserved terms are not a promise of confirmability. */
@Injectable()
export class DraftRentalDeliveryResolver {
  constructor(private readonly delivery: DeliveryQuoteService) {}

  async resolve(input: DraftDeliveryInput): Promise<Result<DraftDeliveryTerms, RentalProposalResolutionError>> {
    const { existing, decisions } = input;
    const suppliedMinutes = decisions?.transportReservationMinutes;
    if (suppliedMinutes !== undefined && (!Number.isInteger(suppliedMinutes) || suppliedMinutes < 0)) {
      return err(this.invalid('transportReservationMinutes', 'must be a non-negative integer'));
    }

    const sameInputs =
      existing !== undefined &&
      input.branchId === existing.branchId &&
      input.period.start.getTime() === existing.period.start.getTime() &&
      input.period.end.getTime() === existing.period.end.getTime() &&
      (suppliedMinutes === undefined || suppliedMinutes === existing.snapshot.transportReservationMinutes);
    const knownSameDestination =
      existing !== undefined &&
      'resolvedLocation' in input.destination &&
      sameDestination(input.destination.resolvedLocation, existing.details);

    // Equipment/customer/insurance/pricing edits and agreement-only edits must not re-route or re-quote.
    if (sameInputs && knownSameDestination && !decisions?.policyException) {
      return this.finish(input, existing.details, existing.snapshot, false);
    }

    const evaluation = await this.delivery.evaluate({
      tenantId: input.tenantId,
      branchId: input.branchId,
      rentalStart: input.period.start,
      rentalEnd: input.period.end,
      customerLocation:
        'resolvedLocation' in input.destination
          ? { resolvedLocation: input.destination.resolvedLocation }
          : { address: input.destination.address, locationId: input.destination.locationId },
    });
    if (!evaluation.transportValid) {
      return err({
        code: 'rental_commitment.delivery_not_serviceable',
        message: `Delivery is not technically valid: ${evaluation.reason}.`,
        context: { deliveryReason: evaluation.reason },
      });
    }

    // A newly selected address may resolve to the very same destination. Compare server-resolved facts.
    let conditionsChanged =
      !sameInputs || !existing || !sameDestination(evaluation.resolvedCustomerLocation, existing.details);
    if (existing && !conditionsChanged && !decisions?.policyException) {
      return this.finish(input, existing.details, existing.snapshot, false);
    }
    if (conditionsChanged && existing?.snapshot.staffAgreement && !decisions?.pricingAgreement) {
      return err(this.invalid('pricingAgreement', 'changed transportation conditions require SET, CLEAR or KEEP'));
    }

    if (evaluation.restrictions.length && !decisions?.policyException) {
      return err({
        code: 'rental_commitment.delivery_not_serviceable',
        message: 'The evaluated delivery policy restrictions require explicit exception authorization.',
        context: {
          deliveryReason: evaluation.restrictions[0],
          deliveryRestrictions: evaluation.restrictions,
        },
      });
    }
    if (
      evaluation.transportReservationMinutes !== undefined &&
      suppliedMinutes !== undefined &&
      suppliedMinutes !== evaluation.transportReservationMinutes
    ) {
      return err(
        this.invalid('transportReservationMinutes', 'must use the configured transportation reservation minutes'),
      );
    }
    const minutes = evaluation.transportReservationMinutes ?? suppliedMinutes;
    if (minutes === undefined) {
      return err(
        this.invalid(
          'transportReservationMinutes',
          'explicit minutes, including zero, are required without configuration',
        ),
      );
    }

    conditionsChanged ||= existing !== undefined && minutes !== existing.snapshot.transportReservationMinutes;

    const location = evaluation.resolvedCustomerLocation;
    const snapshot: AcceptedDeliverySnapshotData = {
      ...(evaluation.quote
        ? acceptedDeliverySnapshotFromQuote(evaluation.quote)
        : {
            schema: ACCEPTED_DELIVERY_SNAPSHOT_SCHEMA,
            version: ACCEPTED_DELIVERY_SNAPSHOT_VERSION,
            distanceMeters: evaluation.distanceMeters,
            delivery: { scheduledAt: evaluation.deliveryScheduledAt.toISOString() },
            collection: { scheduledAt: evaluation.collectionScheduledAt.toISOString() },
            currency: evaluation.currency ?? input.pricingCurrency,
            transportReservationMinutes: minutes,
          }),
      branchId: input.branchId,
      resolvedDestination: {
        formattedAddress: location.formattedAddress,
        latitude: location.latitude,
        longitude: location.longitude,
        ...(location.providerPlaceId ? { providerPlaceId: location.providerPlaceId } : {}),
      },
      transportReservationMinutes: minutes,
      staffAgreement: existing?.snapshot.staffAgreement,
      // An old exception never authorizes a newly evaluated arrangement.
      policyException: evaluation.restrictions.length
        ? {
            overriddenRestrictions: evaluation.restrictions,
            reason: decisions?.policyException?.reason,
            authorizedBy: input.tenantUserId,
            authorizedAt: new Date().toISOString(),
          }
        : undefined,
    };

    return this.finish(
      input,
      {
        address: input.destination.address,
        formattedAddress: location.formattedAddress,
        latitude: location.latitude,
        longitude: location.longitude,
        ...(location.providerPlaceId ? { providerPlaceId: location.providerPlaceId } : {}),
      },
      snapshot,
      conditionsChanged,
    );
  }

  private finish(
    input: DraftDeliveryInput,
    details: RentalDeliveryDetails,
    original: AcceptedDeliverySnapshotData,
    conditionsChanged: boolean,
  ): Result<DraftDeliveryTerms, RentalProposalResolutionError> {
    if (original.currency !== input.pricingCurrency) {
      return err(this.invalid('currency', 'delivery and rental pricing must use the same currency'));
    }
    const decision = input.decisions?.pricingAgreement;
    if (decision?.type === 'KEEP' && !input.existing?.snapshot.staffAgreement) {
      return err(this.invalid('pricingAgreement', 'KEEP requires an existing staff agreement'));
    }
    if (conditionsChanged && input.existing?.snapshot.staffAgreement && !decision) {
      return err(this.invalid('pricingAgreement', 'changed transportation conditions require SET, CLEAR or KEEP'));
    }

    if (
      input.existing?.snapshot.staffAgreement &&
      input.existing.snapshot.currency !== original.currency &&
      decision?.type !== 'SET' &&
      decision?.type !== 'CLEAR'
    ) {
      return err(this.invalid('pricingAgreement', 'currency changes require SET or CLEAR for an existing agreement'));
    }

    let staffAgreement = original.staffAgreement;
    if (decision?.type === 'SET') {
      let amount: Decimal;
      try {
        amount = new Decimal(decision.amount);
      } catch {
        return err(
          this.invalid('pricingAgreement.amount', 'must be a non-negative amount exactly representable in cents'),
        );
      }
      if (!amount.isFinite() || amount.isNegative() || amount.decimalPlaces() > 2) {
        return err(
          this.invalid('pricingAgreement.amount', 'must be a non-negative amount exactly representable in cents'),
        );
      }
      staffAgreement = {
        amount: amount.toFixed(),
        reason: decision.reason,
        agreedBy: input.tenantUserId,
        agreedAt: new Date().toISOString(),
      };
    } else if (decision?.type === 'CLEAR') {
      if (original.deliveryTotal === undefined) {
        return err(this.invalid('pricingAgreement', 'CLEAR requires a valid automatic quote'));
      }
      staffAgreement = undefined;
    }
    if (original.deliveryTotal === undefined && (!staffAgreement || !original.policyException)) {
      return err(
        this.invalid('pricingAgreement', 'quote-less delivery requires both an agreed amount and a policy exception'),
      );
    }

    const validated = AcceptedDeliverySnapshot.create({ ...original, staffAgreement });
    if (validated.isErr()) {
      return err({
        code: 'rental_commitment.invalid_rental_field',
        message: validated.error.message,
        cause: validated.error,
      });
    }
    return ok({ deliveryDetails: details, deliverySnapshot: validated.value.snapshot });
  }

  private invalid(field: string, message: string): RentalProposalResolutionError {
    const cause = new RentalInvalidFieldError(`deliveryDecisions.${field}`, message);
    return {
      code: 'rental_commitment.invalid_rental_field',
      message: cause.message,
      cause,
      context: { field: cause.field },
    };
  }
}

function sameDestination(a: ResolvedCustomerLocation, b: RentalDeliveryDetails): boolean {
  return (
    a.latitude === b.latitude &&
    a.longitude === b.longitude &&
    a.formattedAddress === b.formattedAddress &&
    a.providerPlaceId === b.providerPlaceId
  );
}
