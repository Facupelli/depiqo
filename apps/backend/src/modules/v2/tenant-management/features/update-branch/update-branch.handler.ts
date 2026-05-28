import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { BranchNotFoundError, TenantManagementError } from '../../domain/errors/tenant-management.errors';
import { BranchRepository } from '../../infrastructure/persistence/repositories/branch.repository';
import { UpdateBranchCommand } from './update-branch.command';

export interface UpdateBranchResult {
  id: string;
}

@CommandHandler(UpdateBranchCommand)
export class UpdateBranchHandler implements ICommandHandler<
  UpdateBranchCommand,
  Result<UpdateBranchResult, TenantManagementError>
> {
  constructor(private readonly branchRepository: BranchRepository) {}

  async execute(command: UpdateBranchCommand): Promise<Result<UpdateBranchResult, TenantManagementError>> {
    const branch = await this.branchRepository.findByIdForTenant(command.branchId, command.tenantId);

    if (!branch) {
      return err(new BranchNotFoundError());
    }

    const update = branch.updateDetails({
      name: command.name,
      address: command.address,
      timezone: command.timezone,
      supportsDelivery: command.supportsDelivery,
      deliveryDefaultCountry: command.deliveryDefaultCountry,
      deliveryDefaultStateRegion: command.deliveryDefaultStateRegion,
      deliveryDefaultCity: command.deliveryDefaultCity,
      deliveryDefaultPostalCode: command.deliveryDefaultPostalCode,
      schedules: command.schedules.map((schedule) => ({
        type: schedule.type,
        dayOfWeek: schedule.dayOfWeek,
        specificDate: schedule.specificDate,
        window: {
          openTime: schedule.openTime,
          closeTime: schedule.closeTime,
          slotIntervalMinutes: schedule.slotIntervalMinutes,
        },
      })),
    });

    if (update.isErr()) {
      return err(update.error);
    }

    await this.branchRepository.update(branch);

    return ok({ id: branch.id });
  }
}
