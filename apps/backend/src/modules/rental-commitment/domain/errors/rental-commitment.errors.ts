import { DomainError } from 'src/core/exceptions/domain.error';

import { RentalStatus } from '../rental-status';

export class RentalCommitmentError extends DomainError {}

export class RentalInvalidFieldError extends RentalCommitmentError {
  constructor(
    public readonly field: string,
    public readonly reason: string,
  ) {
    super(`Invalid rental field "${field}": ${reason}.`);
  }
}

export class RentalOfferNotFoundError extends RentalInvalidFieldError {
  constructor(public readonly rentalOfferId: string) {
    super('rentalOfferId', `offer "${rentalOfferId}" was not found`);
  }
}

export class RentalOfferNotRentableError extends RentalInvalidFieldError {
  constructor(public readonly rentalOfferId: string) {
    super('rentalOfferId', `offer "${rentalOfferId}" is not selectable`);
  }
}

export class RentableItemNotActiveError extends RentalInvalidFieldError {
  constructor(public readonly rentableItemId: string) {
    super('rentableItemId', `item "${rentableItemId}" is not active`);
  }
}

export class InvalidFulfillmentDefinitionError extends RentalInvalidFieldError {
  constructor(public readonly rentableItemId: string) {
    super('fulfillmentRequirements', `item "${rentableItemId}" has no requirements`);
  }
}

export class RentalMustContainSelectionError extends RentalCommitmentError {
  constructor() {
    super('A rental must contain at least one rental selection.');
  }
}

export class DuplicateRentalOfferSelectionError extends RentalCommitmentError {
  constructor(public readonly rentalOfferId: string) {
    super(`Rental offer "${rentalOfferId}" was selected more than once.`);
  }
}

export class RentalSelectionNotFoundError extends RentalCommitmentError {
  constructor(
    public readonly rentalId: string,
    public readonly rentalSelectionId: string,
  ) {
    super(`Rental "${rentalId}" selection "${rentalSelectionId}" was not found.`);
  }
}

export class RentalDemandLineNotFoundError extends RentalCommitmentError {
  constructor(
    public readonly rentalId: string,
    public readonly rentalDemandLineId: string,
  ) {
    super(`Rental "${rentalId}" demand line "${rentalDemandLineId}" was not found.`);
  }
}

export class RentalCannotBeConfirmedFromStatusError extends RentalCommitmentError {
  constructor(rentalId: string, status: RentalStatus) {
    super(`Rental "${rentalId}" cannot be confirmed from status "${status}".`);
  }
}

export class RentalCannotBeEditedFromStatusError extends RentalCommitmentError {
  constructor(rentalId: string, status: RentalStatus) {
    super(`Rental "${rentalId}" cannot be edited from status "${status}".`);
  }
}

export class RentalPeriodCannotStartInPastError extends RentalCommitmentError {
  constructor() {
    super('Rental period cannot start in the past.');
  }
}

export class ConfirmedRentalCannotBeEditedAfterPickupError extends RentalCommitmentError {
  constructor(rentalId: string) {
    super(`Confirmed rental "${rentalId}" cannot be edited at or after its pickup time.`);
  }
}

export class RentalPeriodHasEndedError extends RentalCommitmentError {
  constructor(rentalId: string) {
    super(`Confirmed rental "${rentalId}" cannot have an asset replaced because its rental period has ended.`);
  }
}

export class RentalContainsOperationalCommitmentsError extends RentalCommitmentError {
  constructor(rentalId: string) {
    super(`Rental "${rentalId}" contains assignments or asset blocks and cannot be edited while unconfirmed.`);
  }
}

export class RentalConfirmationRequiresCustomerError extends RentalCommitmentError {
  constructor(rentalId: string) {
    super(`Rental "${rentalId}" cannot be confirmed without a linked rental customer.`);
  }
}

