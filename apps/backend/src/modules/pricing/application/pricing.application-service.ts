import Decimal from 'decimal.js';
import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { TenantConfig } from '@repo/schemas';
import { RoundingRule } from '@repo/types';
import { err, ok, Result } from 'neverthrow';
import { DateRange } from 'src/core/domain/value-objects/date-range.value-object';
import { PrismaTransactionClient } from 'src/core/database/prisma-unit-of-work';
import { BundleBookingEligibilityDto, CatalogPublicApi } from 'src/modules/catalog/catalog.public-api';
import { GetTenantConfigQuery } from 'src/modules/tenant/public/queries/get-tenant-config.query';
import { PricingProductTypeNotFoundError, PricingBundleNotFoundError } from '../domain/errors/pricing.errors';
import { PricingTier } from '../domain/entities/pricing-tier.entity';
import { BillingUnitResolverService } from '../domain/services/billing-unit-resolver.service';
import { NewPricingCalculatorService, NewPricingResult } from '../domain/services/new-pricing-calculator.service';
import {
  PriceBasketDto,
  PriceBasketBundleItemDto,
  PriceBasketProductItemDto,
  PriceBasketResultDto,
  PricedBasketBundleComponentDto,
  PricedLinePriceDto,
  PricingPublicApi,
  RedeemCouponDto,
  RedeemCouponError,
  ResolvedCouponDto,
  ResolveCouponForPricingDto,
  ResolveCouponForPricingError,
} from '../pricing.public-api';
import {
  ComponentTierData,
  PricingComputationReadService,
} from '../infrastructure/read-services/pricing-computation-read.service';
import { RedeemCouponService } from './services/redeem-coupon.service';
import { ResolveCouponForPricingService } from './services/resolve-coupon-for-pricing.service';
import { VoidCouponRedemptionService } from './services/void-coupon-redemption.service';
import {
  GetLocationContextQuery,
  LocationContextReadModel,
} from 'src/modules/tenant/public/queries/get-location-context.query';

type PricingContext = {
  effectiveTimezone: string;
  weekendCountsAsOne: boolean;
  roundingRule: RoundingRule;
};

@Injectable()
export class PricingApplicationService implements PricingPublicApi {
  private readonly calculator = new NewPricingCalculatorService();
  private readonly billingUnitResolver = new BillingUnitResolverService();

  constructor(
    private readonly queryBus: QueryBus,
    private readonly catalogApi: CatalogPublicApi,
    private readonly pricingRead: PricingComputationReadService,
    private readonly resolveCouponForPricingService: ResolveCouponForPricingService,
    private readonly redeemCouponService: RedeemCouponService,
    private readonly voidCouponRedemptionService: VoidCouponRedemptionService,
  ) {}

