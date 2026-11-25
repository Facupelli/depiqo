import { Injectable } from '@nestjs/common';
import { TenantPermission, type PreviewDraftRentalCostDeliveryDto } from '@repo/api-contracts';
import Decimal from 'decimal.js';
import { err, ok, Result } from 'neverthrow';

import {
  DeliveryEvaluationOutcome,
  DeliveryQuoteService,
  ResolvedCustomerLocation,
} from 'src/modules/delivery/public-api/delivery-quote.public-api';
import { TenantAuthorization } from 'src/modules/tenant-management/authorization/tenant-authorization.public-api';

import { RentalInvalidFieldError } from '../domain/errors/rental-commitment.errors';
import { RentalDeliveryDetails } from '../domain/rental.aggregate';
import {
  ACCEPTED_DELIVERY_SNAPSHOT_SCHEMA,
  ACCEPTED_DELIVERY_SNAPSHOT_VERSION,
  AcceptedDeliverySnapshot,
  AcceptedDeliverySnapshotData,
  RoutedDeliverySnapshotData,
} from '../domain/value-objects/accepted-delivery-snapshot.value-object';
import { RentalPeriod } from '../domain/value-objects/rental-period.value-object';
import { acceptedDeliverySnapshotFromQuote } from './accepted-delivery-snapshot.adapter';
import type {
  RentalProposalDeliveryDestination,
  RentalProposalResolutionError,
  RoutedProposalDeliveryDestination,
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
  keepCurrent?: boolean;
}

type DraftDeliveryInput = DraftRentalDeliveryIntent & {
  tenantId: string;
  branchId: string;
  period: RentalPeriod;
  destination: RentalProposalDeliveryDestination;
  pricingCurrency: string;
};

type RoutedDraftDeliveryInput = DraftDeliveryInput & { destination: RoutedProposalDeliveryDestination };
type DeliveryInspectionInput = Omit<RoutedDraftDeliveryInput, 'tenantUserId' | 'pricingCurrency'>;

export interface DraftDeliveryAuthorizationError {
  code: 'rental_commitment.delivery_management_permission_denied';
  message: string;
  cause?: unknown;
}

type ProposedStaffTerms = {
  details: RentalDeliveryDetails;
  currency: string;
  agreement: { amount: string; reason?: string };
  persistedAgreement?: AcceptedDeliverySnapshotData['staffAgreement'];
  minutes: number;
  changed: boolean;
};
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

@Injectable()
export class DraftRentalDeliveryResolver {
  constructor(
    private readonly delivery: DeliveryQuoteService,
    private readonly authorization: TenantAuthorization,
  ) {}

  async authorizeChange(
    input: Omit<DraftDeliveryInput, 'pricingCurrency'>,
  ): Promise<Result<void, DraftDeliveryAuthorizationError>> {
    const decision = input.decisions?.pricingAgreement;
    const staffChange =
      input.destination.arrangement === 'STAFF_ARRANGED' && (!input.keepCurrent || this.staffConditionsChanged(input));
    if (!staffChange && decision?.type !== 'SET' && decision?.type !== 'CLEAR' && !input.decisions?.policyException) {
      return ok(undefined);
    }
    const allowed = await this.authorization.hasPermission(
      { tenantId: input.tenantId, tenantUserId: input.tenantUserId },
      TenantPermission.RentalsDeliveryManage,
    );
    if (allowed.isErr() && allowed.error.code === 'TenantAuthorizationStateInvalid') throw allowed.error;
    if (allowed.isErr() || !allowed.value) {
      return err({
        code: 'rental_commitment.delivery_management_permission_denied',
        message: 'Delivery-management permission is required to establish or change delivery terms.',
        ...(allowed.isErr() ? { cause: allowed.error } : {}),
      });
    }
    return ok(undefined);
  }

  private staffConditionsChanged(input: Omit<DraftDeliveryInput, 'tenantUserId' | 'pricingCurrency'>): boolean {
    const existing = input.existing;
    return (
      existing?.snapshot.arrangement !== 'STAFF_ARRANGED' ||
      existing.branchId !== input.branchId ||
      existing.period.start.getTime() !== input.period.start.getTime() ||
      existing.period.end.getTime() !== input.period.end.getTime() ||
      (input.decisions?.transportReservationMinutes !== undefined &&
        input.decisions.transportReservationMinutes !== existing.snapshot.transportReservationMinutes)
    );
  }

