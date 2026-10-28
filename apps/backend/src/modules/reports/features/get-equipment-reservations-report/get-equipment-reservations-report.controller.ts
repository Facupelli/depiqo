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

import type { GetEquipmentReservationsReportResult } from './get-equipment-reservations-report.handler';
import { GetEquipmentReservationsReportQuery } from './get-equipment-reservations-report.query';
import { GetEquipmentReservationsReportRequestDto } from './get-equipment-reservations-report.request.dto';
import type { GetEquipmentReservationsReportResponseDto } from './get-equipment-reservations-report.response.dto';

@Controller('reports/equipment')
export class GetEquipmentReservationsReportHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @RequirePermission(TenantPermission.ReportsEquipmentRead)
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async getReport(
    @Query() dto: GetEquipmentReservationsReportRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetEquipmentReservationsReportResponseDto> {
    const result = await this.queryBus.execute<
      GetEquipmentReservationsReportQuery,
      GetEquipmentReservationsReportResult
    >(
      new GetEquipmentReservationsReportQuery(
        user.tenantId,
        dto.year,
        dto.month,
        dto.branchId,
        dto.statuses,
        dto.page,
        dto.pageSize,
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
