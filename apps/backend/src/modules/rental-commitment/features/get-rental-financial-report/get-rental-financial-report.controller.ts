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

import type {
  GetRentalFinancialReportError,
  GetRentalFinancialReportErrorCode,
} from './get-rental-financial-report.errors';
import type { GetRentalFinancialReportResult } from './get-rental-financial-report.handler';
import { GetRentalFinancialReportQuery } from './get-rental-financial-report.query';
import { GetRentalFinancialReportRequestDto } from './get-rental-financial-report.request.dto';
import type { GetRentalFinancialReportResponseDto } from './get-rental-financial-report.response.dto';

@Controller('rental-commitments/financial-report')
export class GetRentalFinancialReportHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @RequirePermission(TenantPermission.FinancesRead)
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async getRentalFinancialReport(
    @Query() dto: GetRentalFinancialReportRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetRentalFinancialReportResponseDto> {
    const result = await this.queryBus.execute<GetRentalFinancialReportQuery, GetRentalFinancialReportResult>(
      new GetRentalFinancialReportQuery(user.tenantId, dto.year),
    );

    if (result.isErr()) throw toGetRentalFinancialReportProblem(result.error);
    return result.value;
  }
}

function toGetRentalFinancialReportProblem(error: GetRentalFinancialReportError): ProblemException {
  const problem = getRentalFinancialReportProblemMap[error.code];
  return ProblemException.from({
    problemDetails: createProblemDetails({ ...problem, extensions: { code: error.code } }),
    applicationError: error,
    cause: error.cause,
  });
}

const getRentalFinancialReportProblemMap = {
  'rental_commitment.financial_report_tenant_not_found': {
    type: createProblemType('rental_commitment.financial_report_tenant_not_found'),
    title: 'Tenant not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The current tenant could not be found.',
  },
  'rental_commitment.financial_report_currency_mismatch': {
    type: createProblemType('rental_commitment.financial_report_currency_mismatch'),
    title: 'Financial report currency mismatch',
    status: HttpStatus.CONFLICT,
    detail: 'Accepted rental amounts must use the configured tenant currency to produce this report.',
  },
} satisfies Record<
  GetRentalFinancialReportErrorCode,
  { type: string; title: string; status: HttpStatus; detail: string }
>;
