import { Result } from 'neverthrow';

export interface GetTenantPresentationPreferencesInput {
  tenantId: string;
}

export interface TenantPresentationPreferencesFact {
  locale: string;
}

export type TenantPresentationPreferencesError =
  | { code: 'TenantNotFound'; message: string }
  | { code: 'TenantConfigurationInvalid'; message: string };

export abstract class TenantPresentationPreferences {
  abstract getTenantPresentationPreferences(
    input: GetTenantPresentationPreferencesInput,
  ): Promise<Result<TenantPresentationPreferencesFact, TenantPresentationPreferencesError>>;
}
