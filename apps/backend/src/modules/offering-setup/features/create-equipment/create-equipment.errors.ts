import { ApplicationError } from 'src/core/errors/application-error';

export type CreateEquipmentErrorCode =
  | 'offering_setup.tenant_unavailable'
  | 'offering_setup.branch_unavailable'
  | 'offering_setup.invalid_equipment'
  | 'offering_setup.duplicate_equipment_type_name'
  | 'offering_setup.asset_owner_not_found'
  | 'offering_setup.active_owner_contract_not_found'
  | 'offering_setup.multiple_active_owner_contracts'
  | 'offering_setup.invalid_standalone_rental';

export interface CreateEquipmentError extends ApplicationError {
  code: CreateEquipmentErrorCode;
}

export function createEquipmentError(
  code: CreateEquipmentErrorCode,
  message: string,
  cause?: unknown,
  context?: Record<string, unknown>,
): CreateEquipmentError {
  return { code, message, cause, context };
}
