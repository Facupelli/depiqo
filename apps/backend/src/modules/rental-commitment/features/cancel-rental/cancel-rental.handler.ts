import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';

import { toRentalIntegrationEvents } from '../../application/rental-integration-event.mapper';
import {
  RentalAlreadyCancelledError,
  RentalCannotBeCancelledFromStatusError,
} from '../../domain/errors/rental-commitment.errors';
import { RentalRepository } from '../../persistence/rental.repository';
import { CancelRentalCommand } from './cancel-rental.command';
import { cancelRentalError, CancelRentalError } from './cancel-rental.errors';

export type CancelRentalResult = Result<void, CancelRentalError>;

@CommandHandler(CancelRentalCommand)
export class CancelRentalHandler implements ICommandHandler<CancelRentalCommand, CancelRentalResult> {
  constructor(
    private readonly rentalRepository: RentalRepository,
    private readonly unitOfWork: PrismaUnitOfWork,
  ) {}

  async execute(command: CancelRentalCommand): Promise<CancelRentalResult> {
    const context = {
      useCase: 'CancelRental',
      tenantId: command.tenantId,
      rentalId: command.rentalId,
    };
    const rental = await this.rentalRepository.findById(command.tenantId, command.rentalId);

    if (!rental) {
      return err(
        cancelRentalError(
          'rental_commitment.rental_not_found',
          `Rental "${command.rentalId}" was not found.`,
          undefined,
          context,
        ),
      );
    }

    const expectedUpdatedAt = rental.updatedAt;
    if (!expectedUpdatedAt) {
      throw new Error(`Persisted rental "${rental.id}" is missing its updatedAt concurrency token.`);
    }

    const cancellation = rental.cancel();

    if (cancellation.isErr()) {
      const error = cancellation.error;

      if (error instanceof RentalAlreadyCancelledError) {
        return err(cancelRentalError('rental_commitment.rental_already_cancelled', error.message, error, context));
      }

      if (error instanceof RentalCannotBeCancelledFromStatusError) {
        return err(
          cancelRentalError('rental_commitment.rental_cannot_be_cancelled_from_status', error.message, error, context),
        );
      }

      throw error;
    }

    return this.unitOfWork.runInTransaction(async ({ tx, integrationEvents }) => {
      const saved = await this.rentalRepository.save(rental, { expectedUpdatedAt, tx });
      if (!saved) {
        return err(
          cancelRentalError(
            'rental_commitment.rental_version_conflict',
            `Rental "${command.rentalId}" was modified by another request.`,
            undefined,
            context,
          ),
        );
      }

      integrationEvents.collect(toRentalIntegrationEvents(rental.pullDomainEvents()));
      return ok(undefined);
    });
  }
}