export class RentalAlreadyCancelledError extends RentalCommitmentError {
  constructor(rentalId: string) {
    super(`Rental "${rentalId}" is already cancelled.`);
  }
}

export class RentalCannotBeCancelledFromStatusError extends RentalCommitmentError {
  constructor(rentalId: string, status: RentalStatus) {
    super(`Rental "${rentalId}" cannot be cancelled from status "${status}".`);
  }
}

export class ConfirmedRentalRequiresPriceSnapshotError extends RentalCommitmentError {
  constructor(rentalId: string) {
    super(`Rental "${rentalId}" cannot be confirmed without a confirmed price snapshot.`);
  }
}

export class ConfirmedRentalRequiresEquipmentDemandError extends RentalCommitmentError {
  constructor(rentalId: string) {
    super(`Rental "${rentalId}" cannot be confirmed without equipment demand lines.`);
  }
}

export class ConfirmedRentalRequiresCompleteAssignmentsError extends RentalCommitmentError {
  constructor(rentalId: string, rentalDemandLineId: string, expected: number, actual: number) {
    super(
      `Rental "${rentalId}" demand line "${rentalDemandLineId}" requires ${expected} assigned assets but received ${actual}.`,
    );
  }
}

export class ConfirmedRentalRequiresActiveBlocksError extends RentalCommitmentError {
  constructor(rentalId: string, assetId: string) {
    super(
      `Rental "${rentalId}" assigned asset "${assetId}" must have one active equipment block for the rental period.`,
    );
  }
}

export class AssetBlockPeriodMismatchError extends RentalCommitmentError {
  constructor(rentalId: string, assetBlockId: string) {
    super(`Rental "${rentalId}" asset block "${assetBlockId}" does not cover the rental period.`);
  }
}

export class PendingOrDraftRentalCannotHaveAssignmentsError extends RentalCommitmentError {
  constructor(rentalId: string) {
    super(`Rental "${rentalId}" cannot have assigned assets before confirmation.`);
  }
}

export class PendingOrDraftRentalCannotHaveBlocksError extends RentalCommitmentError {
  constructor(rentalId: string) {
    super(`Rental "${rentalId}" cannot have asset blocks before confirmation.`);
  }
}

export class RentalChildTenantMismatchError extends RentalCommitmentError {
  constructor(rentalId: string, childType: string, childId: string) {
    super(`Rental "${rentalId}" ${childType} "${childId}" belongs to a different tenant.`);
  }
}

export class RentalChildRentalMismatchError extends RentalCommitmentError {
  constructor(rentalId: string, childType: string, childId: string) {
    super(`Rental "${rentalId}" ${childType} "${childId}" belongs to a different rental.`);
  }
}

export class DemandLineSelectionMismatchError extends RentalCommitmentError {
  constructor(rentalId: string, rentalDemandLineId: string) {
    super(`Rental "${rentalId}" demand line "${rentalDemandLineId}" does not reference a known rental selection.`);
  }
}

export class AssignedAssetDemandMismatchError extends RentalCommitmentError {
  constructor(rentalId: string, assignedAssetId: string) {
    super(`Rental "${rentalId}" assigned asset "${assignedAssetId}" does not reference a known demand line.`);
  }
}

export class RentalAssignedAssetNotFoundError extends RentalCommitmentError {
  constructor(rentalId: string, assetId: string) {
    super(`Rental "${rentalId}" does not have an assignment for asset "${assetId}".`);
  }
}

export class DuplicateAssignedAssetError extends RentalCommitmentError {
  constructor(rentalId: string, assetId: string) {
    super(`Rental "${rentalId}" assigns physical asset "${assetId}" more than once.`);
  }
}

export class UnexpectedActiveAssetBlockError extends RentalCommitmentError {
  constructor(rentalId: string, assetBlockId: string) {
    super(`Rental "${rentalId}" has unexpected active asset block "${assetBlockId}".`);
  }
}

