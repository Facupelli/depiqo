import { Injectable } from '@nestjs/common';
import type { PreviewDraftRentalCostDeliveryDto } from '@repo/api-contracts';
import Decimal from 'decimal.js';
import { err, ok, Result } from 'neverthrow';

import {
  DeliveryEvaluationOutcome,
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

type DeliveryInspectionInput = Omit<DraftDeliveryInput, 'tenantUserId' | 'pricingCurrency'>;
type DeliveryInspection =
  | { preserved: true; existing: ExistingDraftDelivery }
  | { preserved: false; evaluation: DeliveryEvaluationOutcome; conditionsChanged: boolean };

type AgreementIssue = Extract<
  PreviewDraftRentalCostDeliveryDto['requirements'][number],
  | 'AGREEMENT_DECISION_REQUIRED'
  | 'KEEP_REQUIRES_EXISTING_AGREEMENT'
  | 'CURRENCY_DECISION_REQUIRED'
  | 'AUTOMATIC_QUOTE_REQUIRED'
  | 'AGREEMENT_REQUIRED'
  | 'INVALID_AGREEMENT_AMOUNT'
>;

type DraftDeliveryTerms = {
  deliveryDetails: RentalDeliveryDetails;
  deliverySnapshot: AcceptedDeliverySnapshotData;
};

/** Draft-only orchestration. Preserved terms are not a promise of confirmability. */
@Injectable()
export class DraftRentalDeliveryResolver {
  constructor(private readonly delivery: DeliveryQuoteService) {}

  /** Shared inspection never attributes an agreement or authorizes an exception. */
  private async inspect(input: DeliveryInspectionInput): Promise<DeliveryInspection> {
    const { existing, decisions } = input;
    const suppliedMinutes = decisions?.transportReservationMinutes;
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
      return { preserved: true, existing };
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
    if (!evaluation.transportValid) return { preserved: false, evaluation, conditionsChanged: true };

    // A newly selected address may resolve to the very same destination. Compare server-resolved facts.
    const conditionsChanged =
      !sameInputs || !existing || !sameDestination(evaluation.resolvedCustomerLocation, existing.details);
    if (existing && !conditionsChanged && !decisions?.policyException) {
      return { preserved: true, existing };
    }
    return { preserved: false, evaluation, conditionsChanged };
  }

  async resolve(input: DraftDeliveryInput): Promise<Result<DraftDeliveryTerms, RentalProposalResolutionError>> {
    const { existing, decisions } = input;
    const suppliedMinutes = decisions?.transportReservationMinutes;
    if (suppliedMinutes !== undefined && (!Number.isInteger(suppliedMinutes) || suppliedMinutes < 0)) {
      return err(this.invalid('transportReservationMinutes', 'must be a non-negative integer'));
    }
    const inspection = await this.inspect(input);
    if (inspection.preserved) {
      return this.finish(input, inspection.existing.details, inspection.existing.snapshot, false);
    }
    const { evaluation } = inspection;
    let { conditionsChanged } = inspection;
    if (!evaluation.transportValid) {
      return err({
        code: 'rental_commitment.delivery_not_serviceable',
        message: `Delivery is not technically valid: ${evaluation.reason}.`,
        context: { deliveryReason: evaluation.reason },
      });
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
    const agreement = this.selectAgreement(input, original, conditionsChanged);
    if (agreement.isErr()) {
      const field = agreement.error === 'INVALID_AGREEMENT_AMOUNT' ? 'pricingAgreement.amount' : 'pricingAgreement';
      return err(this.invalid(field, agreementMessages[agreement.error]));
    }
    let staffAgreement = agreement.value ? original.staffAgreement : undefined;
    if (input.decisions?.pricingAgreement?.type === 'SET' && agreement.value) {
      staffAgreement = { ...agreement.value, agreedBy: input.tenantUserId, agreedAt: new Date().toISOString() };
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

  /** Pricing decisions only. No authorization or attribution is established here. */
  private selectAgreement(
    input: Pick<DraftDeliveryInput, 'existing' | 'decisions'>,
    terms: { currency: string; deliveryTotal?: string; staffAgreement?: { amount: string; reason?: string } },
    conditionsChanged: boolean,
  ): Result<{ amount: string; reason?: string } | undefined, AgreementIssue> {
    const decision = input.decisions?.pricingAgreement;
    const existing = input.existing?.snapshot;
    if (decision?.type === 'KEEP' && !existing?.staffAgreement) return err('KEEP_REQUIRES_EXISTING_AGREEMENT');
    if (conditionsChanged && existing?.staffAgreement && !decision) return err('AGREEMENT_DECISION_REQUIRED');
    if (
      existing?.staffAgreement &&
      existing.currency !== terms.currency &&
      decision?.type !== 'SET' &&
      decision?.type !== 'CLEAR'
    ) {
      return err('CURRENCY_DECISION_REQUIRED');
    }
    let agreement = terms.staffAgreement;
    if (decision?.type === 'SET') {
      try {
        const amount = new Decimal(decision.amount);
        if (!amount.isFinite() || amount.isNegative() || amount.decimalPlaces() > 2)
          return err('INVALID_AGREEMENT_AMOUNT');
        agreement = { amount: amount.toFixed(), reason: decision.reason };
      } catch {
        return err('INVALID_AGREEMENT_AMOUNT');
      }
    } else if (decision?.type === 'CLEAR') {
      if (terms.deliveryTotal === undefined) return err('AUTOMATIC_QUOTE_REQUIRED');
      agreement = undefined;
    }
    if (terms.deliveryTotal === undefined && !agreement) return err('AGREEMENT_REQUIRED');
    return ok(agreement);
  }

  async preview(input: Omit<DraftDeliveryInput, 'tenantUserId'>): Promise<PreviewDraftRentalCostDeliveryDto> {
    const inspection = await this.inspect(input);
    const result: PreviewDraftRentalCostDeliveryDto = {
      source: inspection.preserved ? 'STORED' : 'EVALUATED',
      technicalFailure: null,
      restrictions: [],
      policyExceptionRequired: false,
      requirements: [],
      resolvedDestination: null,
      distanceMeters: null,
      currency: null,
      delivery: null,
      collection: null,
      transportReservationMinutes: null,
      calculatedCharge: null,
      staffAgreedAmount: null,
      effectiveCharge: null,
    };
    let terms: Pick<AcceptedDeliverySnapshotData, 'currency' | 'deliveryTotal' | 'staffAgreement'>;
    let conditionsChanged = false;
    if (inspection.preserved) {
      const { snapshot, details } = inspection.existing;
      terms = snapshot;
      result.resolvedDestination = {
        formattedAddress: details.formattedAddress,
        latitude: details.latitude,
        longitude: details.longitude,
        providerPlaceId: details.providerPlaceId,
      };
      result.distanceMeters = snapshot.distanceMeters;
      result.delivery = snapshot.delivery;
      result.collection = snapshot.collection;
      result.transportReservationMinutes = snapshot.transportReservationMinutes;
      result.restrictions = snapshot.policyException?.overriddenRestrictions ?? [];
    } else if (!inspection.evaluation.transportValid) {
      result.technicalFailure = inspection.evaluation.reason;
      conditionsChanged = inspection.conditionsChanged;
      // Commercial agreement validation does not establish operational readiness.
      terms = {
        currency: input.pricingCurrency,
        staffAgreement: input.existing?.snapshot.staffAgreement,
      };
    } else {
      const { evaluation } = inspection;
      const location = evaluation.resolvedCustomerLocation;
      result.resolvedDestination = {
        formattedAddress: location.formattedAddress,
        latitude: location.latitude,
        longitude: location.longitude,
        providerPlaceId: location.providerPlaceId,
      };
      result.distanceMeters = evaluation.distanceMeters;
      result.restrictions = evaluation.restrictions;
      result.policyExceptionRequired = evaluation.restrictions.length > 0;
      const suppliedMinutes = input.decisions?.transportReservationMinutes;
      const minutes = evaluation.transportReservationMinutes ?? suppliedMinutes;
      result.transportReservationMinutes = minutes ?? null;
      if (minutes === undefined) result.requirements.push('TRANSPORT_RESERVATION_MINUTES_REQUIRED');
      if (
        evaluation.transportReservationMinutes !== undefined &&
        suppliedMinutes !== undefined &&
        suppliedMinutes !== evaluation.transportReservationMinutes
      ) {
        result.requirements.push('TRANSPORT_RESERVATION_MINUTES_CONFLICT');
      }
      conditionsChanged =
        inspection.conditionsChanged ||
        (input.existing !== undefined && minutes !== input.existing.snapshot.transportReservationMinutes);
      const quote = evaluation.quote;
      terms = {
        currency: evaluation.currency ?? input.pricingCurrency,
        deliveryTotal: quote?.deliveryTotal,
        staffAgreement: input.existing?.snapshot.staffAgreement,
      };
      result.delivery = quote
        ? { ...quote.delivery, scheduledAt: quote.delivery.scheduledAt.toISOString() }
        : { scheduledAt: evaluation.deliveryScheduledAt.toISOString() };
      result.collection = quote
        ? { ...quote.collection, scheduledAt: quote.collection.scheduledAt.toISOString() }
        : { scheduledAt: evaluation.collectionScheduledAt.toISOString() };
    }
    result.currency = terms.currency;
    result.calculatedCharge = terms.deliveryTotal ?? null;
    const agreement = this.selectAgreement(input, terms, conditionsChanged);
    if (agreement.isErr()) {
      result.requirements.push(agreement.error);
      // Show the stored amount as context, but do not treat it as the proposed charge.
      result.staffAgreedAmount = input.existing?.snapshot.staffAgreement?.amount ?? null;
    } else {
      result.staffAgreedAmount = agreement.value?.amount ?? null;
      if (!result.technicalFailure) {
        result.effectiveCharge = agreement.value?.amount ?? terms.deliveryTotal ?? null;
      }
    }
    if (terms.currency !== input.pricingCurrency) {
      result.requirements.push('CURRENCY_MISMATCH');
      result.effectiveCharge = null;
    }
    return result;
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

const agreementMessages: Record<AgreementIssue, string> = {
  AGREEMENT_DECISION_REQUIRED: 'changed transportation conditions require SET, CLEAR or KEEP',
  KEEP_REQUIRES_EXISTING_AGREEMENT: 'KEEP requires an existing staff agreement',
  CURRENCY_DECISION_REQUIRED: 'currency changes require SET or CLEAR for an existing agreement',
  AUTOMATIC_QUOTE_REQUIRED: 'CLEAR requires a valid automatic quote',
  AGREEMENT_REQUIRED: 'quote-less delivery requires both an agreed amount and a policy exception',
  INVALID_AGREEMENT_AMOUNT: 'must be a non-negative amount exactly representable in cents',
};

function sameDestination(a: ResolvedCustomerLocation, b: RentalDeliveryDetails): boolean {
  return (
    a.latitude === b.latitude &&
    a.longitude === b.longitude &&
    a.formattedAddress === b.formattedAddress &&
    a.providerPlaceId === b.providerPlaceId
  );
}
