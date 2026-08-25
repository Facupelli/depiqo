import { Result } from 'neverthrow';

export const TENANT_DAILY_BILLING_POLICIES = [
  'IGNORE_PARTIAL_DAY',
  'BILL_OVER_QUARTER_DAY',
  'BILL_OVER_HALF_DAY',
  'BILL_ANY_PARTIAL_DAY',
] as const;
export type TenantDailyBillingPolicy = (typeof TENANT_DAILY_BILLING_POLICIES)[number];

export interface GetTenantBillingPreferencesInput {
  tenantId: string;
}

export interface TenantBillingPreferencesFact {
  dailyBillingPolicy: TenantDailyBillingPolicy;
  weekendCountsAsOne: boolean;
}

export type TenantBillingPreferencesError =
  | { code: 'TenantNotFound'; message: string }
  | { code: 'TenantConfigurationInvalid'; message: string };

export abstract class TenantBillingPreferences {
  abstract getTenantBillingPreferences(
    input: GetTenantBillingPreferencesInput,
  ): Promise<Result<TenantBillingPreferencesFact, TenantBillingPreferencesError>>;
}
