import { DomainError } from 'src/core/exceptions/domain.error';

export class CatalogError extends DomainError {}

export class CatalogInvalidFieldError extends CatalogError {
  constructor(
    public readonly field: string,
    public readonly reason: string,
  ) {
    super(`Invalid catalog field "${field}": ${reason}.`);
  }
}

export class CatalogRentableItemNotFoundError extends CatalogError {
  constructor(public readonly rentableItemId: string) {
    super(`Rentable item "${rentableItemId}" was not found.`);
  }
}

export class CatalogRentableItemArchivedError extends CatalogError {
  constructor(public readonly rentableItemId: string) {
    super(`Rentable item "${rentableItemId}" is archived.`);
  }
}

export class CatalogRentableItemCannotBeActivatedFromStatusError extends CatalogError {
  constructor(
    public readonly rentableItemId: string,
    public readonly status: string,
  ) {
    super(`Rentable item "${rentableItemId}" cannot be activated from status "${status}".`);
  }
}

export class CatalogRentalOfferAlreadyExistsError extends CatalogError {
  constructor(
    public readonly rentableItemId: string,
    public readonly branchId: string,
  ) {
    super(`Rentable item "${rentableItemId}" is already offered in branch "${branchId}".`);
  }
}

export class CatalogEquipmentTypeNotFoundError extends CatalogError {
  constructor(public readonly equipmentTypeId: string) {
    super(`Equipment type "${equipmentTypeId}" was not found.`);
  }
}

export class CatalogEquipmentTypeNotActiveError extends CatalogError {
  constructor(public readonly equipmentTypeId: string) {
    super(`Equipment type "${equipmentTypeId}" is not active.`);
  }
}

export class CatalogRentableItemRequirementAlreadyExistsError extends CatalogError {
  constructor(
    public readonly rentableItemId: string,
    public readonly equipmentTypeId: string,
  ) {
    super(`Rentable item "${rentableItemId}" already requires equipment type "${equipmentTypeId}".`);
  }
}
