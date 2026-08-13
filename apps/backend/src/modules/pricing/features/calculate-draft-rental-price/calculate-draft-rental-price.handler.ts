import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import {
  CatalogSelectionResolution,
  CatalogSelectionResolutionError,
} from 'src/modules/catalog/public-api/catalog-selection-resolution.public-api';
import { TenantManagementPublicApi } from 'src/modules/tenant-management/public-api/tenant-management.public-api';

import { InvalidPricingInputError, PricingError } from '../../pricing-engine/errors/pricing.errors';
import { RentalPriceSnapshotV1 } from '../../public-api/rental-price-snapshot.type';
import { PriceDraftRentalService } from '../price-draft-rental/price-draft-rental.service';
import { CalculateDraftRentalPriceError, calculateDraftRentalPriceError } from './calculate-draft-rental-price.errors';
import { CalculateDraftRentalPriceQuery } from './calculate-draft-rental-price.query';

export type CalculateDraftRentalPriceResult = RentalPriceSnapshotV1;

@Injectable()
@QueryHandler(CalculateDraftRentalPriceQuery)
export class CalculateDraftRentalPriceHandler implements IQueryHandler<
  CalculateDraftRentalPriceQuery,
  Result<CalculateDraftRentalPriceResult, CalculateDraftRentalPriceError>
