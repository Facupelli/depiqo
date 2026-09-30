import { ApplicationError } from 'src/core/errors/application-error';

export type CreateOwnerWithContractErrorCode = 'asset_inventory.invalid_owner_contract_terms';

export interface CreateOwnerWithContractError extends ApplicationError {
  code: CreateOwnerWithContractErrorCode;
  context: { field: string; reason: string };
}

export function createOwnerWithContractError(
  message: string,
  context: CreateOwnerWithContractError['context'],
): CreateOwnerWithContractError {
  return { code: 'asset_inventory.invalid_owner_contract_terms', message, context };
}
