import { Body, Controller, HttpStatus, Param, Patch, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AUTH_ACTOR_TYPES, AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantUserSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-user-session.guard';
import { ChangeRentalSelectionQuantityCommand } from './change-rental-selection-quantity.command';
import { ChangeRentalSelectionQuantityError } from './change-rental-selection-quantity.errors';
import { ChangeRentalSelectionQuantityResult } from './change-rental-selection-quantity.handler';
import {
  ChangeRentalSelectionQuantityParamsDto,
  ChangeRentalSelectionQuantityRequestDto,
} from './change-rental-selection-quantity.request.dto';
import { ChangeRentalSelectionQuantityResponseDto } from './change-rental-selection-quantity.response.dto';

@Controller('rental-commitments/confirmed-rentals')
export class ChangeRentalSelectionQuantityHttpController {
  constructor(private readonly commandBus: CommandBus) {}
  @Patch(':rentalId/selections/:selectionId/quantity')
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async change(
    @Param() params: ChangeRentalSelectionQuantityParamsDto,
    @Body() dto: ChangeRentalSelectionQuantityRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ChangeRentalSelectionQuantityResponseDto> {
    const result = await this.commandBus.execute<
      ChangeRentalSelectionQuantityCommand,
      ChangeRentalSelectionQuantityResult
    >(
      new ChangeRentalSelectionQuantityCommand({
        tenantId: user.tenantId,
        tenantUserId: user.id,
        rentalId: params.rentalId,
        selectionId: params.selectionId,
        expectedVersion: dto.expectedVersion,
        quantity: dto.quantity,
        releaseAssetIds: dto.releaseAssetIds ?? [],
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
  ChangeRentalSelectionQuantityError['code'],
  { title: string; status: HttpStatus; detail: string }
> = {
  'rental_commitment.rental_not_found': {
    title: 'Rental not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested rental could not be found.',
  },
  'rental_commitment.rental_selection_not_found': {
    title: 'Rental selection not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested rental selection could not be found.',
  },
  'rental_commitment.rental_cannot_be_edited_from_status': {
    title: 'Rental cannot be edited',
    status: HttpStatus.CONFLICT,
    detail: 'Selection quantities can only be changed on confirmed rentals.',
  },
  'rental_commitment.rental_period_ended': {
    title: 'Rental period ended',
    status: HttpStatus.CONFLICT,
    detail: 'The selection quantity cannot be changed after the rental period has ended.',
  },
  'rental_commitment.insufficient_asset_availability': {
    title: 'Insufficient asset availability',
    status: HttpStatus.CONFLICT,
    detail: 'The additional equipment is unavailable for the remaining rental period.',
  },
  'rental_commitment.invalid_pricing_input': {
    title: 'Invalid pricing input',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The resulting rental could not be priced.',
  },
  'rental_commitment.rental_version_conflict': {
    title: 'Rental was modified',
    status: HttpStatus.CONFLICT,
    detail: 'The rental was changed by another request. Refresh it and try again.',
  },
  'rental_commitment.invalid_rental_field': {
    title: 'Invalid rental field',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The requested quantity change is invalid.',
  },
};
function toProblem(error: ChangeRentalSelectionQuantityError): ProblemException {
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
