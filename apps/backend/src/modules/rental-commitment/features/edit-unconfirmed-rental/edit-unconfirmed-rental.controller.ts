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
import { EditUnconfirmedRentalCommand } from './edit-unconfirmed-rental.command';
import { EditUnconfirmedRentalError, EditUnconfirmedRentalErrorCode } from './edit-unconfirmed-rental.errors';
import { EditUnconfirmedRentalResult } from './edit-unconfirmed-rental.handler';
import { EditUnconfirmedRentalParamsDto, EditUnconfirmedRentalRequestDto } from './edit-unconfirmed-rental.request.dto';
import { EditUnconfirmedRentalResponseDto } from './edit-unconfirmed-rental.response.dto';

@Controller('rental-commitments/rentals')
export class EditUnconfirmedRentalHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Put(':rentalId')
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async edit(
    @Param() params: EditUnconfirmedRentalParamsDto,
    @Body() dto: EditUnconfirmedRentalRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<EditUnconfirmedRentalResponseDto> {
    let period: RentalPeriod;

    try {
      period = new RentalPeriod(dto.period.start, dto.period.end);
    } catch (error) {
      throw toEditUnconfirmedRentalProblem({
        code: 'rental_commitment.invalid_rental_period',
        message: 'Invalid rental period.',
        cause: error,
        context: { useCase: 'EditUnconfirmedRental', tenantId: user.tenantId, rentalId: params.rentalId },
      });
    }

    const result = await this.commandBus.execute<EditUnconfirmedRentalCommand, EditUnconfirmedRentalResult>(
      new EditUnconfirmedRentalCommand({
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

    if (result.isErr()) {
      throw toEditUnconfirmedRentalProblem(result.error);
    }

    return {
      id: result.value.rentalId,
      version: result.value.version,
      updatedAt: result.value.updatedAt.toISOString(),
    };
  }
}

function toEditUnconfirmedRentalProblem(error: EditUnconfirmedRentalError): ProblemException {
  const problem = editUnconfirmedRentalProblemMap[error.code];

  return ProblemException.from({
    problemDetails: createProblemDetails({ ...problem, extensions: { code: error.code } }),
    applicationError: error,
    cause: error.cause,
  });
}

const editUnconfirmedRentalProblemMap = {
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
    'Only draft and pending rentals can be edited.',
  ),
  'rental_commitment.rental_contains_operational_commitments': problem(
    'rental_contains_operational_commitments',
    'Rental contains operational commitments',
    HttpStatus.CONFLICT,
    'This unconfirmed rental contains assignments, blocks, or accessory commitments and cannot be edited.',
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
    HttpStatus.UNPROCESSABLE_ENTITY,
    'The same rental offer cannot be selected more than once.',
  ),
  'rental_commitment.rental_offer_not_found': problem(
    'rental_offer_not_found',
    'Rental offer not found',
    HttpStatus.NOT_FOUND,
    'The selected rental offer was not found.',
  ),
  'rental_commitment.catalog_selection_unavailable': problem(
    'catalog_selection_unavailable',
    'Catalog selection unavailable',
    HttpStatus.UNPROCESSABLE_ENTITY,
    'The selected rental offer is not currently available for selection.',
  ),
  'rental_commitment.invalid_fulfillment_definition': problem(
    'invalid_fulfillment_definition',
    'Invalid fulfillment definition',
    HttpStatus.UNPROCESSABLE_ENTITY,
    'The selected rental offer has an invalid fulfillment definition.',
  ),
  'rental_commitment.equipment_type_not_found': problem(
    'equipment_type_not_found',
    'Equipment type not found',
    HttpStatus.NOT_FOUND,
    'A required equipment type could not be found.',
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
} satisfies Record<EditUnconfirmedRentalErrorCode, ProblemDefinition>;

type ProblemDefinition = { type: string; title: string; status: HttpStatus; detail: string };

function problem(slug: string, title: string, status: HttpStatus, detail: string): ProblemDefinition {
  return { type: createProblemType(`rental_commitment.${slug}`), title, status, detail };
}
