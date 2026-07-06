import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { TenantManagementError } from '../../domain/errors/tenant-management.errors';
import { TenantRepository } from '../../infrastructure/persistence/repositories/tenant.repository';
import {
  updateTenantConfigApplicationError,
  UpdateTenantConfigApplicationError,
} from './update-tenant-config-application.error';
import { UpdateTenantConfigCommand } from './update-tenant-config.command';

export interface UpdateTenantConfigResult {
  id: string;
}

export type UpdateTenantConfigHandlerResult = Result<UpdateTenantConfigResult, UpdateTenantConfigApplicationError>;

@CommandHandler(UpdateTenantConfigCommand)
export class UpdateTenantConfigHandler implements ICommandHandler<
  UpdateTenantConfigCommand,
  UpdateTenantConfigHandlerResult
> {
  constructor(private readonly tenantRepository: TenantRepository) {}

  async execute(command: UpdateTenantConfigCommand): Promise<UpdateTenantConfigHandlerResult> {
    const tenant = await this.tenantRepository.findById(command.tenantId);

    if (!tenant) {
      return err(updateTenantConfigApplicationError('TenantNotFound', `Tenant "${command.tenantId}" was not found.`));
    }

    try {
      tenant.updateConfig(command.patch);
    } catch (error) {
      if (error instanceof TenantManagementError) {
        return err(updateTenantConfigApplicationError('InvalidTenantConfig', error.message, error));
      }

      return err(updateTenantConfigApplicationError('Unexpected', 'An unexpected error occurred.', error));
    }

    await this.tenantRepository.saveConfig(tenant);

    return ok({ id: tenant.id });
  }
}
