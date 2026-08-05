import { Controller, Delete, HttpCode, HttpStatus, Param, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AUTH_ACTOR_TYPES, AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantUserSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-user-session.guard';

import { CancelRentalCommand } from './cancel-rental.command';
import { CancelRentalError, CancelRentalErrorCode } from './cancel-rental.errors';
import { CancelRentalResult } from './cancel-rental.handler';
import { CancelRentalParamsDto } from './cancel-rental.request.dto';

@Controller('rental-commitments/rentals')
export class CancelRentalHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Delete(':rentalId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async cancel(@Param() params: CancelRentalParamsDto, @CurrentUser() user: AuthUser): Promise<void> {
    const result = await this.commandBus.execute<CancelRentalCommand, CancelRentalResult>(
      new CancelRentalCommand(user.tenantId, params.rentalId),
    );

    if (result.isErr()) {
      throw toCancelRentalProblem(result.error);
    }
  }
}

function toCancelRentalProblem(error: CancelRentalError): ProblemException {
  const problem = cancelRentalProblemMap[error.code];

  return ProblemException.from({
    problemDetails: createProblemDetails({ ...problem, extensions: { code: error.code } }),
    applicationError: error,
    cause: error.cause,
  });
}

const cancelRentalProblemMap = {
  'rental_commitment.rental_not_found': {
    type: createProblemType('rental_commitment.rental_not_found'),
    title: 'Rental not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested rental could not be found.',
  },
  'rental_commitment.rental_already_cancelled': {
    type: createProblemType('rental_commitment.rental_already_cancelled'),
    title: 'Rental already cancelled',
    status: HttpStatus.CONFLICT,
    detail: 'The requested rental is already cancelled.',
  },
  'rental_commitment.rental_cannot_be_cancelled_from_status': {
    type: createProblemType('rental_commitment.rental_cannot_be_cancelled_from_status'),
    title: 'Rental cannot be cancelled from status',
    status: HttpStatus.CONFLICT,
    detail: 'The requested rental cannot be cancelled from its current status.',
  },
} satisfies Record<CancelRentalErrorCode, { type: string; title: string; status: HttpStatus; detail: string }>;
