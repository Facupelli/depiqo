import { Result } from 'neverthrow';

export interface GetTenantBrandingFactsInput {
  tenantId: string;
}

export interface TenantBrandingFact {
  logoUrl: string | null;
}

export type TenantBrandingFactsError =
  | { code: 'TenantNotFound'; message: string }
  | { code: 'TenantInactive'; message: string }
  | { code: 'TenantDeleted'; message: string };

export abstract class TenantBrandingFacts {
  abstract getTenantBrandingFacts(
    input: GetTenantBrandingFactsInput,
  ): Promise<Result<TenantBrandingFact, TenantBrandingFactsError>>;
}
