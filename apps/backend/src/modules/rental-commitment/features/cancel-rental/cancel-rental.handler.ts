import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';

import { RentalRepository } from '../../persistence/rental.repository';
import { CancelRentalApplicationError, cancelRentalApplicationError } from './cancel-rental-application.error';
import { CancelRentalCommand } from './cancel-rental.command';
import { toCancelRentalApplicationError } from './map-cancel-rental-error';

export type CancelRentalResult = Result<void, CancelRentalApplicationError>;

@CommandHandler(CancelRentalCommand)
export class CancelRentalHandler implements ICommandHandler<CancelRentalCommand, CancelRentalResult> {
  constructor(
    private readonly rentalRepository: RentalRepository,
    private readonly unitOfWork: PrismaUnitOfWork,
  ) {}

  async execute(command: CancelRentalCommand): Promise<CancelRentalResult> {
    const rental = await this.rentalRepository.findById(command.tenantId, command.rentalId);

    if (!rental) {
      return err(cancelRentalApplicationError('RentalNotFound', `Rental "${command.rentalId}" was not found.`));
    }

    const cancellation = rental.cancel();

    if (cancellation.isErr()) {
      return err(toCancelRentalApplicationError(cancellation.error));
    }

    await this.unitOfWork.runInTransaction(async ({ tx, events }) => {
      await this.rentalRepository.save(rental, { tx });
      events.collectFrom(rental);
    });

    return ok(undefined);
  }
}
