import { Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import Decimal from 'decimal.js';
import { err, ok, Result } from 'neverthrow';

import { InsuranceCalculationService } from 'src/core/domain/services/insurance-calculation.service';
import { PrismaService } from 'src/core/database/prisma.service';

import { PricingContextLoader } from '../../application/pricing-context-loader';
import {
  CouponNotApplicableError,
  InvalidPricingInputError,
  PricingError,
} from '../../pricing-engine/errors/pricing.errors';
import { PricingInput } from '../../pricing-engine/final/pricing-input.types';
import { PricingResult } from '../../pricing-engine/final/pricing-result.type';
import { RentalPricingService } from '../../pricing-engine/final/rental-pricing.service';
import {
  CalculateCartPriceApplicationError,
  calculateCartPriceApplicationError,
} from './calculate-cart-price-application.error';
import { CalculateCartPriceQuery } from './calculate-cart-price.query';
import { CatalogPublicApi } from 'src/modules/catalog/public-api/catalog.public-api';
import {
  GetTenantPricingConfigResult,
  TenantManagementPublicApi,
} from 'src/modules/tenant-management/public-api/tenant-management.public-api';
import { BasePricingSelectionInput } from '../../public-api/pricing.public-api';

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
  Result<CalculateCartPriceResult, CalculateCartPriceApplicationError>
> {
  private readonly calculator = new RentalPricingService();

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingContextLoader: PricingContextLoader,
    private readonly catalogApi: CatalogPublicApi,
    private readonly tenantManagementApi: TenantManagementPublicApi,
  ) {}

  async execute(
    query: CalculateCartPriceQuery,
  ): Promise<Result<CalculateCartPriceResult, CalculateCartPriceApplicationError>> {
    const validationError = this.validateQuery(query);
    if (validationError) {
      return err(validationError);
    }

    const tenantPricingConfigResult = await this.tenantManagementApi.getTenantPricingConfig({
      tenantId: query.tenantId,
    });
    if (tenantPricingConfigResult.isErr()) {
      return err(
        calculateCartPriceApplicationError(
          'TenantPricingConfigUnavailable',
          `Tenant pricing config for tenant "${query.tenantId}" is unavailable.`,
          tenantPricingConfigResult.error,
        ),
      );
    }
    const tenantPricingConfig = tenantPricingConfigResult.value;

    if (query.selectedOffers.length === 0) {
      return ok(
        this.buildEmptyResult({
          insuranceSelected: query.insuranceSelected,
          locale: tenantPricingConfig.locale,
          insuranceRatePercent: tenantPricingConfig.insuranceRatePercent,
        }),
      );
    }

    if (query.couponCode && !query.customerId) {
      return err(calculateCartPriceApplicationError('CouponRequiresCustomer', 'Coupon pricing requires a customer.'));
    }

    const branch = await this.prisma.client.v2Branch.findFirst({
      where: { id: query.branchId, tenantId: query.tenantId, deletedAt: null, isActive: true },
      select: { id: true, timezone: true },
    });

    if (!branch) {
      return err(calculateCartPriceApplicationError('BranchNotFound', `Branch "${query.branchId}" was not found.`));
    }

    const resolvedCatalogSelections = await this.catalogApi.resolveSelectedRentalOffers({
      tenantId: query.tenantId,
      branchId: query.branchId,
      selectedOffers: query.selectedOffers.map((selection) => ({
        rentalOfferId: selection.rentalOfferId,
        quantity: selection.quantity,
      })),
    });

    if (resolvedCatalogSelections.isErr()) {
      return err(calculateCartPriceApplicationError('RentalOfferNotFound', `Rental offer was not found.`));
    }

    try {
      const pricingContext = await this.pricingContextLoader.loadPricingCalculationContext({
        tenantId: query.tenantId,
        customerId: query.customerId,
        couponCode: query.couponCode,
        rentalOfferIds: query.selectedOffers.map((selection) => selection.rentalOfferId),
      });

      const pricingInput: PricingInput = {
        tenantId: query.tenantId,
        branchId: query.branchId,
        rentalPeriod: { start: query.rentalPeriodStart, end: query.rentalPeriodEnd },
        pricingConfig: {
          timezone: branch.timezone ?? tenantPricingConfig.timezone,
          dailyBillingPolicy: tenantPricingConfig.dailyBillingPolicy,
          minimumChargedDays: tenantPricingConfig.minimumChargedDays,
          halfDayThresholdMinutes: tenantPricingConfig.halfDayThresholdMinutes,
        },
        selections: resolvedCatalogSelections.value.resolvedOffers.map((offer) => ({
          rentalOfferId: offer.rentalOfferId,
          rentableItemId: offer.rentableItem.id,
          rentableItemName: offer.rentableItem.name,
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

      const pricingResult = this.calculator.calculate(pricingInput);

      return ok(
        this.buildResult({
          pricingResult,
          insuranceSelected: query.insuranceSelected,
          tenantPricingConfig,
        }),
      );
    } catch (error) {
      return this.mapCalculationError(error);
    }
  }

  private validateQuery(query: CalculateCartPriceQuery): CalculateCartPriceApplicationError | null {
    if (!query.tenantId.trim()) {
      return calculateCartPriceApplicationError('InvalidCartSelection', 'tenantId is required.');
    }
    if (!query.branchId.trim()) {
      return calculateCartPriceApplicationError('InvalidCartSelection', 'branchId is required.');
    }
    if (!(query.rentalPeriodStart instanceof Date) || Number.isNaN(query.rentalPeriodStart.getTime())) {
      return calculateCartPriceApplicationError('RentalPeriodInvalid', 'rentalPeriod.start must be a valid date.');
    }
    if (!(query.rentalPeriodEnd instanceof Date) || Number.isNaN(query.rentalPeriodEnd.getTime())) {
      return calculateCartPriceApplicationError('RentalPeriodInvalid', 'rentalPeriod.end must be a valid date.');
    }
    if (query.rentalPeriodEnd <= query.rentalPeriodStart) {
      return calculateCartPriceApplicationError(
        'RentalPeriodInvalid',
        'rentalPeriod.end must be after rentalPeriod.start.',
      );
    }

    const seenRentalOfferIds = new Set<string>();
    for (const [index, selection] of query.selectedOffers.entries()) {
      if (!selection.rentalOfferId.trim()) {
        return calculateCartPriceApplicationError(
          'InvalidCartSelection',
          `selectedOffers.${index}.rentalOfferId is required.`,
        );
      }
      if (!Number.isInteger(selection.quantity) || selection.quantity <= 0) {
        return calculateCartPriceApplicationError(
          'InvalidCartSelection',
          `selectedOffers.${index}.quantity must be a positive integer.`,
        );
      }
      if (seenRentalOfferIds.has(selection.rentalOfferId)) {
        return calculateCartPriceApplicationError(
          'InvalidCartSelection',
          `Rental offer "${selection.rentalOfferId}" was selected more than once.`,
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
    tenantPricingConfig: GetTenantPricingConfigResult;
  }): CalculateCartPriceResult {
    const insuranceTerms = InsuranceCalculationService.resolveTerms(
      {
        insuranceEnabled: input.tenantPricingConfig.insuranceEnabled,
        insuranceRatePercent: input.tenantPricingConfig.insuranceRatePercent,
      },
      input.insuranceSelected,
    );
    const insurance = InsuranceCalculationService.calculate(input.pricingResult.subtotal, insuranceTerms);
    const total = new Decimal(input.pricingResult.total).plus(insurance.insuranceAmount);

    return {
      currency: input.pricingResult.currency,
      locale: input.tenantPricingConfig.locale,
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

  private mapCalculationError(error: unknown): Result<CalculateCartPriceResult, CalculateCartPriceApplicationError> {
    if (error instanceof CouponNotApplicableError) {
      return err(calculateCartPriceApplicationError('CouponNotApplicable', error.message, error));
    }

    if (error instanceof InvalidPricingInputError && error.message.includes('no active pricing')) {
      return err(calculateCartPriceApplicationError('MissingActivePricing', error.message, error));
    }

    if (error instanceof PricingError) {
      return err(calculateCartPriceApplicationError('PricingCalculationFailed', error.message, error));
    }

    throw error;
  }
}

export type { CalculateCartPriceResult };
