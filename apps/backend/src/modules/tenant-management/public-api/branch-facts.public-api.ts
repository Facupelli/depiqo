import { Result } from 'neverthrow';

export interface GetBranchFactsInput {
  tenantId: string;
  branchId: string;
}

export interface GetBranchFactsBatchInput {
  tenantId: string;
  branchIds: string[];
}

export interface BranchOperationalLocation {
  formattedAddress: string;
  latitude: number;
  longitude: number;
  street: string | null;
  streetNumber: string | null;
  city: string | null;
  stateRegion: string | null;
  postalCode: string | null;
  country: string | null;
  providerPlaceId: string | null;
}

export interface BranchFact {
  branchId: string;
  supportsDelivery: boolean;
  isActive: boolean;
  isDeleted: boolean;
  effectiveTimezone: string;
  operationalLocation: BranchOperationalLocation | null;
  branchTimezone: string | null;
  tenantTimezone: string;
  timezoneSource: 'BRANCH' | 'TENANT' | 'DEFAULT';
}

export type BranchFactsError =
  | { code: 'BranchNotFound'; message: string }
  | { code: 'TenantConfigurationInvalid'; message: string };

export abstract class BranchFacts {
  abstract getBranchFacts(input: GetBranchFactsInput): Promise<Result<BranchFact, BranchFactsError>>;

  abstract getBranchFactsBatch(input: GetBranchFactsBatchInput): Promise<Result<BranchFact[], BranchFactsError>>;
}
