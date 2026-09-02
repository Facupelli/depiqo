import type { ProspectiveCartCostResponseDto } from '@repo/api-contracts';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import {
  CatalogSelectionResolution,
  CatalogSelectionResolutionError,
} from 'src/modules/catalog/public-api/catalog-selection-resolution.public-api';
import {
  PricingCalculationError,
  PricingCalculationResult,
} from 'src/modules/pricing/public-api/pricing-calculation.public-api';
import { BranchFacts } from 'src/modules/tenant-management/public-api/branch-facts.public-api';
import { TenantBillingPreferences } from 'src/modules/tenant-management/public-api/tenant-billing-preferences.public-api';
import { TenantInsuranceOfferingTerms } from 'src/modules/tenant-management/public-api/tenant-insurance-offering-terms.public-api';
import { TenantPresentationPreferences } from 'src/modules/tenant-management/public-api/tenant-presentation-preferences.public-api';

import {
  ProspectiveRentalCostInput,
  ProspectiveRentalCostService,
} from '../../application/prospective-rental-cost.service';
import {
  calculateProspectiveCartCostError,
  CalculateProspectiveCartCostError,
} from './calculate-prospective-cart-cost.errors';
import { CalculateProspectiveCartCostQuery } from './calculate-prospective-cart-cost.query';

export type CalculateProspectiveCartCostResult = Result<
  ProspectiveCartCostResponseDto,
  CalculateProspectiveCartCostError
>;

@QueryHandler(CalculateProspectiveCartCostQuery)
export class CalculateProspectiveCartCostHandler implements IQueryHandler<
  CalculateProspectiveCartCostQuery,
  CalculateProspectiveCartCostResult