  async priceBasket(dto: PriceBasketDto): Promise<PriceBasketResultDto> {
    const { period, bookingCreatedAt, productItems, basketContext, resolvedCoupon } =
      await this.loadBasketPricingContext(dto);
    const { pricingContext, promotions, productMetas, bundleMetas, productTiers, bundleTiers, bundleEligibility } =
      basketContext;

    const standaloneProductQuantity = productItems.reduce((sum, item) => sum + (item.quantity ?? 1), 0);

    const applicablePromotionIds = resolvedCoupon ? [resolvedCoupon.promotionId] : undefined;

    const basePricedItems = dto.items.map((item) => {
      if (item.type === 'PRODUCT') {
        const meta = productMetas.get(item.productTypeId);
        if (!meta) {
          throw new PricingProductTypeNotFoundError(item.productTypeId);
        }

        return {
          type: 'PRODUCT' as const,
          quantity: item.quantity ?? 1,
          price: this.calculateProductPriceFromContext({
            productTypeId: item.productTypeId,
            period,
            currency: dto.currency,
            bookingCreatedAt,
            customerId: dto.customerId,
            standaloneProductQuantity,
            applyPromotions: false,
            meta,
            promotions,
            pricingContext,
            tiers: productTiers.get(item.productTypeId) ?? [],
          }),
        };
      }

      const meta = bundleMetas.get(item.bundleId);
      if (!meta) {
        throw new PricingBundleNotFoundError(item.bundleId);
      }

      return {
        type: 'BUNDLE' as const,
        quantity: item.quantity ?? 1,
        price: this.calculateBundlePriceFromContext({
          bundleId: item.bundleId,
          period,
          currency: dto.currency,
          bookingCreatedAt,
          customerId: dto.customerId,
          standaloneProductQuantity,
          applyPromotions: false,
          meta,
          promotions,
          pricingContext,
          tiers: bundleTiers.get(item.bundleId) ?? [],
        }),
      };
    });

    const orderSubtotalBeforePromotions = basePricedItems
      .reduce((sum, item) => sum.add(item.price.finalPrice.toDecimal().mul(item.quantity)), new Decimal(0))
      .toNumber();

    const uniqueBundleComponentProductTypeIds = [
      ...new Set(
        Array.from(bundleEligibility.values()).flatMap((bundle) =>
          bundle.components.map((component) => component.productTypeId),
        ),
      ),
    ];

    const componentStandalonePrices =
      uniqueBundleComponentProductTypeIds.length > 0
        ? await this.loadComponentStandalonePricesForBasket(
            dto.locationId,
            uniqueBundleComponentProductTypeIds,
            period,
            pricingContext,
          )
        : new Map<string, Decimal>();

    const items = dto.items.map((item) => {
      if (item.type === 'PRODUCT') {
        const meta = productMetas.get(item.productTypeId);
        if (!meta) {
          throw new PricingProductTypeNotFoundError(item.productTypeId);
        }

        return {
          type: 'PRODUCT' as const,
          productTypeId: item.productTypeId,
          quantity: item.quantity ?? 1,
          assetId: item.assetId,
          locationId: dto.locationId,
          period,
          currency: dto.currency,
          price: this.toPricedLinePriceDto(
            this.calculateProductPriceFromContext({
              productTypeId: item.productTypeId,
              period,
              currency: dto.currency,
              bookingCreatedAt,
              customerId: dto.customerId,
              applicablePromotionIds,
              standaloneProductQuantity,
              orderSubtotalBeforePromotions,
              applyPromotions: true,
              meta,
              promotions,
              pricingContext,
              tiers: productTiers.get(item.productTypeId) ?? [],
            }),
          ),
        };
      }

      const meta = bundleMetas.get(item.bundleId);
      if (!meta) {
        throw new PricingBundleNotFoundError(item.bundleId);
      }

      const bundle = bundleEligibility.get(item.bundleId);
      if (!bundle) {
        throw new PricingBundleNotFoundError(item.bundleId);
      }

      return {
        type: 'BUNDLE' as const,
        bundleId: item.bundleId,
        quantity: item.quantity ?? 1,
        locationId: dto.locationId,
        period,
        currency: dto.currency,
        price: this.toPricedLinePriceDto(
          this.calculateBundlePriceFromContext({
            bundleId: item.bundleId,
            period,
            currency: dto.currency,
            bookingCreatedAt,
            customerId: dto.customerId,
            applicablePromotionIds,
            standaloneProductQuantity,
            orderSubtotalBeforePromotions,
            applyPromotions: true,
            meta,
            promotions,
            pricingContext,
            tiers: bundleTiers.get(item.bundleId) ?? [],
          }),
        ),
        bundleName: bundle.name,
        components: bundle.components.map<PricedBasketBundleComponentDto>((component) => ({
          productTypeId: component.productTypeId,
          productTypeName: component.productTypeName,
          quantity: component.quantity,
          standalonePricePerUnit: componentStandalonePrices.get(component.productTypeId) ?? new Decimal(0),
        })),
      };
    });

    const itemsSubtotal = items
      .reduce((sum, item) => sum.add(item.price.finalPrice.toDecimal().mul(item.quantity)), new Decimal(0))
      .toNumber();
    const totalBeforeDiscounts = items
      .reduce((sum, item) => sum.add(item.price.basePrice.toDecimal().mul(item.quantity)), new Decimal(0))
      .toNumber();
    const totalDiscount = items
      .reduce(
        (sum, item) =>
          sum.add(
            item.price.appliedAdjustments
              .reduce((lineSum, adjustment) => lineSum.add(adjustment.discountAmount.toDecimal()), new Decimal(0))
              .mul(item.quantity),
          ),
        new Decimal(0),
      )
      .toNumber();

    return {
      items,
      resolvedCoupon,
      couponApplied: resolvedCoupon !== undefined,
      orderSubtotalBeforePromotions,
      itemsSubtotal,
      totalBeforeDiscounts,
      totalDiscount,
    };
  }

