import { Body, Controller, HttpStatus, Param, Patch, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AUTH_ACTOR_TYPES, AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantUserSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-user-session.guard';
import { FulfillmentMethod } from '../../domain/rental-status';
import { ChangeRentalDetailsCommand } from './change-rental-details.command';
import { ChangeRentalDetailsError } from './change-rental-details.errors';
import { ChangeRentalDetailsResult } from './change-rental-details.handler';
import { ChangeRentalDetailsParamsDto, ChangeRentalDetailsRequestDto } from './change-rental-details.request.dto';
import { ChangeRentalDetailsResponseDto } from './change-rental-details.response.dto';

@Controller('rental-commitments/confirmed-rentals')
export class ChangeRentalDetailsHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Patch(':rentalId/details')
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async change(
    @Param() params: ChangeRentalDetailsParamsDto,
    @Body() dto: ChangeRentalDetailsRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ChangeRentalDetailsResponseDto> {
    const patch = {
      ...('fulfillmentMethod' in dto
        ? { fulfillmentMethod: dto.fulfillmentMethod as FulfillmentMethod | undefined }
        : {}),
      ...('deliveryDetails' in dto ? { deliveryDetails: dto.deliveryDetails } : {}),
      ...('notes' in dto ? { notes: dto.notes } : {}),
      ...('insuranceSelected' in dto ? { insuranceSelected: dto.insuranceSelected } : {}),
      ...('manualPricingAdjustment' in dto ? { manualPricingAdjustment: dto.manualPricingAdjustment } : {}),
    };
    const result = await this.commandBus.execute<ChangeRentalDetailsCommand, ChangeRentalDetailsResult>(
      new ChangeRentalDetailsCommand({
        tenantId: user.tenantId,
        tenantUserId: user.id,
        rentalId: params.rentalId,
        expectedVersion: dto.expectedVersion,
        patch,
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

const definitions: Record<ChangeRentalDetailsError['code'], { title: string; status: HttpStatus; detail: string }> = {
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
    detail: 'Details can only be changed on confirmed rentals.',
  },
  'rental_commitment.rental_period_ended': {
    title: 'Rental period ended',
    status: HttpStatus.CONFLICT,
    detail: 'Details cannot be changed after the rental ends.',
  },
  'rental_commitment.invalid_rental_field': {
    title: 'Invalid rental field',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The requested details are invalid for this rental.',
  },
  'rental_commitment.invalid_pricing_input': {
    title: 'Invalid pricing input',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The resulting rental could not be priced.',
  },
};

function toProblem(error: ChangeRentalDetailsError): ProblemException {
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
