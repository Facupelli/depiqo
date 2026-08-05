import { Controller, Get, HttpStatus, Param, Res, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import type { Response } from 'express';
import { Result } from 'neverthrow';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AUTH_ACTOR_TYPES, AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantUserSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-user-session.guard';

import { GenerateRentalRemitoError, GenerateRentalRemitoErrorCode } from './generate-rental-remito.errors';
import { GenerateRentalRemitoReadModel } from './generate-rental-remito.handler';
import { GenerateRentalRemitoQuery } from './generate-rental-remito.query';

@Controller('contracts/rentals')
export class GenerateRentalRemitoHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(':rentalId/remito')
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async previewRemito(
    @Param('rentalId') rentalId: string,
    @CurrentUser() user: AuthUser,
    @Res() response: Response,
  ): Promise<void> {
    await this.sendRemitoResponse({
      tenantId: user.tenantId,
      rentalId,
      response,
      disposition: 'inline',
    });
  }

  @Get(':rentalId/remito/download')
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async downloadRemito(
    @Param('rentalId') rentalId: string,
    @CurrentUser() user: AuthUser,
    @Res() response: Response,
  ): Promise<void> {
    await this.sendRemitoResponse({
      tenantId: user.tenantId,
      rentalId,
      response,
      disposition: 'attachment',
    });
  }

  private async sendRemitoResponse({
    tenantId,
    rentalId,
    response,
    disposition,
  }: {
    tenantId: string;
    rentalId: string;
    response: Response;
    disposition: 'inline' | 'attachment';
  }): Promise<void> {
    const result = await this.queryBus.execute<
      GenerateRentalRemitoQuery,
      Result<GenerateRentalRemitoReadModel, GenerateRentalRemitoError>
    >(new GenerateRentalRemitoQuery(tenantId, rentalId));

    if (result.isErr()) {
      throw toGenerateRentalRemitoProblem(result.error);
    }

    response.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${disposition}; filename="${result.value.fileName}"`,
      'Content-Length': result.value.buffer.length,
    });

    response.end(result.value.buffer);
  }
}

function toGenerateRentalRemitoProblem(error: GenerateRentalRemitoError): ProblemException {
  const problem = generateRentalRemitoProblemMap[error.code];

  return ProblemException.from({
    problemDetails: createProblemDetails({
      type: problem.type,
      title: problem.title,
      status: problem.status,
      detail: problem.detail,
      extensions: { code: error.code },
    }),
    applicationError: error,
    cause: error.cause,
  });
}

const generateRentalRemitoProblemMap = {
  'contracts.rental_remito_rental_not_found': {
    type: createProblemType('contracts.rental_remito_rental_not_found'),
    title: 'Rental not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested rental was not found.',
  },
  'contracts.rental_remito_rental_not_ready': {
    type: createProblemType('contracts.rental_remito_rental_not_ready'),
    title: 'Rental not ready',
    status: HttpStatus.CONFLICT,
    detail: 'The rental must be confirmed before generating the remito.',
  },
  'contracts.rental_remito_customer_profile_missing': {
    type: createProblemType('contracts.rental_remito_customer_profile_missing'),
    title: 'Customer profile missing',
    status: HttpStatus.CONFLICT,
    detail: 'The customer profile does not have enough legal identity data to generate the remito.',
  },
  'contracts.rental_remito_branch_context_missing': {
    type: createProblemType('contracts.rental_remito_branch_context_missing'),
    title: 'Branch context missing',
    status: HttpStatus.CONFLICT,
    detail: 'The rental branch does not have enough context to generate the remito.',
  },
  'contracts.rental_remito_price_snapshot_invalid': {
    type: createProblemType('contracts.rental_remito_price_snapshot_invalid'),
    title: 'Price snapshot invalid',
    status: HttpStatus.CONFLICT,
    detail: 'The rental does not have a valid confirmed price snapshot.',
  },
} satisfies Record<
  GenerateRentalRemitoErrorCode,
  {
    type: string;
    title: string;
    status: HttpStatus;
    detail: string;
  }
>;
