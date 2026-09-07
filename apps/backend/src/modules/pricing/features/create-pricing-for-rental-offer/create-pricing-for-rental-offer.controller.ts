import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';

import { AuthUser } from '../../../tenant-management/auth/shared/auth.types';
import { CurrentUser } from '../../../tenant-management/auth/shared/current-user/current-user.decorator';
import { CreatePricingForRentalOfferCommand } from './create-pricing-for-rental-offer.command';
import {
  CreatePricingForRentalOfferError,
  CreatePricingForRentalOfferErrorCode,
} from './create-pricing-for-rental-offer.errors';
import { CreatePricingForRentalOfferResult } from './create-pricing-for-rental-offer.handler';
import { CreatePricingForRentalOfferRequestDto } from './create-pricing-for-rental-offer.request.dto';
import { CreatePricingForRentalOfferResponseDto } from './create-pricing-for-rental-offer.response.dto';

@Controller('pricing/rental-offer-pricings')
export class CreatePricingForRentalOfferHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createPricingForRentalOffer(
    @Body() dto: CreatePricingForRentalOfferRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CreatePricingForRentalOfferResponseDto> {
    const result = await this.commandBus.execute<
      CreatePricingForRentalOfferCommand,
      Result<CreatePricingForRentalOfferResult, CreatePricingForRentalOfferError>
    >(
      new CreatePricingForRentalOfferCommand({
        tenantId: user.tenantId,
        catalogRentalOfferId: dto.catalogRentalOfferId,
        ratePlan: {
          name: dto.ratePlan.name,
          billingUnit: dto.ratePlan.billingUnit,
          currency: dto.ratePlan.currency,
          tiers: dto.ratePlan.tiers.map((tier) => ({
            fromUnit: tier.fromUnit,
            toUnit: tier.toUnit,
            pricePerUnit: tier.pricePerUnit,
          })),
        },
      }),
    );

    if (result.isErr()) {
      throw toCreatePricingForRentalOfferProblem(result.error);
    }

    return result.value;
  }
}

function toCreatePricingForRentalOfferProblem(error: CreatePricingForRentalOfferError): ProblemException {
  const problem = createPricingForRentalOfferProblemMap[error.code];

  return ProblemException.from({
    problemDetails: createProblemDetails({
      ...problem,
      extensions: { code: error.code },
    }),
    applicationError: error,
    cause: error.cause,
  });
}

const createPricingForRentalOfferProblemMap = {
  'pricing.rental_offer_not_found': {
    type: createProblemType('pricing.rental_offer_not_found'),
    title: 'Rental offer not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested rental offer was not found.',
  },
  'pricing.rate_plan_name_already_in_use': {
    type: createProblemType('pricing.rate_plan_name_already_in_use'),
    title: 'Rate plan name already in use',
    status: HttpStatus.CONFLICT,
    detail: 'A rate plan with the requested name already exists.',
  },
  'pricing.invalid_rate_plan': {
    type: createProblemType('pricing.invalid_rate_plan'),
    title: 'Invalid rate plan',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The rate plan could not be created because it violates pricing rules.',
  },
} satisfies Record<
  CreatePricingForRentalOfferErrorCode,
  { type: string; title: string; status: HttpStatus; detail: string }
>;
