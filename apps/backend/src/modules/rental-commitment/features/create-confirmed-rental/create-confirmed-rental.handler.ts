import type { ApplicationErrorContext } from 'src/core/errors/application-error';

import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';
import { PrismaService } from 'src/core/database/prisma.service';
import { PostgresExclusionViolationError, isUniqueConstraintViolation } from 'src/core/utils/postgres-error.mapper';
import { CatalogSelectionResolutionError } from 'src/modules/catalog/public-api/catalog-selection-resolution.public-api';
import { BranchFacts } from 'src/modules/tenant-management/public-api/branch-facts.public-api';
import { TenantBillingPreferences } from 'src/modules/tenant-management/public-api/tenant-billing-preferences.public-api';
import { TenantRentalAssetBufferSettings } from 'src/modules/tenant-management/public-api/tenant-rental-asset-buffer-settings.public-api';

import { RentalOperationalFactsValidatorService } from '../../application/rental-operational-facts-validator.service';
import {
  RentalProposalResolver,
  RentalProposalResolutionError,
} from '../../application/rental-proposal-resolver.service';
import { toRentalIntegrationEvents } from '../../application/rental-integration-event.mapper';
import { buildConfirmationFingerprint } from './confirmation-operation-fingerprint';
import { CreateConfirmedRentalCommand } from './create-confirmed-rental.command';
import { ConfirmationOperationPersistence } from '../../persistence/rental.repository';
import { deriveConfirmedAssetBlockPeriod } from '../../domain/confirmed-asset-block-period';
import { deriveConfirmationParticipationTiming } from '../../domain/confirmation-participation-timing';
import { AcceptedDeliverySnapshot } from '../../domain/value-objects/accepted-delivery-snapshot.value-object';
import { Rental } from '../../domain/rental.aggregate';
import { createConfirmedRentalError, CreateConfirmedRentalError } from './create-confirmed-rental.errors';
import { RentalNumberAllocator } from '../../persistence/rental-number.allocator';
import { RentalRepository } from '../../persistence/rental.repository';
import { RentalAssetAllocationService } from '../../asset-allocation/rental-asset-allocation.service';
import { EquipmentTypeId } from '../../domain/types/rental-commitment-ids';
import { RentalOwnerSplitCalculator } from '../../owner-split/rental-owner-split-calculator';
import {
  BranchUnavailableForRentalError,
  DuplicateAssignedAssetError,
  DuplicateRentalOfferSelectionError,
  InsufficientAssetAvailabilityError,
  InvalidCatalogSelectionQuantityError,
  PickupTimeOutsideBranchScheduleError,
  RentalOfferNotRentableError,
  ProfessionalConfirmedRentalCreationDisabledError,
  RentalCustomerUnavailableForRentalError,
  RentalInvalidFieldError,
  RentalMustContainSelectionError,
  RentalPeriodCannotStartInPastError,
  ReturnTimeOutsideBranchScheduleError,
  TenantUnavailableForRentalError,
} from '../../domain/errors/rental-commitment.errors';

export interface CreateConfirmedRentalResult {
  rentalId: string;
  rentalNumber: number;
}

export type CreateConfirmedRentalServiceResult = Result<CreateConfirmedRentalResult, CreateConfirmedRentalError>;

@CommandHandler(CreateConfirmedRentalCommand)
export class CreateConfirmedRentalService implements ICommandHandler<
  CreateConfirmedRentalCommand,
  CreateConfirmedRentalServiceResult
