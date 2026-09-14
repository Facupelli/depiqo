import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';

import {
  DraftRentalProposalResolutionError,
  DraftRentalProposalResolver,
} from '../../application/draft-rental-proposal-resolver.service';
import {
  DuplicateRentalOfferSelectionError,
  InvalidCatalogSelectionQuantityError,
  RentalInvalidFieldError,
  RentalMustContainSelectionError,
} from '../../domain/errors/rental-commitment.errors';
import { Rental } from '../../domain/rental.aggregate';
import { RentalSource } from '../../domain/rental-status';
import { RentalNumberAllocator } from '../../persistence/rental-number.allocator';
import { RentalRepository } from '../../persistence/rental.repository';
import { CreateDraftRentalCommand } from './create-draft-rental.command';
import { createDraftRentalError, CreateDraftRentalError } from './create-draft-rental.errors';

export interface CreateDraftRentalResult {
  rentalId: string;
}

export type CreateDraftRentalServiceResult = Result<CreateDraftRentalResult, CreateDraftRentalError>;

@CommandHandler(CreateDraftRentalCommand)
export class CreateDraftRentalService implements ICommandHandler<
  CreateDraftRentalCommand,
  CreateDraftRentalServiceResult
> {
  constructor(
    private readonly draftRentalProposalResolver: DraftRentalProposalResolver,
    private readonly rentalRepository: RentalRepository,
    private readonly rentalNumberAllocator: RentalNumberAllocator,
    private readonly unitOfWork: PrismaUnitOfWork,
  ) {}

  async execute(command: CreateDraftRentalCommand): Promise<CreateDraftRentalServiceResult> {
    const context = {
      useCase: 'CreateDraftRental',
      tenantId: command.tenantId,
      tenantUserId: command.tenantUserId,
      branchId: command.branchId,
      rentalCustomerId: command.rentalCustomerId,
    };

    const proposal = await this.draftRentalProposalResolver.resolve({
      tenantId: command.tenantId,
      branchId: command.branchId,
      rentalCustomerId: command.rentalCustomerId,
      period: command.period,
      selectedOffers: command.selectedOffers,
      fulfillmentMethod: command.fulfillmentMethod,
      insuranceSelected: command.insuranceSelected,
      deliveryDestination: command.deliveryDetails,
      manualPricingAdjustment: command.manualPricingAdjustment
        ? { ...command.manualPricingAdjustment, setByTenantUserId: command.tenantUserId }
        : undefined,
    });
    if (proposal.isErr()) return err(this.toCreateProposalError(proposal.error, context));

    try {
      return await this.unitOfWork.runInTransaction(async ({ tx }) => {
        const rental = Rental.createDraft({
          tenantId: command.tenantId,
          rentalNumber: await this.rentalNumberAllocator.allocate(command.tenantId, tx),
          branchId: command.branchId,
          rentalCustomerId: command.rentalCustomerId,
          source: RentalSource.Staff,
          fulfillmentMethod: command.fulfillmentMethod,
          notes: command.notes,
          insuranceSelected: command.insuranceSelected,
          bookingSnapshot: command.bookingSnapshot,
          deliveryDetails: proposal.value.deliveryDetails,
          deliverySnapshot: proposal.value.deliverySnapshot,
          period: command.period,
          priceSnapshot: proposal.value.priceSnapshot,
          selections: proposal.value.selections,
          demandLines: proposal.value.demandLines,
        });

        if (rental.isErr()) throw rental.error;

        await this.rentalRepository.save(rental.value, { tx });
        return ok({ rentalId: rental.value.id });
      });
    } catch (error) {
      return err(this.toCreateError(error, context));
    }
  }

  private toCreateProposalError(
    error: DraftRentalProposalResolutionError,
    context: Record<string, unknown>,
  ): CreateDraftRentalError {
    return createDraftRentalError(error.code, error.message, error.cause, { ...context, ...error.context });
  }

  private toCreateError(error: unknown, context: Record<string, unknown>): CreateDraftRentalError {
    if (error instanceof RentalMustContainSelectionError) {
      return createDraftRentalError('rental_commitment.rental_requires_selection', error.message, error, context);
    }
    if (error instanceof DuplicateRentalOfferSelectionError) {
      return createDraftRentalError('rental_commitment.duplicate_rental_offer_selection', error.message, error, {
        ...context,
        rentalOfferId: error.rentalOfferId,
      });
    }
    if (error instanceof RentalInvalidFieldError) {
      return createDraftRentalError('rental_commitment.invalid_rental_field', error.message, error, {
        ...context,
        field: error.field,
      });
    }
    if (error instanceof InvalidCatalogSelectionQuantityError) {
      return createDraftRentalError('rental_commitment.invalid_catalog_selection_quantity', error.message, error, {
        ...context,
        field: error.field,
        quantity: error.quantity,
      });
    }
    throw error;
  }
}
