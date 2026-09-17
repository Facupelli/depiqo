import { Body, Controller, HttpStatus, Param, Put, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { TenantPermission } from '@repo/api-contracts';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AUTH_ACTOR_TYPES, AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantUserSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-user-session.guard';
import { RequirePermission } from 'src/modules/tenant-management/authorization/tenant-authorization.decorators';
import { TenantAuthorizationHttpEnforcer } from 'src/modules/tenant-management/authorization/tenant-authorization-http.enforcer';

import { FulfillmentMethod } from '../../domain/rental-status';
import { RentalPeriod } from '../../domain/value-objects/rental-period.value-object';
import { UpdateDraftRentalCommand } from './update-draft-rental.command';
import { UpdateDraftRentalError, updateDraftRentalError } from './update-draft-rental.errors';
import { UpdateDraftRentalResult } from './update-draft-rental.handler';
import { UpdateDraftRentalParamsDto, UpdateDraftRentalRequestDto } from './update-draft-rental.request.dto';
import { UpdateDraftRentalResponseDto } from './update-draft-rental.response.dto';

@Controller('rental-commitments/draft-rentals')
export class UpdateDraftRentalHttpController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly authorizationEnforcer: TenantAuthorizationHttpEnforcer,
  ) {}

  @Put(':rentalId')
  @RequirePermission(TenantPermission.RentalsProposalsManage)
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async update(
    @Param() params: UpdateDraftRentalParamsDto,
    @Body() dto: UpdateDraftRentalRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<UpdateDraftRentalResponseDto> {
    if (dto.manualPricingAdjustment !== undefined) {
      await this.authorizationEnforcer.requirePermission(user, TenantPermission.RentalsPriceAdjustmentManage);
    }

    let period: RentalPeriod;
    try {
      period = new RentalPeriod(dto.period.start, dto.period.end);
    } catch (error) {
      throw toProblem(
        updateDraftRentalError('rental_commitment.invalid_rental_period', 'Invalid rental period.', error, {
          useCase: 'UpdateDraftRental',
          tenantId: user.tenantId,
          rentalId: params.rentalId,
        }),
      );
    }

    const proposal = {
      tenantId: user.tenantId,
      tenantUserId: user.id,
      rentalId: params.rentalId,
      expectedVersion: dto.expectedVersion,
      branchId: dto.branchId,
      rentalCustomerId: dto.rentalCustomerId,
      period,
      selectedOffers: dto.selectedOffers,
      insuranceSelected: dto.insuranceSelected,
      manualPricingAdjustment: dto.manualPricingAdjustment,
    };
    const command =
      dto.fulfillmentMethod === 'DELIVERY'
        ? new UpdateDraftRentalCommand({
            ...proposal,
            fulfillmentMethod: FulfillmentMethod.Delivery,
            deliveryIntent: dto.deliveryIntent!,
          })
        : new UpdateDraftRentalCommand({
            ...proposal,
            fulfillmentMethod: FulfillmentMethod.Pickup,
          });
    const result = await this.commandBus.execute<UpdateDraftRentalCommand, UpdateDraftRentalResult>(command);
    if (result.isErr()) throw toProblem(result.error);

    return {
      id: result.value.rentalId,
      version: result.value.version,
      updatedAt: result.value.updatedAt.toISOString(),
    };
  }
}

type ProblemDefinition = { title: string; status: HttpStatus; detail: string };

const definitions: Record<UpdateDraftRentalError['code'], ProblemDefinition> = {
  'rental_commitment.invalid_rental_period': unprocessable(
    'Invalid rental period',
    'The requested rental period is invalid.',
  ),
  'rental_commitment.rental_requires_selection': unprocessable(
    'Rental requires selection',
    'A draft rental must include at least one selected offer.',
  ),
  'rental_commitment.rental_offer_not_found': {
    title: 'Rental offer not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'A selected rental offer could not be found.',
  },
  'rental_commitment.catalog_selection_unavailable': unprocessable(
    'Catalog selection unavailable',
    'A selected rental offer is not currently available.',
  ),
  'rental_commitment.invalid_fulfillment_definition': unprocessable(
    'Invalid fulfillment definition',
    'A selected rental offer does not have a valid fulfillment definition.',
  ),
  'rental_commitment.duplicate_rental_offer_selection': unprocessable(
    'Duplicate rental offer selection',
    'The same rental offer cannot be selected more than once.',
  ),
  'rental_commitment.tenant_unavailable': unprocessable(
    'Tenant unavailable',
    'The tenant is not available for draft rental editing.',
  ),
  'rental_commitment.branch_unavailable': unprocessable(
    'Branch unavailable',
    'The selected branch is not available for draft rental editing.',
  ),
  'rental_commitment.customer_unavailable': unprocessable(
    'Customer unavailable',
    'The selected customer is not available for draft rental editing.',
  ),
  'rental_commitment.equipment_type_not_found': {
    title: 'Equipment type not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'A required equipment type could not be found.',
  },
  'rental_commitment.equipment_type_not_rentable': unprocessable(
    'Equipment type not rentable',
    'A required equipment type is not rentable.',
  ),
  'rental_commitment.invalid_rental_field': unprocessable(
    'Invalid rental field',
    'The proposed rental contains an invalid field value.',
  ),
  'rental_commitment.invalid_catalog_selection_quantity': unprocessable(
    'Invalid selection quantity',
    'A selected offer has an invalid quantity.',
  ),
  'rental_commitment.invalid_pricing_input': unprocessable(
    'Invalid pricing input',
    'The proposed rental could not be priced.',
  ),
  'rental_commitment.delivery_not_serviceable': unprocessable(
    'Delivery not serviceable',
    'Delivery is not serviceable for the requested destination and rental period.',
  ),
  'rental_commitment.rental_not_found': {
    title: 'Rental not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested rental could not be found.',
  },
  'rental_commitment.rental_cannot_be_edited_from_status': {
    title: 'Rental cannot be edited',
    status: HttpStatus.CONFLICT,
    detail: 'Only draft rentals can be replaced through this operation.',
  },
  'rental_commitment.rental_version_conflict': {
    title: 'Rental was modified',
    status: HttpStatus.CONFLICT,
    detail: 'The rental was changed by another request. Refresh it and try again.',
  },
  'rental_commitment.current_delivery_destination_missing': unprocessable(
    'Current delivery destination missing',
    'This rental has no resolved delivery destination to keep. Submit a new destination.',
  ),
  'rental_commitment.unsafe_draft_state': {
    title: 'Draft rental cannot be replaced',
    status: HttpStatus.CONFLICT,
    detail: 'The draft contains operational state that prevents full proposal replacement.',
  },
};

function unprocessable(title: string, detail: string): ProblemDefinition {
  return { title, status: HttpStatus.UNPROCESSABLE_ENTITY, detail };
}

function toProblem(error: UpdateDraftRentalError): ProblemException {
  const definition = definitions[error.code];
  return ProblemException.from({
    problemDetails: createProblemDetails({
      type: createProblemType(error.code),
      ...definition,
      extensions: {
        code: error.code,
        ...(error.code === 'rental_commitment.delivery_not_serviceable'
          ? { reason: error.context?.deliveryReason }
          : {}),
      },
    }),
    applicationError: error,
    cause: error.cause,
  });
}
