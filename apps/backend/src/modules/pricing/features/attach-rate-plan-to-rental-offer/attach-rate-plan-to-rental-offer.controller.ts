import { Body, Controller, HttpCode, HttpStatus, Put } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';

import { AuthUser } from '../../../tenant-management/auth/shared/auth.types';
import { CurrentUser } from '../../../tenant-management/auth/shared/current-user/current-user.decorator';
import { AttachRatePlanToRentalOfferCommand } from './attach-rate-plan-to-rental-offer.command';
import {
  AttachRatePlanToRentalOfferError,
  AttachRatePlanToRentalOfferErrorCode,
} from './attach-rate-plan-to-rental-offer.errors';
import { AttachRatePlanToRentalOfferResult } from './attach-rate-plan-to-rental-offer.handler';
import { AttachRatePlanToRentalOfferRequestDto } from './attach-rate-plan-to-rental-offer.request.dto';
import { AttachRatePlanToRentalOfferResponseDto } from './attach-rate-plan-to-rental-offer.response.dto';

@Controller('pricing/rental-offer-pricings')
export class AttachRatePlanToRentalOfferHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Put()
  @HttpCode(HttpStatus.OK)
  async attachRatePlanToRentalOffer(
    @Body() dto: AttachRatePlanToRentalOfferRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<AttachRatePlanToRentalOfferResponseDto> {
    const result = await this.commandBus.execute<
      AttachRatePlanToRentalOfferCommand,
      Result<AttachRatePlanToRentalOfferResult, AttachRatePlanToRentalOfferError>
    >(
      new AttachRatePlanToRentalOfferCommand({
        tenantId: user.tenantId,
        catalogRentalOfferId: dto.catalogRentalOfferId,
        ratePlanId: dto.ratePlanId,
      }),
    );

    if (result.isErr()) {
      throw toAttachRatePlanToRentalOfferProblem(result.error);
    }

    return result.value;
  }
}

function toAttachRatePlanToRentalOfferProblem(error: AttachRatePlanToRentalOfferError): ProblemException {
  const problem = attachRatePlanToRentalOfferProblemMap[error.code];

  return ProblemException.from({
    problemDetails: createProblemDetails({
      ...problem,
      extensions: { code: error.code },
    }),
    applicationError: error,
    cause: error.cause,
  });
}

const attachRatePlanToRentalOfferProblemMap = {
  'pricing.rental_offer_not_found': {
    type: createProblemType('pricing.rental_offer_not_found'),
    title: 'Rental offer not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested rental offer was not found.',
  },
  'pricing.rate_plan_not_found': {
    type: createProblemType('pricing.rate_plan_not_found'),
    title: 'Rate plan not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested rate plan was not found.',
  },
  'pricing.rate_plan_inactive': {
    type: createProblemType('pricing.rate_plan_inactive'),
    title: 'Rate plan inactive',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The requested rate plan must be active before it can price a rental offer.',
  },
} satisfies Record<
  AttachRatePlanToRentalOfferErrorCode,
  { type: string; title: string; status: HttpStatus; detail: string }
>;
