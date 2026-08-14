import { Body, Controller, HttpCode, HttpStatus, Param, Patch } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';

import { AuthUser } from '../../../tenant-management/auth/shared/auth.types';
import { CurrentUser } from '../../../tenant-management/auth/shared/current-user/current-user.decorator';
import { UpdateRentalOfferVisibilityAndRentabilityCommand } from './update-rental-offer-visibility-and-rentability.command';
import {
  UpdateRentalOfferVisibilityAndRentabilityError,
  UpdateRentalOfferVisibilityAndRentabilityErrorCode,
} from './update-rental-offer-visibility-and-rentability.errors';
import {
  UpdateRentalOfferVisibilityAndRentabilityBodyDto,
  UpdateRentalOfferVisibilityAndRentabilityParamsDto,
} from './update-rental-offer-visibility-and-rentability.request.dto';

@Controller('catalog/rental-offers')
export class UpdateRentalOfferVisibilityAndRentabilityHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Patch(':rentalOfferId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async update(
    @Param() params: UpdateRentalOfferVisibilityAndRentabilityParamsDto,
    @Body() body: UpdateRentalOfferVisibilityAndRentabilityBodyDto,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    const result = await this.commandBus.execute<
      UpdateRentalOfferVisibilityAndRentabilityCommand,
      Result<void, UpdateRentalOfferVisibilityAndRentabilityError>
    >(new UpdateRentalOfferVisibilityAndRentabilityCommand(user.tenantId, params.rentalOfferId, body));

    if (result.isErr()) {
      throw toUpdateRentalOfferVisibilityAndRentabilityProblem(result.error);
    }
  }
}

function toUpdateRentalOfferVisibilityAndRentabilityProblem(
  error: UpdateRentalOfferVisibilityAndRentabilityError,
): ProblemException {
  const problem = updateRentalOfferVisibilityAndRentabilityProblemMap[error.code];

  return ProblemException.from({
    problemDetails: createProblemDetails({
      type: problem.type,
      title: problem.title,
      status: problem.status,
      detail: problem.detail,
      extensions: { code: error.code },
    }),
    applicationError: error,
    cause: error.cause,
  });
}

const updateRentalOfferVisibilityAndRentabilityProblemMap = {
  'catalog.rental_offer_not_found': {
    type: createProblemType('catalog.rental_offer_not_found'),
    title: 'Rental offer not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested rental offer could not be found.',
  },
  'catalog.rental_offer_archived': {
    type: createProblemType('catalog.rental_offer_archived'),
    title: 'Rental offer is archived',
    status: HttpStatus.CONFLICT,
    detail: 'Archived rental offers cannot be updated.',
  },
} satisfies Record<
  UpdateRentalOfferVisibilityAndRentabilityErrorCode,
  { type: string; title: string; status: HttpStatus; detail: string }
>;
