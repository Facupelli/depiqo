import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PricingContextLoader } from './pricing-context-loader';
import { createPricingDurationPolicy } from './pricing-duration-policy';
import {
  PricingCalculation,
  PricingCalculationBreakdown,
  PricingCalculationError,
  PricingCalculationRequest,
  PricingCalculationResult,
} from '../public-api/pricing-calculation.public-api';
import {
  PricingError,
  CouponNotApplicableError,
  InvalidCouponError,
  InvalidPricingInputError,
} from '../pricing-engine/errors/pricing.errors';
import { PricingInput } from '../pricing-engine/final/pricing-input.types';
import { PricingResult } from '../pricing-engine/final/pricing-result.type';
import { RentalPricingService } from '../pricing-engine/final/rental-pricing.service';
import { ManualPricingAdjustmentApplier } from '../features/price-draft-rental/manual-adjustments/manual-pricing-adjustment-applier';
import { Money } from '../pricing-engine/money/money.value-object';

@Injectable()
export class PricingCalculationService extends PricingCalculation {
  private readonly calculator = new RentalPricingService();
  private readonly adjustmentApplier = new ManualPricingAdjustmentApplier();

  constructor(private readonly contextLoader: PricingContextLoader) {
    super();
  }

  async calculateProposedPrice(
    input: PricingCalculationRequest,
  ): Promise<Result<PricingCalculationResult, PricingCalculationError>> {
    const invalid = this.validate(input);
    if (invalid) return err(invalid);
    try {
      const calculatedAt = input.calculationDate ?? new Date();
      const context = await this.contextLoader.loadPricingCalculationContext({
        tenantId: input.tenantId,
        customerId: input.customerId,
        couponCode: input.couponCode,
        rentalOfferIds: input.lines.map((line) => line.rentalOfferId),
      });
      const selections = input.lines.map((line) => ({
        rentalSelectionId: line.lineReference,
        rentalOfferId: line.rentalOfferId,
        rentableItemId: line.rentableItemId,
        rentableItemName: line.rentalOfferId,
        rentableItemKind: 'PRICEABLE_LINE',
        categoryId: line.categoryId,
        quantity: line.quantity,
        ratePlan: context.ratePlansByRentalOfferId.get(line.rentalOfferId),
      }));
      if (selections.some((selection) => !selection.ratePlan)) {
        return err(
          new PricingCalculationError(
            'pricing_calculation.configuration_unpriceable',
            'Pricing configuration cannot produce a valid price.',
          ),
        );
      }
      const calculated = this.calculator.calculate({
        tenantId: input.tenantId,
        rentalPeriod: input.rentalPeriod,
        pricingConfig: createPricingDurationPolicy(input.calculationFacts),
        selections: selections as PricingInput['selections'],
        customerId: input.customerId,
        calculationDate: calculatedAt,
        automaticPromotions: context.automaticPromotions,
        couponCode: input.couponCode,
        coupon: context.coupon,
      });
      if (!input.targetTotalAdjustment) {
        return ok({
          calculatedAt,
          calculated: this.toBreakdown(calculated, selections as PricingInput['selections']),
          final: this.toBreakdown(calculated, selections as PricingInput['selections']),
        });
      }
      let target: Money;
      try {
        target = Money.of(input.targetTotalAdjustment.targetTotal, calculated.currency);
      } catch {
        return err(
          new PricingCalculationError(
            'pricing_calculation.invalid_request',
            'targetTotalAdjustment.targetTotal must be a valid positive amount.',
          ),
        );
      }
      if (target.isZero())
        return err(
          new PricingCalculationError(
            'pricing_calculation.invalid_request',
            'targetTotalAdjustment.targetTotal must be greater than zero.',
          ),
        );
      const adjusted = this.adjustmentApplier.apply({
        pricingResult: calculated,
        targetTotalAdjustment: { targetTotal: input.targetTotalAdjustment.targetTotal },
      });
      return ok({
        calculatedAt,
        calculated: this.toBreakdown(calculated, selections as PricingInput['selections']),
        final: this.toBreakdown(adjusted.pricingResult, selections as PricingInput['selections']),
        targetTotalAdjustment: {
          targetTotal: adjusted.targetTotalAdjustment.targetTotal,
          previousTotal: adjusted.targetTotalAdjustment.previousTotal,
          direction: adjusted.targetTotalAdjustment.direction,
          adjustmentTotal: adjusted.targetTotalAdjustment.adjustmentTotal,
        },
      });
    } catch (error) {
      if (error instanceof CouponNotApplicableError || error instanceof InvalidCouponError)
        return err(
          new PricingCalculationError('pricing_calculation.coupon_not_applicable', 'Coupon cannot be applied.'),
        );
      if (error instanceof PricingError)
        return err(
          new PricingCalculationError(
            error instanceof InvalidPricingInputError
              ? 'pricing_calculation.invalid_request'
              : 'pricing_calculation.configuration_unpriceable',
            error instanceof InvalidPricingInputError
              ? error.message
              : 'Pricing configuration cannot produce a valid price.',
          ),
        );
      throw error;
    }
  }