  async resolveCouponForPricing(
    dto: ResolveCouponForPricingDto,
  ): Promise<Result<ResolvedCouponDto, ResolveCouponForPricingError>> {
    const result = await this.resolveCouponForPricingService.resolveCouponForPricing(dto);
    return result.isErr() ? err(result.error) : ok(result.value);
  }

  async redeemCouponWithinTransaction(
    dto: RedeemCouponDto,
    tx: PrismaTransactionClient,
  ): Promise<Result<void, RedeemCouponError>> {
    const result = await this.redeemCouponService.redeemWithinTransaction(dto, tx);
    return result.isErr() ? err(result.error) : ok(undefined);
  }

  async voidCouponRedemptionWithinTransaction(orderId: string, tx: PrismaTransactionClient): Promise<void> {
    await this.voidCouponRedemptionService.voidRedemption(orderId, tx);
  }

  private toPricedLinePriceDto(result: NewPricingResult): PricedLinePriceDto {
    return {
      basePrice: result.basePrice,
      finalPrice: result.finalPrice,
      pricePerBillingUnit: result.pricePerBillingUnit,
      totalUnits: result.totalUnits,
      appliedAdjustments: result.appliedAdjustments.map((adjustment) => ({
        sourceKind: adjustment.sourceKind,
        sourceId: adjustment.sourceId,
        label: adjustment.label,
        effectType: adjustment.effectType,
        configuredValue: adjustment.configuredValue,
        discountAmount: adjustment.discountAmount,
      })),
    };
  }

  private async loadPricingContext(tenantId: string, locationId: string): Promise<PricingContext> {
    const [locationContext, tenantConfig] = await Promise.all([
      this.queryBus.execute<GetLocationContextQuery, LocationContextReadModel | null>(
        new GetLocationContextQuery(tenantId, locationId),
      ),
      this.queryBus.execute<GetTenantConfigQuery, TenantConfig | null>(new GetTenantConfigQuery(tenantId)),
    ]);

    if (!locationContext) {
      throw new Error(`Location context not found for location "${locationId}"`);
    }

    if (!tenantConfig) {
      throw new Error(`Tenant config not found for tenant "${tenantId}"`);
    }

    return {
      effectiveTimezone: locationContext.effectiveTimezone,
      weekendCountsAsOne: tenantConfig.pricing.weekendCountsAsOne,
      roundingRule: tenantConfig.pricing.roundingRule,
    };
  }

  private normalizePeriod(period: { start: Date; end: Date } | DateRange): DateRange {
    return period instanceof DateRange ? period : DateRange.create(period.start, period.end);
  }

