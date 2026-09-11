import { Body, Controller, HttpCode, HttpStatus, Param, Put, UseGuards } from '@nestjs/common';
import { AssignRentalAccessoriesAvailabilityProblemExtensionsSchema } from '@repo/api-contracts';
import { CommandBus } from '@nestjs/cqrs';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AUTH_ACTOR_TYPES, AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantUserSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-user-session.guard';

import { ReplaceRentalDemandLineAccessoriesCommand } from './replace-rental-demand-line-accessories.command';
import {
  ReplaceRentalDemandLineAccessoriesError,
  ReplaceRentalDemandLineAccessoriesErrorCode,
} from './replace-rental-demand-line-accessories.errors';
import { ReplaceRentalDemandLineAccessoriesResult } from './replace-rental-demand-line-accessories.handler';
import {
  ReplaceRentalDemandLineAccessoriesParamsDto,
  ReplaceRentalDemandLineAccessoriesRequestDto,
} from './replace-rental-demand-line-accessories.request.dto';

@Controller('rental-commitments/rentals')
export class ReplaceRentalDemandLineAccessoriesHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Put(':rentalId/demand-lines/:rentalDemandLineId/accessories')
  @HttpCode(HttpStatus.CREATED)
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async replace(
    @Param() params: ReplaceRentalDemandLineAccessoriesParamsDto,
    @Body() dto: ReplaceRentalDemandLineAccessoriesRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    const result = await this.commandBus.execute<
      ReplaceRentalDemandLineAccessoriesCommand,
      ReplaceRentalDemandLineAccessoriesResult
    >(
      new ReplaceRentalDemandLineAccessoriesCommand({
        tenantId: user.tenantId,
        rentalId: params.rentalId,
        rentalDemandLineId: params.rentalDemandLineId,
        expectedVersion: dto.expectedVersion,
        accessories: dto.accessories,
      }),
    );
    if (result.isErr()) throw toProblem(result.error);
  }
}

function toProblem(error: ReplaceRentalDemandLineAccessoriesError): ProblemException {
  const problem = problemMap[error.code];
  const availability =
    error.code === 'rental_commitment.insufficient_asset_availability'
      ? AssignRentalAccessoriesAvailabilityProblemExtensionsSchema.safeParse({
          availability: error.context?.availability,
        })
      : undefined;
  return ProblemException.from({
    problemDetails: createProblemDetails({
      ...problem,
      extensions: { code: error.code, ...(availability?.success ? availability.data : {}) },
    }),
    applicationError: error,
    cause: error.cause,
  });
}

const problemMap = {
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
    detail: 'Accessories can only be assigned to a confirmed rental before its period ends.',
  },
  'rental_commitment.source_rental_demand_line_not_found': {
    type: createProblemType('rental_commitment.source_rental_demand_line_not_found'),
    title: 'Rental demand line not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The rental demand line does not belong to this rental.',
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
    detail: 'Each equipment type can only be requested once.',
  },
  'rental_commitment.equipment_type_not_found': {
    type: createProblemType('rental_commitment.equipment_type_not_found'),
    title: 'Equipment type not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'A requested equipment type could not be found.',
  },
  'rental_commitment.insufficient_asset_availability': {
    type: createProblemType('rental_commitment.insufficient_asset_availability'),
    title: 'Insufficient asset availability',
    status: HttpStatus.CONFLICT,
    detail: 'Not enough accessory assets are available for the rental period.',
  },
  'rental_commitment.asset_availability_changed': {
    type: createProblemType('rental_commitment.asset_availability_changed'),
    title: 'Asset availability changed',
    status: HttpStatus.CONFLICT,
    detail: 'Accessory availability changed while the assignment was being saved.',
  },
  'rental_commitment.rental_version_conflict': {
    type: createProblemType('rental_commitment.rental_version_conflict'),
    title: 'Rental was modified',
    status: HttpStatus.CONFLICT,
    detail: 'The rental was changed by another request. Refresh it and try again.',
  },
} satisfies Record<
  ReplaceRentalDemandLineAccessoriesErrorCode,
  { type: string; title: string; status: HttpStatus; detail: string }
>;
