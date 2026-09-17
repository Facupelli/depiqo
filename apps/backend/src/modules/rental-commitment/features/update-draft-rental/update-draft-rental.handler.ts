import type { ApplicationErrorContext } from 'src/core/errors/application-error';

import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import {
  DraftRentalDeliveryAuthoringInput,
  DraftRentalProposalResolutionError,
  DraftRentalProposalResolver,
} from '../../application/draft-rental-proposal-resolver.service';
import {
  DuplicateRentalOfferSelectionError,
  InvalidCatalogSelectionQuantityError,
  RentalCannotBeEditedFromStatusError,
  RentalInvalidFieldError,
  RentalMustContainSelectionError,
} from '../../domain/errors/rental-commitment.errors';
import { Rental } from '../../domain/rental.aggregate';
import { FulfillmentMethod, RentalStatus } from '../../domain/rental-status';
import { RentalRepository, UnsafeDraftRentalReplacementError } from '../../persistence/rental.repository';
import { UpdateDraftRentalCommand } from './update-draft-rental.command';
import { UpdateDraftRentalError, updateDraftRentalError } from './update-draft-rental.errors';

export type UpdateDraftRentalResult = Result<
  { rentalId: string; version: number; updatedAt: Date },
  UpdateDraftRentalError
>;

@CommandHandler(UpdateDraftRentalCommand)
export class UpdateDraftRentalHandler implements ICommandHandler<UpdateDraftRentalCommand, UpdateDraftRentalResult> {
  constructor(
    private readonly proposalResolver: DraftRentalProposalResolver,
    private readonly rentals: RentalRepository,
  ) {}

  async execute(command: UpdateDraftRentalCommand): Promise<UpdateDraftRentalResult> {
    const {
      tenantId,
      tenantUserId,
      rentalId,
      expectedVersion,
      branchId,
      rentalCustomerId,
      period,
      selectedOffers,
      fulfillmentMethod,
      insuranceSelected,
      deliveryIntent,
      manualPricingAdjustment,
    } = command.props;
    const context = { useCase: 'UpdateDraftRental', tenantId, tenantUserId, rentalId };

    const rental = await this.rentals.findById(tenantId, rentalId);
    if (!rental)
      return err(this.error('rental_commitment.rental_not_found', `Rental "${rentalId}" was not found.`, context));
    if (rental.status !== RentalStatus.Draft) {
      return err(this.mapDomainError(new RentalCannotBeEditedFromStatusError(rentalId, rental.status), context));
    }
    if (rental.version !== expectedVersion) return err(this.versionConflict(rentalId, context));

    const deliveryDestination = this.resolveDeliveryDestination({
      fulfillmentMethod,
      deliveryIntent,
      rental,
      context,
    });
    if (deliveryDestination.isErr()) return err(deliveryDestination.error);

    const proposal = await this.proposalResolver.resolve({
      tenantId,
      branchId,
      rentalCustomerId,
      period,
      selectedOffers,
      fulfillmentMethod,
      insuranceSelected,
      deliveryDestination: deliveryDestination.value,
      manualPricingAdjustment: manualPricingAdjustment
        ? { ...manualPricingAdjustment, setByTenantUserId: tenantUserId }
        : undefined,
    });
    if (proposal.isErr()) return err(this.mapProposalError(proposal.error, context));

    const replacement = rental.replaceDraftProposal({
      branchId,
      rentalCustomerId,
      period,
      fulfillmentMethod,
      insuranceSelected,
      deliveryDetails: proposal.value.deliveryDetails,
      deliverySnapshot: proposal.value.deliverySnapshot,
      selections: proposal.value.selections,
      demandLines: proposal.value.demandLines,
      priceSnapshot: proposal.value.priceSnapshot,
    });
    if (replacement.isErr()) return err(this.mapDomainError(replacement.error, context));

    try {
      const saved = await this.rentals.replaceDraft(rental, { expectedVersion });
      if (!saved) return err(this.versionConflict(rentalId, context));
      return ok({ rentalId, version: saved.version, updatedAt: saved.updatedAt });
    } catch (error) {
      if (error instanceof UnsafeDraftRentalReplacementError) {
        return err(
          this.error(
            'rental_commitment.unsafe_draft_state',
            `Rental "${rentalId}" contains operational state that prevents draft replacement.`,
            context,
            error,
          ),
        );
      }
      throw error;
    }
  }

  private resolveDeliveryDestination(input: {
    fulfillmentMethod: FulfillmentMethod;
    deliveryIntent?: UpdateDraftRentalCommand['props']['deliveryIntent'];
    rental: Rental;
    context: ApplicationErrorContext;
  }): Result<DraftRentalDeliveryAuthoringInput | undefined, UpdateDraftRentalError> {
    if (input.fulfillmentMethod === FulfillmentMethod.Pickup) return ok(undefined);

    if (!input.deliveryIntent) {
      return err(
        this.error(
          'rental_commitment.invalid_rental_field',
          'Delivery rentals require an explicit delivery intent.',
          input.context,
        ),
      );
    }

    if (input.deliveryIntent.type === 'NEW_DESTINATION') {
      return ok({ address: input.deliveryIntent.address, locationId: input.deliveryIntent.locationId });
    }

    const existing = input.rental.deliveryDetails;
    if (!existing) {
      return err(
        this.error(
          'rental_commitment.current_delivery_destination_missing',
          `Rental "${input.rental.id}" has no current delivery destination to keep.`,
          input.context,
        ),
      );
    }

    return ok({
      address: existing.address,
      resolvedLocation: {
        formattedAddress: existing.formattedAddress,
        latitude: existing.latitude,
        longitude: existing.longitude,
        ...(existing.providerPlaceId ? { providerPlaceId: existing.providerPlaceId } : {}),
      },
    });
  }

  private mapProposalError(
    error: DraftRentalProposalResolutionError,
    context: ApplicationErrorContext,
  ): UpdateDraftRentalError {
    return updateDraftRentalError(error.code, error.message, error.cause, { ...context, ...error.context });
  }

  private mapDomainError(error: unknown, context: ApplicationErrorContext): UpdateDraftRentalError {
    if (error instanceof RentalCannotBeEditedFromStatusError) {
      return this.error('rental_commitment.rental_cannot_be_edited_from_status', error.message, context, error);
    }
    if (error instanceof RentalMustContainSelectionError) {
      return this.error('rental_commitment.rental_requires_selection', error.message, context, error);
    }
    if (error instanceof DuplicateRentalOfferSelectionError) {
      return this.error('rental_commitment.duplicate_rental_offer_selection', error.message, context, error);
    }
    if (error instanceof InvalidCatalogSelectionQuantityError) {
      return this.error('rental_commitment.invalid_catalog_selection_quantity', error.message, context, error);
    }
    if (error instanceof RentalInvalidFieldError) {
      if (['assignedAssets', 'assetBlocks', 'confirmedState'].includes(error.field)) {
        return this.error('rental_commitment.unsafe_draft_state', error.message, context, error);
      }
      return this.error('rental_commitment.invalid_rental_field', error.message, context, error);
    }
    throw error;
  }

  private versionConflict(rentalId: string, context: ApplicationErrorContext): UpdateDraftRentalError {
    return this.error(
      'rental_commitment.rental_version_conflict',
      `Rental "${rentalId}" was modified by another request.`,
      context,
    );
  }

  private error(
    code: UpdateDraftRentalError['code'],
    message: string,
    context: ApplicationErrorContext,
    cause?: unknown,
  ): UpdateDraftRentalError {
    return updateDraftRentalError(code, message, cause, context);
  }
}
