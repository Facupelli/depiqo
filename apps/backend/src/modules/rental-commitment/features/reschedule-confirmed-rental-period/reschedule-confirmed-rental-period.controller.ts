import { Body, Controller, HttpStatus, Param, Patch, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { TenantPermission } from '@repo/api-contracts';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { RequirePermission } from 'src/modules/tenant-management/authorization/tenant-authorization.decorators';
import { AUTH_ACTOR_TYPES, AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantUserSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-user-session.guard';

import { RescheduleConfirmedRentalPeriodCommand } from './reschedule-confirmed-rental-period.command';
import { RescheduleConfirmedRentalPeriodError } from './reschedule-confirmed-rental-period.errors';
import { RescheduleConfirmedRentalPeriodResult } from './reschedule-confirmed-rental-period.handler';
import {
  RescheduleConfirmedRentalPeriodParamsDto,
  RescheduleConfirmedRentalPeriodRequestDto,
} from './reschedule-confirmed-rental-period.request.dto';
import { RescheduleConfirmedRentalPeriodResponseDto } from './reschedule-confirmed-rental-period.response.dto';

@Controller('rental-commitments/confirmed-rentals')
export class RescheduleConfirmedRentalPeriodHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Patch(':rentalId/period')
  @RequirePermission(TenantPermission.RentalsConfirmedManage)
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async reschedule(
    @Param() params: RescheduleConfirmedRentalPeriodParamsDto,
    @Body() dto: RescheduleConfirmedRentalPeriodRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<RescheduleConfirmedRentalPeriodResponseDto> {
    const result = await this.commandBus.execute<
      RescheduleConfirmedRentalPeriodCommand,
      RescheduleConfirmedRentalPeriodResult
    >(
      new RescheduleConfirmedRentalPeriodCommand({
        tenantId: user.tenantId,
        tenantUserId: user.id,
        rentalId: params.rentalId,
        expectedVersion: dto.expectedVersion,
        periodStart: dto.period.start,
        periodEnd: dto.period.end,
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

const definitions: Record<
  RescheduleConfirmedRentalPeriodError['code'],
  { title: string; status: HttpStatus; detail: string }
> = {
  'rental_commitment.rental_not_found': {
    title: 'Rental not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested rental could not be found.',
  },
  'rental_commitment.rental_version_conflict': {
    title: 'Rental was modified',
    status: HttpStatus.CONFLICT,
    detail: 'The rental was changed by another request. Refresh it and try again.',
  },
  'rental_commitment.rental_cannot_be_edited_from_status': {
    title: 'Rental cannot be rescheduled',
    status: HttpStatus.CONFLICT,
    detail: 'Only confirmed rentals can have their period rescheduled.',
  },
  'rental_commitment.rental_period_has_started': {
    title: 'Rental has started',
    status: HttpStatus.CONFLICT,
    detail: 'A rental cannot be rescheduled after its rental period has started.',
  },
  'rental_commitment.rental_period_must_start_in_future': {
    title: 'Rental start must be in the future',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The proposed rental start must be strictly in the future.',
  },
  'rental_commitment.invalid_rental_period': {
    title: 'Invalid rental period',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The proposed rental period is invalid.',
  },
  'rental_commitment.assigned_assets_unavailable': {
    title: 'Assigned assets unavailable',
    status: HttpStatus.CONFLICT,
    detail: 'The rental period cannot currently be moved because assigned equipment or accessories are unavailable.',
  },
};

function toProblem(error: RescheduleConfirmedRentalPeriodError): ProblemException {
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