  private validate(input: PricingCalculationRequest): PricingCalculationError | null {
    if (
      !input.tenantId?.trim() ||
      !input.rentalPeriod?.start ||
      !input.rentalPeriod?.end ||
      input.rentalPeriod.end <= input.rentalPeriod.start ||
      !input.calculationFacts?.effectiveTimezone?.trim() ||
      !input.lines?.length
    )
      return new PricingCalculationError(
        'pricing_calculation.invalid_request',
        'The pricing calculation request is invalid.',
      );
    const references = new Set<string>();
    for (const line of input.lines) {
      if (
        !line.lineReference?.trim() ||
        !line.rentalOfferId?.trim() ||
        !line.rentableItemId?.trim() ||
        !Number.isInteger(line.quantity) ||
        line.quantity <= 0 ||
        references.has(line.lineReference)
      )
        return new PricingCalculationError(
          'pricing_calculation.invalid_request',
          'The pricing calculation request contains an invalid priceable line.',
        );
      references.add(line.lineReference);
    }
    return null;
  }

  private toBreakdown(
    result: PricingResult,
    selections: Array<PricingInput['selections'][number]>,
  ): PricingCalculationBreakdown {
    return {
      currency: result.currency,
      subtotal: result.subtotal,
      discountTotal: result.discountTotal,
      total: result.total,
      chargedDays: result.chargedDays,
      durationPolicy: result.durationPolicySnapshot,
      lines: result.lines.map((line) => {
        const source = selections.find((selection) => selection.rentalSelectionId === line.rentalSelectionId)!;
        const tier = source.ratePlan.tiers.find((candidate) => candidate.id === line.appliedTierId)!;
        return {
          lineReference: line.rentalSelectionId,
          rentalOfferId: line.rentalOfferId,
          rentableItemId: line.rentableItemId,
          ...(line.categoryId ? { categoryId: line.categoryId } : {}),
          quantity: line.quantity,
          ratePlanId: line.ratePlanId,
          billingUnit: line.billingUnit,
          chargedUnits: line.chargedUnits,
          appliedTier: {
            tierId: tier.id,
            fromUnit: tier.fromUnit,
            toUnit: tier.toUnit,
            pricePerUnit: line.pricePerUnit,
          },
          subtotal: line.subtotal,
          discountTotal: line.discountTotal,
          total: line.total,
          appliedAdjustments: line.appliedAdjustments,
          ...(line.targetTotalAllocation ? { targetTotalAllocation: line.targetTotalAllocation } : {}),
        };
      }),
      appliedPromotions: result.appliedPromotions,
      ...(result.appliedCoupon ? { appliedCoupon: result.appliedCoupon } : {}),
    };
  }
}
