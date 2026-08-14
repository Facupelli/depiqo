import { Result } from 'neverthrow';

export interface GetTenantIdentityFactsInput {
  tenantId: string;
}

export interface TenantIdentityFact {
  tenantId: string;
  name: string;
  slug: string;
}

export type TenantIdentityFactsError =
  | { code: 'TenantNotFound'; message: string }
  | { code: 'TenantInactive'; message: string }
  | { code: 'TenantDeleted'; message: string };

export abstract class TenantIdentityFacts {
  abstract getTenantIdentityFacts(
    input: GetTenantIdentityFactsInput,
  ): Promise<Result<TenantIdentityFact, TenantIdentityFactsError>>;
}
