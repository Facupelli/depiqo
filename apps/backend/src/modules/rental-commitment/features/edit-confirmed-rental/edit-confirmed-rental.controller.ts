import { Body, Controller, HttpStatus, Param, Put, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AUTH_ACTOR_TYPES, AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantUserSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-user-session.guard';

import { FulfillmentMethod } from '../../domain/rental-status';
import { RentalPeriod } from '../../domain/value-objects/rental-period.value-object';
import { EditConfirmedRentalCommand } from './edit-confirmed-rental.command';
import { EditConfirmedRentalError, EditConfirmedRentalErrorCode } from './edit-confirmed-rental.errors';
import { EditConfirmedRentalResult } from './edit-confirmed-rental.handler';
import { EditConfirmedRentalParamsDto, EditConfirmedRentalRequestDto } from './edit-confirmed-rental.request.dto';
import { EditConfirmedRentalResponseDto } from './edit-confirmed-rental.response.dto';

@Controller('rental-commitments/confirmed-rentals')
export class EditConfirmedRentalHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Put(':rentalId')
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async edit(
    @Param() params: EditConfirmedRentalParamsDto,
    @Body() dto: EditConfirmedRentalRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<EditConfirmedRentalResponseDto> {
    let period: RentalPeriod;
    try {
      period = new RentalPeriod(dto.period.start, dto.period.end);
    } catch (error) {
      throw toProblem({
        code: 'rental_commitment.invalid_rental_period',
        message: 'Invalid rental period.',
        cause: error,
        context: { useCase: 'EditConfirmedRental', tenantId: user.tenantId, rentalId: params.rentalId },
      });
    }

    const result = await this.commandBus.execute<EditConfirmedRentalCommand, EditConfirmedRentalResult>(
      new EditConfirmedRentalCommand({
        tenantId: user.tenantId,
        tenantUserId: user.id,
        rentalId: params.rentalId,
        expectedVersion: dto.expectedVersion,
        branchId: dto.branchId,
        period,
        selectedOffers: dto.selectedOffers,
        fulfillmentMethod: dto.fulfillmentMethod as FulfillmentMethod,
        deliveryDetails: dto.deliveryDetails,
        notes: dto.notes,
        insuranceSelected: dto.insuranceSelected,
        manualPricingAdjustment: dto.manualPricingAdjustment,
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

function toProblem(error: EditConfirmedRentalError): ProblemException {
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
  'rental_commitment.invalid_rental_period': problem(
    'invalid_rental_period',
    'Invalid rental period',
    HttpStatus.UNPROCESSABLE_ENTITY,
    'The requested rental period is invalid.',
  ),
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
    'Only confirmed rentals can be edited.',
  ),
  'rental_commitment.rental_cannot_be_edited_after_pickup': problem(
    'rental_cannot_be_edited_after_pickup',
    'Rental cannot be edited',
    HttpStatus.CONFLICT,
    'A rental cannot be edited at or after its pickup time.',
  ),
  'rental_commitment.rental_contract_prevents_editing': problem(
    'rental_contract_prevents_editing',
    'Rental contract prevents editing',
    HttpStatus.CONFLICT,
    'A rental with generated, signing, or signed contract terms cannot be edited.',
  ),
  'rental_commitment.rental_accessories_require_removal': problem(
    'rental_accessories_require_removal',
    'Accessories require removal',
    HttpStatus.CONFLICT,
    'Remove or reassign the affected accessories before editing this rental.',
  ),
  'rental_commitment.rental_version_conflict': problem(
    'rental_version_conflict',
    'Rental was modified',
    HttpStatus.CONFLICT,
    'The rental was changed by another request. Refresh it and try again.',
  ),
  'rental_commitment.rental_requires_selection': problem(
    'rental_requires_selection',
    'Rental requires selection',
    HttpStatus.UNPROCESSABLE_ENTITY,
    'A rental must include at least one selected offer.',
  ),
  'rental_commitment.duplicate_rental_offer_selection': problem(
    'duplicate_rental_offer_selection',
    'Duplicate rental offer selection',
    HttpStatus.CONFLICT,
    'The same rental offer cannot be selected more than once.',
  ),
  'rental_commitment.insufficient_asset_availability': problem(
    'insufficient_asset_availability',
    'Insufficient asset availability',
    HttpStatus.CONFLICT,
    'The requested equipment is no longer available.',
  ),
  'rental_commitment.tenant_unavailable': problem(
    'tenant_unavailable',
    'Tenant unavailable',
    HttpStatus.UNPROCESSABLE_ENTITY,
    'The tenant is not available for rental editing.',
  ),
  'rental_commitment.branch_unavailable': problem(
    'branch_unavailable',
    'Branch unavailable',
    HttpStatus.UNPROCESSABLE_ENTITY,
    'The selected branch is not available for rental editing.',
  ),
  'rental_commitment.customer_unavailable': problem(
    'customer_unavailable',
    'Customer unavailable',
    HttpStatus.UNPROCESSABLE_ENTITY,
    'The rental customer is not available.',
  ),
  'rental_commitment.unsupported_branch_fulfillment_method': problem(
    'unsupported_branch_fulfillment_method',
    'Unsupported fulfillment method',
    HttpStatus.UNPROCESSABLE_ENTITY,
    'The selected branch does not support the requested fulfillment method.',
  ),
  'rental_commitment.pickup_time_outside_branch_schedule': problem(
    'pickup_time_outside_branch_schedule',
    'Pickup time outside branch schedule',
    HttpStatus.UNPROCESSABLE_ENTITY,
    'The requested pickup time is outside the branch schedule.',
  ),
  'rental_commitment.return_time_outside_branch_schedule': problem(
    'return_time_outside_branch_schedule',
    'Return time outside branch schedule',
    HttpStatus.UNPROCESSABLE_ENTITY,
    'The requested return time is outside the branch schedule.',
  ),
  'rental_commitment.invalid_rental_field': problem(
    'invalid_rental_field',
    'Invalid rental field',
    HttpStatus.UNPROCESSABLE_ENTITY,
    'The rental contains an invalid field value.',
  ),
  'rental_commitment.invalid_catalog_selection_quantity': problem(
    'invalid_catalog_selection_quantity',
    'Invalid selection quantity',
    HttpStatus.UNPROCESSABLE_ENTITY,
    'A selected offer has an invalid quantity.',
  ),
  'rental_commitment.invalid_pricing_input': problem(
    'invalid_pricing_input',
    'Invalid pricing input',
    HttpStatus.UNPROCESSABLE_ENTITY,
    'The rental could not be priced with the provided input.',
  ),
} satisfies Record<EditConfirmedRentalErrorCode, ProblemDefinition>;
