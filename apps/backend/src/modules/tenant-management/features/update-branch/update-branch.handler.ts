import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { BranchAddressResolver } from '../../application/services/branch-address-resolver.service';
import type { BranchOperationalLocationProps } from '../../domain/value-objects/branch-operational-location.value-object';
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
import { UpdateBranchCommand } from './update-branch.command';
import { UpdateBranchError, updateBranchError } from './update-branch.errors';

export interface UpdateBranchResult {
  id: string;
}

@CommandHandler(UpdateBranchCommand)
export class UpdateBranchHandler implements ICommandHandler<
  UpdateBranchCommand,
  Result<UpdateBranchResult, UpdateBranchError>
> {
  constructor(
    private readonly branchRepository: BranchRepository,
    private readonly branchAddressResolver: BranchAddressResolver,
  ) {}

  async execute(command: UpdateBranchCommand): Promise<Result<UpdateBranchResult, UpdateBranchError>> {
    const context = {
      useCase: 'UpdateBranch',
      tenantId: command.tenantId,
      branchId: command.branchId,
    };
    const branch = await this.branchRepository.findByIdForTenant(command.branchId, command.tenantId);

    if (!branch) {
      return err(
        updateBranchError(
          'tenant_management.branch_not_found',
          `Branch "${command.branchId}" was not found.`,
          undefined,
          context,
        ),
      );
    }

    const address = this.branchAddressResolver.normalize(command.address);
    let operationalLocation: BranchOperationalLocationProps | null = branch.getOperationalLocation();

    if (address === null) {
      operationalLocation = null;
    } else if (address !== this.branchAddressResolver.normalize(branch.getAddress()) || operationalLocation === null) {
      const addressResolution = await this.branchAddressResolver.resolve(address);
      if (addressResolution.outcome === 'UNRESOLVED') {
        return err(
          updateBranchError(
            'tenant_management.branch_address_unresolved',
            'The branch address could not be resolved.',
            undefined,
            context,
          ),
        );
      }
      if (addressResolution.outcome === 'AMBIGUOUS') {
        return err(
          updateBranchError(
            'tenant_management.branch_address_ambiguous',
            'The branch address resolved to multiple possible locations.',
            undefined,
            context,
          ),
        );
      }
      operationalLocation = addressResolution.operationalLocation;
    }

    const update = branch.updateDetails({
      name: command.name,
      address,
      operationalLocation,
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

    if (update.isErr()) {
      const error = update.error;

      if (
        error instanceof InvalidBranchNameError ||
        error instanceof InvalidBranchOperationalLocationError ||
        error instanceof InvalidTimezoneError
      ) {
        return err(updateBranchError('tenant_management.branch_invalid_input', error.message, error, context));
      }

      if (
        error instanceof InvalidBranchScheduleTypeError ||
        error instanceof InvalidBranchScheduleDaySpecificationError ||
        error instanceof InvalidBranchScheduleDayOfWeekError ||
        error instanceof InvalidBranchScheduleWindowError ||
        error instanceof BranchScheduleOverlapError
      ) {
        return err(updateBranchError('tenant_management.branch_schedule_invalid_input', error.message, error, context));
      }

      throw error;
    }

    await this.branchRepository.update(branch);

    return ok({ id: branch.id });
  }
}
