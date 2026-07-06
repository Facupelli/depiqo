import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { CatalogPublicApi } from 'src/modules/catalog/public-api/catalog.public-api';
import { TenantManagementPublicApi } from 'src/modules/tenant-management/public-api/tenant-management.public-api';

import { InvalidPricingInputError, PricingError } from '../../pricing-engine/errors/pricing.errors';
import { RentalPriceSnapshotV1 } from '../../public-api/rental-price-snapshot.type';
import { PriceDraftRentalService } from '../price-draft-rental/price-draft-rental.service';
import {
  CalculateDraftRentalPriceApplicationError,
  calculateDraftRentalPriceApplicationError,
} from './calculate-draft-rental-price-application.error';
import { CalculateDraftRentalPriceQuery } from './calculate-draft-rental-price.query';

export type CalculateDraftRentalPriceResult = RentalPriceSnapshotV1;

@Injectable()
@QueryHandler(CalculateDraftRentalPriceQuery)
export class CalculateDraftRentalPriceHandler implements IQueryHandler<
  CalculateDraftRentalPriceQuery,
  Result<CalculateDraftRentalPriceResult, CalculateDraftRentalPriceApplicationError>
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalogApi: CatalogPublicApi,
    private readonly tenantManagementApi: TenantManagementPublicApi,
    private readonly priceDraftRentalService: PriceDraftRentalService,
  ) {}

  async execute(
    query: CalculateDraftRentalPriceQuery,
  ): Promise<Result<CalculateDraftRentalPriceResult, CalculateDraftRentalPriceApplicationError>> {
    const validationError = this.validateQuery(query);
    if (validationError) {
      return err(validationError);
    }

    const tenantPricingConfigResult = await this.tenantManagementApi.getTenantPricingConfig({
      tenantId: query.tenantId,
    });
    if (tenantPricingConfigResult.isErr()) {
      return err(
        calculateDraftRentalPriceApplicationError(
          'TenantPricingConfigUnavailable',
          `Tenant pricing config for tenant "${query.tenantId}" is unavailable.`,
          tenantPricingConfigResult.error,
        ),
      );
    }
    const tenantPricingConfig = tenantPricingConfigResult.value;

    // TODO: cross-module dependency
    const branch = await this.prisma.client.v2Branch.findFirst({
      where: { id: query.branchId, tenantId: query.tenantId, deletedAt: null, isActive: true },
      select: { id: true, timezone: true },
    });

    if (!branch) {
      return err(
        calculateDraftRentalPriceApplicationError('BranchNotFound', `Branch "${query.branchId}" was not found.`),
      );
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
      return err(
        calculateDraftRentalPriceApplicationError(
          'RentalOfferNotFound',
          'Rental offer was not found.',
          resolvedCatalogSelections.error,
        ),
      );
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
        timezone: branch.timezone ?? tenantPricingConfig.timezone,
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
      return err(this.toApplicationError(pricingResult.error));
    }

    return ok(pricingResult.value);
  }

  private validateQuery(query: CalculateDraftRentalPriceQuery): CalculateDraftRentalPriceApplicationError | null {
    if (!query.tenantId.trim()) {
      return calculateDraftRentalPriceApplicationError('InvalidDraftRentalPricingInput', 'tenantId is required.');
    }
    if (!query.tenantUserId.trim()) {
      return calculateDraftRentalPriceApplicationError('InvalidDraftRentalPricingInput', 'tenantUserId is required.');
    }
    if (!query.branchId.trim()) {
      return calculateDraftRentalPriceApplicationError('InvalidDraftRentalPricingInput', 'branchId is required.');
    }
    if (!(query.rentalPeriodStart instanceof Date) || Number.isNaN(query.rentalPeriodStart.getTime())) {
      return calculateDraftRentalPriceApplicationError('RentalPeriodInvalid', 'period.start must be a valid date.');
    }
    if (!(query.rentalPeriodEnd instanceof Date) || Number.isNaN(query.rentalPeriodEnd.getTime())) {
      return calculateDraftRentalPriceApplicationError('RentalPeriodInvalid', 'period.end must be a valid date.');
    }
    if (query.rentalPeriodEnd <= query.rentalPeriodStart) {
      return calculateDraftRentalPriceApplicationError('RentalPeriodInvalid', 'period.end must be after period.start.');
    }
    if (query.selectedOffers.length === 0) {
      return calculateDraftRentalPriceApplicationError(
        'InvalidDraftRentalPricingInput',
        'selectedOffers must contain at least one rental offer.',
      );
    }
    if (query.manualPricingAdjustment) {
      if (query.manualPricingAdjustment.mode !== 'TARGET_TOTAL') {
        return calculateDraftRentalPriceApplicationError(
          'InvalidDraftRentalPricingInput',
          'manualPricingAdjustment.mode is invalid.',
        );
      }
      if (!query.manualPricingAdjustment.targetTotal.trim()) {
        return calculateDraftRentalPriceApplicationError(
          'InvalidDraftRentalPricingInput',
          'manualPricingAdjustment.targetTotal is required.',
        );
      }
    }

    const seenRentalOfferIds = new Set<string>();
    for (const [index, selection] of query.selectedOffers.entries()) {
      if (!selection.rentalOfferId.trim()) {
        return calculateDraftRentalPriceApplicationError(
          'InvalidDraftRentalPricingInput',
          `selectedOffers.${index}.rentalOfferId is required.`,
        );
      }
      if (!Number.isInteger(selection.quantity) || selection.quantity <= 0) {
        return calculateDraftRentalPriceApplicationError(
          'InvalidDraftRentalPricingInput',
          `selectedOffers.${index}.quantity must be a positive integer.`,
        );
      }
      if (seenRentalOfferIds.has(selection.rentalOfferId)) {
        return calculateDraftRentalPriceApplicationError(
          'InvalidDraftRentalPricingInput',
          `Rental offer "${selection.rentalOfferId}" was selected more than once.`,
        );
      }
      seenRentalOfferIds.add(selection.rentalOfferId);
    }

    return null;
  }

  private toApplicationError(error: PricingError): CalculateDraftRentalPriceApplicationError {
    if (error instanceof InvalidPricingInputError && error.message.includes('no active pricing')) {
      return calculateDraftRentalPriceApplicationError('MissingActivePricing', error.message, error);
    }

    if (error instanceof PricingError) {
      return calculateDraftRentalPriceApplicationError('PricingCalculationFailed', error.message, error);
    }

    return calculateDraftRentalPriceApplicationError('Unexpected', 'An unexpected error occurred.', error);
  }
}
