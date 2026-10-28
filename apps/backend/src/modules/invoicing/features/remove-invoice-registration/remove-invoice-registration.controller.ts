import { Controller, Delete, HttpCode, HttpStatus, Param, Query, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { TenantPermission } from '@repo/api-contracts';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AUTH_ACTOR_TYPES, AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantUserSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-user-session.guard';
import { RequirePermission } from 'src/modules/tenant-management/authorization/tenant-authorization.decorators';

import { RemoveInvoiceRegistrationCommand } from './remove-invoice-registration.command';
import type { RemoveInvoiceRegistrationErrorCode } from './remove-invoice-registration.errors';
import type { RemoveInvoiceRegistrationResult } from './remove-invoice-registration.handler';
import {
  RemoveInvoiceRegistrationParamsDto,
  RemoveInvoiceRegistrationQueryDto,
} from './remove-invoice-registration.request.dto';

@Controller('invoicing/invoices')
export class RemoveInvoiceRegistrationHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Delete(':invoiceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission(TenantPermission.InvoicingManage)
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async remove(
    @Param() params: RemoveInvoiceRegistrationParamsDto,
    @Query() query: RemoveInvoiceRegistrationQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    const result = await this.commandBus.execute<RemoveInvoiceRegistrationCommand, RemoveInvoiceRegistrationResult>(
      new RemoveInvoiceRegistrationCommand({
        tenantId: user.tenantId,
        tenantUserId: user.id,
        invoiceId: params.invoiceId,
        expectedVersion: query.expectedVersion,
      }),
    );
    if (result.isErr()) {
      const problem = problemMap[result.error.code];
      throw ProblemException.from({
        problemDetails: createProblemDetails({
          type: createProblemType(result.error.code),
          ...problem,
          extensions: { code: result.error.code },
        }),
        applicationError: result.error,
        cause: result.error.cause,
      });
    }
  }
}

const problemMap = {
  'invoicing.invoice_not_found': {
    title: 'Invoice not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested invoice registration could not be found.',
  },
  'invoicing.invoice_registration_removed': {
    title: 'Invoice registration removed',
    status: HttpStatus.CONFLICT,
    detail: 'The invoice registration has already been removed.',
  },
  'invoicing.invoice_version_conflict': {
    title: 'Invoice registration was modified',
    status: HttpStatus.CONFLICT,
    detail: 'The invoice registration was changed by another request. Refresh it and try again.',
  },
} satisfies Record<RemoveInvoiceRegistrationErrorCode, { title: string; status: HttpStatus; detail: string }>;
