import { Controller, Get, HttpStatus, Query, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { TenantPermission } from '@repo/api-contracts';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AUTH_ACTOR_TYPES, AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantUserSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-user-session.guard';
import { RequireAnyPermission } from 'src/modules/tenant-management/authorization/tenant-authorization.decorators';

import { GetAssetAvailabilityTimelineResult } from './get-asset-availability-timeline.handler';
import { GetAssetAvailabilityTimelineQuery } from './get-asset-availability-timeline.query';
import { GetAssetAvailabilityTimelineRequestDto } from './get-asset-availability-timeline.request.dto';
import type { GetAssetAvailabilityTimelineResponseDto } from './get-asset-availability-timeline.response.dto';

@Controller('asset-inventory/availability-timeline')
export class GetAssetAvailabilityTimelineHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @RequireAnyPermission(TenantPermission.InventoryRead, TenantPermission.InventoryManage)
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async getTimeline(
    @Query() dto: GetAssetAvailabilityTimelineRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetAssetAvailabilityTimelineResponseDto> {
    const result = await this.queryBus.execute<GetAssetAvailabilityTimelineQuery, GetAssetAvailabilityTimelineResult>(
      new GetAssetAvailabilityTimelineQuery({ ...dto, tenantId: user.tenantId, tenantUserId: user.id }),
    );
    if (result.isOk()) return result.value;

    const error = result.error;
    throw ProblemException.from({
      problemDetails: createProblemDetails({
        ...problems[error.code],
        type: createProblemType(error.code),
        extensions: { code: error.code },
      }),
      applicationError: error,
      cause: error.cause,
    });
  }
}

const problems = {
  'rental_commitment.branch_not_found': {
    title: 'Branch not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested branch was not found.',
  },
  'rental_commitment.tenant_config_invalid': {
    title: 'Internal server error',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    detail: 'The availability timeline could not be loaded.',
  },
};
