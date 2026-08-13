import { Result } from 'neverthrow';

export interface GetRentalRemitoEquipmentFactsInput {
  tenantId: string;
  rentalId: string;
}

export interface RentalRemitoEquipmentFacts {
  demandLines: Array<{
    demandLineId: string;
    equipmentTypeId: string;
    name: string;
    quantity: number;
    assignedAssetIds: string[];
  }>;
}

export interface RentalCommitmentPublicApiError {
  code: 'RentalNotFound';
  message: string;
}

export abstract class RentalCommitmentPublicApi {
  abstract getRentalRemitoEquipmentFacts(
    input: GetRentalRemitoEquipmentFactsInput,
  ): Promise<Result<RentalRemitoEquipmentFacts, RentalCommitmentPublicApiError>>;
}
