import { HttpStatus } from '@nestjs/common';

import {
  createProblemType,
  PlatformProblemTypes,
  ProblemDetailsExtensions,
  ProblemException,
} from 'src/core/problem-details';
import {
  DuplicateRentalOfferSelectionError,
  EquipmentTypeNotFoundError,
  EquipmentTypeNotRentableError,
  InsufficientAssetAvailabilityError,
  InvalidCatalogSelectionQuantityError,
  RentalInvalidFieldError,
} from '../../domain/errors/rental-commitment.errors';

import {
  RentalCommitmentApplicationError,
  RentalCommitmentApplicationErrorCode,
} from './rental-commitment-application.error';

interface RentalCommitmentProblemDefinition {
  type: string;
  title: string;
  status: number;
  detail: string;
  extensions?: (cause: unknown) => ProblemDetailsExtensions | undefined;
}

const RentalCommitmentProblemCatalog: Record<RentalCommitmentApplicationErrorCode, RentalCommitmentProblemDefinition> =
  {
    InvalidRentalPeriod: {
      type: createProblemType('rental-commitment/invalid-rental-period'),
      title: 'Invalid rental period',
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      detail: 'The requested rental period is invalid.',
    },
    RentalMustContainSelection: {
      type: createProblemType('rental-commitment/rental-must-contain-selection'),
      title: 'Rental must contain a selection',
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      detail: 'A confirmed rental must include at least one selected offer.',
    },
    DuplicateRentalOfferSelection: {
      type: createProblemType('rental-commitment/duplicate-rental-offer-selection'),
      title: 'Duplicate rental offer selection',
      status: HttpStatus.CONFLICT,
      detail: 'The same rental offer cannot be selected more than once.',
      extensions: duplicateRentalOfferSelectionExtensions,
    },
    InsufficientAssetAvailability: {
      type: createProblemType('rental-commitment/insufficient-asset-availability'),
      title: 'Insufficient asset availability',
      status: HttpStatus.CONFLICT,
      detail: 'Not enough equipment is available for the requested rental period.',
      extensions: insufficientAssetAvailabilityExtensions,
    },
    ProfessionalConfirmedRentalCreationDisabled: {
      type: createProblemType('rental-commitment/professional-confirmed-rental-creation-disabled'),
      title: 'Professional confirmed rental creation disabled',
      status: HttpStatus.FORBIDDEN,
      detail: 'Confirmed rental creation is not available for this tenant.',
    },
    TenantUnavailableForRental: {
      type: createProblemType('rental-commitment/tenant-unavailable-for-rental'),
      title: 'Tenant unavailable for rental',
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      detail: 'This tenant is not available for rental creation.',
    },
    BranchUnavailableForRental: {
      type: createProblemType('rental-commitment/branch-unavailable-for-rental'),
      title: 'Branch unavailable for rental',
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      detail: 'The selected branch is not available for rental creation.',
    },
    RentalCustomerUnavailableForRental: {
      type: createProblemType('rental-commitment/rental-customer-unavailable-for-rental'),
      title: 'Rental customer unavailable for rental',
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      detail: 'The rental customer is not available for rental creation.',
    },
    TenantUserUnavailableForRental: {
      type: createProblemType('rental-commitment/tenant-user-unavailable-for-rental'),
      title: 'Tenant user unavailable for rental',
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      detail: 'The tenant user is not available for rental creation.',
    },
    EquipmentTypeNotFound: {
      type: createProblemType('rental-commitment/equipment-type-not-found'),
      title: 'Equipment type not found',
      status: HttpStatus.NOT_FOUND,
      detail: 'One of the selected equipment types could not be found.',
      extensions: equipmentTypeNotFoundExtensions,
    },
    EquipmentTypeNotRentable: {
      type: createProblemType('rental-commitment/equipment-type-not-rentable'),
      title: 'Equipment type not rentable',
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      detail: 'One of the selected equipment types is not available for rental.',
      extensions: equipmentTypeNotRentableExtensions,
    },
    UnsupportedBranchFulfillmentMethod: {
      type: createProblemType('rental-commitment/unsupported-branch-fulfillment-method'),
      title: 'Unsupported branch fulfillment method',
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      detail: 'The selected branch does not support the requested fulfillment method.',
    },
    PickupTimeOutsideBranchSchedule: {
      type: createProblemType('rental-commitment/pickup-time-outside-branch-schedule'),
      title: 'Pickup time outside branch schedule',
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      detail: 'The requested pickup time is outside the branch pickup schedule.',
    },
    ReturnTimeOutsideBranchSchedule: {
      type: createProblemType('rental-commitment/return-time-outside-branch-schedule'),
      title: 'Return time outside branch schedule',
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      detail: 'The requested return time is outside the branch return schedule.',
    },
    InvalidRentalField: {
      type: createProblemType('rental-commitment/invalid-rental-field'),
      title: 'Invalid rental field',
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      detail: 'The rental contains an invalid field value.',
      extensions: invalidRentalFieldExtensions,
    },
    InvalidCatalogSelectionQuantity: {
      type: createProblemType('rental-commitment/invalid-catalog-selection-quantity'),
      title: 'Invalid catalog selection quantity',
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      detail: 'One of the selected catalog quantities is invalid.',
      extensions: invalidCatalogSelectionQuantityExtensions,
    },
    InvalidPricingInput: {
      type: createProblemType('rental-commitment/invalid-pricing-input'),
      title: 'Invalid pricing input',
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      detail: 'The rental could not be priced with the provided input.',
    },
    RentalSelectionNotFound: {
      type: createProblemType('rental-commitment/rental-selection-not-found'),
      title: 'Rental selection not found',
      status: HttpStatus.NOT_FOUND,
      detail: 'The requested rental selection could not be found.',
    },
    RentalDemandLineNotFound: {
      type: createProblemType('rental-commitment/rental-demand-line-not-found'),
      title: 'Rental demand line not found',
      status: HttpStatus.NOT_FOUND,
      detail: 'The requested rental demand line could not be found.',
    },
    DuplicateAssignedAsset: {
      type: createProblemType('rental-commitment/duplicate-assigned-asset'),
      title: 'Duplicate assigned asset',
      status: HttpStatus.CONFLICT,
      detail: 'The same physical asset cannot be assigned more than once.',
    },
    RentalCommitmentUnexpected: {
      type: createProblemType('rental-commitment/unexpected-error'),
      title: 'Unexpected rental commitment error',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      detail: 'An unexpected rental commitment error occurred.',
    },
    Unexpected: {
      type: PlatformProblemTypes.system.internalServerError,
      title: 'Internal server error',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      detail: 'An unexpected error occurred. Please try again later.',
    },
  };

