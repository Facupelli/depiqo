import { Body, Controller, HttpCode, HttpStatus, Param, Put } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { AuthUser } from '../../auth/shared/auth.types';
import { CurrentUser } from '../../auth/shared/current-user/current-user.decorator';
import { TenantManagementError } from '../../domain/errors/tenant-management.errors';
import { toUpdateBranchApplicationError } from './map-update-branch-error';
import { UpdateBranchCommand } from './update-branch.command';
import { toUpdateBranchProblem } from './update-branch-http-error.mapper';
import { UpdateBranchResult } from './update-branch.handler';
import { UpdateBranchParamsDto, UpdateBranchRequestDto } from './update-branch.request.dto';
import { UpdateBranchResponseDto } from './update-branch.response.dto';

@Controller('v2/tenant-management/branches')
export class UpdateBranchHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Put(':branchId')
  @HttpCode(HttpStatus.OK)
  async updateBranch(
    @Param() params: UpdateBranchParamsDto,
    @Body() dto: UpdateBranchRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<UpdateBranchResponseDto> {
    const result = await this.commandBus.execute<
      UpdateBranchCommand,
      Result<UpdateBranchResult, TenantManagementError>
    >(
      new UpdateBranchCommand({
        tenantId: user.tenantId,
        branchId: params.branchId,
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
      throw toUpdateBranchProblem(toUpdateBranchApplicationError(result.error));
    }

    return result.value;
  }
}
