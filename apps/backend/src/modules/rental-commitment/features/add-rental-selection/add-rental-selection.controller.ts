import { Body, Controller, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AUTH_ACTOR_TYPES, AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantUserSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-user-session.guard';

import { AddRentalSelectionCommand } from './add-rental-selection.command';
import { AddRentalSelectionError, AddRentalSelectionErrorCode } from './add-rental-selection.errors';
import { AddRentalSelectionResult } from './add-rental-selection.handler';
import { AddRentalSelectionParamsDto, AddRentalSelectionRequestDto } from './add-rental-selection.request.dto';
import { AddRentalSelectionResponseDto } from './add-rental-selection.response.dto';

@Controller('rental-commitments/confirmed-rentals')
export class AddRentalSelectionHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post(':rentalId/selections')
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async add(
    @Param() params: AddRentalSelectionParamsDto,
    @Body() dto: AddRentalSelectionRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<AddRentalSelectionResponseDto> {
    const result = await this.commandBus.execute<AddRentalSelectionCommand, AddRentalSelectionResult>(
      new AddRentalSelectionCommand({
        tenantId: user.tenantId,
        tenantUserId: user.id,
        rentalId: params.rentalId,
        expectedVersion: dto.expectedVersion,
        rentalOfferId: dto.rentalOfferId,
        quantity: dto.quantity,
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

function toProblem(error: AddRentalSelectionError): ProblemException {
  const definition = problemMap[error.code];
  return ProblemException.from({
    problemDetails: createProblemDetails({ ...definition, extensions: { code: error.code } }),
    applicationError: error,
    cause: error.cause,
  });
}

type ProblemDefinition = { type: string; title: string; status: HttpStatus; detail: string };
const problem = (slug: string, title: string, status: HttpStatus, detail: string): ProblemDefinition => ({
  type: createProblemType(`rental_commitment.${slug}`),
  title,
  status,
  detail,
});

const problemMap = {
  'rental_commitment.rental_not_found': problem(
    'rental_not_found',
    'Rental not found',
    HttpStatus.NOT_FOUND,
    'The requested rental could not be found.',
  ),
  'rental_commitment.rental_cannot_be_edited_from_status': problem(
    'rental_cannot_be_edited_from_status',
    'Rental cannot be edited',
    HttpStatus.CONFLICT,
    'Selections can only be added to confirmed rentals.',
  ),
  'rental_commitment.rental_period_ended': problem(
    'rental_period_ended',
    'Rental period ended',
    HttpStatus.CONFLICT,
    'A selection cannot be added after the rental period has ended.',
  ),
  'rental_commitment.duplicate_rental_offer_selection': problem(
    'duplicate_rental_offer_selection',
    'Rental offer already selected',
    HttpStatus.CONFLICT,
    'The requested rental offer is already part of this rental.',
  ),
  'rental_commitment.invalid_catalog_selection_quantity': problem(
    'invalid_catalog_selection_quantity',
    'Invalid selection quantity',
    HttpStatus.UNPROCESSABLE_ENTITY,
    'The requested selection quantity is invalid.',
  ),
  'rental_commitment.rental_offer_not_found': problem(
    'rental_offer_not_found',
    'Rental offer not found',
    HttpStatus.NOT_FOUND,
    'The requested rental offer could not be found.',
  ),
  'rental_commitment.catalog_selection_unavailable': problem(
    'catalog_selection_unavailable',
    'Rental offer unavailable',
    HttpStatus.CONFLICT,
    'The requested rental offer is not currently available for selection.',
  ),
  'rental_commitment.invalid_fulfillment_definition': problem(
    'invalid_fulfillment_definition',
    'Invalid fulfillment definition',
    HttpStatus.UNPROCESSABLE_ENTITY,
    'The requested rental offer has an invalid fulfillment definition.',
  ),
  'rental_commitment.equipment_type_not_found': problem(
    'equipment_type_not_found',
    'Equipment type not found',
    HttpStatus.NOT_FOUND,
    'Required equipment information could not be found.',
  ),
  'rental_commitment.insufficient_asset_availability': problem(
    'insufficient_asset_availability',
    'Insufficient asset availability',
    HttpStatus.CONFLICT,
    'The required equipment is unavailable for the remaining rental period.',
  ),
  'rental_commitment.tenant_unavailable': problem(
    'tenant_unavailable',
    'Tenant unavailable',
    HttpStatus.CONFLICT,
    'The tenant is unavailable for rental operations.',
  ),
  'rental_commitment.branch_unavailable': problem(
    'branch_unavailable',
    'Branch unavailable',
    HttpStatus.CONFLICT,
    'The rental branch is unavailable.',
  ),
  'rental_commitment.customer_unavailable': problem(
    'customer_unavailable',
    'Customer unavailable',
    HttpStatus.CONFLICT,
    'The rental customer is unavailable.',
  ),
  'rental_commitment.unsupported_branch_fulfillment_method': problem(
    'unsupported_branch_fulfillment_method',
    'Unsupported fulfillment method',
    HttpStatus.UNPROCESSABLE_ENTITY,
    'The rental branch does not support the rental fulfillment method.',
  ),
  'rental_commitment.invalid_pricing_input': problem(
    'invalid_pricing_input',
    'Invalid pricing input',
    HttpStatus.UNPROCESSABLE_ENTITY,
    'The resulting rental could not be priced.',
  ),
  'rental_commitment.rental_version_conflict': problem(
    'rental_version_conflict',
    'Rental was modified',
    HttpStatus.CONFLICT,
    'The rental was changed by another request. Refresh it and try again.',
  ),
  'rental_commitment.invalid_rental_field': problem(
    'invalid_rental_field',
    'Invalid rental field',
    HttpStatus.UNPROCESSABLE_ENTITY,
    'The rental contains an invalid field value.',
  ),
} satisfies Record<AddRentalSelectionErrorCode, ProblemDefinition>;
