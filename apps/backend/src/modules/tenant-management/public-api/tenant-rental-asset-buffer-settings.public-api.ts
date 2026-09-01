import { Result } from 'neverthrow';

export interface GetTenantRentalAssetBufferSettingsInput {
  tenantId: string;
}

export interface TenantRentalAssetBufferSettingsFact {
  beforeBufferMinutes: number;
  afterBufferMinutes: number;
}

export type TenantRentalAssetBufferSettingsError =
  | { code: 'TenantNotFound'; message: string }
  | { code: 'TenantConfigurationInvalid'; message: string };

export abstract class TenantRentalAssetBufferSettings {
  abstract getTenantRentalAssetBufferSettings(
    input: GetTenantRentalAssetBufferSettingsInput,
  ): Promise<Result<TenantRentalAssetBufferSettingsFact, TenantRentalAssetBufferSettingsError>>;
}
