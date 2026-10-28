import { Controller, Get, HttpStatus, Query, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { TenantPermission } from '@repo/api-contracts';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AUTH_ACTOR_TYPES, AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantUserSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-user-session.guard';
import { RequirePermission } from 'src/modules/tenant-management/authorization/tenant-authorization.decorators';

import type { GetRentalInvoicesResult } from './get-rental-invoices.handler';
import { GetRentalInvoicesQuery } from './get-rental-invoices.query';
import { GetRentalInvoicesRequestDto } from './get-rental-invoices.request.dto';
import { GetRentalInvoicesResponseDto } from './get-rental-invoices.response.dto';

@Controller('invoicing/invoices')
export class GetRentalInvoicesHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @RequirePermission(TenantPermission.InvoicingRead)
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async list(
    @Query() query: GetRentalInvoicesRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetRentalInvoicesResponseDto> {
    const result = await this.queryBus.execute<GetRentalInvoicesQuery, GetRentalInvoicesResult>(
      new GetRentalInvoicesQuery(user.tenantId, query.rentalId, query.includeRemoved),
    );
    if (result.isErr()) {
      throw ProblemException.from({
        problemDetails: createProblemDetails({
          type: createProblemType(result.error.code),
          title: 'Rental not found',
          status: HttpStatus.NOT_FOUND,
          detail: 'The requested rental could not be found.',
          extensions: { code: result.error.code },
        }),
        applicationError: result.error,
        cause: result.error.cause,
      });
    }
    return result.value;
  }
}
