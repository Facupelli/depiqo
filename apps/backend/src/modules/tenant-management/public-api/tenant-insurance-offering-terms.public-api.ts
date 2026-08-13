import { Result } from 'neverthrow';

export interface GetTenantInsuranceOfferingTermsInput {
  tenantId: string;
}

export interface TenantInsuranceOfferingTermsFact {
  insuranceEnabled: boolean;
  insuranceRatePercent: number;
}

export type TenantInsuranceOfferingTermsError =
  | { code: 'TenantNotFound'; message: string }
  | { code: 'TenantConfigurationInvalid'; message: string };

export abstract class TenantInsuranceOfferingTerms {
  abstract getTenantInsuranceOfferingTerms(
    input: GetTenantInsuranceOfferingTermsInput,
  ): Promise<Result<TenantInsuranceOfferingTermsFact, TenantInsuranceOfferingTermsError>>;
}
