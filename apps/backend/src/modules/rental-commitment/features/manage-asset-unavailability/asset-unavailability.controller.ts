import { AssetUnavailabilityPeriod, TenantPermission } from '@repo/api-contracts';
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import {
  RequireAnyPermission,
  RequirePermission,
} from 'src/modules/tenant-management/authorization/tenant-authorization.decorators';

import { AssetUnavailabilityError, AssetUnavailabilityErrorCode } from './asset-unavailability.errors';
import {
  AssetUnavailabilityReadModel,
  AssetUnavailabilityResult,
  CancelAssetUnavailabilityCommand,
  ListAssetUnavailabilityQuery,
  RescheduleAssetUnavailabilityCommand,
  ScheduleAssetUnavailabilityCommand,
} from './asset-unavailability.handler';
import {
  AssetUnavailabilityListParamsDto,
  AssetUnavailabilityPeriodParamsDto,
  RescheduleAssetUnavailabilityRequestDto,
  ScheduleAssetUnavailabilityRequestDto,
} from './asset-unavailability.request.dto';

@Controller('asset-inventory/assets/:assetId/unavailability-periods')
export class ListAssetUnavailabilityHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @RequireAnyPermission(TenantPermission.InventoryRead, TenantPermission.InventoryManage)
  @Get()
  async list(
    @Param() params: AssetUnavailabilityListParamsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<AssetUnavailabilityPeriod[]> {
    const result = await this.queryBus.execute<
      ListAssetUnavailabilityQuery,
      AssetUnavailabilityResult<AssetUnavailabilityReadModel[]>
    >(new ListAssetUnavailabilityQuery({ tenantId: user.tenantId, assetId: params.assetId }));
    if (result.isErr()) throw toProblem(result.error);
    return result.value.map((period) => ({
      id: period.id,
      startsAt: period.startsAt.toISOString(),
      endsAt: period.endsAt.toISOString(),
      reason: period.reason,
      createdAt: period.createdAt.toISOString(),
      cancelledAt: period.cancelledAt?.toISOString() ?? null,
    }));
  }
}

@Controller('asset-inventory/assets/:assetId/unavailability-periods')
export class ScheduleAssetUnavailabilityHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @RequirePermission(TenantPermission.InventoryManage)
  @Post()
  async schedule(
    @Param() params: AssetUnavailabilityListParamsDto,
    @Body() dto: ScheduleAssetUnavailabilityRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<{ id: string }> {
    const result = await this.commandBus.execute<
      ScheduleAssetUnavailabilityCommand,
      AssetUnavailabilityResult<{ id: string }>
    >(
      new ScheduleAssetUnavailabilityCommand(
        { tenantId: user.tenantId, assetId: params.assetId },
        {
          startsAt: dto.startsAt,
          endsAt: dto.endsAt,
          reason: dto.reason,
        },
      ),
    );
    if (result.isErr()) throw toProblem(result.error);
    return result.value;
  }
}

@Controller('asset-inventory/assets/:assetId/unavailability-periods')
export class RescheduleAssetUnavailabilityHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @RequirePermission(TenantPermission.InventoryManage)
  @Patch(':periodId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async reschedule(
    @Param() params: AssetUnavailabilityPeriodParamsDto,
    @Body() dto: RescheduleAssetUnavailabilityRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    const result = await this.commandBus.execute<RescheduleAssetUnavailabilityCommand, AssetUnavailabilityResult<void>>(
      new RescheduleAssetUnavailabilityCommand(
        { tenantId: user.tenantId, assetId: params.assetId, periodId: params.periodId },
        {
          startsAt: dto.startsAt,
          endsAt: dto.endsAt,
          reason: dto.reason,
        },
      ),
    );
    if (result.isErr()) throw toProblem(result.error);
  }
}

@Controller('asset-inventory/assets/:assetId/unavailability-periods')
export class CancelAssetUnavailabilityHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @RequirePermission(TenantPermission.InventoryManage)
  @Delete(':periodId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancel(@Param() params: AssetUnavailabilityPeriodParamsDto, @CurrentUser() user: AuthUser): Promise<void> {
    const result = await this.commandBus.execute<CancelAssetUnavailabilityCommand, AssetUnavailabilityResult<void>>(
      new CancelAssetUnavailabilityCommand({
        tenantId: user.tenantId,
        assetId: params.assetId,
        periodId: params.periodId,
      }),
    );
    if (result.isErr()) throw toProblem(result.error);
  }
}

const problems = {
  'asset_inventory.asset_not_found': { title: 'Asset not found', status: HttpStatus.NOT_FOUND },
  'asset_unavailability.period_not_found': { title: 'Period not found', status: HttpStatus.NOT_FOUND },
  'asset_unavailability.invalid_window': {
    title: 'Invalid unavailability period',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
  },
  'asset_unavailability.not_editable': { title: 'Period cannot be changed', status: HttpStatus.CONFLICT },
  'asset_unavailability.overlap': { title: 'Asset unavailable', status: HttpStatus.CONFLICT },
} satisfies Record<AssetUnavailabilityErrorCode, { title: string; status: HttpStatus }>;

function toProblem(error: AssetUnavailabilityError): ProblemException {
  return ProblemException.from({
    problemDetails: createProblemDetails({
      ...problems[error.code],
      type: createProblemType(error.code),
      detail: error.message,
      extensions: { code: error.code },
    }),
    applicationError: error,
    cause: error.cause,
  });
}
