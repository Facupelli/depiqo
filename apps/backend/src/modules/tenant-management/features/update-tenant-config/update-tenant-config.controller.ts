import { Body, Controller, HttpCode, HttpStatus, Patch } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { AuthUser } from '../../auth/shared/auth.types';
import { CurrentUser } from '../../auth/shared/current-user/current-user.decorator';
import { UpdateTenantConfigApplicationError } from './update-tenant-config-application.error';
import { UpdateTenantConfigCommand } from './update-tenant-config.command';
import { toUpdateTenantConfigProblem } from './update-tenant-config-http-error.mapper';
import { UpdateTenantConfigResult } from './update-tenant-config.handler';
import { UpdateTenantConfigRequestDto } from './update-tenant-config.request.dto';
import { UpdateTenantConfigResponseDto } from './update-tenant-config.response.dto';

@Controller('v2/tenant-management/tenant/config')
export class UpdateTenantConfigHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Patch()
  @HttpCode(HttpStatus.OK)
  async updateTenantConfig(
    @Body() dto: UpdateTenantConfigRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<UpdateTenantConfigResponseDto> {
    const result = await this.commandBus.execute<
      UpdateTenantConfigCommand,
      Result<UpdateTenantConfigResult, UpdateTenantConfigApplicationError>
    >(
      new UpdateTenantConfigCommand({
        tenantId: user.tenantId,
        patch: dto,
      }),
    );

    if (result.isErr()) {
      throw toUpdateTenantConfigProblem(result.error);
    }

    return result.value;
  }
}
