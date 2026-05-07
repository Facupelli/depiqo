import { Body, Controller, NotFoundException, Param, Put, UnprocessableEntityException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Permission } from '@repo/types';

import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { StaffRoute } from 'src/core/decorators/staff-route.decorator';
import { AuthenticatedUser } from 'src/modules/auth/public/authenticated-user';
import {
  AccessoryLinkAccessoryMustBeAccessoryError,
  AccessoryLinkCrossTenantError,
  AccessoryLinkPrimaryMustBePrimaryError,
  DuplicateAccessoryLinkError,
  InvalidAccessoryLinkDefaultQuantityError,
  ProductTypeNotFoundError,
} from 'src/modules/catalog/domain/errors/catalog.errors';

import { ReplaceProductTypeAccessoryLinksCommand } from './replace-product-type-accessory-links.command';
import { ReplaceProductTypeAccessoryLinksRequestDto } from './replace-product-type-accessory-links.request.dto';

@StaffRoute(Permission.UPDATE_PRODUCTS)
@Controller('product-types')
export class ReplaceProductTypeAccessoryLinksHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Put(':id/accessory-links')
  async replace(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReplaceProductTypeAccessoryLinksRequestDto,
  ): Promise<void> {
    const result = await this.commandBus.execute(
      new ReplaceProductTypeAccessoryLinksCommand(
        user.tenantId,
        id,
        dto.accessoryLinks.map((accessoryLink) => ({
          accessoryRentalItemId: accessoryLink.accessoryRentalItemId,
          isDefaultIncluded: accessoryLink.isDefaultIncluded,
          defaultQuantity: accessoryLink.defaultQuantity,
          notes: accessoryLink.notes ?? null,
        })),
      ),
    );

    if (result.isErr()) {
      const error = result.error;

      if (error instanceof ProductTypeNotFoundError) {
        throw new NotFoundException(error.message);
      }

      if (
        error instanceof AccessoryLinkPrimaryMustBePrimaryError ||
        error instanceof AccessoryLinkAccessoryMustBeAccessoryError ||
        error instanceof AccessoryLinkCrossTenantError ||
        error instanceof InvalidAccessoryLinkDefaultQuantityError ||
        error instanceof DuplicateAccessoryLinkError
      ) {
        throw new UnprocessableEntityException(error.message);
      }

      throw error;
    }
  }
}
