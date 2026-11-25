import { Result } from 'neverthrow';

export interface GetBranchRentalAssetBufferSettingsInput {
  tenantId: string;
  branchId: string;
}

export interface BranchRentalAssetBufferSettingsFact {
  beforeBufferMinutes: number;
  afterBufferMinutes: number;
}

export type BranchRentalAssetBufferSettingsError = { code: 'BranchNotFound'; message: string };

export abstract class BranchRentalAssetBufferSettings {
  abstract getBranchRentalAssetBufferSettings(
    input: GetBranchRentalAssetBufferSettingsInput,
  ): Promise<Result<BranchRentalAssetBufferSettingsFact, BranchRentalAssetBufferSettingsError>>;
}
