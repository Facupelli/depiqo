import { Body, Controller, HttpStatus, Param, Patch, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { TenantPermission } from '@repo/api-contracts';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AUTH_ACTOR_TYPES, AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantUserSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-user-session.guard';
import { RequirePermission } from 'src/modules/tenant-management/authorization/tenant-authorization.decorators';

import { CorrectInvoiceRegistrationCommand } from './correct-invoice-registration.command';
import type { CorrectInvoiceRegistrationErrorCode } from './correct-invoice-registration.errors';
import type { CorrectInvoiceRegistrationResult } from './correct-invoice-registration.handler';
import {
  CorrectInvoiceRegistrationParamsDto,
  CorrectInvoiceRegistrationRequestDto,
} from './correct-invoice-registration.request.dto';
import { CorrectInvoiceRegistrationResponseDto } from './correct-invoice-registration.response.dto';

@Controller('invoicing/invoices')
export class CorrectInvoiceRegistrationHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Patch(':invoiceId')
  @RequirePermission(TenantPermission.InvoicingManage)
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async correct(
    @Param() params: CorrectInvoiceRegistrationParamsDto,
    @Body() dto: CorrectInvoiceRegistrationRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CorrectInvoiceRegistrationResponseDto> {
    const result = await this.commandBus.execute<CorrectInvoiceRegistrationCommand, CorrectInvoiceRegistrationResult>(
      new CorrectInvoiceRegistrationCommand({
        tenantId: user.tenantId,
        tenantUserId: user.id,
        invoiceId: params.invoiceId,
        expectedVersion: dto.expectedVersion,
        patch: {
          reference: dto.reference,
          issuedOn: dto.issuedOn,
          amount: dto.amount,
          externalUrl: dto.externalUrl,
          sourceSystem: dto.sourceSystem,
        },
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
    return {
      id: result.value.id,
      version: result.value.version,
      updatedAt: result.value.updatedAt.toISOString(),
    };
  }
}

const problemMap = {
  'invoicing.invalid_registration': {
    title: 'Invalid invoice registration',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The invoice registration correction contains invalid values.',
  },
  'invoicing.invoice_not_found': {
    title: 'Invoice not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested invoice registration could not be found.',
  },
  'invoicing.invoice_registration_removed': {
    title: 'Invoice registration removed',
    status: HttpStatus.CONFLICT,
    detail: 'A removed invoice registration cannot be corrected.',
  },
  'invoicing.invoice_version_conflict': {
    title: 'Invoice registration was modified',
    status: HttpStatus.CONFLICT,
    detail: 'The invoice registration was changed by another request. Refresh it and try again.',
  },
} satisfies Record<CorrectInvoiceRegistrationErrorCode, { title: string; status: HttpStatus; detail: string }>;