export function toRentalCommitmentProblem(error: RentalCommitmentApplicationError): ProblemException {
  const definition = RentalCommitmentProblemCatalog[error.code];

  return ProblemException.from({
    type: definition.type,
    title: definition.title,
    status: definition.status,
    detail: definition.detail,
    extensions: definition.extensions?.(error.cause),
  });
}

function insufficientAssetAvailabilityExtensions(cause: unknown): ProblemDetailsExtensions | undefined {
  if (!(cause instanceof InsufficientAssetAvailabilityError)) return undefined;

  return {
    equipmentTypeId: cause.equipmentTypeId,
    rentalSelectionId: cause.rentalSelectionId,
    requiredQuantity: cause.requiredQuantity,
    availableQuantity: cause.availableQuantity,
  };
}

function duplicateRentalOfferSelectionExtensions(cause: unknown): ProblemDetailsExtensions | undefined {
  if (!(cause instanceof DuplicateRentalOfferSelectionError)) return undefined;

  return { rentalOfferId: cause.rentalOfferId };
}

function equipmentTypeNotFoundExtensions(cause: unknown): ProblemDetailsExtensions | undefined {
  if (!(cause instanceof EquipmentTypeNotFoundError)) return undefined;

  return { equipmentTypeId: cause.equipmentTypeId };
}

function equipmentTypeNotRentableExtensions(cause: unknown): ProblemDetailsExtensions | undefined {
  if (!(cause instanceof EquipmentTypeNotRentableError)) return undefined;

  return { equipmentTypeId: cause.equipmentTypeId };
}

function invalidRentalFieldExtensions(cause: unknown): ProblemDetailsExtensions | undefined {
  if (!(cause instanceof RentalInvalidFieldError)) return undefined;

  return invalidParamsExtension(cause.field, cause.reason);
}

function invalidCatalogSelectionQuantityExtensions(cause: unknown): ProblemDetailsExtensions | undefined {
  if (!(cause instanceof InvalidCatalogSelectionQuantityError)) return undefined;

  return invalidParamsExtension(cause.field, `Quantity must be a positive integer. Received ${cause.quantity}.`);
}

function invalidParamsExtension(name: string, reason: string): ProblemDetailsExtensions {
  return {
    'invalid-params': [{ name, reason }],
  };
}
