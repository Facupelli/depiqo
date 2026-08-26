import { Body, Controller, HttpStatus, Param, Patch, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AUTH_ACTOR_TYPES, AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantUserSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-user-session.guard';
import { ChangeRentalPeriodCommand } from './change-rental-period.command';
import { ChangeRentalPeriodError } from './change-rental-period.errors';
import { ChangeRentalPeriodResult } from './change-rental-period.handler';
import { ChangeRentalPeriodParamsDto, ChangeRentalPeriodRequestDto } from './change-rental-period.request.dto';
import { ChangeRentalPeriodResponseDto } from './change-rental-period.response.dto';

@Controller('rental-commitments/confirmed-rentals')
export class ChangeRentalPeriodHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Patch(':rentalId/period')
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async change(
    @Param() params: ChangeRentalPeriodParamsDto,
    @Body() dto: ChangeRentalPeriodRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ChangeRentalPeriodResponseDto> {
    const result = await this.commandBus.execute<ChangeRentalPeriodCommand, ChangeRentalPeriodResult>(
      new ChangeRentalPeriodCommand({
        tenantId: user.tenantId,
        tenantUserId: user.id,
        rentalId: params.rentalId,
        expectedVersion: dto.expectedVersion,
        start: dto.start,
        end: dto.end,
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

const definitions: Record<ChangeRentalPeriodError['code'], { title: string; status: HttpStatus; detail: string }> = {
  'rental_commitment.rental_not_found': {
    title: 'Rental not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested rental could not be found.',
  },
  'rental_commitment.rental_cannot_be_edited_from_status': {
    title: 'Rental cannot be edited',
    status: HttpStatus.CONFLICT,
    detail: 'Periods can only be changed on confirmed rentals.',
  },
  'rental_commitment.rental_period_ended': {
    title: 'Rental period ended',
    status: HttpStatus.CONFLICT,
    detail: 'An ended rental cannot be revived by changing its period.',
  },
  'rental_commitment.rental_version_conflict': {
    title: 'Rental was modified',
    status: HttpStatus.CONFLICT,
    detail: 'The rental was changed by another request. Refresh it and try again.',
  },
  'rental_commitment.invalid_rental_period': {
    title: 'Invalid rental period',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The requested rental period is invalid.',
  },
  'rental_commitment.insufficient_asset_availability': {
    title: 'Insufficient asset availability',
    status: HttpStatus.CONFLICT,
    detail: 'One or more assigned assets are unavailable for the requested period.',
  },
  'rental_commitment.invalid_pricing_input': {
    title: 'Invalid pricing input',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The resulting rental could not be priced.',
  },
  'rental_commitment.invalid_rental_field': {
    title: 'Invalid rental field',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The rental contains invalid persisted temporal state.',
  },
};

function toProblem(error: ChangeRentalPeriodError): ProblemException {
  const definition = definitions[error.code];
  return ProblemException.from({
    problemDetails: createProblemDetails({
      type: createProblemType(error.code),
      ...definition,
      extensions: { code: error.code },
    }),
    applicationError: error,
    cause: error.cause,
  });
}
