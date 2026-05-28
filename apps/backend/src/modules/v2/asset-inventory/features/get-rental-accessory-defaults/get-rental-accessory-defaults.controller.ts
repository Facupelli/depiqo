import { Controller, Get, Param } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/modules/auth/public/authenticated-user';

import { GetRentalAccessoryDefaultsResult } from './get-rental-accessory-defaults.handler';
import { toGetRentalAccessoryDefaultsProblem } from './get-rental-accessory-defaults-http-error.mapper';
import { GetRentalAccessoryDefaultsQuery } from './get-rental-accessory-defaults.query';
import { GetRentalAccessoryDefaultsParamsDto } from './get-rental-accessory-defaults.request.dto';
import type { GetRentalAccessoryDefaultsResponseDto } from './get-rental-accessory-defaults.response.dto';

@Controller('v2/asset-inventory/rentals')
export class GetRentalAccessoryDefaultsHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(':rentalId/accessory-defaults')
  async getRentalAccessoryDefaults(
    @Param() params: GetRentalAccessoryDefaultsParamsDto,
    @CurrentUser() user: AuthenticatedUser,
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