  private async loadBasketPricingContext(dto: PriceBasketDto): Promise<{
    period: DateRange;
    bookingCreatedAt: Date;
    productItems: PriceBasketProductItemDto[];
    basketContext: {
      pricingContext: PricingContext;
      promotions: Awaited<ReturnType<PricingComputationReadService['loadActivePromotionsForTenant']>>;
      productMetas: Awaited<ReturnType<PricingComputationReadService['loadProductTypeMetaBatch']>>;
      bundleMetas: Awaited<ReturnType<PricingComputationReadService['loadBundleMetaBatch']>>;
      productTiers: Awaited<ReturnType<PricingComputationReadService['loadTiersForProducts']>>;
      bundleTiers: Awaited<ReturnType<PricingComputationReadService['loadTiersForBundles']>>;
      bundleEligibility: Map<string, BundleBookingEligibilityDto>;
    };
    resolvedCoupon: ResolvedCouponDto | undefined;
  }> {
    const period = this.normalizePeriod(dto.period);
    const bookingCreatedAt = dto.bookingCreatedAt ?? new Date();
    const productItems = dto.items.filter((item): item is PriceBasketProductItemDto => item.type === 'PRODUCT');
    const bundleItems = dto.items.filter((item): item is PriceBasketBundleItemDto => item.type === 'BUNDLE');
    const uniqueProductTypeIds = [...new Set(productItems.map((item) => item.productTypeId))];
    const uniqueBundleIds = [...new Set(bundleItems.map((item) => item.bundleId))];

    const [
      pricingContext,
      promotions,
      productMetas,
      bundleMetas,
      productTiers,
      bundleTiers,
      bundleEligibility,
      resolvedCoupon,
    ] = await Promise.all([
      this.loadPricingContext(dto.tenantId, dto.locationId),
      this.pricingRead.loadActivePromotionsForTenant(dto.tenantId),
      uniqueProductTypeIds.length > 0
        ? this.pricingRead.loadProductTypeMetaBatch(uniqueProductTypeIds)
        : Promise.resolve(new Map()),
      uniqueBundleIds.length > 0 ? this.pricingRead.loadBundleMetaBatch(uniqueBundleIds) : Promise.resolve(new Map()),
      uniqueProductTypeIds.length > 0
        ? this.pricingRead.loadTiersForProducts(uniqueProductTypeIds, dto.locationId)
        : Promise.resolve(new Map()),
      uniqueBundleIds.length > 0
        ? this.pricingRead.loadTiersForBundles(uniqueBundleIds, dto.locationId)
        : Promise.resolve(new Map()),
      this.loadBundleEligibility(dto.tenantId, dto.locationId, uniqueBundleIds),
      this.resolveCouponIfProvided(dto.tenantId, dto.customerId, dto.couponCode, bookingCreatedAt),
    ]);

    return {
      period,
      bookingCreatedAt,
      productItems,
      basketContext: {
        pricingContext,
        promotions,
        productMetas,
        bundleMetas,
        productTiers,
        bundleTiers,
        bundleEligibility,
      },
      resolvedCoupon,
    };
  }

  private async resolveCouponIfProvided(
    tenantId: string,
    customerId: string | undefined,
    couponCode: string | undefined,
    now: Date,
  ): Promise<ResolvedCouponDto | undefined> {
    if (!couponCode) {
      return undefined;
    }

    const result = await this.resolveCouponForPricing({
      tenantId,
      code: couponCode,
      customerId,
      now,
    });

    if (result.isErr()) {
      throw result.error;
    }

    return result.value;
  }

  private async loadBundleEligibility(
    tenantId: string,
    locationId: string,
    bundleIds: string[],
  ): Promise<Map<string, BundleBookingEligibilityDto>> {
    const bundleMetas = await Promise.all(
      bundleIds.map((id) => this.catalogApi.getBundleBookingEligibility(tenantId, locationId, id)),
    );

    return new Map(
      bundleIds.map((id, index) => {
        const bundleMeta = bundleMetas[index];
        if (!bundleMeta) {
          throw new PricingBundleNotFoundError(id);
        }

        return [id, bundleMeta];
      }),
    );
  }

  private async loadComponentStandalonePricesForBasket(
    locationId: string,
    componentProductTypeIds: string[],
    period: DateRange,
    pricingContext: PricingContext,
  ): Promise<Map<string, Decimal>> {
    const componentData = await this.pricingRead.loadTiersForBundleComponents(componentProductTypeIds, locationId);

    return this.resolveStandaloneComponentPrices(componentData, period, pricingContext, locationId);
  }

