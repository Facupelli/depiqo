import {
  InvalidPricingInputError,
  UnsupportedPricingCurrencyError,
} from '../../../pricing-engine/errors/pricing.errors';
import { isPayableCurrency } from '../../../domain/value-objects/payable-currency';
import { Money } from '../../../pricing-engine/money/money.value-object';
import {
  TargetTotalAllocationInput,
  TargetTotalAllocationLineResult,
  TargetTotalAllocationResult,
} from './target-total-allocation.types';

export class TargetTotalAllocationService {
  allocate(input: TargetTotalAllocationInput): TargetTotalAllocationResult {
    this.validateInput(input);

    const targetTotal = this.parseInputMoney(input.targetTotal, input.currency, 'Target total');
    if (targetTotal.isZero() || !targetTotal.isPayable()) {
      throw new InvalidPricingInputError('Target total must be positive and exactly representable in cents.');
    }

    const lines = input.lines.map((line) => ({
      rentalSelectionId: line.rentalSelectionId,
      rentalOfferId: line.rentalOfferId,
      currentTotal: this.parseInputMoney(line.currentTotal, input.currency, 'Current line total'),
    }));

    if (lines.some((line) => !line.currentTotal.isPayable())) {
      throw new InvalidPricingInputError('Current line totals must be exactly representable in cents.');
    }
    const currentTotal = lines.reduce((total, line) => total.add(line.currentTotal), Money.zero(input.currency));

    const finalLineTotals = currentTotal.isZero()
      ? this.allocateEvenly({
          targetTotal,
          keys: lines.map((line) => line.rentalOfferId),
        })
      : this.allocateProportionally({
          targetTotal,
          currentLineTotals: lines.map((line) => line.currentTotal),
          keys: lines.map((line) => line.rentalOfferId),
        });

    const resultLines = lines.map((line, index): TargetTotalAllocationLineResult => {
      const finalTotal = finalLineTotals[index];

      return {
        rentalSelectionId: line.rentalSelectionId,
        previousTotal: line.currentTotal.toSnapshotString(),
        finalTotal: finalTotal.toSnapshotString(),
        adjustment: this.calculateAdjustment({
          previousTotal: line.currentTotal,
          finalTotal,
        }),
      };
    });

    return {
      currency: input.currency.toUpperCase(),
      currentTotal: currentTotal.toSnapshotString(),
      targetTotal: targetTotal.toSnapshotString(),
      ...this.calculateOrderAdjustment({
        previousTotal: currentTotal,
        finalTotal: targetTotal,
      }),
      lines: resultLines,
    };
  }

  private allocateProportionally(input: { targetTotal: Money; currentLineTotals: Money[]; keys: string[] }): Money[] {
    return input.targetTotal.allocateByRatios(
      input.currentLineTotals.map((total) => total.toDecimal()),
      input.keys,
    );
  }

  private allocateEvenly(input: { targetTotal: Money; keys: string[] }): Money[] {
    return input.targetTotal.allocateByRatios(
      input.keys.map(() => 1),
      input.keys,
    );
  }

  private calculateOrderAdjustment(input: {
    previousTotal: Money;
    finalTotal: Money;
  }): Pick<TargetTotalAllocationResult, 'direction' | 'adjustmentTotal'> {
    const adjustment = this.calculateAdjustment(input);

    return {
      direction: adjustment.direction,
      adjustmentTotal: adjustment.amount,
    };
  }

  private calculateAdjustment(input: { previousTotal: Money; finalTotal: Money }) {
    const { previousTotal, finalTotal } = input;

    if (finalTotal.equals(previousTotal)) {
      return {
        direction: 'NONE',
        amount: Money.zero(previousTotal.currency).toSnapshotString(),
      } satisfies TargetTotalAllocationLineResult['adjustment'];
    }

    if (finalTotal.isGreaterThan(previousTotal)) {
      return {
        direction: 'INCREASE',
        amount: finalTotal.subtract(previousTotal).toSnapshotString(),
      } satisfies TargetTotalAllocationLineResult['adjustment'];
    }

    return {
      direction: 'DECREASE',
      amount: previousTotal.subtract(finalTotal).toSnapshotString(),
    } satisfies TargetTotalAllocationLineResult['adjustment'];
  }

  private validateInput(input: TargetTotalAllocationInput): void {
    if (!input.currency.trim()) {
      throw new InvalidPricingInputError('Currency is required for target total allocation.');
    }
    if (!isPayableCurrency(input.currency)) throw new UnsupportedPricingCurrencyError(input.currency);

    if (input.lines.length === 0) {
      throw new InvalidPricingInputError('At least one line is required for target total allocation.');
    }

    const uniqueSelectionIds = new Set<string>();
    const uniqueOfferIds = new Set<string>();

    for (const line of input.lines) {
      if (!line.rentalSelectionId.trim()) {
        throw new InvalidPricingInputError('Rental selection id is required for each allocation line.');
      }

      if (uniqueSelectionIds.has(line.rentalSelectionId)) {
        throw new InvalidPricingInputError(
          `Duplicated rental selection id in target total allocation: ${line.rentalSelectionId}`,
        );
      }

      uniqueSelectionIds.add(line.rentalSelectionId);

      if (!line.rentalOfferId.trim() || uniqueOfferIds.has(line.rentalOfferId)) {
        throw new InvalidPricingInputError(
          'Rental offer ids must be distinct and nonempty for target total allocation.',
        );
      }
      uniqueOfferIds.add(line.rentalOfferId);
    }
  }

  private parseInputMoney(amount: string, currency: string, field: string): Money {
    try {
      return Money.of(amount, currency);
    } catch (error) {
      if (error instanceof Error) {
        throw new InvalidPricingInputError(`${field} is invalid: ${error.message}`);
      }
      throw error;
    }
  }
}
