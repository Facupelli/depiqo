import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { TenantManagementError } from '../../domain/errors/tenant-management.errors';
import { TenantRepository } from '../../infrastructure/persistence/repositories/tenant.repository';
import { UpdateTenantConfigCommand } from './update-tenant-config.command';
import { UpdateTenantConfigError, updateTenantConfigError } from './update-tenant-config.errors';

export interface UpdateTenantConfigResult {
  id: string;
}

export type UpdateTenantConfigHandlerResult = Result<UpdateTenantConfigResult, UpdateTenantConfigError>;

@CommandHandler(UpdateTenantConfigCommand)
export class UpdateTenantConfigHandler implements ICommandHandler<
  UpdateTenantConfigCommand,
  UpdateTenantConfigHandlerResult
> {
  constructor(private readonly tenantRepository: TenantRepository) {}

  async execute(command: UpdateTenantConfigCommand): Promise<UpdateTenantConfigHandlerResult> {
    const context = { useCase: 'UpdateTenantConfig', tenantId: command.tenantId };
    const tenant = await this.tenantRepository.findById(command.tenantId);

    if (!tenant) {
      return err(
        updateTenantConfigError(
          'tenant_management.tenant_not_found',
          `Tenant "${command.tenantId}" was not found.`,
          undefined,
          context,
        ),
      );
    }

    try {
      tenant.updateConfig(command.patch);
    } catch (error) {
      if (error instanceof TenantManagementError) {
        return err(updateTenantConfigError('tenant_management.invalid_tenant_config', error.message, error, context));
      }

      throw error;
    }

    await this.tenantRepository.saveConfig(tenant);

    return ok({ id: tenant.id });
  }
}
