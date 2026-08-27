import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { err, ok, Result } from 'neverthrow';

import { InsuranceCalculationService } from 'src/core/domain/services/insurance-calculation.service';
import { TenantInsuranceOfferingTerms } from 'src/modules/tenant-management/public-api/tenant-insurance-offering-terms.public-api';

import { PricingContextLoader } from './pricing-context-loader';
import { createPricingDurationPolicy } from './pricing-duration-policy';
import {
  PricingCalculation,
  PricingCalculationBreakdown,
  PricingCalculationError,
  PricingCalculationRequest,
  PricingCalculationResult,
  PricingInsuranceCompositionRequest,
  PricingInsuranceCompositionResult,
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

  constructor(
    private readonly contextLoader: PricingContextLoader,
    private readonly tenantInsuranceOfferingTerms: TenantInsuranceOfferingTerms,
  ) {
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
      const selections: PricingInput['selections'] = [];
      for (const line of input.lines) {
        const ratePlan = context.ratePlansByRentalOfferId.get(line.rentalOfferId);
        if (!ratePlan) {
          return err(
            new PricingCalculationError(
              'pricing_calculation.configuration_unpriceable',
              'Pricing configuration cannot produce a valid price.',
            ),
          );
        }
        selections.push({
          rentalSelectionId: line.lineReference,
          rentalOfferId: line.rentalOfferId,
          rentableItemId: line.rentableItemId,
          rentableItemName: line.rentalOfferId,
          pricingLineKind: 'PRICEABLE_LINE',
          rentableItemKind: line.rentableItemKind,
          categoryId: line.categoryId,
          quantity: line.quantity,
          ratePlan,
        });
      }
      const calculated = this.calculator.calculate({
        tenantId: input.tenantId,
        rentalPeriod: input.rentalPeriod,
        pricingConfig: createPricingDurationPolicy(input.calculationFacts),
        selections,
        customerId: input.customerId,
        calculationDate: calculatedAt,
        automaticPromotions: context.automaticPromotions,
        couponCode: input.couponCode,
        coupon: context.coupon,
      });
      if (!input.targetTotalAdjustment) {
        const breakdown = this.toBreakdown(calculated, selections);
        const insurance = await this.calculateInsuranceForEquipmentPrice({
          tenantId: input.tenantId,
          insuranceSelected: input.insuranceSelected,
          equipmentSubtotalBeforeDiscounts: breakdown.subtotal,
          equipmentTotal: breakdown.total,
        });
        if (insurance.isErr()) return err(insurance.error);
        return ok({
          calculatedAt,
          calculated: breakdown,
          final: breakdown,
          ...insurance.value,
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
      const calculatedBreakdown = this.toBreakdown(calculated, selections);
      const finalBreakdown = this.toBreakdown(adjusted.pricingResult, selections);
      const insurance = await this.calculateInsuranceForEquipmentPrice({
        tenantId: input.tenantId,
        insuranceSelected: input.insuranceSelected,
        equipmentSubtotalBeforeDiscounts: calculatedBreakdown.subtotal,
        equipmentTotal: finalBreakdown.total,
      });
      if (insurance.isErr()) return err(insurance.error);
      return ok({
        calculatedAt,
        calculated: calculatedBreakdown,
        final: finalBreakdown,
        ...insurance.value,
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

  async calculateInsuranceForEquipmentPrice(
    input: PricingInsuranceCompositionRequest,
  ): Promise<Result<PricingInsuranceCompositionResult, PricingCalculationError>> {
    if (
      !input.tenantId.trim() ||
      !isValidDecimal(input.equipmentSubtotalBeforeDiscounts) ||
      !isValidDecimal(input.equipmentTotal)
    ) {
      return err(
        new PricingCalculationError('pricing_calculation.invalid_request', 'Insurance pricing input is invalid.'),
      );
    }

    const offeringTerms = await this.tenantInsuranceOfferingTerms.getTenantInsuranceOfferingTerms({
      tenantId: input.tenantId,
    });
    if (offeringTerms.isErr()) {
      return err(
        new PricingCalculationError(
          'pricing_calculation.configuration_unpriceable',
          'Insurance pricing configuration is unavailable.',
        ),
      );
    }

    const terms = InsuranceCalculationService.resolveTerms(offeringTerms.value, input.insuranceSelected);
    const calculation = InsuranceCalculationService.calculate(input.equipmentSubtotalBeforeDiscounts, terms);
    const totalBeforeInsurance = new Decimal(input.equipmentTotal).toFixed(2);

    return ok({
      insurance: {
        applied: calculation.insuranceApplied,
        amount: calculation.insuranceAmount.toFixed(2),
      },
      totalBeforeInsurance,
      total: new Decimal(totalBeforeInsurance).plus(calculation.insuranceAmount).toFixed(2),
    });
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
        !['SINGLE', 'PACKAGE', 'KIT', 'BUNDLE'].includes(line.rentableItemKind) ||
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
        const source = selections.find((selection) => selection.rentalSelectionId === line.rentalSelectionId);
        if (!source) throw new Error(`Pricing result references unknown selection ${line.rentalSelectionId}.`);
        const tier = source.ratePlan.tiers.find((candidate) => candidate.id === line.appliedTierId);
        if (!tier) throw new Error(`Pricing result references unknown tier ${line.appliedTierId}.`);
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

function isValidDecimal(value: string): boolean {
  try {
    return new Decimal(value).isFinite();
  } catch {
    return false;
  }
}
