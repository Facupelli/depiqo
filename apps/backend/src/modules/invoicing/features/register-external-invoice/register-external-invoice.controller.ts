import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { TenantPermission } from '@repo/api-contracts';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AUTH_ACTOR_TYPES, AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantUserSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-user-session.guard';
import { RequirePermission } from 'src/modules/tenant-management/authorization/tenant-authorization.decorators';

import { RegisterExternalInvoiceCommand } from './register-external-invoice.command';
import type { RegisterExternalInvoiceErrorCode } from './register-external-invoice.errors';
import type { RegisterExternalInvoiceResult } from './register-external-invoice.handler';
import { RegisterExternalInvoiceRequestDto } from './register-external-invoice.request.dto';
import { RegisterExternalInvoiceResponseDto } from './register-external-invoice.response.dto';

@Controller('invoicing/invoices')
export class RegisterExternalInvoiceHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(TenantPermission.InvoicingManage)
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async register(
    @Body() dto: RegisterExternalInvoiceRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<RegisterExternalInvoiceResponseDto> {
    const result = await this.commandBus.execute<RegisterExternalInvoiceCommand, RegisterExternalInvoiceResult>(
      new RegisterExternalInvoiceCommand({
        tenantId: user.tenantId,
        tenantUserId: user.id,
        rentalId: dto.rentalId,
        reference: dto.reference,
        issuedOn: dto.issuedOn,
        amount: dto.amount,
        externalUrl: dto.externalUrl,
        sourceSystem: dto.sourceSystem,
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
    return result.value;
  }
}

const problemMap = {
  'invoicing.invalid_registration': {
    title: 'Invalid invoice registration',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The invoice registration contains invalid values.',
  },
  'invoicing.rental_not_found': {
    title: 'Rental not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested rental could not be found.',
  },
  'invoicing.rental_not_eligible': {
    title: 'Rental not eligible',
    status: HttpStatus.CONFLICT,
    detail: 'Invoices can only be registered for confirmed, completed, or previously confirmed cancelled rentals.',
  },
} satisfies Record<RegisterExternalInvoiceErrorCode, { title: string; status: HttpStatus; detail: string }>;
