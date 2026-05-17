import { HttpStatus } from '@nestjs/common';

import { ProblemException } from 'src/core/exceptions/problem.exception';

import { CustomerCreateOrderError } from './create-order.types';
import { CREATE_ORDER_IDEMPOTENCY_RETRYABLE_PROBLEM_EXTENSION } from './idempotency/create-order-idempotency.constants';

type CustomerCreateOrderErrorCode = CustomerCreateOrderError['code'];

type ProblemDefinition = {
  readonly status: HttpStatus;
  readonly title: string;
  readonly type: string;
  readonly extensions?: (error: CustomerCreateOrderError) => Record<string, unknown>;
};

const createOrderProblemDefinitions: Record<CustomerCreateOrderErrorCode, ProblemDefinition> = {
  MISSING_IDEMPOTENCY_KEY: {
    status: HttpStatus.BAD_REQUEST,
    title: 'Missing Idempotency Key',
    type: 'errors://missing-idempotency-key',
  },
  INVALID_IDEMPOTENCY_KEY: {
    status: HttpStatus.BAD_REQUEST,
    title: 'Invalid Idempotency Key',
    type: 'errors://invalid-idempotency-key',
  },
  IDEMPOTENCY_KEY_IN_PROGRESS: {
    status: HttpStatus.CONFLICT,
    title: 'Idempotency Key In Progress',
    type: 'errors://idempotency-key-in-progress',
    extensions: () => CREATE_ORDER_IDEMPOTENCY_RETRYABLE_PROBLEM_EXTENSION,
  },
  IDEMPOTENCY_KEY_CONFLICT: {
    status: HttpStatus.CONFLICT,
    title: 'Idempotency Key Conflict',
    type: 'errors://idempotency-key-conflict',
  },
  ORDER_ITEM_UNAVAILABLE: {
    status: HttpStatus.CONFLICT,
    title: 'Order Items Unavailable',
    type: 'errors://order-items-unavailable',
    extensions: (error) => {
      if (error.code !== 'ORDER_ITEM_UNAVAILABLE') return {};

      return {
        unavailableItems: error.unavailableItems,
        conflictGroups: error.conflictGroups,
        accessoryConflicts: error.accessoryConflicts,
      };
    },
  },
  ORDER_MUST_CONTAIN_ITEMS: {
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    title: 'Invalid Order',
    type: 'errors://order-must-contain-items',
  },
  INVALID_PICKUP_SLOT: {
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    title: 'Invalid Pickup Slot',
    type: 'errors://invalid-pickup-slot',
  },
  INVALID_RETURN_SLOT: {
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    title: 'Invalid Return Slot',
    type: 'errors://invalid-return-slot',
  },
  INVALID_BOOKING_CONTEXT: {
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    title: 'Invalid Booking Context',
    type: 'errors://invalid-booking-context',
  },
  DELIVERY_NOT_SUPPORTED_FOR_LOCATION: {
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    title: 'Delivery Not Supported',
    type: 'errors://delivery-not-supported',
  },
  CATALOG_ITEM_NOT_FOUND: {
    status: HttpStatus.NOT_FOUND,
    title: 'Catalog Item Not Found',
    type: 'errors://catalog-item-not-found',
  },
  CATALOG_ITEM_INACTIVE_FOR_BOOKING: {
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    title: 'Inactive Catalog Item',
    type: 'errors://inactive-catalog-item',
  },
  COUPON_NOT_FOUND: {
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    title: 'Coupon Not Found',
    type: 'errors://coupon-not-found',
  },
  COUPON_VALIDATION_FAILED: {
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    title: 'Coupon Validation Failed',
    type: 'errors://coupon-validation-failed',
    extensions: (error) => {
      if (error.code !== 'COUPON_VALIDATION_FAILED') return {};

      return { reason: error.reason };
    },
  },
};

export function mapCreateOrderErrorToProblemException(error: CustomerCreateOrderError): ProblemException {
  const definition = createOrderProblemDefinitions[error.code];

  return new ProblemException(definition.status, definition.title, error.message, definition.type, {
    code: error.code,
    ...definition.extensions?.(error),
  });
}
