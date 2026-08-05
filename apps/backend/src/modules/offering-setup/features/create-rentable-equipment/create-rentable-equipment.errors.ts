import { ApplicationError } from 'src/core/errors/application-error';

export type CreateRentableEquipmentErrorCode =
  | 'offering_setup.tenant_unavailable'
  | 'offering_setup.branch_unavailable'
  | 'offering_setup.invalid_equipment'
  | 'offering_setup.duplicate_equipment_type_name'
  | 'offering_setup.duplicate_asset_serial_number'
  | 'offering_setup.asset_owner_not_found'
  | 'offering_setup.active_owner_contract_not_found'
  | 'offering_setup.multiple_active_owner_contracts'
  | 'offering_setup.invalid_rentable_item';

export interface CreateRentableEquipmentError extends ApplicationError {
  code: CreateRentableEquipmentErrorCode;
}

export function createRentableEquipmentError(
  code: CreateRentableEquipmentErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): CreateRentableEquipmentError {
  return { code, message, cause, context };
}