export class AssetBlockTypeMismatchError extends RentalCommitmentError {
  constructor(rentalId: string, assetBlockId: string) {
    super(`Rental "${rentalId}" asset block "${assetBlockId}" must be an equipment block.`);
  }
}

export class InvalidCatalogSelectionQuantityError extends RentalCommitmentError {
  constructor(
    public readonly field: string,
    public readonly quantity: number,
  ) {
    super(`Invalid catalog selection quantity for "${field}": ${quantity}.`);
  }
}

export class EquipmentTypeNotFoundError extends RentalCommitmentError {
  constructor(public readonly equipmentTypeId: string) {
    super(`Equipment type "${equipmentTypeId}" was not found.`);
  }
}

export class EquipmentTypeNotRentableError extends RentalCommitmentError {
  constructor(public readonly equipmentTypeId: string) {
    super(`Equipment type "${equipmentTypeId}" is not rentable.`);
  }
}

export class InsufficientAssetAvailabilityError extends RentalCommitmentError {
  constructor(
    public readonly equipmentTypeId: string,
    public readonly rentalSelectionId: string,
    public readonly requiredQuantity: number,
    public readonly availableQuantity: number,
  ) {
    super(
      `Equipment type "${equipmentTypeId}" requires ${requiredQuantity} available assets but only ${availableQuantity} can be promised.`,
    );
  }
}

export class ThirdPartyAssetRequiresOwnerContractSnapshotError extends RentalCommitmentError {
  constructor(assetId: string) {
    super(`Third-party asset "${assetId}" requires an owner contract snapshot before it can be assigned.`);
  }
}

export class TenantOwnedAssetCannotHaveOwnerContractSnapshotError extends RentalCommitmentError {
  constructor(assetId: string) {
    super(`Tenant-owned asset "${assetId}" must not have an owner contract snapshot.`);
  }
}

export class TenantUnavailableForRentalError extends RentalCommitmentError {
  constructor(public readonly tenantId: string) {
    super(`Tenant "${tenantId}" is not available for rental creation.`);
  }
}

export class ProfessionalConfirmedRentalCreationDisabledError extends RentalCommitmentError {
  constructor(public readonly tenantId: string) {
    super(`Tenant "${tenantId}" does not allow professional confirmed rental creation.`);
  }
}

export class BranchUnavailableForRentalError extends RentalCommitmentError {
  constructor(public readonly branchId: string) {
    super(`Branch "${branchId}" is not available for rental creation.`);
  }
}

export class RentalCustomerUnavailableForRentalError extends RentalCommitmentError {
  constructor(public readonly rentalCustomerId: string) {
    super(`Rental customer "${rentalCustomerId}" is not available for rental creation.`);
  }
}

export class TenantUserUnavailableForRentalError extends RentalCommitmentError {
  constructor(public readonly tenantUserId: string) {
    super(`Tenant user "${tenantUserId}" is not available for rental creation.`);
  }
}

export class UnsupportedBranchFulfillmentMethodError extends RentalCommitmentError {
  constructor(
    public readonly branchId: string,
    public readonly fulfillmentMethod: string,
  ) {
    super(`Branch "${branchId}" does not support fulfillment method "${fulfillmentMethod}".`);
  }
}

export class PickupTimeOutsideBranchScheduleError extends RentalCommitmentError {
  constructor(
    public readonly branchId: string,
    public readonly requestedPickupAt: Date,
  ) {
    super(`Pickup time is outside branch "${branchId}" pickup schedule.`);
  }
}

export class ReturnTimeOutsideBranchScheduleError extends RentalCommitmentError {
  constructor(
    public readonly branchId: string,
    public readonly requestedReturnAt: Date,
  ) {
    super(`Return time is outside branch "${branchId}" return schedule.`);
  }
}

export class RentalMustBeDraftToAssignCustomerError extends RentalCommitmentError {
  constructor(rentalId: string) {
    super(`Rental "${rentalId}" must be in DRAFT status to assign a customer.`);
  }
}
