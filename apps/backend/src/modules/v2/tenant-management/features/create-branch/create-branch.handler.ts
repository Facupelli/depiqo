import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { Branch } from '../../domain/entities/branch.aggregate';
import { TenantManagementError } from '../../domain/errors/tenant-management.errors';
import { BranchRepository } from '../../infrastructure/persistence/repositories/branch.repository';
import { CreateBranchCommand } from './create-branch.command';

export interface CreateBranchResult {
  id: string;
}

@CommandHandler(CreateBranchCommand)
export class CreateBranchHandler implements ICommandHandler<
  CreateBranchCommand,
  Result<CreateBranchResult, TenantManagementError>
> {
  constructor(private readonly branchRepository: BranchRepository) {}

  async execute(command: CreateBranchCommand): Promise<Result<CreateBranchResult, TenantManagementError>> {
    const branch = Branch.create({
      tenantId: command.tenantId,
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

    if (branch.isErr()) {
      return err(branch.error);
    }

    await this.branchRepository.save(branch.value);

    return ok({ id: branch.value.id });
  }
}
