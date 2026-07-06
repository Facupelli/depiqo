import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { TenantRepository } from '../../infrastructure/persistence/repositories/tenant.repository';
import { UpdateTenantBrandingCommand } from './update-tenant-branding.command';
import {
  updateTenantBrandingApplicationError,
  UpdateTenantBrandingApplicationError,
} from './update-tenant-branding-application.error';

export interface UpdateTenantBrandingResult {
  id: string;
}

export type UpdateTenantBrandingHandlerResult = Result<
  UpdateTenantBrandingResult,
  UpdateTenantBrandingApplicationError
>;

@CommandHandler(UpdateTenantBrandingCommand)
export class UpdateTenantBrandingHandler implements ICommandHandler<
  UpdateTenantBrandingCommand,
  UpdateTenantBrandingHandlerResult
> {
  constructor(private readonly tenantRepository: TenantRepository) {}

  async execute(command: UpdateTenantBrandingCommand): Promise<UpdateTenantBrandingHandlerResult> {
    const tenant = await this.tenantRepository.findById(command.tenantId);

    if (!tenant) {
      return err(updateTenantBrandingApplicationError('TenantNotFound', `Tenant "${command.tenantId}" was not found.`));
    }

    tenant.updateBranding({
      logoUrl: command.logoUrl,
      faviconUrl: command.faviconUrl,
      primaryColor: command.primaryColor,
      accentColor: command.accentColor,
      storefrontName: command.storefrontName,
      tagline: command.tagline,
    });

    const brandingId = await this.tenantRepository.saveBranding(tenant);

    return ok({ id: brandingId });
  }
}
