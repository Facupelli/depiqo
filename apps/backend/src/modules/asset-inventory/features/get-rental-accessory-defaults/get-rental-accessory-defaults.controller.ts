import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';

import {
  GetRentalAccessoryDefaultsError,
  GetRentalAccessoryDefaultsErrorCode,
} from './get-rental-accessory-defaults.errors';
import { GetRentalAccessoryDefaultsResult } from './get-rental-accessory-defaults.handler';
import { GetRentalAccessoryDefaultsQuery } from './get-rental-accessory-defaults.query';
import { GetRentalAccessoryDefaultsParamsDto } from './get-rental-accessory-defaults.request.dto';
import type { GetRentalAccessoryDefaultsResponseDto } from './get-rental-accessory-defaults.response.dto';

@Controller('asset-inventory/rentals')
export class GetRentalAccessoryDefaultsHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(':rentalId/accessory-defaults')
  async getRentalAccessoryDefaults(
    @Param() params: GetRentalAccessoryDefaultsParamsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetRentalAccessoryDefaultsResponseDto> {
    const result = await this.queryBus.execute<GetRentalAccessoryDefaultsQuery, GetRentalAccessoryDefaultsResult>(
      new GetRentalAccessoryDefaultsQuery(user.tenantId, params.rentalId),
    );

    if (result.isErr()) {
      throw toGetRentalAccessoryDefaultsProblem(result.error);
    }

    return result.value;
  }
}

function toGetRentalAccessoryDefaultsProblem(error: GetRentalAccessoryDefaultsError): ProblemException {
  const problem = getRentalAccessoryDefaultsProblemMap[error.code];

  return ProblemException.from({
    problemDetails: createProblemDetails({
      type: problem.type,
      title: problem.title,
      status: problem.status,
      detail: problem.detail,
      extensions: {
        code: error.code,
        rentalId: error.context?.rentalId,
      },
    }),
    applicationError: error,
    cause: error.cause,
  });
}

const getRentalAccessoryDefaultsProblemMap = {
  'asset_inventory.rental_not_found': {
    type: createProblemType('asset_inventory.rental_not_found'),
    title: 'Rental not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested rental could not be found.',
  },
} satisfies Record<
  GetRentalAccessoryDefaultsErrorCode,
  { type: string; title: string; status: HttpStatus; detail: string }
>;
