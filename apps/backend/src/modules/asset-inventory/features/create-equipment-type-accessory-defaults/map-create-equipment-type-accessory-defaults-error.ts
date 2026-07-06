import { EquipmentTypeNotActiveError, EquipmentTypeNotFoundError } from '../../domain/errors/asset-inventory.errors';
import {
  createEquipmentTypeAccessoryDefaultsApplicationError,
  CreateEquipmentTypeAccessoryDefaultsApplicationError,
} from './create-equipment-type-accessory-defaults-application.error';

export class AccessoryDefaultAlreadyExistsError extends Error {
  constructor(
    public readonly equipmentTypeId: string,
    public readonly accessoryEquipmentTypeId: string,
  ) {
    super(
      `Accessory default already exists for equipment type "${equipmentTypeId}" and accessory "${accessoryEquipmentTypeId}".`,
    );
  }
}

export class DuplicateAccessoryInRequestError extends Error {
  constructor(public readonly accessoryEquipmentTypeId: string) {
    super(`Accessory equipment type "${accessoryEquipmentTypeId}" appears more than once in the request.`);
  }
}

export class SelfReferenceAccessoryDefaultError extends Error {
  constructor(public readonly equipmentTypeId: string) {
    super(`Equipment type "${equipmentTypeId}" cannot be its own accessory default.`);
  }
}

export function mapCreateEquipmentTypeAccessoryDefaultsError(
  error: unknown,
  role: 'equipmentType' | 'accessoryEquipmentType' = 'equipmentType',
): CreateEquipmentTypeAccessoryDefaultsApplicationError {
  if (error instanceof EquipmentTypeNotFoundError) {
    return createEquipmentTypeAccessoryDefaultsApplicationError(
      role === 'equipmentType' ? 'EquipmentTypeNotFound' : 'AccessoryEquipmentTypeNotFound',
      error.message,
      error,
    );
  }

  if (error instanceof EquipmentTypeNotActiveError) {
    return createEquipmentTypeAccessoryDefaultsApplicationError(
      role === 'equipmentType' ? 'EquipmentTypeNotActive' : 'AccessoryEquipmentTypeNotActive',
      error.message,
      error,
    );
  }

  if (error instanceof DuplicateAccessoryInRequestError) {
    return createEquipmentTypeAccessoryDefaultsApplicationError('DuplicateAccessoryInRequest', error.message, error);
  }

  if (error instanceof AccessoryDefaultAlreadyExistsError) {
    return createEquipmentTypeAccessoryDefaultsApplicationError('AccessoryDefaultAlreadyExists', error.message, error);
  }

  if (error instanceof SelfReferenceAccessoryDefaultError) {
    return createEquipmentTypeAccessoryDefaultsApplicationError('SelfReferenceNotAllowed', error.message, error);
  }

  return createEquipmentTypeAccessoryDefaultsApplicationError(
    'Unexpected',
    'An unexpected error occurred while creating equipment type accessory defaults.',
    error,
  );
}
