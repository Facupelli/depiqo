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
import { ChangeConfirmedRentalDeliveryCommand } from './change-confirmed-rental-delivery.command';
import { ChangeConfirmedRentalDeliveryError } from './change-confirmed-rental-delivery.errors';
import { ChangeConfirmedRentalDeliveryResult } from './change-confirmed-rental-delivery.handler';
import {
  ChangeConfirmedRentalDeliveryParamsDto,
  ChangeConfirmedRentalDeliveryRequestDto,
} from './change-confirmed-rental-delivery.request.dto';
import { ChangeConfirmedRentalDeliveryResponseDto } from './change-confirmed-rental-delivery.response.dto';

@Controller('rental-commitments/confirmed-rentals')
export class ChangeConfirmedRentalDeliveryHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Patch(':rentalId/delivery')
  @RequirePermission(TenantPermission.RentalsDeliveryManage)
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async change(
    @Param() params: ChangeConfirmedRentalDeliveryParamsDto,
    @Body() dto: ChangeConfirmedRentalDeliveryRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ChangeConfirmedRentalDeliveryResponseDto> {
    const result = await this.commandBus.execute<
      ChangeConfirmedRentalDeliveryCommand,
      ChangeConfirmedRentalDeliveryResult
    >(
      new ChangeConfirmedRentalDeliveryCommand({
        tenantId: user.tenantId,
        tenantUserId: user.id,
        rentalId: params.rentalId,
        expectedVersion: dto.expectedVersion,
        destination: dto.destination,
        deliveryDecisions: dto.deliveryDecisions,
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
  ChangeConfirmedRentalDeliveryError['code'],
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
    detail: 'Refresh the rental and retry the delivery change.',
  },
  'rental_commitment.delivery_management_permission_denied': {
    title: 'Delivery management forbidden',
    status: HttpStatus.FORBIDDEN,
    detail: 'Delivery-management permission is required.',
  },
  'rental_commitment.rental_cannot_be_edited_from_status': {
    title: 'Rental cannot be edited',
    status: HttpStatus.CONFLICT,
    detail: 'Only confirmed rentals can have delivery conditions changed.',
  },
  'rental_commitment.rental_period_started': {
    title: 'Rental has started',
    status: HttpStatus.CONFLICT,
    detail: 'Delivery conditions can only be changed before the scheduled rental start.',
  },
  'rental_commitment.invalid_rental_field': {
    title: 'Invalid delivery conditions',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail:
      'Check the destination, agreement decision, currency, and transportation minutes. Routed minutes must match configured minutes when configured.',
  },
  'rental_commitment.delivery_not_serviceable': {
    title: 'Delivery cannot be accepted',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'Routing must succeed and current delivery restrictions require explicit policy-exception authorization.',
  },
  'rental_commitment.delivery_evaluation_unavailable': {
    title: 'Delivery evaluation unavailable',
    status: HttpStatus.SERVICE_UNAVAILABLE,
    detail: 'Delivery routing is temporarily unavailable. Try again later.',
  },
  'rental_commitment.assigned_assets_unavailable': {
    title: 'Assigned assets unavailable',
    status: HttpStatus.CONFLICT,
    detail: 'The proposed delivery reservation conflicts with another equipment reservation.',
  },
  'rental_commitment.unsafe_delivery_reservation_change': {
    title: 'Reservation change is unsafe',
    status: HttpStatus.CONFLICT,
    detail: 'Delivery minutes cannot be changed without affecting historical asset participation.',
  },
};

function toProblem(error: ChangeConfirmedRentalDeliveryError): ProblemException {
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
