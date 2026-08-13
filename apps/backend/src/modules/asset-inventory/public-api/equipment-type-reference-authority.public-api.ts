import { Result } from 'neverthrow';

export interface ValidateEquipmentTypeReferencesInput {
  tenantId: string;
  equipmentTypeIds: string[];
}

export type EquipmentTypeReferenceAuthorityError = {
  code: 'EquipmentTypeReferenceNotFound';
  message: string;
  equipmentTypeId: string;
};

export abstract class EquipmentTypeReferenceAuthority {
  abstract validateEquipmentTypeReferences(
    input: ValidateEquipmentTypeReferencesInput,
  ): Promise<Result<void, EquipmentTypeReferenceAuthorityError>>;
}
