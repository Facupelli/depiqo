import { FulfillmentMethod } from '@repo/types';
import { Body, Controller, Headers, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { CustomerOnly } from 'src/core/decorators/customer-only.decorator';
import { AuthenticatedUser } from 'src/modules/auth/public/authenticated-user';

import { CreateOrderCommand } from './create-order.command';
import { mapCreateOrderErrorToProblemException } from './create-order.errors.mapper';
import { CREATE_ORDER_IDEMPOTENCY_HEADER } from './idempotency/create-order-idempotency.constants';
import { CreateOrderRequestDto } from './create-order.request.dto';
import { CreateOrderResponseDto } from './create-order.response.dto';

@CustomerOnly()
@Controller('orders')
export class CreateOrderHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOrderRequestDto,
    @Headers(CREATE_ORDER_IDEMPOTENCY_HEADER) idempotencyKey?: string,
  ): Promise<CreateOrderResponseDto> {
    const result = await this.commandBus.execute(
      new CreateOrderCommand({
        tenantId: user.tenantId,
        locationId: dto.locationId,
        customerId: user.id,
        pickupDate: dto.pickupDate,
        returnDate: dto.returnDate,
        pickupTime: dto.pickupTime,
        returnTime: dto.returnTime,
        items: dto.items,
        currency: dto.currency,
        insuranceSelected: dto.insuranceSelected,
        couponCode: dto.couponCode,
        fulfillmentMethod: dto.fulfillmentMethod as FulfillmentMethod,
        deliveryRequest: dto.deliveryRequest ?? undefined,
        idempotencyKey,
      }),
    );

    if (result.isErr()) {
      throw mapCreateOrderErrorToProblemException(result.error);
    }

    return result.value;
  }
}