> {
  constructor(
    private readonly rentalRepository: RentalRepository,
    private readonly prisma: PrismaService,
    private readonly tenantBillingPreferences: TenantBillingPreferences,
    private readonly tenantRentalAssetBufferSettings: TenantRentalAssetBufferSettings,
    private readonly branchFacts: BranchFacts,
    private readonly rentalOperationalFacts: RentalOperationalFactsValidatorService,
    private readonly proposalResolver: RentalProposalResolver,
    private readonly rentalAssetAllocation: RentalAssetAllocationService,
    private readonly rentalOwnerSplitCalculator: RentalOwnerSplitCalculator,
    private readonly rentalNumberAllocator: RentalNumberAllocator,
    private readonly unitOfWork: PrismaUnitOfWork,
  ) {}

  async execute(command: CreateConfirmedRentalCommand): Promise<CreateConfirmedRentalServiceResult> {
    const context = {
      useCase: 'CreateConfirmedRental',
      tenantId: command.tenantId,
      branchId: command.branchId,
      rentalCustomerId: command.rentalCustomerId,
    };
    const confirmationOperation: ConfirmationOperationPersistence = {
      operationId: command.confirmationOperationId,
      fingerprint: buildConfirmationFingerprint(command),
    };

    const replay = await this.findCommittedRentalByOperation(command.tenantId, confirmationOperation.operationId);
    if (replay) {
      return this.resolveReplayResult(replay, confirmationOperation, context);
    }

    const tenantValidation = await this.rentalOperationalFacts.validateDirectConfirmedFacts({
      tenantId: command.tenantId,
      branchId: command.branchId,
      rentalCustomerId: command.rentalCustomerId,
      pickupAt: command.period.start,
      returnAt: command.period.end,
      fulfillmentMethod: command.fulfillmentMethod,
    });

    if (tenantValidation.isErr()) {
      return err(this.toApplicationError(tenantValidation.error, context));
    }

    const [billingPreferences, bufferSettings, branchFacts] = await Promise.all([
      this.tenantBillingPreferences.getTenantBillingPreferences({ tenantId: command.tenantId }),
      this.tenantRentalAssetBufferSettings.getTenantRentalAssetBufferSettings({ tenantId: command.tenantId }),
      this.branchFacts.getBranchFacts({ tenantId: command.tenantId, branchId: command.branchId }),
    ]);
    if (billingPreferences.isErr())
      return err(this.toApplicationError(new TenantUnavailableForRentalError(command.tenantId), context));
    if (bufferSettings.isErr()) {
      return err(
        createConfirmedRentalError(
          'rental_commitment.tenant_unavailable',
          bufferSettings.error.message,
          bufferSettings.error,
          context,
        ),
      );
    }
    if (branchFacts.isErr())
      return err(this.toApplicationError(new BranchUnavailableForRentalError(command.branchId), context));

    const proposal = await this.proposalResolver.resolve({
      tenantId: command.tenantId,
      branchId: command.branchId,
      rentalCustomerId: command.rentalCustomerId,
      period: command.period,
      selectedOffers: command.selectedOffers,
      fulfillmentMethod: command.fulfillmentMethod,
      insuranceSelected: command.insuranceSelected,
      deliveryDestination: command.deliveryDetails,
      calculationFacts: {
        effectiveTimezone: branchFacts.value.effectiveTimezone,
        dailyBillingPolicy: billingPreferences.value.dailyBillingPolicy,
        weekendCountsAsOne: billingPreferences.value.weekendCountsAsOne,
      },
      pricingIntent: { context: 'CONFIRMED' },
    });
    if (proposal.isErr()) return err(this.toProposalError(proposal.error, context));

    let acceptedDelivery: AcceptedDeliverySnapshot | undefined;
    if (proposal.value.deliverySnapshot) {
      const acceptedDeliveryResult = AcceptedDeliverySnapshot.create(proposal.value.deliverySnapshot);
      if (acceptedDeliveryResult.isErr()) throw acceptedDeliveryResult.error;
      acceptedDelivery = acceptedDeliveryResult.value;
    }

    const operationTime = new Date();
    const participationTiming = deriveConfirmationParticipationTiming(command.period, operationTime);
    const acceptedAssetBuffer = { ...bufferSettings.value };
    const operationalPeriod = deriveConfirmedAssetBlockPeriod({
      participationPeriod: participationTiming.participationPeriod,
      acceptedBeforeBufferMinutes: acceptedAssetBuffer.beforeBufferMinutes,
      acceptedAfterBufferMinutes: acceptedAssetBuffer.afterBufferMinutes,
      acceptedDelivery,
      clampStartAt: participationTiming.blockOperationTime,
    });

    // SAFETY: This value comes from a persisted or already validated non-empty domain identifier; the brand adds no runtime representation.
    const assetAssignmentPlan = await this.rentalAssetAllocation.planAllocations({
      tenantId: command.tenantId,
      branchId: command.branchId,
      periodStart: operationalPeriod.start,
      periodEnd: operationalPeriod.end,
      demandLines: proposal.value.demandLines.map((line) => ({
        rentalDemandLineId: line.id,
        rentalSelectionId: line.rentalSelectionId,
        equipmentTypeId: line.equipmentTypeId as EquipmentTypeId,
        quantity: line.quantity,
      })),
    });

    if (assetAssignmentPlan.isErr()) {
      const availabilityError = assetAssignmentPlan.error;

      if (availabilityError instanceof InsufficientAssetAvailabilityError) {
        const replay = await this.findCommittedRentalByOperation(command.tenantId, confirmationOperation.operationId);
        if (replay) {
          return this.resolveReplayResult(replay, confirmationOperation, context);
        }
      }

      const failedSelection =
        availabilityError instanceof InsufficientAssetAvailabilityError
          ? proposal.value.selections.find((selection) => selection.id === availabilityError.rentalSelectionId)
          : undefined;
      return err(
        this.toApplicationError(availabilityError, {
          ...context,
          ...(failedSelection ? { rentalOfferId: failedSelection.rentalOfferId } : {}),
        }),
      );
    }

    try {
      return await this.unitOfWork.runInTransaction(async ({ tx, integrationEvents }) => {
        // SAFETY: This value comes from a persisted or already validated non-empty domain identifier; the brand adds no runtime representation.
        const rental = Rental.createConfirmed({
          tenantId: command.tenantId,
          rentalNumber: await this.rentalNumberAllocator.allocate(command.tenantId, tx),
          branchId: command.branchId,
          rentalCustomerId: command.rentalCustomerId,
          fulfillmentMethod: command.fulfillmentMethod,
          notes: command.notes,
          insuranceSelected: command.insuranceSelected,
          bookingSnapshot: command.bookingSnapshot,
          deliveryDetails: proposal.value.deliveryDetails,
          acceptedAssetBuffer,
          confirmedAt: operationTime,
          confirmedPriceSnapshot: proposal.value.priceSnapshot,
          acceptedDelivery: proposal.value.deliverySnapshot,
          period: command.period,
          selections: proposal.value.selections,
          demandLines: proposal.value.demandLines,

          assignedAssets: assetAssignmentPlan.value.allocations.map((allocation) => ({
            rentalDemandLineId: allocation.rentalDemandLineId,
            assetId: allocation.assetId,
            ownershipSnapshot: allocation.ownershipSnapshot,
          })),
        });

        if (rental.isErr()) {
          throw rental.error;
        }

        const confirmedRental = rental.value;

        const splits = this.rentalOwnerSplitCalculator.calculate(confirmedRental);

        await this.rentalRepository.save(confirmedRental, { ownerSplits: splits, confirmationOperation, tx });
        integrationEvents.collect(toRentalIntegrationEvents(confirmedRental.pullDomainEvents()));

        return ok({
          rentalId: confirmedRental.id,
          rentalNumber: confirmedRental.rentalNumber,
        });
      });
    } catch (error) {
      const isIdempotencyConflict = isUniqueConstraintViolation(error, ['tenant_id', 'confirmation_operation_id']);
      const isAssetBlockConflict = error instanceof PostgresExclusionViolationError;

      if (isIdempotencyConflict || isAssetBlockConflict) {
        // The failed transaction has fully rolled back before runInTransaction
        // rejects. Resolve through the normal Prisma client, never the failed tx.
        const replay = await this.findCommittedRentalByOperation(command.tenantId, confirmationOperation.operationId);
        if (replay) {
          return this.resolveReplayResult(replay, confirmationOperation, context);
        }
      }

      if (isAssetBlockConflict) {
        return err(
          createConfirmedRentalError(
            'rental_commitment.insufficient_asset_availability',
            'The requested equipment is no longer available.',
            error,
            context,
          ),
        );
      }

      return err(this.toApplicationError(error, context));
    }
  }

  private async findCommittedRentalByOperation(
    tenantId: string,
    operationId: string,
  ): Promise<{ id: string; rentalNumber: number; confirmationFingerprint: string | null } | null> {
    return this.prisma.client.v2Rental.findFirst({
      where: { tenantId, confirmationOperationId: operationId },
      select: { id: true, rentalNumber: true, confirmationFingerprint: true },
    });
  }

  private resolveReplayResult(
    replay: { id: string; rentalNumber: number; confirmationFingerprint: string | null },
    operation: ConfirmationOperationPersistence,
    context: ApplicationErrorContext,
  ): CreateConfirmedRentalServiceResult {
    if (replay.confirmationFingerprint !== operation.fingerprint) {
      return err(
        createConfirmedRentalError(
          'rental_commitment.idempotency_key_reused_with_different_input',
          'The idempotency key was already used for a different confirmation request.',
          undefined,
          context,
        ),
      );
    }

    return ok({ rentalId: replay.id, rentalNumber: replay.rentalNumber });
  }

  private toProposalError(
    error: RentalProposalResolutionError,
    context: ApplicationErrorContext,
  ): CreateConfirmedRentalError {
    let unavailableOfferId: string | undefined;
    if (error.code === 'rental_commitment.catalog_selection_unavailable') {
      if (error.cause instanceof CatalogSelectionResolutionError) {
        const rentalOfferId = error.cause.context?.rentalOfferId;
        unavailableOfferId = typeof rentalOfferId === 'string' ? rentalOfferId : undefined;
      } else if (error.cause instanceof RentalOfferNotRentableError) {
        unavailableOfferId = error.cause.rentalOfferId;
      }
    }
    return createConfirmedRentalError(error.code, error.message, error.cause, {
      ...context,
      ...error.context,
      ...(unavailableOfferId === undefined ? {} : { rentalOfferId: unavailableOfferId }),
    });
  }

  private toApplicationError(error: unknown, context: ApplicationErrorContext): CreateConfirmedRentalError {
    if (error instanceof RentalPeriodCannotStartInPastError) {
      return createConfirmedRentalError(
        'rental_commitment.rental_period_must_start_in_future',
        error.message,
        error,
        context,
      );
    }
    if (error instanceof RentalMustContainSelectionError) {
      return createConfirmedRentalError('rental_commitment.rental_requires_selection', error.message, error, context);
    }
    if (error instanceof DuplicateRentalOfferSelectionError) {
      return createConfirmedRentalError('rental_commitment.duplicate_rental_offer_selection', error.message, error, {
        ...context,
        rentalOfferId: error.rentalOfferId,
      });
    }
    if (error instanceof InsufficientAssetAvailabilityError) {
      return createConfirmedRentalError('rental_commitment.insufficient_asset_availability', error.message, error, {
        ...context,
        equipmentTypeId: error.equipmentTypeId,
        rentalSelectionId: error.rentalSelectionId,
        requiredQuantity: error.requiredQuantity,
        availableQuantity: error.availableQuantity,
      });
    }
    if (error instanceof ProfessionalConfirmedRentalCreationDisabledError) {
      return createConfirmedRentalError(
        'rental_commitment.confirmed_rental_creation_disabled',
        error.message,
        error,
        context,
      );
    }
    if (error instanceof TenantUnavailableForRentalError) {
      return createConfirmedRentalError('rental_commitment.tenant_unavailable', error.message, error, context);
    }
    if (error instanceof BranchUnavailableForRentalError) {
      return createConfirmedRentalError('rental_commitment.branch_unavailable', error.message, error, context);
    }
    if (error instanceof RentalCustomerUnavailableForRentalError) {
      return createConfirmedRentalError('rental_commitment.customer_unavailable', error.message, error, context);
    }
    if (error instanceof PickupTimeOutsideBranchScheduleError) {
      return createConfirmedRentalError(
        'rental_commitment.pickup_time_outside_branch_schedule',
        error.message,
        error,
        context,
      );
    }
    if (error instanceof ReturnTimeOutsideBranchScheduleError) {
      return createConfirmedRentalError(
        'rental_commitment.return_time_outside_branch_schedule',
        error.message,
        error,
        context,
      );
    }
    if (error instanceof RentalInvalidFieldError) {
      return createConfirmedRentalError('rental_commitment.invalid_rental_field', error.message, error, {
        ...context,
        field: error.field,
      });
    }
    if (error instanceof InvalidCatalogSelectionQuantityError) {
      return createConfirmedRentalError('rental_commitment.invalid_catalog_selection_quantity', error.message, error, {
        ...context,
        field: error.field,
        quantity: error.quantity,
      });
    }
    if (error instanceof DuplicateAssignedAssetError) {
      return createConfirmedRentalError('rental_commitment.duplicate_assigned_asset', error.message, error, context);
    }

    throw error;
  }
}
