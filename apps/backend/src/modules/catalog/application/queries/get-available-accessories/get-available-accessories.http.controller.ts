import { Controller, Get, NotFoundException, Param, Query, UnprocessableEntityException } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Permission } from '@repo/types';

import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { Paginated } from 'src/core/decorators/paginated-response.decorator';
import { StaffRoute } from 'src/core/decorators/staff-route.decorator';
import { AuthenticatedUser } from 'src/modules/auth/public/authenticated-user';
import {
  AccessoryLinkPrimaryMustBePrimaryError,
  ProductTypeNotFoundError,
} from 'src/modules/catalog/domain/errors/catalog.errors';

import { GetAvailableAccessoriesQuery } from './get-available-accessories.query';
import { GetAvailableAccessoriesRequestDto } from './get-available-accessories.request.dto';
import { GetAvailableAccessoriesResponseDto } from './get-available-accessories.response.dto';

@StaffRoute(Permission.VIEW_PRODUCTS)
@Controller('product-types')
export class GetAvailableAccessoriesHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(':id/available-accessories')
  @Paginated()
  async getAvailableAccessories(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() dto: GetAvailableAccessoriesRequestDto,
  ): Promise<GetAvailableAccessoriesResponseDto> {
    const result = await this.queryBus.execute(
      new GetAvailableAccessoriesQuery(user.tenantId, id, dto.search, dto.page, dto.limit),
    );

    if (result.isErr()) {
      const error = result.error;

      if (error instanceof ProductTypeNotFoundError) {
        throw new NotFoundException(error.message);
      }

      if (error instanceof AccessoryLinkPrimaryMustBePrimaryError) {
        throw new UnprocessableEntityException(error.message);
      }

      throw error;
    }

    return result.value;
  }
}
