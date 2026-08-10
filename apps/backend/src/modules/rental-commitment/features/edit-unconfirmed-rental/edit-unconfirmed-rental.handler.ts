import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { CatalogPublicApi, ResolveSelectedRentalOffersError } from 'src/modules/catalog/public-api/catalog.public-api';
import { PricingPublicApi } from 'src/modules/pricing/public-api/pricing.public-api';
import { TenantManagementPublicApi } from 'src/modules/tenant-management/public-api/tenant-management.public-api';

import {
  BranchUnavailableForRentalError,
  DuplicateRentalOfferSelectionError,
  InvalidCatalogSelectionQuantityError,
  PickupTimeOutsideBranchScheduleError,
  RentalCannotBeEditedFromStatusError,
  RentalContainsOperationalCommitmentsError,
  RentalCustomerUnavailableForRentalError,
  RentalInvalidFieldError,
  RentalMustContainSelectionError,
  ReturnTimeOutsideBranchScheduleError,
  TenantUnavailableForRentalError,
  UnsupportedBranchFulfillmentMethodError,
} from '../../domain/errors/rental-commitment.errors';
import { RentalDemandLineId } from '../../domain/ids/rental-demand-line-id';
import { RentalStatus } from '../../domain/rental-status';
import { RentalSelectionId } from '../../domain/ids/rental-selection-id';
import { EquipmentTypeId } from '../../domain/types/rental-commitment-ids';
import { RentalRepository } from '../../persistence/rental.repository';
import { EditUnconfirmedRentalCommand } from './edit-unconfirmed-rental.command';
import { editUnconfirmedRentalError, EditUnconfirmedRentalError } from './edit-unconfirmed-rental.errors';

export interface EditUnconfirmedRentalResultValue {
  rentalId: string;
  version: number;
  updatedAt: Date;
}

export type EditUnconfirmedRentalResult = Result<EditUnconfirmedRentalResultValue, EditUnconfirmedRentalError>;

