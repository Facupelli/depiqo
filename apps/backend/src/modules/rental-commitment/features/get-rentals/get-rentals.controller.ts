import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { TenantPermission } from '@repo/api-contracts';

import { RequireAnyPermission } from 'src/modules/tenant-management/authorization/tenant-authorization.decorators';
import { AUTH_ACTOR_TYPES, AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantUserSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-user-session.guard';

import { GetRentalsQuery } from './get-rentals.query';
import { GetRentalsRequestDto } from './get-rentals.request.dto';
import type { GetRentalsResponseDto } from './get-rentals.response.dto';

@Controller('rental-commitments/rentals')
export class GetRentalsHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @RequireAnyPermission(
    TenantPermission.RentalsRead,
    TenantPermission.RentalsProposalsManage,
    TenantPermission.RentalsConfirm,
    TenantPermission.RentalsConfirmedManage,
    TenantPermission.RentalsFulfillmentManage,
    TenantPermission.RentalsCancel,
    TenantPermission.ContractsRead,
    TenantPermission.ContractsGenerate,
    TenantPermission.ContractsSigningSend,
  )
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async getRentals(@Query() dto: GetRentalsRequestDto, @CurrentUser() user: AuthUser): Promise<GetRentalsResponseDto> {
    return this.queryBus.execute<GetRentalsQuery, GetRentalsResponseDto>(
      new GetRentalsQuery(
        user.tenantId,
        dto.page,
        dto.limit,
        dto.branchId,
        dto.customerId,
        dto.statuses,
        dto.dateLens,
        dto.sortBy,
        dto.sortDirection,
      ),
    );
  }
}