> {
  constructor(
    private readonly catalogSelectionResolution: CatalogSelectionResolution,
    private readonly tenantManagementApi: TenantManagementPublicApi,
    private readonly priceDraftRentalService: PriceDraftRentalService,
  ) {}

  async execute(
    query: CalculateDraftRentalPriceQuery,
  ): Promise<Result<CalculateDraftRentalPriceResult, CalculateDraftRentalPriceError>> {
    const context = this.errorContext(query);
    const validationError = this.validateQuery(query, context);
    if (validationError) {
      return err(validationError);
    }

    const tenantPricingConfigResult = await this.tenantManagementApi.getTenantPricingConfig({
      tenantId: query.tenantId,
    });
    if (tenantPricingConfigResult.isErr()) {
      return err(
        calculateDraftRentalPriceError(
          'pricing.tenant_config_unavailable',
          `Tenant pricing config for tenant "${query.tenantId}" is unavailable.`,
          tenantPricingConfigResult.error,
          context,
        ),
      );
    }
    const tenantPricingConfig = tenantPricingConfigResult.value;

    const branchContextResult = await this.tenantManagementApi.getBranchContext({
      tenantId: query.tenantId,
      branchId: query.branchId,
    });

    if (branchContextResult.isErr()) {
      if (branchContextResult.error.code === 'BranchNotFound') {
        return err(
          calculateDraftRentalPriceError(
            'pricing.branch_not_found',
            `Branch "${query.branchId}" was not found.`,
            branchContextResult.error,
            context,
          ),
        );
      }

      return err(
        calculateDraftRentalPriceError(
          'pricing.tenant_config_unavailable',
          `Tenant pricing config for tenant "${query.tenantId}" is unavailable.`,
          branchContextResult.error,
          context,
        ),
      );
    }

    if (!branchContextResult.value.isActive || branchContextResult.value.isDeleted) {
      return err(
        calculateDraftRentalPriceError(
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

    const pricingResult = await this.priceDraftRentalService.price({
      tenantId: query.tenantId,
      branchId: query.branchId,
      customerId: query.rentalCustomerId,
      rentalPeriod: {
        start: query.rentalPeriodStart,
        end: query.rentalPeriodEnd,
      },
      pricingConfig: {
        timezone: branchContextResult.value.effectiveTimezone,
        dailyBillingPolicy: tenantPricingConfig.dailyBillingPolicy,
        minimumChargedDays: tenantPricingConfig.minimumChargedDays,
        halfDayThresholdMinutes: tenantPricingConfig.halfDayThresholdMinutes,
      },
      selections: resolvedCatalogSelections.value.resolvedOffers.map((offer) => ({
        rentalSelectionId: randomUUID(),
        rentalOfferId: offer.rentalOfferId,
        rentableItemId: offer.rentableItem.id,
        rentableItemName: offer.rentableItem.name,
        rentableItemKind: offer.rentableItem.kind,
        categoryId: offer.rentableItem.categoryId ?? undefined,
        quantity: offer.quantity,
      })),
      manualPricingAdjustment: query.manualPricingAdjustment
        ? {
            ...query.manualPricingAdjustment,
            setByTenantUserId: query.tenantUserId,
          }
        : undefined,
    });

    if (pricingResult.isErr()) {
      return err(this.toApplicationError(pricingResult.error, context));
    }

    return ok(pricingResult.value);
  }

  private errorContext(query: CalculateDraftRentalPriceQuery): Record<string, unknown> {
    return {
      useCase: 'CalculateDraftRentalPrice',
      tenantId: query.tenantId,
      tenantUserId: query.tenantUserId,
      branchId: query.branchId,
      rentalCustomerId: query.rentalCustomerId,
      selectedOfferCount: query.selectedOffers.length,
      hasManualPricingAdjustment: Boolean(query.manualPricingAdjustment),
    };
  }

  private validateQuery(
    query: CalculateDraftRentalPriceQuery,
    context: Record<string, unknown>,
  ): CalculateDraftRentalPriceError | null {
    if (!query.tenantId.trim()) {
      return calculateDraftRentalPriceError(
        'pricing.invalid_draft_rental_selection',
        'tenantId is required.',
        undefined,
        context,
      );
    }
    if (!query.tenantUserId.trim()) {
      return calculateDraftRentalPriceError(
        'pricing.invalid_draft_rental_selection',
        'tenantUserId is required.',
        undefined,
        context,
      );
    }
    if (!query.branchId.trim()) {
      return calculateDraftRentalPriceError(
        'pricing.invalid_draft_rental_selection',
        'branchId is required.',
        undefined,
        context,
      );
    }
    if (!(query.rentalPeriodStart instanceof Date) || Number.isNaN(query.rentalPeriodStart.getTime())) {
      return calculateDraftRentalPriceError(
        'pricing.invalid_rental_period',
        'period.start must be a valid date.',
        undefined,
        context,
      );
    }
    if (!(query.rentalPeriodEnd instanceof Date) || Number.isNaN(query.rentalPeriodEnd.getTime())) {
      return calculateDraftRentalPriceError(
        'pricing.invalid_rental_period',
        'period.end must be a valid date.',
        undefined,
        context,
      );
    }
    if (query.rentalPeriodEnd <= query.rentalPeriodStart) {
      return calculateDraftRentalPriceError(
        'pricing.invalid_rental_period',
        'period.end must be after period.start.',
        undefined,
        context,
      );
    }
    if (query.selectedOffers.length === 0) {
      return calculateDraftRentalPriceError(
        'pricing.invalid_draft_rental_selection',
        'selectedOffers must contain at least one rental offer.',
        undefined,
        context,
      );
    }
    if (query.manualPricingAdjustment) {
      if (query.manualPricingAdjustment.mode !== 'TARGET_TOTAL') {
        return calculateDraftRentalPriceError(
          'pricing.invalid_draft_rental_selection',
          'manualPricingAdjustment.mode is invalid.',
          undefined,
          context,
        );
      }
      if (!query.manualPricingAdjustment.targetTotal.trim()) {
        return calculateDraftRentalPriceError(
          'pricing.invalid_draft_rental_selection',
          'manualPricingAdjustment.targetTotal is required.',
          undefined,
          context,
        );
      }
    }

    const seenRentalOfferIds = new Set<string>();
    for (const [index, selection] of query.selectedOffers.entries()) {
      if (!selection.rentalOfferId.trim()) {
        return calculateDraftRentalPriceError(
          'pricing.invalid_draft_rental_selection',
          `selectedOffers.${index}.rentalOfferId is required.`,
          undefined,
          context,
        );
      }
      if (!Number.isInteger(selection.quantity) || selection.quantity <= 0) {
        return calculateDraftRentalPriceError(
          'pricing.invalid_draft_rental_selection',
          `selectedOffers.${index}.quantity must be a positive integer.`,
          undefined,
          context,
        );
      }
      if (seenRentalOfferIds.has(selection.rentalOfferId)) {
        return calculateDraftRentalPriceError(
          'pricing.invalid_draft_rental_selection',
          `Rental offer "${selection.rentalOfferId}" was selected more than once.`,
          undefined,
          context,
        );
      }
      seenRentalOfferIds.add(selection.rentalOfferId);
    }

    return null;
  }

  private mapCatalogSelectionError(
    error: CatalogSelectionResolutionError,
    context: Record<string, unknown>,
  ): CalculateDraftRentalPriceError {
    if (error.code === 'RentalOfferNotFound') {
      return calculateDraftRentalPriceError('pricing.rental_offer_not_found', error.message, error, context);
    }
    if (error.code === 'RentalOfferNotRentable') {
      return calculateDraftRentalPriceError('pricing.rental_offer_not_selectable', error.message, error, context);
    }
    if (error.code === 'RentableItemNotActive') {
      return calculateDraftRentalPriceError('pricing.rentable_item_inactive', error.message, error, context);
    }

    return calculateDraftRentalPriceError('pricing.invalid_draft_rental_selection', error.message, error, context);
  }

  private toApplicationError(error: PricingError, context: Record<string, unknown>): CalculateDraftRentalPriceError {
    if (error instanceof InvalidPricingInputError && error.message.includes('no active pricing')) {
      return calculateDraftRentalPriceError('pricing.missing_active_pricing', error.message, error, context);
    }

    if (error instanceof PricingError) {
      return calculateDraftRentalPriceError('pricing.invalid_pricing_configuration', error.message, error, context);
    }

    throw error;
  }
}
