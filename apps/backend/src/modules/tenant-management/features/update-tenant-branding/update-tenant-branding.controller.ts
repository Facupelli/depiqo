import { Body, Controller, HttpCode, HttpStatus, Put } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { AuthUser } from '../../auth/shared/auth.types';
import { CurrentUser } from '../../auth/shared/current-user/current-user.decorator';
import { UpdateTenantBrandingApplicationError } from './update-tenant-branding-application.error';
import { UpdateTenantBrandingCommand } from './update-tenant-branding.command';
import { toUpdateTenantBrandingProblem } from './update-tenant-branding-http-error.mapper';
import { UpdateTenantBrandingResult } from './update-tenant-branding.handler';
import { UpdateTenantBrandingRequestDto } from './update-tenant-branding.request.dto';
import { UpdateTenantBrandingResponseDto } from './update-tenant-branding.response.dto';

@Controller('tenant-management/tenant/branding')
export class UpdateTenantBrandingHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Put()
  @HttpCode(HttpStatus.OK)
  async updateTenantBranding(
    @Body() dto: UpdateTenantBrandingRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<UpdateTenantBrandingResponseDto> {
    const result = await this.commandBus.execute<
      UpdateTenantBrandingCommand,
      Result<UpdateTenantBrandingResult, UpdateTenantBrandingApplicationError>
    >(
      new UpdateTenantBrandingCommand({
        tenantId: user.tenantId,
        logoUrl: dto.logoUrl,
        faviconUrl: dto.faviconUrl,
        primaryColor: dto.primaryColor,
        accentColor: dto.accentColor,
        storefrontName: dto.storefrontName,
        tagline: dto.tagline,
      }),
    );

    if (result.isErr()) {
      throw toUpdateTenantBrandingProblem(result.error);
    }

    return result.value;
  }
}