@CommandHandler(EditUnconfirmedRentalCommand)
export class EditUnconfirmedRentalHandler implements ICommandHandler<
  EditUnconfirmedRentalCommand,
  EditUnconfirmedRentalResult
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rentalRepository: RentalRepository,
    private readonly tenantManagementApi: TenantManagementPublicApi,
    private readonly catalogApi: CatalogPublicApi,
    private readonly pricingApi: PricingPublicApi,
  ) {}

  async execute(command: EditUnconfirmedRentalCommand): Promise<EditUnconfirmedRentalResult> {
    const {
      tenantId,
      tenantUserId,
      rentalId,
      expectedVersion,
      branchId,
      period,
      selectedOffers,
      fulfillmentMethod,
      deliveryDetails,
      notes,
      insuranceSelected,
      manualPricingAdjustment,
    } = command.props;
    const context = { useCase: 'EditUnconfirmedRental', tenantId, tenantUserId, rentalId };

    const operationalCommitment = await this.prisma.client.v2Rental.findFirst({
      where: { id: rentalId, tenantId },
      select: {
        assignedAssets: { select: { id: true }, take: 1 },
        assetBlocks: { select: { id: true }, take: 1 },
        accessorySelections: { select: { id: true }, take: 1 },
        accessoryAssetAssignments: { select: { id: true }, take: 1 },
      },
    });

    if (
      operationalCommitment &&
      (operationalCommitment.assignedAssets.length > 0 ||
        operationalCommitment.assetBlocks.length > 0 ||
        operationalCommitment.accessorySelections.length > 0 ||
        operationalCommitment.accessoryAssetAssignments.length > 0)
    ) {
      return err(
        editUnconfirmedRentalError(
          'rental_commitment.rental_contains_operational_commitments',
          `Rental "${rentalId}" contains assignments, blocks, or accessory commitments.`,
          undefined,
          context,
        ),
      );
    }

    const rental = await this.rentalRepository.findById(tenantId, rentalId);
    if (!rental) {
      return err(
        editUnconfirmedRentalError(
          'rental_commitment.rental_not_found',
          `Rental "${rentalId}" was not found.`,
          undefined,
          context,
        ),
      );
    }

    if (![RentalStatus.Draft, RentalStatus.Pending].includes(rental.status)) {
      return err(this.toApplicationError(new RentalCannotBeEditedFromStatusError(rental.id, rental.status), context));
    }

    const tenantValidation = await this.tenantManagementApi.validateDraftRental({
      tenantId,
      branchId,
      rentalCustomerId: rental.rentalCustomerId,
      period,
      fulfillmentMethod,
    });
    if (tenantValidation.isErr()) {
      return err(this.toApplicationError(tenantValidation.error, context));
    }

    const resolvedCatalogSelections = await this.catalogApi.resolveSelectedRentalOffers({
      tenantId,
      branchId,
      selectedOffers,
    });
    if (resolvedCatalogSelections.isErr()) {
      return err(this.toApplicationError(resolvedCatalogSelections.error, context));
    }

    const selections = resolvedCatalogSelections.value.resolvedOffers.map((offer) => ({
      id: RentalSelectionId.create(),
      rentalOfferId: offer.rentalOfferId,
      rentableItemId: offer.rentableItem.id,
      rentableItemNameSnapshot: offer.rentableItem.name,
      rentableItemKindSnapshot: offer.rentableItem.kind,
      categoryId: offer.rentableItem.categoryId,
      quantity: offer.quantity,
      fulfillmentRequirements: offer.fulfillmentRequirements,
    }));

    const pricingResult = await this.pricingApi.priceDraftRental({
      tenantId,
      branchId,
      customerId: rental.rentalCustomerId,
      rentalPeriod: { start: period.start, end: period.end },
      pricingConfig: tenantValidation.value.pricingConfig,
      selections: selections.map((selection) => ({
        rentalSelectionId: selection.id,
        rentalOfferId: selection.rentalOfferId,
        rentableItemId: selection.rentableItemId,
        rentableItemName: selection.rentableItemNameSnapshot,
        rentableItemKind: selection.rentableItemKindSnapshot,
        categoryId: selection.categoryId,
        quantity: selection.quantity,
      })),
      manualPricingAdjustment: manualPricingAdjustment
        ? { ...manualPricingAdjustment, setByTenantUserId: tenantUserId }
        : undefined,
    });
    if (pricingResult.isErr()) {
      return err(this.toApplicationError(pricingResult.error, context));
    }

    const editResult = rental.editUnconfirmed({
      branchId,
      period,
      fulfillmentMethod,
      deliveryDetails,
      notes,
      insuranceSelected,
      priceSnapshot: pricingResult.value,
      selections: selections.map(
        ({ id, rentalOfferId, rentableItemId, rentableItemNameSnapshot, rentableItemKindSnapshot, quantity }) => ({
          id,
          rentalOfferId,
          rentableItemId,
          rentableItemNameSnapshot,
          rentableItemKindSnapshot,
          quantity,
        }),
      ),
      demandLines: selections.flatMap((selection) =>
        selection.fulfillmentRequirements.map((requirement) => ({
          id: RentalDemandLineId.create(),
          rentalSelectionId: selection.id,
          equipmentTypeId: requirement.equipmentTypeId as EquipmentTypeId,
          equipmentTypeNameSnapshot: requirement.equipmentTypeName ?? requirement.equipmentTypeId,
          quantity: selection.quantity * requirement.quantityPerItem,
        })),
      ),
    });
    if (editResult.isErr()) {
      return err(this.toApplicationError(editResult.error, context));
    }

    const saved = await this.rentalRepository.save(rental, { expectedVersion });
    if (!saved) {
      return err(
        editUnconfirmedRentalError(
          'rental_commitment.rental_version_conflict',
          `Rental "${rentalId}" was modified by another request.`,
          undefined,
          context,
        ),
      );
    }

    return ok({ rentalId: rental.id, version: saved.version, updatedAt: saved.updatedAt });
  }

  private toApplicationError(error: unknown, context: Record<string, unknown>): EditUnconfirmedRentalError {
    if (isDuplicateRentalOfferSelection(error)) {
      return editUnconfirmedRentalError('rental_commitment.duplicate_rental_offer_selection', error.message, error, {
        ...context,
        rentalOfferId: error.context?.rentalOfferId,
      });
    }
    if (error instanceof RentalCannotBeEditedFromStatusError) {
      return editUnconfirmedRentalError(
        'rental_commitment.rental_cannot_be_edited_from_status',
        error.message,
        error,
        context,
      );
    }
    if (error instanceof RentalContainsOperationalCommitmentsError) {
      return editUnconfirmedRentalError(
        'rental_commitment.rental_contains_operational_commitments',
        error.message,
        error,
        context,
      );
    }
    if (error instanceof RentalMustContainSelectionError) {
      return editUnconfirmedRentalError('rental_commitment.rental_requires_selection', error.message, error, context);
    }
    if (error instanceof DuplicateRentalOfferSelectionError) {
      return editUnconfirmedRentalError('rental_commitment.duplicate_rental_offer_selection', error.message, error, {
        ...context,
        rentalOfferId: error.rentalOfferId,
      });
    }
    if (error instanceof TenantUnavailableForRentalError) {
      return editUnconfirmedRentalError('rental_commitment.tenant_unavailable', error.message, error, context);
    }
    if (error instanceof BranchUnavailableForRentalError) {
      return editUnconfirmedRentalError('rental_commitment.branch_unavailable', error.message, error, context);
    }
    if (error instanceof RentalCustomerUnavailableForRentalError) {
      return editUnconfirmedRentalError('rental_commitment.customer_unavailable', error.message, error, context);
    }
    if (error instanceof UnsupportedBranchFulfillmentMethodError) {
      return editUnconfirmedRentalError(
        'rental_commitment.unsupported_branch_fulfillment_method',
        error.message,
        error,
        context,
      );
    }
    if (error instanceof PickupTimeOutsideBranchScheduleError) {
      return editUnconfirmedRentalError(
        'rental_commitment.pickup_time_outside_branch_schedule',
        error.message,
        error,
        context,
      );
    }
    if (error instanceof ReturnTimeOutsideBranchScheduleError) {
      return editUnconfirmedRentalError(
        'rental_commitment.return_time_outside_branch_schedule',
        error.message,
        error,
        context,
      );
    }
    if (error instanceof RentalInvalidFieldError) {
      return editUnconfirmedRentalError('rental_commitment.invalid_rental_field', error.message, error, {
        ...context,
        field: error.field,
      });
    }
    if (error instanceof InvalidCatalogSelectionQuantityError) {
      return editUnconfirmedRentalError('rental_commitment.invalid_catalog_selection_quantity', error.message, error, {
        ...context,
        field: error.field,
        quantity: error.quantity,
      });
    }
    if (isErrorWithCode(error, 'INVALID_PRICING_INPUT')) {
      return editUnconfirmedRentalError('rental_commitment.invalid_pricing_input', error.message, error, context);
    }

    throw error;
  }
}

function isDuplicateRentalOfferSelection(error: unknown): error is ResolveSelectedRentalOffersError {
  return (
    typeof error === 'object' && error !== null && 'code' in error && error.code === 'DuplicateRentalOfferSelection'
  );
}

function isErrorWithCode(error: unknown, code: string): error is Error & { code: string } {
  return error instanceof Error && 'code' in error && error.code === code;
}