> {
  constructor(
    private readonly prospectiveRentalCost: ProspectiveRentalCostService,
    private readonly catalogSelectionResolution: CatalogSelectionResolution,
    private readonly branchFacts: BranchFacts,
    private readonly tenantBillingPreferences: TenantBillingPreferences,
    private readonly tenantInsuranceOfferingTerms: TenantInsuranceOfferingTerms,
    private readonly tenantPresentationPreferences: TenantPresentationPreferences,
  ) {}

  async execute(query: CalculateProspectiveCartCostQuery): Promise<CalculateProspectiveCartCostResult> {
    const context = {
      useCase: 'CalculateProspectiveCartCost',
      tenantId: query.tenantId,
      branchId: query.branchId,
      selectedOfferCount: query.selectedOffers.length,
      hasCouponCode: Boolean(query.couponCode),
    };

    const [branchResult, billingResult, insuranceTermsResult, presentationResult, catalogResult] = await Promise.all([
      this.branchFacts.getBranchFacts({ tenantId: query.tenantId, branchId: query.branchId }),
      this.tenantBillingPreferences.getTenantBillingPreferences({ tenantId: query.tenantId }),
      this.tenantInsuranceOfferingTerms.getTenantInsuranceOfferingTerms({ tenantId: query.tenantId }),
      this.tenantPresentationPreferences.getTenantPresentationPreferences({ tenantId: query.tenantId }),
      this.catalogSelectionResolution.resolveSelectedRentalOffers({
        tenantId: query.tenantId,
        branchId: query.branchId,
        selectedOffers: query.selectedOffers,
      }),
    ]);

    if (branchResult.isErr()) {
      return err(
        calculateProspectiveCartCostError(
          branchResult.error.code === 'BranchNotFound'
            ? 'rental_commitment.branch_not_found'
            : 'rental_commitment.tenant_config_unavailable',
          branchResult.error.message,
          branchResult.error,
          context,
        ),
      );
    }
    if (!branchResult.value.isActive || branchResult.value.isDeleted) {
      return err(
        calculateProspectiveCartCostError(
          'rental_commitment.branch_not_found',
          `Branch "${query.branchId}" was not found.`,
          undefined,
          context,
        ),
      );
    }
    if (billingResult.isErr()) {
      return err(this.tenantConfigurationError(billingResult.error, context));
    }
    if (insuranceTermsResult.isErr()) {
      return err(this.tenantConfigurationError(insuranceTermsResult.error, context));
    }
    if (presentationResult.isErr()) {
      return err(this.tenantConfigurationError(presentationResult.error, context));
    }
    if (catalogResult.isErr()) return err(this.mapCatalogError(catalogResult.error, context));

    const offersById = new Map(
      catalogResult.value.resolvedOffers.map((offer) => [offer.rentalOfferId, offer] as const),
    );
    const pricingRequest = {
      tenantId: query.tenantId,
      customerId: query.customerId,
      couponCode: query.couponCode,
      rentalPeriod: { start: query.rentalPeriodStart, end: query.rentalPeriodEnd },
      calculationFacts: {
        effectiveTimezone: branchResult.value.effectiveTimezone,
        dailyBillingPolicy: billingResult.value.dailyBillingPolicy,
        weekendCountsAsOne: billingResult.value.weekendCountsAsOne,
      },
      insuranceSelected: query.insuranceSelected,
      lines: catalogResult.value.resolvedOffers.map((offer) => ({
        lineReference: offer.rentalOfferId,
        rentalOfferId: offer.rentalOfferId,
        rentableItemId: offer.rentableItem.id,
        rentableItemKind: offer.rentableItem.kind,
        categoryId: offer.rentableItem.categoryId,
        quantity: offer.quantity,
      })),
    };

    let prospectiveInput: ProspectiveRentalCostInput;
    if (query.fulfillmentMethod === 'PICKUP') {
      prospectiveInput = { fulfillmentMethod: 'PICKUP', pricing: pricingRequest };
    } else {
      const deliveryDetails = query.deliveryDetails;
      if (!deliveryDetails) {
        return err(
          calculateProspectiveCartCostError(
            'rental_commitment.invalid_prospective_cart',
            'Delivery details are required for Delivery fulfillment.',
            undefined,
            context,
          ),
        );
      }

      prospectiveInput = {
        fulfillmentMethod: 'DELIVERY',
        pricing: pricingRequest,
        branchId: query.branchId,
        customerLocation: {
          address: deliveryDetails.address,
          locationId: deliveryDetails.locationId,
        },
      };
    }

    const prospective = await this.prospectiveRentalCost.calculate(prospectiveInput);

    if (prospective.isErr()) {
      if (prospective.error instanceof PricingCalculationError) {
        return err(this.mapPricingError(prospective.error, context));
      }
      throw prospective.error;
    }
    if (!prospective.value.available) {
      return ok({ available: false, reason: prospective.value.reason });
    }

    return ok({
      available: true,
      pricing: this.mapPricing(
        prospective.value.pricing,
        presentationResult.value.locale,
        query.insuranceSelected,
        insuranceTermsResult.value.insuranceRatePercent,
        offersById,
      ),
      delivery: prospective.value.deliveryQuote
        ? {
            resolvedLocation: {
              formattedAddress: prospective.value.deliveryQuote.resolvedCustomerLocation.formattedAddress,
              addressLine1: prospective.value.deliveryQuote.resolvedCustomerLocation.addressLine1,
              addressLine2: prospective.value.deliveryQuote.resolvedCustomerLocation.addressLine2,
              city: prospective.value.deliveryQuote.resolvedCustomerLocation.city,
              state: prospective.value.deliveryQuote.resolvedCustomerLocation.state,
              postalCode: prospective.value.deliveryQuote.resolvedCustomerLocation.postalCode,
              country: prospective.value.deliveryQuote.resolvedCustomerLocation.country,
            },
            distanceMeters: prospective.value.deliveryQuote.distanceMeters,
            currency: prospective.value.deliveryQuote.currency,
            delivery: this.mapDeliveryLeg(prospective.value.deliveryQuote.delivery),
            collection: this.mapDeliveryLeg(prospective.value.deliveryQuote.collection),
            total: prospective.value.deliveryQuote.deliveryTotal,
            transportReservationMinutes: prospective.value.deliveryQuote.transportReservationMinutes,
          }
        : null,
      customerTotal: prospective.value.customerTotal,
      currency: prospective.value.currency,
    });
  }

  private mapPricing(
    result: PricingCalculationResult,
    locale: string,
    insuranceSelected: boolean,
    insuranceRatePercent: number,
    offersById: Map<string, { rentableItem: { name: string } }>,
  ): Extract<ProspectiveCartCostResponseDto, { available: true }>['pricing'] {
    return {
      currency: result.final.currency,
      locale,
      subtotal: result.final.subtotal,
      discountTotal: result.final.discountTotal,
      totalBeforeInsurance: result.totalBeforeInsurance,
      chargedDays: result.final.chargedDays,
      insurance: {
        selected: insuranceSelected,
        applied: result.insurance.applied,
        ratePercent: String(insuranceRatePercent),
        amount: result.insurance.amount,
      },
      total: result.total,
      durationPolicySnapshot: result.final.durationPolicy,
      lines: result.final.lines.map((line) => ({
        rentalOfferId: line.rentalOfferId,
        rentableItemId: line.rentableItemId,
        rentableItemName: offersById.get(line.rentalOfferId)?.rentableItem.name ?? line.rentalOfferId,
        categoryId: line.categoryId,
        quantity: line.quantity,
        chargedUnits: line.chargedUnits,
        billingUnit: line.billingUnit,
        ratePlanId: line.ratePlanId,
        appliedTierId: line.appliedTier.tierId,
        pricePerUnit: line.appliedTier.pricePerUnit,
        subtotal: line.subtotal,
        discountTotal: line.discountTotal,
        total: line.total,
        appliedAdjustments: line.appliedAdjustments.map((adjustment) => ({
          type: adjustment.type as 'PROMOTION' | 'COUPON',
          promotionId: adjustment.promotionId,
          couponId: adjustment.couponId,
          name: adjustment.name,
          amount: adjustment.amount,
        })),
      })),
      appliedPromotions: result.final.appliedPromotions,
      appliedCoupon: result.final.appliedCoupon ?? null,
    };
  }

  private mapDeliveryLeg(leg: {
    scheduledAt: Date;
    serviceLevel: 'NORMAL' | 'SPECIAL';
    basePrice: string;
    surcharge: string;
    total: string;
  }) {
    return { ...leg, scheduledAt: leg.scheduledAt.toISOString() };
  }

  private tenantConfigurationError(cause: unknown, context: Record<string, unknown>) {
    return calculateProspectiveCartCostError(
      'rental_commitment.tenant_config_unavailable',
      'Tenant pricing configuration is unavailable.',
      cause,
      context,
    );
  }

  private mapCatalogError(error: CatalogSelectionResolutionError, context: Record<string, unknown>) {
    const code =
      error.code === 'RentalOfferNotFound'
        ? ('rental_commitment.rental_offer_not_found' as const)
        : error.code === 'RentalOfferNotRentable' || error.code === 'RentableItemNotActive'
          ? ('rental_commitment.rental_offer_not_selectable' as const)
          : ('rental_commitment.invalid_prospective_cart' as const);
    return calculateProspectiveCartCostError(code, error.message, error, context);
  }

  private mapPricingError(error: PricingCalculationError, context: Record<string, unknown>) {
    const code =
      error.code === 'pricing_calculation.coupon_not_applicable'
        ? ('rental_commitment.coupon_not_applicable' as const)
        : error.code === 'pricing_calculation.invalid_request'
          ? ('rental_commitment.invalid_pricing_input' as const)
          : ('rental_commitment.pricing_unavailable' as const);
    return calculateProspectiveCartCostError(code, error.message, error, context);
  }
}
