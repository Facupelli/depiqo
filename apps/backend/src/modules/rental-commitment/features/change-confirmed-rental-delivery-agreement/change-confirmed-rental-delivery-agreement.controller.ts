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
import { ChangeConfirmedRentalDeliveryAgreementCommand } from './change-confirmed-rental-delivery-agreement.command';
import { ChangeConfirmedRentalDeliveryAgreementError } from './change-confirmed-rental-delivery-agreement.errors';
import { ChangeConfirmedRentalDeliveryAgreementResult } from './change-confirmed-rental-delivery-agreement.handler';
import {
  ChangeConfirmedRentalDeliveryAgreementParamsDto,
  ChangeConfirmedRentalDeliveryAgreementRequestDto,
} from './change-confirmed-rental-delivery-agreement.request.dto';
import { ChangeConfirmedRentalDeliveryAgreementResponseDto } from './change-confirmed-rental-delivery-agreement.response.dto';

@Controller('rental-commitments/confirmed-rentals')
export class ChangeConfirmedRentalDeliveryAgreementHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Patch(':rentalId/delivery-agreement')
  @RequirePermission(TenantPermission.RentalsDeliveryManage)
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async change(
    @Param() params: ChangeConfirmedRentalDeliveryAgreementParamsDto,
    @Body() dto: ChangeConfirmedRentalDeliveryAgreementRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ChangeConfirmedRentalDeliveryAgreementResponseDto> {
    const result = await this.commandBus.execute<
      ChangeConfirmedRentalDeliveryAgreementCommand,
      ChangeConfirmedRentalDeliveryAgreementResult
    >(
      new ChangeConfirmedRentalDeliveryAgreementCommand({
        tenantId: user.tenantId,
        tenantUserId: user.id,
        rentalId: params.rentalId,
        expectedVersion: dto.expectedVersion,
        agreement: dto.agreement,
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
  ChangeConfirmedRentalDeliveryAgreementError['code'],
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
    title: 'Rental cannot be edited',
    status: HttpStatus.CONFLICT,
    detail: 'Only confirmed rentals can have their delivery agreement changed.',
  },
  'rental_commitment.rental_period_ended': {
    title: 'Rental has ended',
    status: HttpStatus.CONFLICT,
    detail: 'The delivery agreement cannot be changed after the rental period has ended.',
  },
  'rental_commitment.invalid_rental_field': {
    title: 'Invalid delivery agreement',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail:
      'An accepted delivery snapshot and a non-negative cent-precision amount are required. An agreement without a calculated reference cannot be cleared.',
  },
};

function toProblem(error: ChangeConfirmedRentalDeliveryAgreementError): ProblemException {
  return ProblemException.from({
    problemDetails: createProblemDetails({
      type: createProblemType(error.code),
      ...definitions[error.code],
      extensions: { code: error.code },
    }),
    applicationError: error,
    cause: error.cause,
  });
}
