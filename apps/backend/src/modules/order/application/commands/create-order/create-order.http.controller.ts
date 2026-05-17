import { FulfillmentMethod } from '@repo/types';
import { CustomerOnly } from 'src/core/decorators/customer-only.decorator';
import { Body, Controller, Headers, HttpCode, HttpStatus, NotFoundException, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { ProblemException } from 'src/core/exceptions/problem.exception';
import { AuthenticatedUser } from 'src/modules/auth/public/authenticated-user';
import {
  BundleInactiveForBookingError,
  BundleNotBookableAtLocationError,
  ProductTypeInactiveForBookingError,
  ProductTypeNotBookableAtLocationError,
} from 'src/modules/catalog/catalog.public-api';
import { CouponNotFoundError, CouponValidationError } from 'src/modules/pricing/pricing.public-api';

import { CreateOrderCommand } from './create-order.command';
import {
  CREATE_ORDER_IDEMPOTENCY_HEADER,
  CREATE_ORDER_IDEMPOTENCY_PROBLEM,
  CREATE_ORDER_IDEMPOTENCY_RETRYABLE_PROBLEM_EXTENSION,
} from './idempotency/create-order-idempotency.constants';
import { CreateOrderRequestDto } from './create-order.request.dto';
import { CreateOrderResponseDto } from './create-order.response.dto';
import {
  IdempotencyKeyConflictError,
  IdempotencyKeyInProgressError,
  InvalidIdempotencyKeyError,
  MissingIdempotencyKeyError,
} from './create-order.types';
import {
  BundleNotFoundError,
  DeliveryNotSupportedForLocationError,
  InvalidBookingLocationError,
  InvalidPickupSlotError,
  InvalidReturnSlotError,
  OrderMustContainItemsError,
  OrderItemUnavailableError,
  ProductTypeNotFoundError,
} from '../../../domain/errors/order.errors';

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
      const error = result.error;

      if (error instanceof MissingIdempotencyKeyError) {
        throw new ProblemException(
          HttpStatus.BAD_REQUEST,
          CREATE_ORDER_IDEMPOTENCY_PROBLEM.missingKey.title,
          error.message,
          CREATE_ORDER_IDEMPOTENCY_PROBLEM.missingKey.type,
        );
      }

      if (error instanceof InvalidIdempotencyKeyError) {
        throw new ProblemException(
          HttpStatus.BAD_REQUEST,
          CREATE_ORDER_IDEMPOTENCY_PROBLEM.invalidKey.title,
          error.message,
          CREATE_ORDER_IDEMPOTENCY_PROBLEM.invalidKey.type,
        );
      }

      if (error instanceof IdempotencyKeyInProgressError) {
        throw new ProblemException(
          HttpStatus.CONFLICT,
          CREATE_ORDER_IDEMPOTENCY_PROBLEM.inProgress.title,
          error.message,
          CREATE_ORDER_IDEMPOTENCY_PROBLEM.inProgress.type,
          CREATE_ORDER_IDEMPOTENCY_RETRYABLE_PROBLEM_EXTENSION,
        );
      }

      if (error instanceof IdempotencyKeyConflictError) {
        throw new ProblemException(
          HttpStatus.CONFLICT,
          CREATE_ORDER_IDEMPOTENCY_PROBLEM.conflict.title,
          error.message,
          CREATE_ORDER_IDEMPOTENCY_PROBLEM.conflict.type,
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

      if (error instanceof OrderMustContainItemsError) {
        throw new ProblemException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          'Invalid Order',
          error.message,
          'errors://order-must-contain-items',
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

    return result.value;
  }
}
