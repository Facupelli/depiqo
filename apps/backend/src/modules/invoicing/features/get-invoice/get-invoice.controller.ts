import { Controller, Get, HttpStatus, Param, Query, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { TenantPermission } from '@repo/api-contracts';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AUTH_ACTOR_TYPES, AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantUserSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-user-session.guard';
import { RequirePermission } from 'src/modules/tenant-management/authorization/tenant-authorization.decorators';

import type { GetInvoiceResult } from './get-invoice.handler';
import { GetInvoiceQuery } from './get-invoice.query';
import { GetInvoiceParamsDto, GetInvoiceQueryDto } from './get-invoice.request.dto';
import { GetInvoiceResponseDto } from './get-invoice.response.dto';

@Controller('invoicing/invoices')
export class GetInvoiceHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(':invoiceId')
  @RequirePermission(TenantPermission.InvoicingRead)
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async get(
    @Param() params: GetInvoiceParamsDto,
    @Query() query: GetInvoiceQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetInvoiceResponseDto> {
    const result = await this.queryBus.execute<GetInvoiceQuery, GetInvoiceResult>(
      new GetInvoiceQuery(user.tenantId, params.invoiceId, query.includeRemoved),
    );
    if (result.isErr()) {
      throw ProblemException.from({
        problemDetails: createProblemDetails({
          type: createProblemType(result.error.code),
          title: 'Invoice not found',
          status: HttpStatus.NOT_FOUND,
          detail: 'The requested invoice registration could not be found.',
          extensions: { code: result.error.code },
        }),
        applicationError: result.error,
        cause: result.error.cause,
      });
    }
    return result.value;
  }
}
