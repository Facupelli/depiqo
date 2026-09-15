import { Body, Controller, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AUTH_ACTOR_TYPES, AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantUserSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-user-session.guard';

import { RestoreConfirmedPackageDemandLineCommand } from './restore-confirmed-package-demand-line.command';
import {
  RestoreConfirmedPackageDemandLineError,
  RestoreConfirmedPackageDemandLineErrorCode,
} from './restore-confirmed-package-demand-line.errors';
import { RestoreConfirmedPackageDemandLineResult } from './restore-confirmed-package-demand-line.handler';
import {
  RestoreConfirmedPackageDemandLineParamsDto,
  RestoreConfirmedPackageDemandLineRequestDto,
} from './restore-confirmed-package-demand-line.request.dto';
import { RestoreConfirmedPackageDemandLineResponseDto } from './restore-confirmed-package-demand-line.response.dto';

@Controller('rental-commitments/confirmed-rentals')
export class RestoreConfirmedPackageDemandLineHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post(':rentalId/demand-lines/:demandLineId/restore')
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async restore(
    @Param() params: RestoreConfirmedPackageDemandLineParamsDto,
    @Body() dto: RestoreConfirmedPackageDemandLineRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<RestoreConfirmedPackageDemandLineResponseDto> {
    const result = await this.commandBus.execute<
      RestoreConfirmedPackageDemandLineCommand,
      RestoreConfirmedPackageDemandLineResult
    >(
      new RestoreConfirmedPackageDemandLineCommand({
        tenantId: user.tenantId,
        tenantUserId: user.id,
        rentalId: params.rentalId,
        demandLineId: params.demandLineId,
        expectedVersion: dto.expectedVersion,
        quantity: dto.quantity,
      }),
    );
    if (result.isErr()) throw toProblem(result.error);
    return {
      id: result.value.rentalId,
      version: result.value.version,
      updatedAt: result.value.updatedAt.toISOString(),
    };
  }
}

function toProblem(error: RestoreConfirmedPackageDemandLineError): ProblemException {
  const definition = problemMap[error.code];
  return ProblemException.from({
    problemDetails: createProblemDetails({ ...definition, extensions: { code: error.code } }),
    applicationError: error,
    cause: error.cause,
  });
}

type ProblemDefinition = { type: string; title: string; status: HttpStatus; detail: string };
const problem = (slug: string, title: string, status: HttpStatus, detail: string): ProblemDefinition => ({
  type: createProblemType(`rental_commitment.${slug}`),
  title,
  status,
  detail,
});

const problemMap = {
  'rental_commitment.rental_not_found': problem(
    'rental_not_found',
    'Rental not found',
    HttpStatus.NOT_FOUND,
    'The requested rental could not be found.',
  ),
  'rental_commitment.rental_demand_line_not_found': problem(
    'rental_demand_line_not_found',
    'Rental demand line not found',
    HttpStatus.NOT_FOUND,
    'The requested rental demand line could not be found.',
  ),
  'rental_commitment.rental_demand_line_already_current': problem(
    'rental_demand_line_already_current',
    'Rental demand line is already current',
    HttpStatus.CONFLICT,
    'The requested rental demand line has already been restored.',
  ),
  'rental_commitment.rental_cannot_be_edited_from_status': problem(
    'rental_cannot_be_edited_from_status',
    'Rental cannot be edited',
    HttpStatus.CONFLICT,
    'Package demand lines can only be restored on confirmed rentals.',
  ),
  'rental_commitment.rental_period_ended': problem(
    'rental_period_ended',
    'Rental period ended',
    HttpStatus.CONFLICT,
    'A package demand line cannot be restored after the rental period has ended.',
  ),
  'rental_commitment.insufficient_asset_availability': problem(
    'insufficient_asset_availability',
    'Insufficient asset availability',
    HttpStatus.CONFLICT,
    'The required equipment is unavailable for the remaining rental period.',
  ),
  'rental_commitment.rental_version_conflict': problem(
    'rental_version_conflict',
    'Rental was modified',
    HttpStatus.CONFLICT,
    'The rental was changed by another request. Refresh it and try again.',
  ),
  'rental_commitment.invalid_rental_field': problem(
    'invalid_rental_field',
    'Invalid rental state',
    HttpStatus.UNPROCESSABLE_ENTITY,
    'The demand line cannot be restored from its current rental state.',
  ),
} satisfies Record<RestoreConfirmedPackageDemandLineErrorCode, ProblemDefinition>;
