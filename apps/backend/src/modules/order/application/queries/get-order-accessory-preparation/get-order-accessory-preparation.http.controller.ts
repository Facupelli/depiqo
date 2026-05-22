import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Permission } from '@repo/types';

import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { StaffRoute } from 'src/core/decorators/staff-route.decorator';
import { AuthenticatedUser } from 'src/modules/auth/public/authenticated-user';
import { OrderNotFoundException } from 'src/modules/order/domain/exceptions/order.exceptions';

import { GetOrderAccessoryPreparationQuery } from './get-order-accessory-preparation.query';
import { GetOrderAccessoryPreparationParamDto } from './get-order-accessory-preparation.request.dto';
import { GetOrderAccessoryPreparationResponseDto } from './get-order-accessory-preparation.response.dto';

@StaffRoute(Permission.CREATE_ORDERS)
@Controller('orders/:orderId/accessory-preparation')
export class GetOrderAccessoryPreparationHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  async getPreparation(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: GetOrderAccessoryPreparationParamDto,
  ): Promise<GetOrderAccessoryPreparationResponseDto> {
    try {
      return await this.queryBus.execute(new GetOrderAccessoryPreparationQuery(user.tenantId, params.orderId));
    } catch (error) {
      if (error instanceof OrderNotFoundException) {
        throw new NotFoundException(error.message);
      }

      throw error;
    }
  }
}