  private resolveStandaloneComponentPrices(
    componentData: Map<string, ComponentTierData>,
    period: DateRange,
    pricingContext: PricingContext,
    locationId: string,
  ): Map<string, Decimal> {
    const result = new Map<string, Decimal>();

    for (const [productTypeId, { billingUnitDurationMinutes, tiers }] of componentData) {
      const units = this.billingUnitResolver.resolveUnits({
        period,
        billingUnitDurationMinutes,
        effectiveTimezone: pricingContext.effectiveTimezone,
        weekendCountsAsOne: pricingContext.weekendCountsAsOne,
        roundingRule: pricingContext.roundingRule,
      });

      const tier = tiers.find((candidate) => candidate.coversUnits(units));
      if (!tier) {
        throw new Error(
          `No pricing tier found for component product type "${productTypeId}" at location "${locationId}" for ${units} units.`,
        );
      }

      result.set(productTypeId, tier.pricePerUnit);
    }

    return result;
  }

  private calculateProductPriceFromContext(input: {
    productTypeId: string;
    period: DateRange;
    currency: string;
    bookingCreatedAt: Date;
    customerId?: string;
    applicablePromotionIds?: string[];
    standaloneProductQuantity: number;
    orderSubtotalBeforePromotions?: number;
    applyPromotions: boolean;
    meta: { billingUnitDurationMinutes: number };
    promotions: Awaited<ReturnType<PricingComputationReadService['loadActivePromotionsForTenant']>>;
    pricingContext: PricingContext;
    tiers: PricingTier[];
  }): NewPricingResult {
    return this.calculator.calculate({
      period: input.period,
      billingUnitDurationMinutes: input.meta.billingUnitDurationMinutes,
      effectiveTimezone: input.pricingContext.effectiveTimezone,
      weekendCountsAsOne: input.pricingContext.weekendCountsAsOne,
      roundingRule: input.pricingContext.roundingRule,
      tiers: input.tiers,
      promotions: input.promotions,
      context: {
        period: input.period,
        bookingCreatedAt: input.bookingCreatedAt,
        orderCurrency: input.currency,
        productTypeId: input.productTypeId,
        customerId: input.customerId,
        applicablePromotionIds: input.applicablePromotionIds,
        standaloneProductQuantity: input.standaloneProductQuantity,
        orderSubtotalBeforePromotions: input.orderSubtotalBeforePromotions,
      },
      currency: input.currency,
      entityId: input.productTypeId,
      applyPromotions: input.applyPromotions,
    });
  }

  private calculateBundlePriceFromContext(input: {
    bundleId: string;
    period: DateRange;
    currency: string;
    bookingCreatedAt: Date;
    customerId?: string;
    applicablePromotionIds?: string[];
    standaloneProductQuantity: number;
    orderSubtotalBeforePromotions?: number;
    applyPromotions: boolean;
    meta: { billingUnitDurationMinutes: number };
    promotions: Awaited<ReturnType<PricingComputationReadService['loadActivePromotionsForTenant']>>;
    pricingContext: PricingContext;
    tiers: PricingTier[];
  }): NewPricingResult {
    return this.calculator.calculate({
      period: input.period,
      billingUnitDurationMinutes: input.meta.billingUnitDurationMinutes,
      effectiveTimezone: input.pricingContext.effectiveTimezone,
      weekendCountsAsOne: input.pricingContext.weekendCountsAsOne,
      roundingRule: input.pricingContext.roundingRule,
      tiers: input.tiers,
      promotions: input.promotions,
      context: {
        period: input.period,
        bookingCreatedAt: input.bookingCreatedAt,
        orderCurrency: input.currency,
        bundleId: input.bundleId,
        customerId: input.customerId,
        applicablePromotionIds: input.applicablePromotionIds,
        standaloneProductQuantity: input.standaloneProductQuantity,
        orderSubtotalBeforePromotions: input.orderSubtotalBeforePromotions,
      },
      currency: input.currency,
      entityId: input.bundleId,
      applyPromotions: input.applyPromotions,
    });
  }
}
