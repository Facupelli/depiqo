import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CreateRentalOfferWithPricingCommand } from './create-rental-offer-with-pricing.command';
import {
  CreateRentalOfferWithPricingError,
  CreateRentalOfferWithPricingErrorCode,
} from './create-rental-offer-with-pricing.errors';
import { CreateRentalOfferWithPricingServiceResult } from './create-rental-offer-with-pricing.handler';
import { CreateRentalOfferWithPricingRequestDto } from './create-rental-offer-with-pricing.request.dto';
import { CreateRentalOfferWithPricingResponseDto } from './create-rental-offer-with-pricing.response.dto';

@Controller('offering-setup/rental-offers')
export class CreateRentalOfferWithPricingHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateRentalOfferWithPricingRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CreateRentalOfferWithPricingResponseDto> {
    const result = await this.commandBus.execute<
      CreateRentalOfferWithPricingCommand,
      CreateRentalOfferWithPricingServiceResult
    >(
      new CreateRentalOfferWithPricingCommand({
        tenantId: user.tenantId,
        rentableItemId: dto.rentableItemId,
        branchId: dto.branchId,
        pricing: dto.pricing,
      }),
    );
    if (result.isErr()) throw toCreateRentalOfferWithPricingProblem(result.error);
    return result.value;
  }
}

function toCreateRentalOfferWithPricingProblem(error: CreateRentalOfferWithPricingError): ProblemException {
  const problem = createrentalofferwithpricingProblemMap[error.code];
  return ProblemException.from({
    problemDetails: createProblemDetails({
      ...problem,
      extensions: { code: error.code, ...error.context },
    }),
    applicationError: error,
    cause: error.cause,
  });
}

const createrentalofferwithpricingProblemMap = {
  'offering_setup.tenant_unavailable': {
    type: createProblemType('offering_setup.tenant_unavailable'),
    title: 'Tenant unavailable',
    status: HttpStatus.NOT_FOUND,
    detail: 'The tenant is not available.',
  },
  'offering_setup.branch_unavailable': {
    type: createProblemType('offering_setup.branch_unavailable'),
    title: 'Branch unavailable',
    status: HttpStatus.NOT_FOUND,
    detail: 'The selected branch is not available.',
  },
  'offering_setup.invalid_rental_offer': {
    type: createProblemType('offering_setup.invalid_rental_offer'),
    title: 'Invalid rental offer',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The rental offer configuration is invalid.',
  },
  'offering_setup.rentable_item_not_found': {
    type: createProblemType('offering_setup.rentable_item_not_found'),
    title: 'Rentable item not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The rentable item was not found.',
  },
  'offering_setup.rentable_item_archived': {
    type: createProblemType('offering_setup.rentable_item_archived'),
    title: 'Rentable item archived',
    status: HttpStatus.CONFLICT,
    detail: 'An archived rentable item cannot receive a rental offer.',
  },
  'offering_setup.rental_offer_already_exists': {
    type: createProblemType('offering_setup.rental_offer_already_exists'),
    title: 'Rental offer already exists',
    status: HttpStatus.CONFLICT,
    detail: 'A rental offer already exists for this rentable item and branch.',
  },
  'offering_setup.rate_plan_not_found': {
    type: createProblemType('offering_setup.rate_plan_not_found'),
    title: 'Rate plan not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The selected rate plan was not found.',
  },
  'offering_setup.rate_plan_inactive': {
    type: createProblemType('offering_setup.rate_plan_inactive'),
    title: 'Rate plan inactive',
    status: HttpStatus.CONFLICT,
    detail: 'The selected rate plan is inactive.',
  },
  'offering_setup.rate_plan_name_already_in_use': {
    type: createProblemType('offering_setup.rate_plan_name_already_in_use'),
    title: 'Rate plan name already in use',
    status: HttpStatus.CONFLICT,
    detail: 'A rate plan with this name already exists.',
  },
  'offering_setup.invalid_rate_plan': {
    type: createProblemType('offering_setup.invalid_rate_plan'),
    title: 'Invalid rate plan',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The rate plan configuration is invalid.',
  },
} satisfies Record<
  CreateRentalOfferWithPricingErrorCode,
  { type: string; title: string; status: HttpStatus; detail: string }
>;
