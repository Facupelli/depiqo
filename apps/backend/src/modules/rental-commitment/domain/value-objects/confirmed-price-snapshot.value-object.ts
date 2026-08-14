import { err, ok, Result } from 'neverthrow';

import {
  ACCEPTED_RENTAL_PRICING_SNAPSHOT_SCHEMA,
  ACCEPTED_RENTAL_PRICING_SNAPSHOT_VERSION,
} from './accepted-pricing-snapshot.type';

import { RentalCommitmentError, RentalInvalidFieldError } from '../errors/rental-commitment.errors';
import { JsonSnapshot, JsonValue } from './json-snapshot.value-object';

export type ConfirmedPriceSnapshotValue = Record<string, JsonValue>;

export class ConfirmedPriceSnapshot extends JsonSnapshot {
  private constructor(value: ConfirmedPriceSnapshotValue) {
    super(value);
  }

  static create(value: JsonValue): Result<ConfirmedPriceSnapshot, RentalCommitmentError> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return err(new RentalInvalidFieldError('priceSnapshot', 'must be a non-empty object'));
    }

    if (Object.keys(value).length === 0) {
      return err(new RentalInvalidFieldError('priceSnapshot', 'must be a non-empty object'));
    }

    const snapshot = value as ConfirmedPriceSnapshotValue;
    const schemaValidation = this.validateSchemaEnvelope(snapshot);
    if (schemaValidation.isErr()) {
      return err(schemaValidation.error);
    }

    return ok(new ConfirmedPriceSnapshot(snapshot));
  }

  static reconstitute(value: ConfirmedPriceSnapshotValue): ConfirmedPriceSnapshot {
    return new ConfirmedPriceSnapshot(value);
  }

  private static validateSchemaEnvelope(snapshot: ConfirmedPriceSnapshotValue): Result<void, RentalCommitmentError> {
    const schema = snapshot.schema;
    const version = snapshot.version;

    if (schema !== ACCEPTED_RENTAL_PRICING_SNAPSHOT_SCHEMA) {
      return err(
        new RentalInvalidFieldError('priceSnapshot.schema', `must be ${ACCEPTED_RENTAL_PRICING_SNAPSHOT_SCHEMA}`),
      );
    }

    if (version !== ACCEPTED_RENTAL_PRICING_SNAPSHOT_VERSION) {
      return err(new RentalInvalidFieldError('priceSnapshot.version', 'must be 1'));
    }

    if (typeof snapshot.calculatedAtIso !== 'string' || snapshot.calculatedAtIso.trim().length === 0) {
      return err(new RentalInvalidFieldError('priceSnapshot.calculatedAtIso', 'must be a non-empty string'));
    }

    if (!snapshot.calculated || typeof snapshot.calculated !== 'object' || Array.isArray(snapshot.calculated)) {
      return err(new RentalInvalidFieldError('priceSnapshot.calculated', 'must be an object'));
    }

    if (!snapshot.final || typeof snapshot.final !== 'object' || Array.isArray(snapshot.final)) {
      return err(new RentalInvalidFieldError('priceSnapshot.final', 'must be an object'));
    }

    const calculatedValidation = this.validatePricingPayload(
      snapshot.calculated as ConfirmedPriceSnapshotValue,
      'priceSnapshot.calculated',
    );
    if (calculatedValidation.isErr()) {
      return err(calculatedValidation.error);
    }

    return this.validatePricingPayload(snapshot.final as ConfirmedPriceSnapshotValue, 'priceSnapshot.final');
  }

  private static validatePricingPayload(
    pricing: ConfirmedPriceSnapshotValue,
    fieldPrefix: string,
  ): Result<void, RentalCommitmentError> {
    for (const field of ['currency', 'subtotal', 'discountTotal', 'total'] as const) {
      if (typeof pricing[field] !== 'string' || pricing[field].trim().length === 0) {
        return err(new RentalInvalidFieldError(`${fieldPrefix}.${field}`, 'must be a non-empty string'));
      }
    }

    const chargedDays = pricing.chargedDays;
    if (typeof chargedDays !== 'number' || !Number.isInteger(chargedDays) || chargedDays < 0) {
      return err(new RentalInvalidFieldError(`${fieldPrefix}.chargedDays`, 'must be a non-negative integer'));
    }

    if (!Array.isArray(pricing.lines)) {
      return err(new RentalInvalidFieldError(`${fieldPrefix}.lines`, 'must be an array'));
    }

    if (!Array.isArray(pricing.appliedPromotions)) {
      return err(new RentalInvalidFieldError(`${fieldPrefix}.appliedPromotions`, 'must be an array'));
    }

    if (
      !pricing.durationPolicySnapshot ||
      typeof pricing.durationPolicySnapshot !== 'object' ||
      Array.isArray(pricing.durationPolicySnapshot)
    ) {
      return err(new RentalInvalidFieldError(`${fieldPrefix}.durationPolicySnapshot`, 'must be an object'));
    }

    return ok(undefined);
  }
}
