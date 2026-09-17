import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { TenantPermission } from '@repo/api-contracts';

import { RequirePermission } from 'src/modules/tenant-management/authorization/tenant-authorization.decorators';
import { AUTH_ACTOR_TYPES, AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantUserSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-user-session.guard';

import { GetRentalOperationsResult } from './get-rental-operations.handler';
import { GetRentalOperationsQuery } from './get-rental-operations.query';
import { GetRentalOperationsRequestDto } from './get-rental-operations.request.dto';
import type { GetRentalOperationsResponseDto } from './get-rental-operations.response.dto';

@Controller('rental-commitments/rentals/operations')
export class GetRentalOperationsHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @RequirePermission(TenantPermission.RentalsRead)
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async getRentalOperations(
    @Query() dto: GetRentalOperationsRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetRentalOperationsResponseDto> {
    return this.queryBus.execute<GetRentalOperationsQuery, GetRentalOperationsResult>(
      new GetRentalOperationsQuery(user.tenantId, dto.branchId, dto.from, dto.to),
    );
  }
}
