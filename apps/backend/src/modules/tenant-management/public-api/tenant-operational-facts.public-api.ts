import { Result } from 'neverthrow';

export const TENANT_BOOKING_MODES = ['INSTANT_BOOK', 'REQUEST_TO_BOOK'] as const;
export type TenantBookingModeFact = (typeof TENANT_BOOKING_MODES)[number];

export interface GetTenantOperationalFactsInput {
  tenantId: string;
}

export interface TenantOperationalFact {
  tenantId: string;
  bookingMode: TenantBookingModeFact;
}

export type TenantOperationalFactsError =
  | { code: 'TenantNotFound'; message: string }
  | { code: 'TenantInactive'; message: string }
  | { code: 'TenantDeleted'; message: string }
  | { code: 'TenantConfigurationInvalid'; message: string };

export abstract class TenantOperationalFacts {
  abstract getTenantOperationalFacts(
    input: GetTenantOperationalFactsInput,
  ): Promise<Result<TenantOperationalFact, TenantOperationalFactsError>>;
}
