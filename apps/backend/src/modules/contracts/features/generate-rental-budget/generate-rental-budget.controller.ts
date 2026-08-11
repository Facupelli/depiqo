import { Body, Controller, HttpStatus, Param, Post, Res, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import type { Response } from 'express';
import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AUTH_ACTOR_TYPES, AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantUserSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-user-session.guard';

import { GenerateRentalBudgetError, GenerateRentalBudgetErrorCode } from './generate-rental-budget.errors';
import { GenerateRentalBudgetResult } from './generate-rental-budget.handler';
import { GenerateRentalBudgetQuery } from './generate-rental-budget.query';
import { GenerateRentalBudgetParamsDto, GenerateRentalBudgetRequestDto } from './generate-rental-budget.request.dto';

@Controller('contracts/rentals')
export class GenerateRentalBudgetHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Post(':rentalId/budget')
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async previewBudget(
    @Param() params: GenerateRentalBudgetParamsDto,
    @Body() dto: GenerateRentalBudgetRequestDto,
    @CurrentUser() user: AuthUser,
    @Res() response: Response,
  ): Promise<void> {
    const result = await this.queryBus.execute<GenerateRentalBudgetQuery, GenerateRentalBudgetResult>(
      new GenerateRentalBudgetQuery(user.tenantId, params.rentalId, dto.customer),
    );
    if (result.isErr()) throw toGenerateRentalBudgetProblem(result.error);

    response.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${result.value.fileName}"`,
      'Content-Length': result.value.buffer.length,
    });
    response.end(result.value.buffer);
  }
}

function toGenerateRentalBudgetProblem(error: GenerateRentalBudgetError): ProblemException {
  const problem = generateRentalBudgetProblemMap[error.code];
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

const generateRentalBudgetProblemMap = {
  'contracts.rental_budget_rental_not_found': {
    type: createProblemType('contracts.rental_budget_rental_not_found'),
    title: 'Rental not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested rental was not found.',
  },
  'contracts.rental_budget_rental_not_draft': {
    type: createProblemType('contracts.rental_budget_rental_not_draft'),
    title: 'Rental is not a draft',
    status: HttpStatus.CONFLICT,
    detail: 'A budget can only be generated for a draft rental.',
  },
  'contracts.rental_budget_customer_name_missing': {
    type: createProblemType('contracts.rental_budget_customer_name_missing'),
    title: 'Customer name missing',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'A customer full name is required to generate a budget.',
  },
  'contracts.rental_budget_context_missing': {
    type: createProblemType('contracts.rental_budget_context_missing'),
    title: 'Rental document context missing',
    status: HttpStatus.CONFLICT,
    detail: 'The rental does not have enough tenant or branch context to generate a budget.',
  },
  'contracts.rental_budget_price_snapshot_invalid': {
    type: createProblemType('contracts.rental_budget_price_snapshot_invalid'),
    title: 'Rental price snapshot invalid',
    status: HttpStatus.CONFLICT,
    detail: 'The rental does not have a valid price snapshot.',
  },
} satisfies Record<
  GenerateRentalBudgetErrorCode,
  { type: string; title: string; status: HttpStatus; detail: string }
>;
