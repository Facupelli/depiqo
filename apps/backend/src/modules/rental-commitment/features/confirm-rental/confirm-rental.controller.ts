import { Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AUTH_ACTOR_TYPES, AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantUserSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-user-session.guard';

import { ConfirmRentalCommand } from './confirm-rental.command';
import { ConfirmRentalError, ConfirmRentalErrorCode } from './confirm-rental.errors';
import { ConfirmRentalResult } from './confirm-rental.handler';
import { ConfirmRentalParamsDto } from './confirm-rental.request.dto';

@Controller('rental-commitments/rentals')
export class ConfirmRentalHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post(':rentalId/confirm')
  @HttpCode(HttpStatus.NO_CONTENT)
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async confirm(@Param() params: ConfirmRentalParamsDto, @CurrentUser() user: AuthUser): Promise<void> {
    const result = await this.commandBus.execute<ConfirmRentalCommand, ConfirmRentalResult>(
      new ConfirmRentalCommand(user.tenantId, params.rentalId),
    );

    if (result.isErr()) {
      throw toConfirmRentalProblem(result.error);
    }
  }
}

function toConfirmRentalProblem(error: ConfirmRentalError): ProblemException {
  const problem = confirmRentalProblemMap[error.code];

  return ProblemException.from({
    problemDetails: createProblemDetails({
      ...problem,
      extensions: {
        code: error.code,
        ...(error.code === 'rental_commitment.delivery_not_serviceable'
          ? { reason: error.context?.deliveryReason }
          : {}),
      },
    }),
    applicationError: error,
    cause: error.cause,
  });
}

const confirmRentalProblemMap = {
  'rental_commitment.rental_not_found': {
    type: createProblemType('rental_commitment.rental_not_found'),
    title: 'Rental not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested rental could not be found.',
  },
  'rental_commitment.rental_cannot_be_confirmed_from_status': {
    type: createProblemType('rental_commitment.rental_cannot_be_confirmed_from_status'),
    title: 'Rental cannot be confirmed from status',
    status: HttpStatus.CONFLICT,
    detail: 'The requested rental cannot be confirmed from its current status.',
  },
  'rental_commitment.rental_version_conflict': {
    type: createProblemType('rental_commitment.rental_version_conflict'),
    title: 'Rental was modified',
    status: HttpStatus.CONFLICT,
    detail: 'The rental was changed by another request. Refresh it and try again.',
  },
  'rental_commitment.rental_confirmation_requires_customer': {
    type: createProblemType('rental_commitment.rental_confirmation_requires_customer'),
    title: 'Rental confirmation requires customer',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The requested rental must have a linked customer before confirmation.',
  },
  'rental_commitment.confirmed_rental_requires_price_snapshot': {
    type: createProblemType('rental_commitment.confirmed_rental_requires_price_snapshot'),
    title: 'Confirmed rental requires price snapshot',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The requested rental cannot be confirmed without an existing price snapshot.',
  },
  'rental_commitment.insufficient_asset_availability': {
    type: createProblemType('rental_commitment.insufficient_asset_availability'),
    title: 'Insufficient asset availability',
    status: HttpStatus.CONFLICT,
    detail: 'Not enough equipment is available for the requested rental period.',
  },
  'rental_commitment.delivery_not_serviceable': {
    type: createProblemType('rental_commitment.delivery_not_serviceable'),
    title: 'Delivery not serviceable',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'Delivery is not serviceable for the selected location and rental period.',
  },
  'rental_commitment.duplicate_assigned_asset': {
    type: createProblemType('rental_commitment.duplicate_assigned_asset'),
    title: 'Duplicate assigned asset',
    status: HttpStatus.CONFLICT,
    detail: 'The same physical asset cannot be assigned more than once.',
  },
  'rental_commitment.invalid_rental_field': {
    type: createProblemType('rental_commitment.invalid_rental_field'),
    title: 'Invalid rental field',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The rental contains an invalid field value.',
  },
  'rental_commitment.tenant_unavailable': {
    type: createProblemType('rental_commitment.tenant_unavailable'),
    title: 'Tenant unavailable',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The tenant is not available for rental confirmation.',
  },
  'rental_commitment.branch_unavailable': {
    type: createProblemType('rental_commitment.branch_unavailable'),
    title: 'Branch unavailable',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The rental branch is not available for rental confirmation.',
  },
  'rental_commitment.customer_unavailable': {
    type: createProblemType('rental_commitment.customer_unavailable'),
    title: 'Customer unavailable',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The linked customer is not available for rental confirmation.',
  },
} satisfies Record<ConfirmRentalErrorCode, { type: string; title: string; status: HttpStatus; detail: string }>;
