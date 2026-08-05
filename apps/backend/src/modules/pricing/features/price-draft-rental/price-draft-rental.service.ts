import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PricingContextLoader } from '../../application/pricing-context-loader';
import { RentalPriceSnapshotFactory } from '../../application/rental-price-snapshot.factory';
import { InvalidPricingInputError, PricingError } from '../../pricing-engine/errors/pricing.errors';
import { PricingInput } from '../../pricing-engine/final/pricing-input.types';
import { RentalPricingService } from '../../pricing-engine/final/rental-pricing.service';
import { RentalPriceSnapshotV1 } from '../../public-api/rental-price-snapshot.type';
import { PriceDraftRentalInput } from './price-draft-rental-input.type';
import { ManualPricingAdjustmentApplier } from './manual-adjustments/manual-pricing-adjustment-applier';

@Injectable()
export class PriceDraftRentalService {
  private readonly rentalPricingService = new RentalPricingService();
  private readonly manualPricingAdjustmentApplier = new ManualPricingAdjustmentApplier();
  private readonly snapshotFactory = new RentalPriceSnapshotFactory();

  constructor(private readonly readService: PricingContextLoader) {}

  async price(input: PriceDraftRentalInput): Promise<Result<RentalPriceSnapshotV1, PricingError>> {
    const validationError = this.validateInput(input);
    if (validationError) {
      return err(validationError);
    }

    try {
      const calculationDate = input.calculationDate ?? new Date();
      const context = await this.readService.loadPricingCalculationContext({
        tenantId: input.tenantId,
        customerId: input.customerId,
        couponCode: input.couponCode,
        rentalOfferIds: input.selections.map((selection) => selection.rentalOfferId),
      });

      const selections = input.selections.map((selection) => ({
        ...selection,
        ratePlan: context.ratePlansByRentalOfferId.get(selection.rentalOfferId),
      }));
      const ratePlanValidationError = this.validateHydratedRatePlans(selections);
      if (ratePlanValidationError) {
        return err(ratePlanValidationError);
      }

      const pricingInput: PricingInput = {
        tenantId: input.tenantId,
        branchId: input.branchId,
        rentalPeriod: input.rentalPeriod,
        pricingConfig: input.pricingConfig,
        selections: selections as PricingInput['selections'],
        customerId: input.customerId,
        calculationDate,
        automaticPromotions: input.automaticPromotions ?? context.automaticPromotions,
        couponCode: input.couponCode,
        coupon: input.coupon ?? context.coupon,
      };

      const calculatedPricing = this.rentalPricingService.calculate(pricingInput);

      if (!input.manualPricingAdjustment) {
        return ok(
          this.snapshotFactory.create({
            context: 'DRAFT',
            calculatedAt: calculationDate,
            calculated: calculatedPricing,
            final: calculatedPricing,
          }),
        );
      }

      const adjusted = this.manualPricingAdjustmentApplier.apply({
        pricingResult: calculatedPricing,
        manualPricingAdjustment: input.manualPricingAdjustment,
        appliedAt: calculationDate,
      });

      return ok(
        this.snapshotFactory.create({
          context: 'DRAFT',
          calculatedAt: calculationDate,
          calculated: calculatedPricing,
          final: adjusted.pricingResult,
          manualPricingAdjustment: adjusted.manualPricingAdjustment,
        }),
      );
    } catch (error) {
      if (error instanceof PricingError) {
        return err(error);
      }

      throw error;
    }
  }

