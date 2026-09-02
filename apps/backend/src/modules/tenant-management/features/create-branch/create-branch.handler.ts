import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { BranchAddressResolver } from '../../application/services/branch-address-resolver.service';
import { Branch } from '../../domain/entities/branch.aggregate';
import {
  BranchScheduleOverlapError,
  InvalidBranchNameError,
  InvalidBranchOperationalLocationError,
  InvalidBranchScheduleDayOfWeekError,
  InvalidBranchScheduleDaySpecificationError,
  InvalidBranchScheduleTypeError,
  InvalidBranchScheduleWindowError,
  InvalidTimezoneError,
} from '../../domain/errors/tenant-management.errors';
import { BranchRepository } from '../../infrastructure/persistence/repositories/branch.repository';
import { CreateBranchCommand } from './create-branch.command';
import { CreateBranchError, createBranchError } from './create-branch.errors';

export interface CreateBranchResult {
  id: string;
}

@CommandHandler(CreateBranchCommand)
export class CreateBranchHandler implements ICommandHandler<
  CreateBranchCommand,
  Result<CreateBranchResult, CreateBranchError>
> {
  constructor(
    private readonly branchRepository: BranchRepository,
    private readonly branchAddressResolver: BranchAddressResolver,
  ) {}

  async execute(command: CreateBranchCommand): Promise<Result<CreateBranchResult, CreateBranchError>> {
    const context = {
      useCase: 'CreateBranch',
      tenantId: command.tenantId,
    };
    const addressResolution = await this.branchAddressResolver.resolve({
      address: command.address,
      addressLocationId: command.addressLocationId,
    });
    if (addressResolution.outcome === 'UNRESOLVED') {
      return err(
        createBranchError(
          'tenant_management.branch_address_unresolved',
          'The branch address could not be resolved.',
          undefined,
          context,
        ),
      );
    }
    const branch = Branch.create({
      tenantId: command.tenantId,
      name: command.name,
      address: addressResolution.address,
      operationalLocation: addressResolution.operationalLocation,
      timezone: command.timezone,
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
      const error = branch.error;

      if (
        error instanceof InvalidBranchNameError ||
        error instanceof InvalidBranchOperationalLocationError ||
        error instanceof InvalidTimezoneError
      ) {
        return err(createBranchError('tenant_management.branch_invalid_input', error.message, error, context));
      }

      if (
        error instanceof InvalidBranchScheduleTypeError ||
        error instanceof InvalidBranchScheduleDaySpecificationError ||
        error instanceof InvalidBranchScheduleDayOfWeekError ||
        error instanceof InvalidBranchScheduleWindowError ||
        error instanceof BranchScheduleOverlapError
      ) {
        return err(createBranchError('tenant_management.branch_schedule_invalid_input', error.message, error, context));
      }

      throw error;
    }

    await this.branchRepository.save(branch.value);

    return ok({ id: branch.value.id });
  }
}
