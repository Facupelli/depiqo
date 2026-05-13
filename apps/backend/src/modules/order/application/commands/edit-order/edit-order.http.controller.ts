import { Body, Controller, HttpCode, HttpStatus, NotFoundException, Param, Put } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { FulfillmentMethod, Permission } from '@repo/types';

import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { StaffRoute } from 'src/core/decorators/staff-route.decorator';
import { ProblemException } from 'src/core/exceptions/problem.exception';
import { AuthenticatedUser } from 'src/modules/auth/public/authenticated-user';
import {
  BundleInactiveForBookingError,
  BundleNotBookableAtLocationError,
  ProductTypeInactiveForBookingError,
  ProductTypeNotBookableAtLocationError,
} from 'src/modules/catalog/catalog.public-api';
import { CouponNotFoundError, CouponValidationError } from 'src/modules/pricing/pricing.public-api';

import {
  BundleNotFoundError,
  DeliveryNotSupportedForLocationError,
  InvalidBookingLocationError,
  InvalidPickupSlotError,
  InvalidReturnSlotError,
  OrderEditAfterPickupNotAllowedError,
  OrderEditNotAllowedError,
  OrderItemUnavailableError,
  OrderMustContainItemsError,
  OrderNotFoundError,
  OrderPricingTargetTotalInvalidError,
  OrderSignedEditNotAllowedError,
  ProductTypeNotFoundError,
} from '../../../domain/errors/order.errors';
import { EditOrderCommand } from './edit-order.command';
import { EditOrderParamDto, EditOrderRequestDto } from './edit-order.request.dto';

@StaffRoute(Permission.CREATE_ORDERS)
@Controller('orders/:orderId/edit')
export class EditOrderHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Put()
  @HttpCode(HttpStatus.NO_CONTENT)
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param() params: EditOrderParamDto,
    @Body() dto: EditOrderRequestDto,
  ): Promise<void> {
    const result = await this.commandBus.execute(
      new EditOrderCommand({
        tenantId: user.tenantId,
        orderId: params.orderId,
        locationId: dto.locationId,
        customerId: dto.customerId ?? undefined,
        pickupDate: dto.pickupDate,
        returnDate: dto.returnDate,
        pickupTime: dto.pickupTime,
        returnTime: dto.returnTime,
        items: dto.items,
        currency: dto.currency,
        insuranceSelected: dto.insuranceSelected,
        couponCode: dto.couponCode,
        setByUserId: user.id,
        pricingAdjustment: dto.initialPricingAdjustment ?? undefined,
        fulfillmentMethod: dto.fulfillmentMethod as FulfillmentMethod,
        deliveryRequest: dto.deliveryRequest ?? undefined,
      }),
    );

    if (result.isErr()) {
      const error = result.error;

      if (error instanceof OrderNotFoundError) {
        throw new NotFoundException(error.message);
      }

      if (error instanceof OrderEditNotAllowedError) {
        throw new ProblemException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          'Order Edit Not Allowed',
          error.message,
          'errors://order-edit-not-allowed',
        );
      }

      if (error instanceof OrderEditAfterPickupNotAllowedError) {
        throw new ProblemException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          'Order Edit After Pickup Not Allowed',
          error.message,
          'errors://order-edit-after-pickup-not-allowed',
        );
      }

      if (error instanceof OrderSignedEditNotAllowedError) {
        throw new ProblemException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          'Signed Order Edit Not Allowed',
          error.message,
          'errors://signed-order-edit-not-allowed',
        );
      }

      if (error instanceof OrderMustContainItemsError) {
        throw new ProblemException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          'Invalid Order',
          error.message,
          'errors://order-must-contain-items',
        );
      }

      if (error instanceof OrderItemUnavailableError) {
        throw new ProblemException(
          HttpStatus.CONFLICT,
          'Order Items Unavailable',
          error.message,
          'errors://order-items-unavailable',
          {
            unavailableItems: error.unavailableItems,
            conflictGroups: error.conflictGroups,
            accessoryConflicts: error.accessoryConflicts,
          },
        );
      }

      if (error instanceof InvalidPickupSlotError) {
        throw new ProblemException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          'Invalid Pickup Slot',
          error.message,
          'errors://invalid-pickup-slot',
        );
      }

      if (error instanceof InvalidReturnSlotError) {
        throw new ProblemException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          'Invalid Return Slot',
          error.message,
          'errors://invalid-return-slot',
        );
      }

      if (error instanceof InvalidBookingLocationError) {
        throw new ProblemException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          'Invalid Booking Context',
          error.message,
          'errors://invalid-booking-context',
        );
      }

      if (error instanceof DeliveryNotSupportedForLocationError) {
        throw new ProblemException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          'Delivery Not Supported',
          error.message,
          'errors://delivery-not-supported',
        );
      }

      if (error instanceof CouponNotFoundError) {
        throw new ProblemException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          'Coupon Not Found',
          error.message,
          'errors://coupon-not-found',
        );
      }

      if (error instanceof CouponValidationError) {
        throw new ProblemException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          'Coupon Validation Failed',
          error.message,
          'errors://coupon-validation-failed',
          { reason: error.reason },
        );
      }

      if (error instanceof OrderPricingTargetTotalInvalidError) {
        throw new ProblemException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          'Invalid Pricing Target',
          error.message,
          'errors://invalid-pricing-target',
        );
      }

      if (error instanceof ProductTypeInactiveForBookingError || error instanceof BundleInactiveForBookingError) {
        throw new ProblemException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          'Inactive Catalog Item',
          error.message,
          'errors://inactive-catalog-item',
        );
      }

      if (error instanceof ProductTypeNotBookableAtLocationError || error instanceof BundleNotBookableAtLocationError) {
        throw new ProblemException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          'Invalid Booking Context',
          error.message,
          'errors://invalid-booking-context',
        );
      }

      if (error instanceof ProductTypeNotFoundError || error instanceof BundleNotFoundError) {
        throw new NotFoundException(error.message);
      }

      throw error;
    }
  }
}
