import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { TenantManagementPublicApi } from 'src/modules/tenant-management/public-api/tenant-management.public-api';

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
  constructor(private readonly tenantManagementApi: TenantManagementPublicApi) {}

  async execute(command: CreatePendingRentalCommand): Promise<CreatePendingRentalServiceResult> {
    const tenantValidation = await this.tenantManagementApi.validateWhatsAppStylePendingRental({
      tenantId: command.tenantId,
      branchId: command.branchId,
      rentalCustomerId: command.rentalCustomerId,
      period: command.period,
    });
    if (tenantValidation.isErr()) {
      return err(tenantValidation.error);
    }

    return ok({ rentalId: '' });
  }
}
