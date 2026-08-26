import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ok, Result } from 'neverthrow';

import { CreatePendingRentalCommand } from './create-pending-rental.command';
import { RentalCommitmentError } from '../../domain/errors/rental-commitment.errors';

export interface CreatePendingRentalResult {
  rentalId: string;
}

export type CreatePendingRentalServiceResult = Result<CreatePendingRentalResult, RentalCommitmentError>;

@CommandHandler(CreatePendingRentalCommand)
export class CreatePendingRentalService implements ICommandHandler<
  CreatePendingRentalCommand,
  CreatePendingRentalServiceResult
> {
  async execute(_command: CreatePendingRentalCommand): Promise<CreatePendingRentalServiceResult> {
    return ok({ rentalId: '' });
  }
}
