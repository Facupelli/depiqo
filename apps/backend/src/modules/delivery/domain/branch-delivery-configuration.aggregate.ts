import { randomUUID } from 'node:crypto';

import { err, ok, Result } from 'neverthrow';

import { DeliveryDomainError, InvalidDeliveryConfigurationError } from './errors/delivery.errors';
import { CurrencyCode } from './value-objects/currency-code.value-object';
import { MinuteOfDayWindow } from './value-objects/minute-of-day-window.value-object';
import { NonNegativeMoneyAmount } from './value-objects/non-negative-money-amount.value-object';

export interface BranchDeliveryDistancePriceBand {
  readonly maxDistanceMeters: number;
  readonly price: NonNegativeMoneyAmount;
}

export interface BranchDeliveryConfigurationInput {
  enabled: boolean;
  currency: string;
  maximumDistanceMeters: number;
  distancePriceBands: Array<{ maxDistanceMeters: number; price: string }>;
  eligibleWeekdays: number[];
  eligibilityStartMinute: number;
  eligibilityEndMinute: number;
  normalServiceStartMinute: number;
  normalServiceEndMinute: number;
  specialHoursSurcharge: string;
  transportReservationMinutes: number;
}

export class BranchDeliveryConfiguration {
  private constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly branchId: string,
    public readonly enabled: boolean,
    public readonly currency: CurrencyCode,
    public readonly maximumDistanceMeters: number,
    private readonly ownedDistancePriceBands: readonly BranchDeliveryDistancePriceBand[],
    private readonly normalizedEligibleWeekdays: readonly number[],
    public readonly eligibilityWindow: MinuteOfDayWindow,
    public readonly normalServiceWindow: MinuteOfDayWindow,
    public readonly specialHoursSurcharge: NonNegativeMoneyAmount,
    public readonly transportReservationMinutes: number,
  ) {}

  get distancePriceBands(): readonly BranchDeliveryDistancePriceBand[] {
    return [...this.ownedDistancePriceBands];
  }

  get eligibleWeekdays(): readonly number[] {
    return [...this.normalizedEligibleWeekdays];
  }

  static create(
    props: BranchDeliveryConfigurationInput & { tenantId: string; branchId: string },
  ): Result<BranchDeliveryConfiguration, DeliveryDomainError> {
    return BranchDeliveryConfiguration.build({ ...props, id: randomUUID() });
  }

  reconfigure(props: BranchDeliveryConfigurationInput): Result<BranchDeliveryConfiguration, DeliveryDomainError> {
    return BranchDeliveryConfiguration.build({
      ...props,
      id: this.id,
      tenantId: this.tenantId,
      branchId: this.branchId,
    });
  }

  static reconstitute(
    props: BranchDeliveryConfigurationInput & { id: string; tenantId: string; branchId: string },
  ): Result<BranchDeliveryConfiguration, DeliveryDomainError> {
    return BranchDeliveryConfiguration.build(props);
  }

  private static build(
    props: BranchDeliveryConfigurationInput & { id: string; tenantId: string; branchId: string },
  ): Result<BranchDeliveryConfiguration, DeliveryDomainError> {
    if (!Number.isInteger(props.maximumDistanceMeters) || props.maximumDistanceMeters <= 0) {
      return err(new InvalidDeliveryConfigurationError('Maximum delivery distance must be a positive integer.'));
    }

    if (!Number.isInteger(props.transportReservationMinutes) || props.transportReservationMinutes < 0) {
      return err(
        new InvalidDeliveryConfigurationError('Transport reservation minutes must be a non-negative integer.'),
      );
    }

    const currency = CurrencyCode.create(props.currency);
    if (currency.isErr()) return err(currency.error);

    const eligibleWeekdays = BranchDeliveryConfiguration.normalizeWeekdays(props.eligibleWeekdays);
    if (eligibleWeekdays.isErr()) return err(eligibleWeekdays.error);

    const eligibilityWindow = MinuteOfDayWindow.create(
      props.eligibilityStartMinute,
      props.eligibilityEndMinute,
      'Eligibility window',
    );
    if (eligibilityWindow.isErr()) return err(eligibilityWindow.error);

    const normalServiceWindow = MinuteOfDayWindow.create(
      props.normalServiceStartMinute,
      props.normalServiceEndMinute,
      'Normal-service window',
    );
    if (normalServiceWindow.isErr()) return err(normalServiceWindow.error);

    if (!eligibilityWindow.value.contains(normalServiceWindow.value)) {
      return err(
        new InvalidDeliveryConfigurationError('Normal-service window must be contained inside the eligibility window.'),
      );
    }

    const surcharge = NonNegativeMoneyAmount.create(props.specialHoursSurcharge, 'Special-hours surcharge');
    if (surcharge.isErr()) return err(surcharge.error);

    const bands = BranchDeliveryConfiguration.buildDistancePriceBands(props.distancePriceBands);
    if (bands.isErr()) return err(bands.error);

    if (bands.value.at(-1)?.maxDistanceMeters !== props.maximumDistanceMeters) {
      return err(
        new InvalidDeliveryConfigurationError(
          'The final distance price band maximum must equal the configuration maximum distance.',
        ),
      );
    }

    return ok(
      new BranchDeliveryConfiguration(
        props.id,
        props.tenantId,
        props.branchId,
        props.enabled,
        currency.value,
        props.maximumDistanceMeters,
        bands.value,
        eligibleWeekdays.value,
        eligibilityWindow.value,
        normalServiceWindow.value,
        surcharge.value,
        props.transportReservationMinutes,
      ),
    );
  }

  private static normalizeWeekdays(weekdays: number[]): Result<readonly number[], InvalidDeliveryConfigurationError> {
    if (weekdays.length === 0) {
      return err(new InvalidDeliveryConfigurationError('At least one eligible weekday is required.'));
    }

    if (weekdays.some((weekday) => !Number.isInteger(weekday) || weekday < 0 || weekday > 6)) {
      return err(new InvalidDeliveryConfigurationError('Eligible weekdays must be integers between 0 and 6.'));
    }

    if (new Set(weekdays).size !== weekdays.length) {
      return err(new InvalidDeliveryConfigurationError('Eligible weekdays must be unique.'));
    }

    return ok([...weekdays].sort((left, right) => left - right));
  }

  private static buildDistancePriceBands(
    bandInputs: BranchDeliveryConfigurationInput['distancePriceBands'],
  ): Result<readonly BranchDeliveryDistancePriceBand[], DeliveryDomainError> {
    if (bandInputs.length === 0) {
      return err(new InvalidDeliveryConfigurationError('At least one distance price band is required.'));
    }

    const sortedBandInputs = [...bandInputs].sort((left, right) => left.maxDistanceMeters - right.maxDistanceMeters);
    const seenMaximums = new Set<number>();
    const bands: BranchDeliveryDistancePriceBand[] = [];

    for (const bandInput of sortedBandInputs) {
      if (!Number.isInteger(bandInput.maxDistanceMeters) || bandInput.maxDistanceMeters <= 0) {
        return err(new InvalidDeliveryConfigurationError('Band maximum distances must be positive integers.'));
      }
      if (seenMaximums.has(bandInput.maxDistanceMeters)) {
        return err(new InvalidDeliveryConfigurationError('Band maximum distances must be unique.'));
      }
      seenMaximums.add(bandInput.maxDistanceMeters);

      const price = NonNegativeMoneyAmount.create(bandInput.price, 'Distance band price');
      if (price.isErr()) return err(price.error);

      bands.push({ maxDistanceMeters: bandInput.maxDistanceMeters, price: price.value });
    }

    return ok(bands);
  }
}
