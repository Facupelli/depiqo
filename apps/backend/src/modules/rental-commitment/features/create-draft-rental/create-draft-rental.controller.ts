import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AUTH_ACTOR_TYPES, AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantUserSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-user-session.guard';

import { FulfillmentMethod } from '../../domain/rental-status';
import { RentalPeriod } from '../../domain/value-objects/rental-period.value-object';
import { CreateDraftRentalCommand } from './create-draft-rental.command';
import {
  createDraftRentalError,
  CreateDraftRentalError,
  CreateDraftRentalErrorCode,
} from './create-draft-rental.errors';
import { CreateDraftRentalRequestDto } from './create-draft-rental.request.dto';
import { CreateDraftRentalResponseDto } from './create-draft-rental.response.dto';
import { CreateDraftRentalServiceResult } from './create-draft-rental.service';

@Controller('rental-commitments/draft-rentals')
export class CreateDraftRentalHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async create(
    @Body() dto: CreateDraftRentalRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CreateDraftRentalResponseDto> {
    let period: RentalPeriod;

    try {
      period = new RentalPeriod(dto.period.start, dto.period.end);
    } catch (error) {
      throw toCreateDraftRentalProblem(
        createDraftRentalError('rental_commitment.invalid_rental_period', 'Invalid rental period.', error, {
          useCase: 'CreateDraftRental',
          tenantId: user.tenantId,
        }),
      );
    }

    const result = await this.commandBus.execute<CreateDraftRentalCommand, CreateDraftRentalServiceResult>(
      new CreateDraftRentalCommand({
        tenantId: user.tenantId,
        tenantUserId: user.id,
        branchId: dto.branchId,
        rentalCustomerId: dto.rentalCustomerId,
        period,
        selectedOffers: dto.selectedOffers,
        fulfillmentMethod: dto.fulfillmentMethod as FulfillmentMethod,
        deliveryDetails: dto.fulfillmentMethod === 'DELIVERY' ? dto.deliveryDetails : undefined,
        notes: dto.notes,
        insuranceSelected: dto.insuranceSelected,
        manualPricingAdjustment: dto.manualPricingAdjustment,
      }),
    );

    if (result.isErr()) throw toCreateDraftRentalProblem(result.error);

    return { id: result.value.rentalId };
  }
}

function toCreateDraftRentalProblem(error: CreateDraftRentalError): ProblemException {
  const problem = createDraftRentalProblemMap[error.code];
  return ProblemException.from({
    problemDetails: createProblemDetails({ ...problem, extensions: { code: error.code } }),
    applicationError: error,
    cause: error.cause,
  });
}

const createDraftRentalProblemMap = {
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
    'A draft rental must include at least one selected offer.',
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
  'rental_commitment.tenant_unavailable': problem(
    'tenant_unavailable',
    'Tenant unavailable',
    HttpStatus.UNPROCESSABLE_ENTITY,
    'The tenant is not available for draft rental creation.',
  ),
  'rental_commitment.branch_unavailable': problem(
    'branch_unavailable',
    'Branch unavailable',
    HttpStatus.UNPROCESSABLE_ENTITY,
    'The selected branch is not available for draft rental creation.',
  ),
  'rental_commitment.customer_unavailable': problem(
    'customer_unavailable',
    'Customer unavailable',
    HttpStatus.UNPROCESSABLE_ENTITY,
    'The selected customer is not available for draft rental creation.',
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
} satisfies Record<CreateDraftRentalErrorCode, ProblemDefinition>;

type ProblemDefinition = { type: string; title: string; status: HttpStatus; detail: string };

function problem(slug: string, title: string, status: HttpStatus, detail: string): ProblemDefinition {
  return { type: createProblemType(`rental_commitment.${slug}`), title, status, detail };
}
