import { Controller, Get, HttpStatus, Query, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { TenantPermission } from '@repo/api-contracts';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { RequirePermission } from 'src/modules/tenant-management/authorization/tenant-authorization.decorators';
import { AUTH_ACTOR_TYPES, type AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantUserSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-user-session.guard';

import type { GetRentalOrdersReportResult } from './get-rental-orders-report.handler';
import { GetRentalOrdersReportQuery } from './get-rental-orders-report.query';
import { GetRentalOrdersReportRequestDto } from './get-rental-orders-report.request.dto';
import type { GetRentalOrdersReportResponseDto } from './get-rental-orders-report.response.dto';

@Controller('reports/rentals')
export class GetRentalOrdersReportHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @RequirePermission(TenantPermission.ReportsRentalsRead)
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async getReport(
    @Query() dto: GetRentalOrdersReportRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetRentalOrdersReportResponseDto> {
    const result = await this.queryBus.execute<GetRentalOrdersReportQuery, GetRentalOrdersReportResult>(
      new GetRentalOrdersReportQuery(
        user.tenantId,
        dto.year,
        dto.month,
        dto.branchId,
        dto.statuses,
        dto.page,
        dto.pageSize,
        dto.invoicePresence,
      ),
    );
    if (result.isErr()) {
      throw ProblemException.from({
        problemDetails: createProblemDetails({
          type: createProblemType(result.error.code),
          title: 'Tenant not found',
          status: HttpStatus.NOT_FOUND,
          detail: 'The current tenant could not be found.',
          extensions: { code: result.error.code },
        }),
        applicationError: result.error,
        cause: result.error.cause,
      });
    }
    return result.value;
  }
}
