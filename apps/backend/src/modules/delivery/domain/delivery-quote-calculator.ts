import { err, ok, Result } from 'neverthrow';

import { toZonedDateTimeParts } from 'src/core/temporal/zoned-date-time-parts';

import {
  BranchDeliveryConfiguration,
  BranchDeliveryDistancePriceBand,
} from './branch-delivery-configuration.aggregate';
import {
  DeliveryQuote,
  DeliveryQuoteLeg,
  DeliveryQuoteNonServiceability,
  ResolvedCustomerLocation,
} from './delivery-quote.types';
import { InvalidDeliveryQuoteInputError } from './errors/delivery.errors';
import { NonNegativeMoneyAmount } from './value-objects/non-negative-money-amount.value-object';

export interface CalculateDeliveryQuoteInput {
  configuration: BranchDeliveryConfiguration;
  distanceMeters: number;
  effectiveTimezone: string;
  resolvedCustomerLocation: ResolvedCustomerLocation;
  rentalStart: Date;
  rentalEnd: Date;
  calculatedAt: Date;
}

export type DeliveryQuoteCalculationError = DeliveryQuoteNonServiceability | InvalidDeliveryQuoteInputError;

export class DeliveryQuoteCalculator {
  calculate(input: CalculateDeliveryQuoteInput): Result<DeliveryQuote, DeliveryQuoteCalculationError> {
    const invalidInput = this.validateInput(input);
    if (invalidInput) return err(invalidInput);

    const band = input.configuration.distancePriceBands.find(
      (candidate) => input.distanceMeters <= candidate.maxDistanceMeters,
    );
    if (!band) return err({ code: 'BEYOND_MAX_DISTANCE' });

    const delivery = this.calculateLeg(input, input.rentalStart, band);
    if (!delivery) return err({ code: 'DELIVERY_OUTSIDE_SERVICE_HOURS' });

    const collection = this.calculateLeg(input, input.rentalEnd, band);
    if (!collection) return err({ code: 'COLLECTION_OUTSIDE_SERVICE_HOURS' });

    const deliveryTotal = delivery.totalAmount.add(collection.totalAmount);

    return ok({
      resolvedCustomerLocation: { ...input.resolvedCustomerLocation },
      distanceMeters: input.distanceMeters,
      currency: input.configuration.currency.value,
      delivery: delivery.quote,
      collection: collection.quote,
      deliveryTotal: deliveryTotal.toString(),
      transportReservationMinutes: input.configuration.transportReservationMinutes,
      calculatedAt: input.calculatedAt,
    });
  }

  private calculateLeg(
    input: CalculateDeliveryQuoteInput,
    scheduledAt: Date,
    band: BranchDeliveryDistancePriceBand,
  ): { quote: DeliveryQuoteLeg; totalAmount: NonNegativeMoneyAmount } | null {
    const local = toZonedDateTimeParts(scheduledAt, input.effectiveTimezone);
    const configuration = input.configuration;

    if (
      !configuration.eligibleWeekdays.includes(local.dayOfWeek) ||
      !configuration.eligibilityWindow.containsMinute(local.minuteOfDay)
    ) {
      return null;
    }

    const normal = configuration.normalServiceWindow.containsMinute(local.minuteOfDay);
    const surcharge = normal ? NonNegativeMoneyAmount.zero() : configuration.specialHoursSurcharge;

    const totalAmount = band.price.add(surcharge);

    return {
      quote: {
        scheduledAt,
        serviceLevel: normal ? 'NORMAL' : 'SPECIAL',
        basePrice: band.price.toString(),
        surcharge: surcharge.toString(),
        total: totalAmount.toString(),
      },
      totalAmount,
    };
  }

  private validateInput(input: CalculateDeliveryQuoteInput): InvalidDeliveryQuoteInputError | null {
    if (!Number.isInteger(input.distanceMeters) || input.distanceMeters < 0) {
      return new InvalidDeliveryQuoteInputError('Distance meters must be a non-negative integer.');
    }

    if (![input.rentalStart, input.rentalEnd, input.calculatedAt].every((date) => !Number.isNaN(date.getTime()))) {
      return new InvalidDeliveryQuoteInputError('Rental and calculation timestamps must be valid dates.');
    }

    if (input.rentalEnd <= input.rentalStart) {
      return new InvalidDeliveryQuoteInputError('Rental end must be after rental start.');
    }

    try {
      new Intl.DateTimeFormat('en-US', { timeZone: input.effectiveTimezone }).format(input.rentalStart);
    } catch {
      return new InvalidDeliveryQuoteInputError('Effective timezone must be a valid IANA timezone.');
    }

    return null;
  }
}
