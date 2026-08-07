import { Body, Controller, HttpCode, HttpStatus, Param, Put, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AUTH_ACTOR_TYPES, AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantUserSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-user-session.guard';

import { AssignRentalAccessoriesCommand } from './assign-rental-accessories.command';
import { AssignRentalAccessoriesError, AssignRentalAccessoriesErrorCode } from './assign-rental-accessories.errors';
import { AssignRentalAccessoriesResult } from './assign-rental-accessories.handler';
import {
  AssignRentalAccessoriesParamsDto,
  AssignRentalAccessoriesRequestDto,
} from './assign-rental-accessories.request.dto';

@Controller('rental-commitments/rentals')
export class AssignRentalAccessoriesHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Put(':rentalId/accessories')
  @HttpCode(HttpStatus.CREATED)
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async assignAccessories(
    @Param() params: AssignRentalAccessoriesParamsDto,
    @Body() dto: AssignRentalAccessoriesRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    const result = await this.commandBus.execute<AssignRentalAccessoriesCommand, AssignRentalAccessoriesResult>(
      new AssignRentalAccessoriesCommand({
        tenantId: user.tenantId,
        rentalId: params.rentalId,
        accessories: dto.accessories,
      }),
    );

    if (result.isErr()) {
      throw toAssignRentalAccessoriesProblem(result.error);
    }
  }
}

function toAssignRentalAccessoriesProblem(error: AssignRentalAccessoriesError): ProblemException {
  const problem = assignRentalAccessoriesProblemMap[error.code];

  return ProblemException.from({
    problemDetails: createProblemDetails({ ...problem, extensions: { code: error.code } }),
    applicationError: error,
    cause: error.cause,
  });
}

const assignRentalAccessoriesProblemMap = {
  'rental_commitment.rental_not_found': {
    type: createProblemType('rental_commitment.rental_not_found'),
    title: 'Rental not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested rental could not be found.',
  },
  'rental_commitment.rental_status_does_not_allow_accessory_assignment': {
    type: createProblemType('rental_commitment.rental_status_does_not_allow_accessory_assignment'),
    title: 'Rental status does not allow accessory assignment',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'Accessories can only be assigned while the rental is pending or confirmed.',
  },
  'rental_commitment.invalid_accessory_quantity': {
    type: createProblemType('rental_commitment.invalid_accessory_quantity'),
    title: 'Invalid accessory quantity',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'Accessory quantities must be positive integers.',
  },
  'rental_commitment.duplicate_accessory_selection': {
    type: createProblemType('rental_commitment.duplicate_accessory_selection'),
    title: 'Duplicate accessory selection',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'Each source demand line and equipment type pair can only be requested once.',
  },
  'rental_commitment.insufficient_asset_availability': {
    type: createProblemType('rental_commitment.insufficient_asset_availability'),
    title: 'Insufficient asset availability',
    status: HttpStatus.CONFLICT,
    detail: 'Not enough accessory assets are available for the rental period.',
  },
  'rental_commitment.rental_version_conflict': {
    type: createProblemType('rental_commitment.rental_version_conflict'),
    title: 'Rental was modified',
    status: HttpStatus.CONFLICT,
    detail: 'The rental was changed by another request. Refresh it and try again.',
  },
  'rental_commitment.source_rental_demand_line_not_found': {
    type: createProblemType('rental_commitment.source_rental_demand_line_not_found'),
    title: 'Source rental demand line not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'One of the source rental demand lines does not belong to this rental.',
  },
} satisfies Record<
  AssignRentalAccessoriesErrorCode,
  { type: string; title: string; status: HttpStatus; detail: string }
>;
