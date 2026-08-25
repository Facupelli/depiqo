import { InvalidPricingInputError } from '../../../pricing-engine/errors/pricing.errors';
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
    if (targetTotal.isZero()) {
      throw new InvalidPricingInputError('Target total must be greater than zero.');
    }

    const lines = input.lines.map((line) => ({
      rentalSelectionId: line.rentalSelectionId,
      currentTotal: this.parseInputMoney(line.currentTotal, input.currency, 'Current line total'),
    }));

    const currentTotal = lines.reduce((total, line) => total.add(line.currentTotal), Money.zero(input.currency));

    const finalLineTotals = currentTotal.isZero()
      ? this.allocateEvenly({
          targetTotal,
          lineCount: lines.length,
        })
      : this.allocateProportionally({
          targetTotal,
          currentLineTotals: lines.map((line) => line.currentTotal),
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

  private allocateProportionally(input: { targetTotal: Money; currentLineTotals: Money[] }): Money[] {
    const ratios = input.currentLineTotals.map((total) => this.toAllocationRatio(total));

    return input.targetTotal.allocateByRatios(ratios);
  }

  private allocateEvenly(input: { targetTotal: Money; lineCount: number }): Money[] {
    return input.targetTotal.allocateByRatios(Array.from({ length: input.lineCount }, () => 1));
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

  private calculateAdjustment(input: { previousTotal: Money; finalTotal: Money }): {
    direction: 'INCREASE' | 'DECREASE' | 'NONE';
    amount: string;
  } {
    const { previousTotal, finalTotal } = input;

    if (finalTotal.equals(previousTotal)) {
      return {
        direction: 'NONE',
        amount: Money.zero(previousTotal.currency).toSnapshotString(),
      };
    }

    if (finalTotal.isGreaterThan(previousTotal)) {
      return {
        direction: 'INCREASE',
        amount: finalTotal.subtract(previousTotal).toSnapshotString(),
      };
    }

    return {
      direction: 'DECREASE',
      amount: previousTotal.subtract(finalTotal).toSnapshotString(),
    };
  }

  private toAllocationRatio(amount: Money): number {
    const cents = amount.toDecimal().mul(100).floor().toNumber();

    if (!Number.isSafeInteger(cents)) {
      throw new Error(`Money amount is too large to be used as an allocation ratio: ${amount.toString()}`);
    }

    return cents;
  }

  private validateInput(input: TargetTotalAllocationInput): void {
    if (!input.currency.trim()) {
      throw new InvalidPricingInputError('Currency is required for target total allocation.');
    }

    if (input.lines.length === 0) {
      throw new InvalidPricingInputError('At least one line is required for target total allocation.');
    }

    const uniqueSelectionIds = new Set<string>();

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
