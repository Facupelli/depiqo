import { DomainError } from 'src/core/exceptions/domain.error';

export class AssetInventoryError extends DomainError {}

export class InvalidEquipmentTypeFieldError extends AssetInventoryError {
  constructor(
    public readonly field: string,
    public readonly reason: string,
  ) {
    super(`Invalid equipment type field "${field}": ${reason}.`);
  }
}

export class DuplicateEquipmentTypeNameError extends AssetInventoryError {
  constructor(public readonly name: string) {
    super(`Equipment type "${name}" already exists for this tenant.`);
  }
}

export class InvalidAssetFieldError extends AssetInventoryError {
  constructor(
    public readonly field: string,
    public readonly reason: string,
  ) {
    super(`Invalid asset field "${field}": ${reason}.`);
  }
}

export class DuplicateAssetSerialNumberError extends AssetInventoryError {
  constructor(public readonly serialNumber: string) {
    super(`Asset serial number "${serialNumber}" already exists for this tenant.`);
  }
}

export class AssetOwnerNotFoundError extends AssetInventoryError {
  constructor(public readonly ownerId: string) {
    super(`Asset owner "${ownerId}" was not found.`);
  }
}

export class ActiveOwnerContractNotFoundError extends AssetInventoryError {
  constructor(public readonly ownerId: string) {
    super(`Asset owner "${ownerId}" does not have an active contract.`);
  }
}

export class MultipleActiveOwnerContractsError extends AssetInventoryError {
  constructor(public readonly ownerId: string) {
    super(`Asset owner "${ownerId}" has multiple active contracts.`);
  }
}

export class EquipmentTypeNotFoundError extends AssetInventoryError {
  constructor(public readonly equipmentTypeId: string) {
    super(`Equipment type "${equipmentTypeId}" was not found.`);
  }
}

export class EquipmentTypeNotActiveError extends AssetInventoryError {
  constructor(public readonly equipmentTypeId: string) {
    super(`Equipment type "${equipmentTypeId}" is not active.`);
  }
}
