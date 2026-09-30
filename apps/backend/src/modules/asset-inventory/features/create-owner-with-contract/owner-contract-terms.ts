import type { CreateOwnerWithContractCommand } from './create-owner-with-contract.command';

type ContractField = 'basis' | 'ownerShare' | 'rentalShare' | 'validFrom' | 'validTo';

export interface InvalidOwnerContractTerm {
  field: ContractField;
  reason: string;
}

const SHARE_SCALE = 10n ** 30n;

export function validateOwnerContractTerms(command: CreateOwnerWithContractCommand): InvalidOwnerContractTerm | null {
  if (command.basis !== 'GROSS' && command.basis !== 'NET') {
    return { field: 'basis', reason: 'must be GROSS or NET' };
  }

  const ownerShare = scaledShare(command.ownerShare);
  if (ownerShare === null) {
    return { field: 'ownerShare', reason: 'must be a decimal share between 0 and 1 with at most 30 decimal places' };
  }
  const rentalShare = scaledShare(command.rentalShare);
  if (rentalShare === null) {
    return { field: 'rentalShare', reason: 'must be a decimal share between 0 and 1 with at most 30 decimal places' };
  }
  if (ownerShare + rentalShare !== SHARE_SCALE) {
    return { field: 'rentalShare', reason: 'ownerShare and rentalShare must sum to exactly 1' };
  }

  if (!isValidDate(command.validFrom)) {
    return { field: 'validFrom', reason: 'must be a valid instant' };
  }
  if (command.validTo !== null && (!isValidDate(command.validTo) || command.validTo <= command.validFrom)) {
    return { field: 'validTo', reason: 'must be a valid instant after validFrom' };
  }
  return null;
}

function isValidDate(value: Date): boolean {
  return value instanceof Date && Number.isFinite(value.getTime());
}

function scaledShare(value: string): bigint | null {
  if (typeof value !== 'string') return null;
  if (!/^\d+(?:\.\d+)?$/.test(value)) return null;

  const [whole, fraction = ''] = value.split('.');
  const significantFraction = fraction.replace(/0+$/, '');
  if (significantFraction.length > 30) return null;

  const scaled = BigInt(whole) * SHARE_SCALE + BigInt(significantFraction.padEnd(30, '0') || '0');
  return scaled <= SHARE_SCALE ? scaled : null;
}
