import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AUTH_ACTOR_TYPES, AuthCustomer } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantCustomerSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-customer-session.guard';

import { FulfillmentMethod } from '../../domain/rental-status';
import { RentalPeriod } from '../../domain/value-objects/rental-period.value-object';
import { CreateConfirmedRentalCommand } from './create-confirmed-rental.command';
import {
  createConfirmedRentalError,
  CreateConfirmedRentalError,
  CreateConfirmedRentalErrorCode,
} from './create-confirmed-rental.errors';
import { CreateConfirmedRentalServiceResult } from './create-confirmed-rental.handler';
import { CreateConfirmedRentalRequestDto } from './create-confirmed-rental.request.dto';
import { CreateConfirmedRentalResponseDto } from './create-confirmed-rental.response.dto';

@Controller('rental-commitments/confirmed-rentals')
export class CreateConfirmedRentalHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_CUSTOMER)
  @UseGuards(SessionAuthGuard, TenantCustomerSessionGuard)
  async create(
    @Body() dto: CreateConfirmedRentalRequestDto,
    @CurrentUser() user: AuthCustomer,
  ): Promise<CreateConfirmedRentalResponseDto> {
    let period: RentalPeriod;

    try {
      period = new RentalPeriod(dto.period.start, dto.period.end);
    } catch (error) {
      throw toCreateConfirmedRentalProblem(
        createConfirmedRentalError('rental_commitment.invalid_rental_period', 'Invalid rental period.', error, {
          useCase: 'CreateConfirmedRental',
          tenantId: user.tenantId,
        }),
      );
    }

    const result = await this.commandBus.execute<CreateConfirmedRentalCommand, CreateConfirmedRentalServiceResult>(
      new CreateConfirmedRentalCommand({
        tenantId: user.tenantId,
        branchId: dto.branchId,
        rentalCustomerId: user.id,
        period,
        selectedOffers: dto.selectedOffers,
        fulfillmentMethod: dto.fulfillmentMethod as FulfillmentMethod,
        deliveryDetails: dto.fulfillmentMethod === 'DELIVERY' ? dto.deliveryDetails : undefined,
        notes: dto.notes,
        insuranceSelected: dto.insuranceSelected,
      }),
    );

    if (result.isErr()) throw toCreateConfirmedRentalProblem(result.error);

    return { id: result.value.rentalId };
  }
}

function toCreateConfirmedRentalProblem(error: CreateConfirmedRentalError): ProblemException {
  const problem = createConfirmedRentalProblemMap[error.code];
  return ProblemException.from({
    problemDetails: createProblemDetails({ ...problem, extensions: { code: error.code } }),
    applicationError: error,
    cause: error.cause,
  });
}

const createConfirmedRentalProblemMap = {
  'rental_commitment.invalid_rental_period': problem(
    'invalid_rental_period',
    'Invalid rental period',
    HttpStatus.UNPROCESSABLE_ENTITY,
    'The requested rental period is invalid.',
  ),
  'rental_commitment.rental_requires_selection': problem(
    'rental_requires_selection',
    'Rental requires selection',
    HttpStatus.UNPROCESSABLE_ENTITY,
    'A confirmed rental must include at least one selected offer.',
  ),
  'rental_commitment.rental_offer_not_found': problem(
    'rental_offer_not_found',
    'Rental offer not found',
    HttpStatus.NOT_FOUND,
    'The selected rental offer could not be found.',
  ),
  'rental_commitment.catalog_selection_unavailable': problem(
    'catalog_selection_unavailable',
    'Catalog selection unavailable',
    HttpStatus.UNPROCESSABLE_ENTITY,
    'A selected rental offer is not currently available.',
  ),
  'rental_commitment.invalid_fulfillment_definition': problem(
    'invalid_fulfillment_definition',
    'Invalid fulfillment definition',
    HttpStatus.UNPROCESSABLE_ENTITY,
    'A selected rental offer does not have a valid fulfillment definition.',
  ),
  'rental_commitment.duplicate_rental_offer_selection': problem(
    'duplicate_rental_offer_selection',
    'Duplicate rental offer selection',
    HttpStatus.UNPROCESSABLE_ENTITY,
    'The same rental offer cannot be selected more than once.',
  ),
  'rental_commitment.insufficient_asset_availability': problem(
    'insufficient_asset_availability',
    'Insufficient asset availability',
    HttpStatus.CONFLICT,
    'Not enough equipment is available for the requested rental period.',
  ),
  'rental_commitment.confirmed_rental_creation_disabled': problem(
    'confirmed_rental_creation_disabled',
    'Confirmed rental creation disabled',
    HttpStatus.FORBIDDEN,
    'Confirmed rental creation is not available for this tenant.',
  ),
  'rental_commitment.tenant_unavailable': problem(
    'tenant_unavailable',
    'Tenant unavailable',
    HttpStatus.UNPROCESSABLE_ENTITY,
    'The tenant is not available for rental creation.',
  ),
  'rental_commitment.branch_unavailable': problem(
    'branch_unavailable',
    'Branch unavailable',
    HttpStatus.UNPROCESSABLE_ENTITY,
    'The selected branch is not available for rental creation.',
  ),
  'rental_commitment.customer_unavailable': problem(
    'customer_unavailable',
    'Customer unavailable',
    HttpStatus.UNPROCESSABLE_ENTITY,
    'The customer is not available for rental creation.',
  ),
  'rental_commitment.equipment_type_not_found': problem(
    'equipment_type_not_found',
    'Equipment type not found',
    HttpStatus.NOT_FOUND,
    'A required equipment type could not be found.',
  ),
  'rental_commitment.equipment_type_not_rentable': problem(
    'equipment_type_not_rentable',
    'Equipment type not rentable',
    HttpStatus.UNPROCESSABLE_ENTITY,
    'A required equipment type is not rentable.',
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
  'rental_commitment.duplicate_assigned_asset': problem(
    'duplicate_assigned_asset',
    'Duplicate assigned asset',
    HttpStatus.CONFLICT,
    'The same physical asset cannot be assigned more than once.',
  ),
} satisfies Record<CreateConfirmedRentalErrorCode, ProblemDefinition>;

type ProblemDefinition = { type: string; title: string; status: HttpStatus; detail: string };

function problem(slug: string, title: string, status: HttpStatus, detail: string): ProblemDefinition {
  return { type: createProblemType(`rental_commitment.${slug}`), title, status, detail };
}