  private proposeStaff(
    input: Omit<DraftDeliveryInput, 'tenantUserId'>,
  ): Result<ProposedStaffTerms, RentalProposalResolutionError> {
    const destination = input.destination;
    if (destination.arrangement !== 'STAFF_ARRANGED') throw new Error('Expected staff-arranged destination.');
    const existing = input.existing?.snapshot.arrangement === 'STAFF_ARRANGED' ? input.existing : undefined;
    const decision = input.decisions?.pricingAgreement;
    if (input.decisions?.policyException)
      return err(this.invalid('policyException', 'staff delivery has no policy exceptions'));
    if (!existing?.snapshot.staffAgreement && decision?.type !== 'SET') {
      return err(this.invalid('pricingAgreement', 'new staff-arranged arrangements require SET'));
    }
    const changed = !input.keepCurrent || this.staffConditionsChanged(input);
    if (changed && decision?.type !== 'SET' && decision?.type !== 'KEEP') {
      return err(this.invalid('pricingAgreement', 'changed staff-arranged terms require SET or KEEP'));
    }
    if (decision?.type === 'CLEAR') return err(this.invalid('pricingAgreement', 'staff agreement cannot be cleared'));
    const minutes =
      input.decisions?.transportReservationMinutes ??
      (existing?.snapshot.staffAgreement ? existing.snapshot.transportReservationMinutes : undefined);
    if (minutes === undefined || !Number.isInteger(minutes) || minutes < 0) {
      return err(this.invalid('transportReservationMinutes', 'explicit non-negative integer minutes are required'));
    }
    const details =
      input.keepCurrent && existing ? existing.details : { address: destination.address, ...destination.geocoding };
    const { latitude, longitude, formattedAddress, providerPlaceId } = details;
    if (!details.address.trim() || details.address !== details.address.trim()) {
      return err(this.invalid('address', 'must be a non-empty trimmed address'));
    }
    if (
      (latitude === undefined) !== (longitude === undefined) ||
      (latitude !== undefined && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) ||
      (longitude !== undefined && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)) ||
      (formattedAddress !== undefined && (!formattedAddress.trim() || formattedAddress !== formattedAddress.trim())) ||
      (providerPlaceId !== undefined && (!providerPlaceId.trim() || providerPlaceId !== providerPlaceId.trim()))
    )
      return err(this.invalid('geocoding', 'must contain valid, complete coordinates and non-empty metadata'));
    if (existing && existing.snapshot.currency !== input.pricingCurrency && decision?.type !== 'SET') {
      return err(this.invalid('currency', 'currency changes require SET for staff-arranged delivery'));
    }
    const selected = this.selectAgreement(
      { decisions: input.decisions, existing },
      { currency: input.pricingCurrency, staffAgreement: existing?.snapshot.staffAgreement },
      changed,
    );
    if (selected.isErr()) return err(this.invalid('pricingAgreement', agreementMessages[selected.error]));
    if (!selected.value) return err(this.invalid('pricingAgreement', 'staff agreement is required'));
    return ok({
      details,
      currency: input.pricingCurrency,
      agreement: selected.value,
      persistedAgreement: decision?.type === 'SET' ? undefined : existing?.snapshot.staffAgreement,
      minutes,
      changed: changed || decision?.type === 'SET',
    });
  }

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

    const conditionsChanged =
      !sameInputs || !existing || !sameDestination(evaluation.resolvedCustomerLocation, existing.details);
    if (existing && !conditionsChanged && !decisions?.policyException) {
      return { preserved: true, existing };
    }
    return { preserved: false, evaluation, conditionsChanged };
  }

  async resolve(input: DraftDeliveryInput): Promise<Result<DraftDeliveryTerms, RentalProposalResolutionError>> {
    if (input.destination.arrangement === 'STAFF_ARRANGED') {
      const proposal = this.proposeStaff(input);
      if (proposal.isErr()) return err(proposal.error);
      const terms = proposal.value;
      const staffAgreement =
        input.decisions?.pricingAgreement?.type === 'SET'
          ? { ...terms.agreement, agreedBy: input.tenantUserId, agreedAt: new Date().toISOString() }
          : terms.persistedAgreement;
      const validated = AcceptedDeliverySnapshot.create({
        schema: ACCEPTED_DELIVERY_SNAPSHOT_SCHEMA,
        version: ACCEPTED_DELIVERY_SNAPSHOT_VERSION,
        arrangement: 'STAFF_ARRANGED',
        delivery: { scheduledAt: input.period.start.toISOString() },
        collection: { scheduledAt: input.period.end.toISOString() },
        currency: terms.currency,
        staffAgreement,
        transportReservationMinutes: terms.minutes,
      });
      if (validated.isErr()) return err(this.invalid('snapshot', validated.error.message));
      return ok({ deliveryDetails: terms.details, deliverySnapshot: validated.value.snapshot });
    }
    return this.resolveRouted({
      ...input,
      destination: input.destination,
      existing: input.existing?.snapshot.arrangement === 'ROUTED' ? input.existing : undefined,
    });
  }

  private async resolveRouted(
    input: RoutedDraftDeliveryInput,
  ): Promise<Result<DraftDeliveryTerms, RentalProposalResolutionError>> {
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
            arrangement: 'ROUTED',
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
    if (original.arrangement !== 'ROUTED') {
      throw new Error('Expected routed delivery terms.');
    }
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

  async preview(
    input: Omit<DraftDeliveryInput, 'tenantUserId'>,
  ): Promise<Result<PreviewDraftRentalCostDeliveryDto, RentalProposalResolutionError>> {
    if (input.destination.arrangement === 'STAFF_ARRANGED') {
      // A preserved agreement is denominated in its stored currency, even if equipment pricing changed.
      const storedCurrency =
        input.existing?.snapshot.arrangement === 'STAFF_ARRANGED' && input.decisions?.pricingAgreement?.type !== 'SET'
          ? input.existing.snapshot.currency
          : undefined;
      const proposal = this.proposeStaff({ ...input, pricingCurrency: storedCurrency ?? input.pricingCurrency });
      if (proposal.isErr()) return err(proposal.error);
      const terms = proposal.value;
      const details = terms.details;
      const currencyMismatch = terms.currency !== input.pricingCurrency;
      return ok({
        arrangement: 'STAFF_ARRANGED',
        source: terms.changed ? 'PROPOSED' : 'STORED',
        technicalFailure: null,
        restrictions: [],
        policyExceptionRequired: false,
        requirements: currencyMismatch ? ['CURRENCY_MISMATCH'] : [],
        deliveryDetails: details,
        resolvedDestination:
          details.formattedAddress !== undefined && details.latitude !== undefined && details.longitude !== undefined
            ? {
                formattedAddress: details.formattedAddress,
                latitude: details.latitude,
                longitude: details.longitude,
                providerPlaceId: details.providerPlaceId,
              }
            : null,
        distanceMeters: null,
        currency: terms.currency,
        delivery: { scheduledAt: input.period.start.toISOString() },
        collection: { scheduledAt: input.period.end.toISOString() },
        transportReservationMinutes: terms.minutes,
        calculatedCharge: null,
        // SET is only a proposal. KEEP may expose the already persisted agreement as context.
        staffAgreement: terms.persistedAgreement,
        staffAgreedAmount: terms.agreement.amount,
        effectiveCharge: currencyMismatch ? null : terms.agreement.amount,
      });
    }
    return ok(
      await this.previewRouted({
        ...input,
        destination: input.destination,
        existing: input.existing?.snapshot.arrangement === 'ROUTED' ? input.existing : undefined,
      }),
    );
  }

  private async previewRouted(
    input: Omit<RoutedDraftDeliveryInput, 'tenantUserId'>,
  ): Promise<PreviewDraftRentalCostDeliveryDto> {
    const inspection = await this.inspect(input);
    const result: Extract<PreviewDraftRentalCostDeliveryDto, { arrangement: 'ROUTED' }> = {
      arrangement: 'ROUTED',
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
    let terms: Pick<RoutedDeliverySnapshotData, 'currency' | 'deliveryTotal' | 'staffAgreement'>;
    let conditionsChanged = false;
    if (inspection.preserved) {
      const { snapshot, details } = inspection.existing;
      if (snapshot.arrangement !== 'ROUTED') {
        throw new Error('Expected routed delivery terms.');
      }
      terms = snapshot;
      result.resolvedDestination =
        details.formattedAddress !== undefined && details.latitude !== undefined && details.longitude !== undefined
          ? {
              formattedAddress: details.formattedAddress,
              latitude: details.latitude,
              longitude: details.longitude,
              providerPlaceId: details.providerPlaceId,
            }
          : null;
      result.distanceMeters = snapshot.distanceMeters ?? null;
      result.delivery = snapshot.delivery;
      result.collection = snapshot.collection;
      result.transportReservationMinutes = snapshot.transportReservationMinutes;
      result.restrictions = snapshot.policyException?.overriddenRestrictions ?? [];
    } else if (!inspection.evaluation.transportValid) {
      result.technicalFailure = inspection.evaluation.reason;
      conditionsChanged = inspection.conditionsChanged;
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
      if (agreement.value && input.decisions?.pricingAgreement?.type !== 'SET') {
        result.staffAgreement = input.existing?.snapshot.staffAgreement;
      }
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

export function existingDraftDeliveryDestination(
  existing: ExistingDraftDelivery,
): RentalProposalDeliveryDestination | undefined {
  const details = existing.details;
  if (existing.snapshot.arrangement === 'STAFF_ARRANGED') {
    return {
      arrangement: 'STAFF_ARRANGED',
      address: details.address,
      geocoding:
        details.latitude !== undefined && details.longitude !== undefined
          ? {
              latitude: details.latitude,
              longitude: details.longitude,
              formattedAddress: details.formattedAddress,
              providerPlaceId: details.providerPlaceId,
            }
          : undefined,
    };
  }
  if (details.formattedAddress === undefined || details.latitude === undefined || details.longitude === undefined)
    return undefined;
  return {
    arrangement: 'ROUTED',
    address: details.address,
    resolvedLocation: {
      formattedAddress: details.formattedAddress,
      latitude: details.latitude,
      longitude: details.longitude,
      providerPlaceId: details.providerPlaceId,
    },
  };
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
