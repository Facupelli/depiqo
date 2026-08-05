import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';

import { AuthUser } from '../../../tenant-management/auth/shared/auth.types';
import { CurrentUser } from '../../../tenant-management/auth/shared/current-user/current-user.decorator';
import { CreateRatePlanAndAttachToRentalOfferCommand } from './create-rate-plan-and-attach-to-rental-offer.command';
import {
  CreateRatePlanAndAttachToRentalOfferError,
  CreateRatePlanAndAttachToRentalOfferErrorCode,
} from './create-rate-plan-and-attach-to-rental-offer.errors';
import { CreateRatePlanAndAttachToRentalOfferResult } from './create-rate-plan-and-attach-to-rental-offer.handler';
import { CreateRatePlanAndAttachToRentalOfferRequestDto } from './create-rate-plan-and-attach-to-rental-offer.request.dto';
import { CreateRatePlanAndAttachToRentalOfferResponseDto } from './create-rate-plan-and-attach-to-rental-offer.response.dto';

@Controller('pricing/rental-offer-pricings')
export class CreateRatePlanAndAttachToRentalOfferHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('create-rate-plan')
  @HttpCode(HttpStatus.CREATED)
  async createRatePlanAndAttachToRentalOffer(
    @Body() dto: CreateRatePlanAndAttachToRentalOfferRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CreateRatePlanAndAttachToRentalOfferResponseDto> {
    const result = await this.commandBus.execute<
      CreateRatePlanAndAttachToRentalOfferCommand,
      Result<CreateRatePlanAndAttachToRentalOfferResult, CreateRatePlanAndAttachToRentalOfferError>
    >(
      new CreateRatePlanAndAttachToRentalOfferCommand({
        tenantId: user.tenantId,
        catalogRentalOfferId: dto.catalogRentalOfferId,
        name: dto.name,
        billingUnit: dto.billingUnit,
        currency: dto.currency,
        tiers: dto.tiers.map((tier) => ({
          fromUnit: tier.fromUnit,
          toUnit: tier.toUnit,
          pricePerUnit: tier.pricePerUnit,
        })),
      }),
    );

    if (result.isErr()) {
      throw toCreateRatePlanAndAttachToRentalOfferProblem(result.error);
    }

    return result.value;
  }
}

function toCreateRatePlanAndAttachToRentalOfferProblem(
  error: CreateRatePlanAndAttachToRentalOfferError,
): ProblemException {
  const problem = createRatePlanAndAttachToRentalOfferProblemMap[error.code];

  return ProblemException.from({
    problemDetails: createProblemDetails({
      ...problem,
      extensions: { code: error.code },
    }),
    applicationError: error,
    cause: error.cause,
  });
}

const createRatePlanAndAttachToRentalOfferProblemMap = {
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
  CreateRatePlanAndAttachToRentalOfferErrorCode,
  { type: string; title: string; status: HttpStatus; detail: string }
>;