  private validateInput(input: PriceDraftRentalInput): PricingError | null {
    if (!input.tenantId?.trim()) {
      return new InvalidPricingInputError('tenantId is required.');
    }
    if (!input.branchId?.trim()) {
      return new InvalidPricingInputError('branchId is required.');
    }
    if (!input.rentalPeriod?.start || !input.rentalPeriod?.end) {
      return new InvalidPricingInputError('rentalPeriod.start and rentalPeriod.end are required.');
    }
    if (input.rentalPeriod.end <= input.rentalPeriod.start) {
      return new InvalidPricingInputError('rentalPeriod.end must be after rentalPeriod.start.');
    }
    if (!input.pricingConfig?.timezone?.trim()) {
      return new InvalidPricingInputError('pricingConfig.timezone is required.');
    }
    if (!Number.isInteger(input.pricingConfig.minimumChargedDays) || input.pricingConfig.minimumChargedDays < 0) {
      return new InvalidPricingInputError('pricingConfig.minimumChargedDays must be a non-negative integer.');
    }
    if (!input.selections?.length) {
      return new InvalidPricingInputError('at least one rental offer selection is required.');
    }

    const seenOfferIds = new Set<string>();
    for (const [index, selection] of input.selections.entries()) {
      if (!selection.rentalOfferId?.trim()) {
        return new InvalidPricingInputError(`selections.${index}.rentalOfferId is required.`);
      }
      if (!selection.rentableItemId?.trim()) {
        return new InvalidPricingInputError(`selections.${index}.rentableItemId is required.`);
      }
      if (!selection.rentableItemName?.trim()) {
        return new InvalidPricingInputError(`selections.${index}.rentableItemName is required.`);
      }
      if (seenOfferIds.has(selection.rentalOfferId)) {
        return new InvalidPricingInputError(`rentalOfferId "${selection.rentalOfferId}" is selected more than once.`);
      }
      seenOfferIds.add(selection.rentalOfferId);

      if (!Number.isInteger(selection.quantity) || selection.quantity <= 0) {
        return new InvalidPricingInputError(`selections.${index}.quantity must be a positive integer.`);
      }
    }

    if (input.manualPricingAdjustment?.mode !== undefined && input.manualPricingAdjustment.mode !== 'TARGET_TOTAL') {
      return new InvalidPricingInputError('manualPricingAdjustment.mode is invalid.');
    }

    return null;
  }

  private validateHydratedRatePlans(
    selections: Array<
      PriceDraftRentalInput['selections'][number] & { ratePlan?: PricingInput['selections'][number]['ratePlan'] }
    >,
  ): PricingError | null {
    for (const [index, selection] of selections.entries()) {
      if (!selection.ratePlan?.id?.trim()) {
        return new InvalidPricingInputError(`rental offer "${selection.rentalOfferId}" has no active pricing.`);
      }
      if (!selection.ratePlan.currency?.trim()) {
        return new InvalidPricingInputError(`selections.${index}.ratePlan.currency is required.`);
      }
      if (!['HOUR', 'DAY', 'WEEK'].includes(selection.ratePlan.billingUnit)) {
        return new InvalidPricingInputError(`selections.${index}.ratePlan.billingUnit is invalid.`);
      }
      if (!selection.ratePlan.tiers.length) {
        return new InvalidPricingInputError(`selections.${index}.ratePlan.tiers must contain at least one tier.`);
      }
      for (const [tierIndex, tier] of selection.ratePlan.tiers.entries()) {
        if (!tier.id?.trim()) {
          return new InvalidPricingInputError(`selections.${index}.ratePlan.tiers.${tierIndex}.id is required.`);
        }
        if (!Number.isInteger(tier.fromUnit) || tier.fromUnit < 1) {
          return new InvalidPricingInputError(
            `selections.${index}.ratePlan.tiers.${tierIndex}.fromUnit must be a positive integer.`,
          );
        }
        if (tier.toUnit != null && (!Number.isInteger(tier.toUnit) || tier.toUnit < tier.fromUnit)) {
          return new InvalidPricingInputError(
            `selections.${index}.ratePlan.tiers.${tierIndex}.toUnit must be greater than or equal to fromUnit.`,
          );
        }
        if (!tier.pricePerUnit?.trim()) {
          return new InvalidPricingInputError(
            `selections.${index}.ratePlan.tiers.${tierIndex}.pricePerUnit is required.`,
          );
        }
      }
    }

    return null;
  }
}
