import { Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import Decimal from 'decimal.js';
import { err, ok, Result } from 'neverthrow';

import { InsuranceCalculationService } from 'src/core/domain/services/insurance-calculation.service';
import { PricingContextLoader } from '../../application/pricing-context-loader';
import { createPricingDurationPolicy } from '../../application/pricing-duration-policy';
import { CouponNotApplicableError, InvalidPricingInputError } from '../../pricing-engine/errors/pricing.errors';
import { PricingInput } from '../../pricing-engine/final/pricing-input.types';
import { PricingResult } from '../../pricing-engine/final/pricing-result.type';
import { RentalPricingService } from '../../pricing-engine/final/rental-pricing.service';
import { CalculateCartPriceError, calculateCartPriceError } from './calculate-cart-price.errors';
import { CalculateCartPriceQuery } from './calculate-cart-price.query';
import {
  CatalogSelectionResolution,
  CatalogSelectionResolutionError,
} from 'src/modules/catalog/public-api/catalog-selection-resolution.public-api';
import { BranchFacts } from 'src/modules/tenant-management/public-api/branch-facts.public-api';
import { TenantBillingPreferences } from 'src/modules/tenant-management/public-api/tenant-billing-preferences.public-api';
import { TenantInsuranceOfferingTerms } from 'src/modules/tenant-management/public-api/tenant-insurance-offering-terms.public-api';
import { TenantPresentationPreferences } from 'src/modules/tenant-management/public-api/tenant-presentation-preferences.public-api';
import { BasePricingSelectionInput } from '../../pricing-engine/base/base-pricing-input.type';

type CalculateCartPriceResult = {
  currency: string | null;
  locale: string;
  subtotal: string;
  discountTotal: string;
  totalBeforeInsurance: string;
  chargedDays: number;
  insurance: {
    selected: boolean;
    applied: boolean;
    ratePercent: string;
    amount: string;
  };
  total: string;
  durationPolicySnapshot: PricingResult['durationPolicySnapshot'] | null;
  lines: PricingResult['lines'];
  appliedPromotions: PricingResult['appliedPromotions'];
  appliedCoupon: NonNullable<PricingResult['appliedCoupon']> | null;
};

@Injectable()
@QueryHandler(CalculateCartPriceQuery)
export class CalculateCartPriceHandler implements IQueryHandler<
  CalculateCartPriceQuery,
  Result<CalculateCartPriceResult, CalculateCartPriceError>
> {
  private readonly calculator = new RentalPricingService();

  constructor(
    private readonly pricingContextLoader: PricingContextLoader,
    private readonly catalogSelectionResolution: CatalogSelectionResolution,
    private readonly tenantBillingPreferences: TenantBillingPreferences,
    private readonly tenantInsuranceOfferingTerms: TenantInsuranceOfferingTerms,
    private readonly tenantPresentationPreferences: TenantPresentationPreferences,
    private readonly branchFacts: BranchFacts,
  ) {}

  async execute(query: CalculateCartPriceQuery): Promise<Result<CalculateCartPriceResult, CalculateCartPriceError>> {
    const context = this.errorContext(query);
    const validationError = this.validateQuery(query, context);
    if (validationError) {
      return err(validationError);
    }

    const [billingPreferencesResult, insuranceOfferingTermsResult, presentationPreferencesResult] = await Promise.all([
      this.tenantBillingPreferences.getTenantBillingPreferences({ tenantId: query.tenantId }),
      this.tenantInsuranceOfferingTerms.getTenantInsuranceOfferingTerms({ tenantId: query.tenantId }),
      this.tenantPresentationPreferences.getTenantPresentationPreferences({ tenantId: query.tenantId }),
    ]);
    if (billingPreferencesResult.isErr()) {
      return err(
        calculateCartPriceError(
          'pricing.tenant_config_unavailable',
          `Tenant pricing config for tenant "${query.tenantId}" is unavailable.`,
          billingPreferencesResult.error,
          context,
        ),
      );
    }
    if (insuranceOfferingTermsResult.isErr()) {
      return err(
        calculateCartPriceError(
          'pricing.tenant_config_unavailable',
          `Tenant pricing config for tenant "${query.tenantId}" is unavailable.`,
          insuranceOfferingTermsResult.error,
          context,
        ),
      );
    }
    if (presentationPreferencesResult.isErr()) {
      return err(
        calculateCartPriceError(
          'pricing.tenant_config_unavailable',
          `Tenant pricing config for tenant "${query.tenantId}" is unavailable.`,
          presentationPreferencesResult.error,
          context,
        ),
      );
    }
    const billingPreferences = billingPreferencesResult.value;
    const insuranceOfferingTerms = insuranceOfferingTermsResult.value;
    const presentationPreferences = presentationPreferencesResult.value;

    if (query.selectedOffers.length === 0) {
      return ok(
        this.buildEmptyResult({
          insuranceSelected: query.insuranceSelected,
          locale: presentationPreferences.locale,
          insuranceRatePercent: insuranceOfferingTerms.insuranceRatePercent,
        }),
      );
    }

    if (query.couponCode && !query.customerId) {
      return err(
        calculateCartPriceError(
          'pricing.coupon_requires_customer',
          'Coupon pricing requires a customer.',
          undefined,
          context,
        ),
      );
    }

    const branchContextResult = await this.branchFacts.getBranchFacts({
      tenantId: query.tenantId,
      branchId: query.branchId,
    });

    if (branchContextResult.isErr()) {
      if (branchContextResult.error.code === 'BranchNotFound') {
        return err(
          calculateCartPriceError(
            'pricing.branch_not_found',
            `Branch "${query.branchId}" was not found.`,
            branchContextResult.error,
            context,
          ),
        );
      }

      return err(
        calculateCartPriceError(
          'pricing.tenant_config_unavailable',
          `Tenant pricing config for tenant "${query.tenantId}" is unavailable.`,
          branchContextResult.error,
          context,
        ),
      );
    }

    if (!branchContextResult.value.isActive || branchContextResult.value.isDeleted) {
      return err(
        calculateCartPriceError(
          'pricing.branch_not_found',
          `Branch "${query.branchId}" was not found.`,
          undefined,
          context,
        ),
      );
    }

    const resolvedCatalogSelections = await this.catalogSelectionResolution.resolveSelectedRentalOffers({
      tenantId: query.tenantId,
      branchId: query.branchId,
      selectedOffers: query.selectedOffers.map((selection) => ({
        rentalOfferId: selection.rentalOfferId,
        quantity: selection.quantity,
      })),
    });

    if (resolvedCatalogSelections.isErr()) {
      return err(this.mapCatalogSelectionError(resolvedCatalogSelections.error, context));
    }

    const pricingContext = await this.pricingContextLoader.loadPricingCalculationContext({
      tenantId: query.tenantId,
      customerId: query.customerId,
      couponCode: query.couponCode,
      rentalOfferIds: query.selectedOffers.map((selection) => selection.rentalOfferId),
    });

    const pricingInput: PricingInput = {
      tenantId: query.tenantId,
      rentalPeriod: { start: query.rentalPeriodStart, end: query.rentalPeriodEnd },
      pricingConfig: createPricingDurationPolicy({
        effectiveTimezone: branchContextResult.value.effectiveTimezone,
        dailyBillingPolicy: billingPreferences.dailyBillingPolicy,
        weekendCountsAsOne: billingPreferences.weekendCountsAsOne,
      }),
      selections: resolvedCatalogSelections.value.resolvedOffers.map((offer) => ({
        rentalOfferId: offer.rentalOfferId,
        rentableItemId: offer.rentableItem.id,
        rentableItemName: offer.rentableItem.name,
        pricingLineKind: 'PRICEABLE_LINE',
        rentableItemKind: offer.rentableItem.kind,
        categoryId: offer.rentableItem.categoryId ?? undefined,
        quantity: offer.quantity,
        ratePlan: pricingContext.ratePlansByRentalOfferId.get(offer.rentalOfferId),
      })) as BasePricingSelectionInput[],
      customerId: query.customerId,
      calculationDate: new Date(),
      automaticPromotions: pricingContext.automaticPromotions,
      couponCode: query.couponCode,
      coupon: pricingContext.coupon,
    };

    let pricingResult: PricingResult;
    try {
      pricingResult = this.calculator.calculate(pricingInput);
    } catch (error) {
      return this.mapCalculationError(error, context);
    }

    return ok(
      this.buildResult({
        pricingResult,
        insuranceSelected: query.insuranceSelected,
        insuranceOfferingTerms,
        presentationPreferences,
      }),
    );
  }

  private errorContext(query: CalculateCartPriceQuery): Record<string, unknown> {
    return {
      useCase: 'CalculateCartPrice',
      tenantId: query.tenantId,
      branchId: query.branchId,
      customerId: query.customerId,
      hasCouponCode: Boolean(query.couponCode),
      selectedOfferCount: query.selectedOffers.length,
    };
  }

  private validateQuery(
    query: CalculateCartPriceQuery,
    context: Record<string, unknown>,
  ): CalculateCartPriceError | null {
    if (!query.tenantId.trim()) {
      return calculateCartPriceError('pricing.invalid_cart_selection', 'tenantId is required.', undefined, context);
    }
    if (!query.branchId.trim()) {
      return calculateCartPriceError('pricing.invalid_cart_selection', 'branchId is required.', undefined, context);
    }
    if (!(query.rentalPeriodStart instanceof Date) || Number.isNaN(query.rentalPeriodStart.getTime())) {
      return calculateCartPriceError(
        'pricing.invalid_rental_period',
        'rentalPeriod.start must be a valid date.',
        undefined,
        context,
      );
    }
    if (!(query.rentalPeriodEnd instanceof Date) || Number.isNaN(query.rentalPeriodEnd.getTime())) {
      return calculateCartPriceError(
        'pricing.invalid_rental_period',
        'rentalPeriod.end must be a valid date.',
        undefined,
        context,
      );
    }
    if (query.rentalPeriodEnd <= query.rentalPeriodStart) {
      return calculateCartPriceError(
        'pricing.invalid_rental_period',
        'rentalPeriod.end must be after rentalPeriod.start.',
        undefined,
        context,
      );
    }

    const seenRentalOfferIds = new Set<string>();
    for (const [index, selection] of query.selectedOffers.entries()) {
      if (!selection.rentalOfferId.trim()) {
        return calculateCartPriceError(
          'pricing.invalid_cart_selection',
          `selectedOffers.${index}.rentalOfferId is required.`,
          undefined,
          context,
        );
      }
      if (!Number.isInteger(selection.quantity) || selection.quantity <= 0) {
        return calculateCartPriceError(
          'pricing.invalid_cart_selection',
          `selectedOffers.${index}.quantity must be a positive integer.`,
          undefined,
          context,
        );
      }
      if (seenRentalOfferIds.has(selection.rentalOfferId)) {
        return calculateCartPriceError(
          'pricing.invalid_cart_selection',
          `Rental offer "${selection.rentalOfferId}" was selected more than once.`,
          undefined,
          context,
        );
      }
      seenRentalOfferIds.add(selection.rentalOfferId);
    }

    return null;
  }

  private buildEmptyResult(input: {
    insuranceSelected: boolean;
    locale: string;
    insuranceRatePercent: number;
  }): CalculateCartPriceResult {
    return {
      currency: null,
      locale: input.locale,
      subtotal: '0.00',
      discountTotal: '0.00',
      totalBeforeInsurance: '0.00',
      chargedDays: 0,
      insurance: {
        selected: input.insuranceSelected,
        applied: false,
        ratePercent: String(input.insuranceRatePercent),
        amount: '0.00',
      },
      total: '0.00',
      durationPolicySnapshot: null,
      lines: [],
      appliedPromotions: [],
      appliedCoupon: null,
    };
  }

  private buildResult(input: {
    pricingResult: PricingResult;
    insuranceSelected: boolean;
    insuranceOfferingTerms: { insuranceEnabled: boolean; insuranceRatePercent: number };
    presentationPreferences: { locale: string };
  }): CalculateCartPriceResult {
    const insuranceTerms = InsuranceCalculationService.resolveTerms(
      {
        insuranceEnabled: input.insuranceOfferingTerms.insuranceEnabled,
        insuranceRatePercent: input.insuranceOfferingTerms.insuranceRatePercent,
      },
      input.insuranceSelected,
    );
    const insurance = InsuranceCalculationService.calculate(input.pricingResult.subtotal, insuranceTerms);
    const total = new Decimal(input.pricingResult.total).plus(insurance.insuranceAmount);

    return {
      currency: input.pricingResult.currency,
      locale: input.presentationPreferences.locale,
      subtotal: input.pricingResult.subtotal,
      discountTotal: input.pricingResult.discountTotal,
      totalBeforeInsurance: input.pricingResult.total,
      chargedDays: input.pricingResult.chargedDays,
      insurance: {
        selected: input.insuranceSelected,
        applied: insurance.insuranceApplied,
        ratePercent: String(insurance.insuranceRatePercent),
        amount: insurance.insuranceAmount.toFixed(2),
      },
      total: total.toFixed(2),
      durationPolicySnapshot: input.pricingResult.durationPolicySnapshot,
      lines: input.pricingResult.lines,
      appliedPromotions: input.pricingResult.appliedPromotions,
      appliedCoupon: input.pricingResult.appliedCoupon ?? null,
    };
  }

  private mapCatalogSelectionError(
    error: CatalogSelectionResolutionError,
    context: Record<string, unknown>,
  ): CalculateCartPriceError {
    if (error.code === 'RentalOfferNotFound') {
      return calculateCartPriceError('pricing.rental_offer_not_found', error.message, error, context);
    }
    if (error.code === 'RentalOfferNotRentable') {
      return calculateCartPriceError('pricing.rental_offer_not_selectable', error.message, error, context);
    }
    if (error.code === 'RentableItemNotActive') {
      return calculateCartPriceError('pricing.rentable_item_inactive', error.message, error, context);
    }

    return calculateCartPriceError('pricing.invalid_cart_selection', error.message, error, context);
  }

  private mapCalculationError(
    error: unknown,
    context: Record<string, unknown>,
  ): Result<CalculateCartPriceResult, CalculateCartPriceError> {
    if (error instanceof CouponNotApplicableError) {
      return err(calculateCartPriceError('pricing.coupon_not_applicable', error.message, error, context));
    }

    if (error instanceof InvalidPricingInputError && error.message.includes('no active pricing')) {
      return err(calculateCartPriceError('pricing.missing_active_pricing', error.message, error, context));
    }

    throw error;
  }
}

export type { CalculateCartPriceResult };
