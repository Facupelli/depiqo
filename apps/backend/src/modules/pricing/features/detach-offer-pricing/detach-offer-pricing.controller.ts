import { Controller, Delete, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';

import { AuthUser } from '../../../tenant-management/auth/shared/auth.types';
import { CurrentUser } from '../../../tenant-management/auth/shared/current-user/current-user.decorator';
import { DetachOfferPricingCommand } from './detach-offer-pricing.command';
import { DetachOfferPricingError, DetachOfferPricingErrorCode } from './detach-offer-pricing.errors';
import { DetachOfferPricingResult } from './detach-offer-pricing.handler';
import { DetachOfferPricingParamsDto } from './detach-offer-pricing.request.dto';

@Controller('pricing/rental-offer-pricings')
export class DetachOfferPricingHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Delete(':rentalOfferPricingId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async detach(@Param() params: DetachOfferPricingParamsDto, @CurrentUser() user: AuthUser): Promise<void> {
    const result = await this.commandBus.execute<DetachOfferPricingCommand, DetachOfferPricingResult>(
      new DetachOfferPricingCommand(user.tenantId, params.rentalOfferPricingId),
    );

    if (result.isErr()) {
      throw toDetachOfferPricingProblem(result.error);
    }
  }
}

function toDetachOfferPricingProblem(error: DetachOfferPricingError): ProblemException {
  const problem = detachOfferPricingProblemMap[error.code];

  return ProblemException.from({
    problemDetails: createProblemDetails({ ...problem, extensions: { code: error.code } }),
    applicationError: error,
    cause: error.cause,
  });
}

const detachOfferPricingProblemMap = {
  'pricing.rental_offer_pricing_not_found': {
    type: createProblemType('pricing.rental_offer_pricing_not_found'),
    title: 'Rental offer pricing not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested rental offer pricing was not found.',
  },
} satisfies Record<DetachOfferPricingErrorCode, { type: string; title: string; status: HttpStatus; detail: string }>;
