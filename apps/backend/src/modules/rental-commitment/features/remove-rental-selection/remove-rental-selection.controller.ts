import { Body, Controller, Delete, HttpStatus, Param, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AUTH_ACTOR_TYPES, AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantUserSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-user-session.guard';
import { RemoveRentalSelectionCommand } from './remove-rental-selection.command';
import { RemoveRentalSelectionError } from './remove-rental-selection.errors';
import { RemoveRentalSelectionResult } from './remove-rental-selection.handler';
import { RemoveRentalSelectionParamsDto, RemoveRentalSelectionRequestDto } from './remove-rental-selection.request.dto';
import { RemoveRentalSelectionResponseDto } from './remove-rental-selection.response.dto';

@Controller('rental-commitments/confirmed-rentals')
export class RemoveRentalSelectionHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Delete(':rentalId/selections/:selectionId')
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async remove(
    @Param() params: RemoveRentalSelectionParamsDto,
    @Body() dto: RemoveRentalSelectionRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<RemoveRentalSelectionResponseDto> {
    const result = await this.commandBus.execute<RemoveRentalSelectionCommand, RemoveRentalSelectionResult>(
      new RemoveRentalSelectionCommand({
        tenantId: user.tenantId,
        tenantUserId: user.id,
        rentalId: params.rentalId,
        selectionId: params.selectionId,
        expectedVersion: dto.expectedVersion,
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

const definitions: Record<RemoveRentalSelectionError['code'], { title: string; status: HttpStatus; detail: string }> = {
  'rental_commitment.rental_not_found': {
    title: 'Rental not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested rental could not be found.',
  },
  'rental_commitment.rental_selection_not_found': {
    title: 'Rental selection not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested current rental selection could not be found.',
  },
  'rental_commitment.rental_cannot_be_edited_from_status': {
    title: 'Rental cannot be edited',
    status: HttpStatus.CONFLICT,
    detail: 'Selections can only be removed from confirmed rentals.',
  },
  'rental_commitment.rental_requires_selection': {
    title: 'Rental requires selection',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The final current rental selection cannot be removed.',
  },
  'rental_commitment.rental_period_ended': {
    title: 'Rental period ended',
    status: HttpStatus.CONFLICT,
    detail: 'A selection cannot be removed after the rental period has ended.',
  },
  'rental_commitment.rental_selection_referenced_by_accessory': {
    title: 'Selection is referenced by an accessory',
    status: HttpStatus.CONFLICT,
    detail: 'Remove or reassign accessories that reference this selection before removing it.',
  },
  'rental_commitment.invalid_pricing_input': {
    title: 'Invalid pricing input',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The remaining rental could not be priced.',
  },
  'rental_commitment.rental_version_conflict': {
    title: 'Rental was modified',
    status: HttpStatus.CONFLICT,
    detail: 'The rental was changed by another request. Refresh it and try again.',
  },
  'rental_commitment.invalid_rental_field': {
    title: 'Invalid rental state',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The rental selection cannot be removed from its current state.',
  },
};

function toProblem(error: RemoveRentalSelectionError): ProblemException {
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
