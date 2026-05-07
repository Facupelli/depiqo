import { Controller, Get, NotFoundException, Param, UnprocessableEntityException } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Permission } from '@repo/types';

import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { StaffRoute } from 'src/core/decorators/staff-route.decorator';
import { AuthenticatedUser } from 'src/modules/auth/public/authenticated-user';
import {
  AccessoryLinkPrimaryMustBePrimaryError,
  ProductTypeNotFoundError,
} from 'src/modules/catalog/domain/errors/catalog.errors';

import { GetProductTypeAccessoryLinksQuery } from './get-product-type-accessory-links.query';
import { GetProductTypeAccessoryLinksResponseDto } from './get-product-type-accessory-links.response.dto';

@StaffRoute(Permission.VIEW_PRODUCTS)
@Controller('product-types')
export class GetProductTypeAccessoryLinksHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(':id/accessory-links')
  async getAccessoryLinks(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<GetProductTypeAccessoryLinksResponseDto> {
    const result = await this.queryBus.execute(new GetProductTypeAccessoryLinksQuery(user.tenantId, id));

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
