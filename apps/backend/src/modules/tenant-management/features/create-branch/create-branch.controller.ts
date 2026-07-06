import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { AuthUser } from '../../auth/shared/auth.types';
import { CurrentUser } from '../../auth/shared/current-user/current-user.decorator';
import { TenantManagementError } from '../../domain/errors/tenant-management.errors';
import { CreateBranchCommand } from './create-branch.command';
import { toCreateBranchProblem } from './create-branch-http-error.mapper';
import { CreateBranchRequestDto } from './create-branch.request.dto';
import { CreateBranchResponseDto } from './create-branch.response.dto';
import { CreateBranchResult } from './create-branch.handler';
import { toCreateBranchApplicationError } from './map-create-branch-error';

@Controller('tenant-management/branches')
export class CreateBranchHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createBranch(
    @Body() dto: CreateBranchRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CreateBranchResponseDto> {
    const result = await this.commandBus.execute<
      CreateBranchCommand,
      Result<CreateBranchResult, TenantManagementError>
    >(
      new CreateBranchCommand({
        tenantId: user.tenantId,
        name: dto.name,
        address: dto.address ?? null,
        timezone: dto.timezone ?? null,
        supportsDelivery: dto.supportsDelivery ?? false,
        deliveryDefaultCountry: dto.deliveryDefaultCountry ?? null,
        deliveryDefaultStateRegion: dto.deliveryDefaultStateRegion ?? null,
        deliveryDefaultCity: dto.deliveryDefaultCity ?? null,
        deliveryDefaultPostalCode: dto.deliveryDefaultPostalCode ?? null,
        schedules: (dto.schedules ?? []).map((schedule) => ({
          type: schedule.type,
          dayOfWeek: schedule.dayOfWeek,
          specificDate: schedule.specificDate ? new Date(`${schedule.specificDate}T00:00:00.000Z`) : null,
          openTime: schedule.openTime,
          closeTime: schedule.closeTime,
          slotIntervalMinutes: schedule.slotIntervalMinutes,
        })),
      }),
    );

    if (result.isErr()) {
      throw toCreateBranchProblem(toCreateBranchApplicationError(result.error));
    }

    return result.value;
  }
}
